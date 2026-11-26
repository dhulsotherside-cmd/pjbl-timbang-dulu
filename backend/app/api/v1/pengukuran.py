from datetime import date
from typing import List, Literal, Optional
from uuid import uuid4

from fastapi import APIRouter, Depends, File, Form, HTTPException, Request, UploadFile, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
from starlette.datastructures import UploadFile as FormFile

from app.api.deps import get_current_user, get_db
from app.models.pengukuran import Pengukuran
from app.models.sapi import Sapi
from app.models.user import User
from app.schemas.pengukuran import (
    CattleHistoryItem,
    CattleHistoryResponse,
    CattleHistorySummary,
    KalkulatorPBHRequest,
    KalkulatorPBHResponse,
    MeasurementSaveData,
    MeasurementSaveResponse,
    PBHInfo,
    PengukuranResponse,
    PredictPreviewData,
    PredictPreviewResponse,
)
from app.schemas.sapi import SapiBase
from app.services.ai_inference import CattleVisionService
from app.services.cattle_registration import prepare_sapi
from app.services.image_utils import compress_to_webp
from app.services.neon_storage import (
    delete_uploaded_image,
    generate_presigned_url,
    upload_bytes_to_neon,
    validate_image_file,
)
from app.services.pbh_calculator import calculate_pbh

router = APIRouter(prefix="/pengukuran", tags=["Pengukuran & Inferensi AI"])


@router.post(
    "/predict",
    response_model=PredictPreviewResponse,
    status_code=status.HTTP_200_OK,
    summary="Preview Estimasi Bobot Sapi Berbasis AI (Tahap 1)"
)
async def predict_weight_preview(
    request: Request,
    foto: Optional[UploadFile] = File(None, description="Citra sapi tampak samping"),
    foto_samping: Optional[UploadFile] = File(None, description="Alias citra tampak samping"),
    foto_belakang: Optional[UploadFile] = File(None, description="Alias citra tampak belakang"),
    current_user: User = Depends(get_current_user),
) -> PredictPreviewResponse:
    """
    Tahap 1 Alur Two-Step Commit:
    - Menerima 1 foto sapi mentah (raw bytes).
    - Memverifikasi keberadaan sapi dan mengeksekusi model AI estimasi bobot.
    - TIDAK menulis ke PostgreSQL dan TIDAK mengunggah ke Neon Object Storage.
    - Menolak berkas non-sapi dengan HTTP 422.
    """
    photo = foto or foto_samping or foto_belakang
    form = await request.form()
    file_parts = [part for _, part in form.multi_items() if isinstance(part, FormFile)]
    if photo is None or len(file_parts) != 1:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Unggah tepat satu foto sapi untuk estimasi."
        )

    validate_image_file(photo)
    view = "samping" if (foto is not None or foto_samping is not None) else "belakang"

    # Jalankan model AI Keras dengan citra asli (raw bytes) - TIDAK dikompres sebelum AI
    weight = await CattleVisionService.predict_weight(photo=photo, view=view)

    return PredictPreviewResponse(
        status="success",
        message="Estimasi bobot berhasil diproses",
        data=PredictPreviewData(
            estimated_weight_kg=weight,
            bobot=weight,
            confidence="Tinggi",
            status="VALID",
        )
    )


