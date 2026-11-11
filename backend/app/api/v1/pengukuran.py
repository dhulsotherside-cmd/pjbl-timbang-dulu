from datetime import date
from typing import List, Optional
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db
from app.models.pengukuran import Pengukuran
from app.models.sapi import Sapi
from app.models.user import User
from app.schemas.pengukuran import (
    KalkulatorPBHRequest,
    KalkulatorPBHResponse,
    PBHInfo,
    PengukuranResponse,
    PredictResponse,
    PredictResponseData,
)
from app.services.ai_inference import CattleVisionService
from app.services.pbh_calculator import calculate_pbh
from app.services.supabase_storage import upload_image_to_supabase, validate_image_file

router = APIRouter(prefix="/pengukuran", tags=["Pengukuran & Inferensi AI"])


@router.post(
    "/predict",
    response_model=PredictResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Eksekusi Prediksi Bobot & Rekam Pengukuran Baru"
)
async def predict_and_record_measurement(
    id_sapi: int = Form(..., description="ID sapi yang akan diukur"),
    foto_samping: UploadFile = File(..., description="Citra sisi lateral tubuh ternak"),
    foto_belakang: UploadFile = File(..., description="Citra sisi posterior (belakang) tubuh ternak"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> PredictResponse:
    """
    Pipeline lengkap estimasi bobot sapi berbasis Computer Vision:
    1. Validasi hak akses multi-tenancy: id_sapi harus milik current_user.
    2. Validasi format berkas kedua citra (MIME type & ekstensi).
    3. Inferensi bobot melalui CattleVisionService (Mock / ONNX Model).
    4. Pengunggahan kedua citra ke Supabase Storage (nama UUID unik).
    5. Rekam data pengukuran ke database PostgreSQL.
    6. Komputasi Perkembangan Bobot Harian (PBH) jika ada data historis sebelumnya.
    """
    # 1. Validasi kepemilikan sapi (Multi-tenancy isolation)
    sapi = db.query(Sapi).filter(
        Sapi.id_sapi == id_sapi,
        Sapi.id_user == current_user.id_user
    ).first()
    if not sapi:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Sapi dengan ID {id_sapi} tidak ditemukan atau bukan milik peternakan Anda."
        )

    # 2. Validasi format berkas gambar
    validate_image_file(foto_samping)
    validate_image_file(foto_belakang)

    # 3. Prediksi bobot melalui AI Inference Service
    predicted_weight = await CattleVisionService.predict_weight(
        foto_samping=foto_samping,
        foto_belakang=foto_belakang,
        umur_bulan=sapi.umur_bulan,
        jenis_kelamin=sapi.jenis_kelamin
    )

    # 4. Upload berkas ke Supabase Object Storage
    url_samping = await upload_image_to_supabase(foto_samping)
    url_belakang = await upload_image_to_supabase(foto_belakang)

    # 5. Cek pengukuran sebelumnya untuk kalkulasi PBH
    today = date.today()
    latest_prev_pengukuran = (
        db.query(Pengukuran)
        .filter(Pengukuran.id_sapi == id_sapi)
        .order_by(Pengukuran.tanggal_ukur.desc(), Pengukuran.id_pengukuran.desc())
        .first()
    )

    pbh_info_obj: Optional[PBHInfo] = None
    if latest_prev_pengukuran:
        delta_hari = (today - latest_prev_pengukuran.tanggal_ukur).days
        if delta_hari > 0:
            calc = calculate_pbh(
                bobot_awal=float(latest_prev_pengukuran.bobot),
                bobot_akhir=predicted_weight,
                jumlah_hari=delta_hari
            )
            pbh_info_obj = PBHInfo(
                pbh_kg_hari=calc["pbh_kg_hari"],
                selang_hari=calc["selang_hari"],
                selisih_bobot_kg=calc["selisih_bobot_kg"],
                status=calc["status"],
                pesan=calc["pesan"]
            )

    # 6. Simpan baris pengukuran ke database PostgreSQL
    new_pengukuran = Pengukuran(
        id_sapi=id_sapi,
        bobot=predicted_weight,
        tanggal_ukur=today,
        path_foto_samping=url_samping,
        path_foto_belakang=url_belakang
    )
    db.add(new_pengukuran)
    db.commit()
    db.refresh(new_pengukuran)

    return PredictResponse(
        status="success",
        message="Estimasi bobot berhasil diproses",
        data=PredictResponseData(
            id_pengukuran=new_pengukuran.id_pengukuran,
            id_sapi=new_pengukuran.id_sapi,
            bobot_estimasi_kg=float(new_pengukuran.bobot),
            tanggal_ukur=new_pengukuran.tanggal_ukur,
            foto_samping_url=new_pengukuran.path_foto_samping,
            foto_belakang_url=new_pengukuran.path_foto_belakang,
            pbh_info=pbh_info_obj
        )
    )


@router.get(
    "/sapi/{id_sapi}",
    response_model=List[PengukuranResponse],
    summary="Riwayat Pengukuran Sapi Tertentu"
)
def get_riwayat_pengukuran_sapi(
    id_sapi: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> List[PengukuranResponse]:
    """
    Mengambil riwayat pengukuran bobot untuk sapi tertentu.
    - Terurut secara descending (pengukuran terbaru di awal).
    - Menghitung PBH antar pengukuran historis jika tersedia.
    """
    # Multi-tenancy check
    sapi = db.query(Sapi).filter(
        Sapi.id_sapi == id_sapi,
        Sapi.id_user == current_user.id_user
    ).first()
    if not sapi:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Sapi dengan ID {id_sapi} tidak ditemukan atau bukan milik peternakan Anda."
        )

    records = (
        db.query(Pengukuran)
        .filter(Pengukuran.id_sapi == id_sapi)
        .order_by(Pengukuran.tanggal_ukur.desc(), Pengukuran.id_pengukuran.desc())
        .all()
    )

    response_list: List[PengukuranResponse] = []
    for i, rec in enumerate(records):
        pbh_info: Optional[PBHInfo] = None
        # Bandingkan dengan record sebelumnya (yang berada pada index i + 1 karena urutan descending)
        if i + 1 < len(records):
            prev_rec = records[i + 1]
            delta_hari = (rec.tanggal_ukur - prev_rec.tanggal_ukur).days
            if delta_hari > 0:
                try:
                    res = calculate_pbh(
                        bobot_awal=float(prev_rec.bobot),
                        bobot_akhir=float(rec.bobot),
                        jumlah_hari=delta_hari
                    )
                    pbh_info = PBHInfo(
                        pbh_kg_hari=res["pbh_kg_hari"],
                        selang_hari=res["selang_hari"],
                        selisih_bobot_kg=res["selisih_bobot_kg"],
                        status=res["status"],
                        pesan=res["pesan"]
                    )
                except HTTPException:
                    pass

        response_list.append(
            PengukuranResponse(
                id_pengukuran=rec.id_pengukuran,
                id_sapi=rec.id_sapi,
                bobot=float(rec.bobot),
                tanggal_ukur=rec.tanggal_ukur,
                path_foto_samping=rec.path_foto_samping,
                path_foto_belakang=rec.path_foto_belakang,
                created_at=rec.created_at,
                pbh_info=pbh_info
            )
        )

    return response_list


@router.post(
    "/kalkulator-pbh",
    response_model=KalkulatorPBHResponse,
    summary="Kalkulator Perkembangan Bobot Harian (PBH) Kustom"
)
def custom_pbh_calculator(
    payload: KalkulatorPBHRequest
) -> KalkulatorPBHResponse:
    """
    Endpoint utilitas mandiri untuk menghitung PBH tanpa harus menyimpan data pengukuran.
    Berguna untuk simulasi atau perhitungan manual peternak.
    """
    result = calculate_pbh(
        bobot_awal=payload.bobot_awal,
        bobot_akhir=payload.bobot_akhir,
        jumlah_hari=payload.jumlah_hari
    )

    return KalkulatorPBHResponse(
        pbh_kg_hari=result["pbh_kg_hari"],
        jumlah_hari=result["selang_hari"],
        selisih_bobot_kg=result["selisih_bobot_kg"],
        status=result["status"],
        pesan=result["pesan"]
    )
