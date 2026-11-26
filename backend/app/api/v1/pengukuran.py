from datetime import date
from typing import List, Literal, Optional
from fastapi import APIRouter, Depends, File, Form, HTTPException, Request, UploadFile, status
from starlette.datastructures import UploadFile as FormFile
from sqlalchemy.exc import IntegrityError
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
from app.schemas.sapi import SapiBase
from app.services.cattle_registration import prepare_sapi
from app.services.ai_inference import CattleVisionService
from app.services.pbh_calculator import calculate_pbh
from app.services.neon_storage import delete_uploaded_image, upload_image_to_neon, validate_image_file

router = APIRouter(prefix="/pengukuran", tags=["Pengukuran & Inferensi AI"])


@router.post(
    "/predict",
    response_model=PredictResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Eksekusi Prediksi Bobot & Rekam Pengukuran Baru"
)
async def predict_and_record_measurement(
    request: Request,
    foto_samping: Optional[UploadFile] = File(None),
    foto_belakang: Optional[UploadFile] = File(None),
    id_sapi: Optional[int] = Form(None, gt=0),
    ear_tag: Optional[str] = Form(None, min_length=1, max_length=50),
    id_jenis: Optional[int] = Form(None, gt=0),
    jenis_kelamin: Optional[Literal["Jantan", "Betina"]] = Form(None),
    umur_bulan: Optional[int] = Form(None, ge=1, le=360),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> PredictResponse:
    photo = foto_samping or foto_belakang
    form = await request.form()
    if photo is None or sum(isinstance(part, FormFile) for _, part in form.multi_items()) != 1:
        raise HTTPException(422, "Unggah tepat satu foto sapi dari samping atau belakang.")
    view = "samping" if foto_samping is not None else "belakang"
    validate_image_file(photo)

    new_fields = (ear_tag, id_jenis, jenis_kelamin, umur_bulan)
    if id_sapi is None:
        if any(value is None for value in new_fields) or not ear_tag.strip():
            raise HTTPException(422, "Lengkapi ear tag, jenis sapi, jenis kelamin dan umur sapi baru.")
        sapi = prepare_sapi(db, current_user.id_user, SapiBase(
            ear_tag=ear_tag, id_jenis=id_jenis, jenis_kelamin=jenis_kelamin, umur_bulan=umur_bulan,
        ))
    else:
        if any(value is not None for value in new_fields):
            raise HTTPException(422, "Pilih sapi terdaftar atau kirim identitas sapi baru.")
        sapi = db.query(Sapi).filter_by(id_sapi=id_sapi, id_user=current_user.id_user).first()
        if sapi is None:
            raise HTTPException(404, "Sapi tidak ditemukan di peternakan Anda.")
        if sapi.tanggal_keluar is not None:
            raise HTTPException(409, "Sapi sudah diarsipkan.")

    weight = await CattleVisionService.predict_weight(photo=photo, view=view)
    photo_url = await upload_image_to_neon(
        photo,
        id_sapi=sapi.id_sapi if id_sapi is not None else None,
        view=view,
    )
    today = date.today()
    pbh = None
    try:
        if id_sapi is None:
            db.add(sapi)
            db.flush()
        else:
            previous = (
                db.query(Pengukuran).filter_by(id_sapi=id_sapi)
                .order_by(Pengukuran.tanggal_ukur.desc(), Pengukuran.id_pengukuran.desc()).first()
            )
            if previous and today > previous.tanggal_ukur:
                days = (today - previous.tanggal_ukur).days
                pbh = PBHInfo(**calculate_pbh(float(previous.bobot), weight, days))

        measurement = Pengukuran(
            id_sapi=sapi.id_sapi, bobot=weight, tanggal_ukur=today,
            path_foto_samping=photo_url if view == "samping" else None,
            path_foto_belakang=photo_url if view == "belakang" else None,
        )
        db.add(measurement)
        db.flush()
        result = PredictResponse(data=PredictResponseData(
            id_pengukuran=measurement.id_pengukuran, id_sapi=sapi.id_sapi,
            bobot_estimasi_kg=weight, tanggal_ukur=today, pbh_info=pbh,
            foto_samping_url=measurement.path_foto_samping, foto_belakang_url=measurement.path_foto_belakang,
        ))
        db.commit()
    except Exception as exc:
        db.rollback()
        await delete_uploaded_image(photo_url)
        if isinstance(exc, IntegrityError) and id_sapi is None:
            raise HTTPException(409, "Pendaftaran gagal. Periksa kembali ear tag dan jenis sapi.") from exc
        raise
    return result


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