@router.post(
    "/save",
    response_model=MeasurementSaveResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Simpan Pengukuran Permanen & Kompresi WebP (Tahap 2)"
)
async def save_measurement(
    request: Request,
    bobot: float = Form(..., gt=0, description="Bobot estimasi dalam kg"),
    foto: Optional[UploadFile] = File(None, description="Foto sapi yang diestimasi"),
    foto_samping: Optional[UploadFile] = File(None, description="Alias foto tampak samping"),
    id_sapi: Optional[int] = Form(None, gt=0, description="ID sapi terdaftar"),
    ear_tag: Optional[str] = Form(None, min_length=1, max_length=50),
    id_jenis: Optional[int] = Form(None, gt=0),
    jenis_kelamin: Optional[Literal["Jantan", "Betina"]] = Form(None),
    umur_bulan: Optional[int] = Form(None, ge=1, le=360),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> MeasurementSaveResponse:
    """
    Tahap 2 Alur Two-Step Commit:
    - Menerima foto, nilai bobot yang telah dikonfirmasi, serta target sapi (lama atau onboarding baru).
    - Mengompres citra ke format WebP (max 1280px, quality 80).
    - Mengunggah berkas WebP ke Neon Object Storage (bucket: cattle-images).
    - Menyimpan transaksi atomik ke database PostgreSQL (menyimpan relative object key).
    - Melakukan rollback kompensasi jika transaksi DB gagal.
    """
    photo = foto or foto_samping
    form = await request.form()
    file_parts = [part for _, part in form.multi_items() if isinstance(part, FormFile)]
    if photo is None or len(file_parts) != 1:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Unggah tepat satu foto sapi untuk disimpan."
        )

    validate_image_file(photo)

    new_fields = (ear_tag, id_jenis, jenis_kelamin, umur_bulan)
    if id_sapi is None:
        if any(v is None for v in new_fields) or not (ear_tag and ear_tag.strip()):
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Lengkapi ear tag, jenis sapi, jenis kelamin, dan umur untuk pendaftaran sapi baru."
            )
        sapi = prepare_sapi(db, current_user.id_user, SapiBase(
            ear_tag=ear_tag, id_jenis=id_jenis, jenis_kelamin=jenis_kelamin, umur_bulan=umur_bulan,
        ))
    else:
        if any(v is not None for v in new_fields):
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Pilih sapi terdaftar atau kirim identitas sapi baru, jangan keduanya."
            )
        sapi = db.query(Sapi).filter_by(id_sapi=id_sapi, id_user=current_user.id_user).first()
        if sapi is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Sapi tidak ditemukan di peternakan Anda.")
        if sapi.tanggal_keluar is not None:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Sapi sudah diarsipkan.")

    # 1. Kompres foto ke .webp
    await photo.seek(0)
    raw_bytes = await photo.read()
    webp_bytes = compress_to_webp(raw_bytes, max_size=1280, quality=80)

    # 2. Persiapkan entitas DB jika sapi baru
    today = date.today()
    pbh = None
    object_key = None

    try:
        if id_sapi is None:
            db.add(sapi)
            db.flush()  # dapatkan sapi.id_sapi
        else:
            previous = (
                db.query(Pengukuran).filter_by(id_sapi=id_sapi)
                .order_by(Pengukuran.tanggal_ukur.desc(), Pengukuran.id_pengukuran.desc()).first()
            )
            if previous and today > previous.tanggal_ukur:
                days = (today - previous.tanggal_ukur).days
                pbh = PBHInfo(**calculate_pbh(float(previous.bobot), bobot, days))

        # 3. Unggah .webp ke Neon Object Storage dengan path unik
        unique_file_id = uuid4().hex
        object_key = f"sapi/{sapi.id_sapi}/{unique_file_id}.webp"
        await upload_bytes_to_neon(webp_bytes, object_key, content_type="image/webp")

        # 4. Simpan transaksi ke database (simpan relative object key ke path_foto_samping)
        measurement = Pengukuran(
            id_sapi=sapi.id_sapi,
            bobot=bobot,
            tanggal_ukur=today,
            path_foto_samping=object_key,
            path_foto_belakang=None,
        )
        db.add(measurement)
        db.flush()

        foto_url = generate_presigned_url(object_key)
        result = MeasurementSaveResponse(
            status="success",
            message="Data pengukuran berhasil disimpan permanen",
            data=MeasurementSaveData(
                id_pengukuran=measurement.id_pengukuran,
                id_sapi=sapi.id_sapi,
                bobot=bobot,
                tanggal_ukur=today,
                path_foto_samping=object_key,
                foto_url=foto_url,
                pbh_info=pbh,
            )
        )
        db.commit()
        return result
    except Exception as exc:
        db.rollback()
        if object_key:
            await delete_uploaded_image(object_key)
        if isinstance(exc, IntegrityError) and id_sapi is None:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Pendaftaran gagal. Ear tag sudah terdaftar.") from exc
        raise


@router.get(
    "/history/{id_sapi}",
    response_model=CattleHistoryResponse,
    summary="Ringkasan Analitik PBH & Riwayat Foto Sapi"
)
def get_cattle_history_analytics(
    id_sapi: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> CattleHistoryResponse:
    """
    Mengambil data analitik pertumbuhan sapi dan seluruh riwayat penimbangan:
    - Agregat: bobot awal, bobot terkini, delta bobot, rata-rata ADG keseluruhan, indikator penurunan bobot.
    - Time-series penimbangan beserta interval PBH dan konversi relative object key ke URL foto aktif.
    """
    sapi = db.query(Sapi).filter_by(id_sapi=id_sapi, id_user=current_user.id_user).first()
    if not sapi:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Sapi dengan ID {id_sapi} tidak ditemukan atau bukan milik peternakan Anda."
        )

    records = (
        db.query(Pengukuran)
        .filter_by(id_sapi=id_sapi)
        .order_by(Pengukuran.tanggal_ukur.asc(), Pengukuran.id_pengukuran.asc())
        .all()
    )

    if not records:
        return CattleHistoryResponse(
            summary=CattleHistorySummary(
                id_sapi=sapi.id_sapi,
                ear_tag=sapi.ear_tag,
                total_pengukuran=0,
            ),
            history=[]
        )

    bobot_awal = round(float(records[0].bobot), 2)
    bobot_terkini = round(float(records[-1].bobot), 2)
    total_pertambahan_kg = round(bobot_terkini - bobot_awal, 2)

    total_days = (records[-1].tanggal_ukur - records[0].tanggal_ukur).days
    rata_rata_pbh = round(total_pertambahan_kg / total_days, 2) if total_days > 0 else None

    history_items: List[CattleHistoryItem] = []
    is_weight_loss = (rata_rata_pbh is not None and rata_rata_pbh < 0)

    for i, rec in enumerate(records):
        interval_pbh = None
        selisih_hari = None
        status_pertumbuhan = None

        if i > 0:
            prev_rec = records[i - 1]
            selisih_hari = (rec.tanggal_ukur - prev_rec.tanggal_ukur).days
            if selisih_hari > 0:
                delta_bobot = float(rec.bobot) - float(prev_rec.bobot)
                interval_pbh = round(delta_bobot / selisih_hari, 2)
                if interval_pbh < 0:
                    status_pertumbuhan = "PERINGATAN_PENURUNAN"
                    is_weight_loss = True
                else:
                    status_pertumbuhan = "NORMAL"

        foto_key = rec.path_foto_samping or rec.path_foto_belakang
        foto_url = generate_presigned_url(foto_key) if foto_key else None

        history_items.append(
            CattleHistoryItem(
                id_pengukuran=rec.id_pengukuran,
                id_sapi=rec.id_sapi,
                bobot=round(float(rec.bobot), 2),
                tanggal_ukur=rec.tanggal_ukur,
                selisih_hari=selisih_hari,
                pbh_kg_hari=interval_pbh,
                status=status_pertumbuhan,
                path_foto_samping=rec.path_foto_samping,
                foto_url=foto_url,
            )
        )

    summary = CattleHistorySummary(
        id_sapi=sapi.id_sapi,
        ear_tag=sapi.ear_tag,
        bobot_awal=bobot_awal,
        bobot_terkini=bobot_terkini,
        total_pertambahan_kg=total_pertambahan_kg,
        rata_rata_pbh=rata_rata_pbh,
        is_weight_loss=is_weight_loss,
        total_pengukuran=len(records),
    )

    # Return order descending untuk riwayat tabel (pengukuran terbaru di atas)
    return CattleHistoryResponse(
        summary=summary,
        history=list(reversed(history_items))
    )


@router.get(
    "/sapi/{id_sapi}",
    response_model=List[PengukuranResponse],
    summary="Riwayat Pengukuran Sapi Tertentu (Legacy Endpoint)"
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
