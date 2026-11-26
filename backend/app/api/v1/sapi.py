from datetime import date
from decimal import Decimal
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import desc, func
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from sqlalchemy.orm import Session, joinedload

from app.api.deps import get_current_user, get_db
from app.models.jenis_sapi import JenisSapi
from app.models.pengukuran import Pengukuran
from app.models.sapi import Sapi
from app.models.user import User
from app.services.cattle_registration import prepare_sapi, resolve_jenis_id
from app.schemas.sapi import (
    JenisSapiResponse,
    SapiCreate,
    SapiDetailResponse,
    SapiResponse,
    SapiUpdate,
)

router = APIRouter(prefix="/sapi", tags=["Manajemen Sapi"])


# --- Master Jenis Sapi ---
@router.get(
    "/jenis",
    response_model=List[JenisSapiResponse],
    summary="Daftar Master Jenis/Ras Sapi"
)
def list_jenis_sapi(
    db: Session = Depends(get_db)
) -> List[JenisSapi]:
    """
    Mengambil seluruh daftar ras/jenis sapi (Simental, Limousin, Brahman, PO, Bali, dll).
    """
    return db.query(JenisSapi).order_by(JenisSapi.nama_jenis.asc()).all()


def _enrich_sapi_with_measurement(db: Session, sapi: Sapi) -> SapiResponse:
    """
    Helper untuk menyertakan bobot terakhir dan total pengukuran ke objek SapiResponse.
    """
    latest_pengukuran = (
        db.query(Pengukuran)
        .filter(Pengukuran.id_sapi == sapi.id_sapi)
        .order_by(Pengukuran.tanggal_ukur.desc(), Pengukuran.id_pengukuran.desc())
        .first()
    )
    total_pengukuran = (
        db.query(func.count(Pengukuran.id_pengukuran))
        .filter(Pengukuran.id_sapi == sapi.id_sapi)
        .scalar() or 0
    )

    return SapiResponse(
        id_sapi=sapi.id_sapi,
        id_user=sapi.id_user,
        ear_tag=sapi.ear_tag,
        id_jenis=sapi.id_jenis,
        jenis_kelamin=sapi.jenis_kelamin,
        umur_bulan=sapi.umur_bulan,
        tanggal_masuk=sapi.tanggal_masuk,
        tanggal_keluar=sapi.tanggal_keluar,
        created_at=sapi.created_at,
        jenis=sapi.jenis,
        bobot_terakhir=float(latest_pengukuran.bobot) if latest_pengukuran else None,
        tanggal_ukur_terakhir=latest_pengukuran.tanggal_ukur if latest_pengukuran else None,
        total_pengukuran=total_pengukuran,
    )


# --- CRUD Sapi (Multi-Tenant Isolated) ---
@router.post(
    "/",
    response_model=SapiResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Tambah Sapi Baru Beserta Bobot Awal Manual"
)
def create_sapi(
    sapi_in: SapiCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> SapiResponse:
    """
    Mendaftarkan ternak sapi baru ke peternakan milik pengguna yang sedang login:
    - Validasi keunikan `ear_tag` khusus pada peternakan pengguna ini.
    - Resolusi `id_jenis` dari ID atau nama string `breed`.
    - Perekaman data sapi dan bobot awal manual ke tabel `pengukuran` dalam satu transaksi atomik.
    """
    db_sapi = prepare_sapi(db, current_user.id_user, sapi_in)
    try:
        db.add(db_sapi)
        db.flush()  # Dapatkan id_sapi dari sequence DB

        # Catat bobot awal sebagai rekor pengukuran pertama
        initial_measurement = Pengukuran(
            id_sapi=db_sapi.id_sapi,
            bobot=Decimal(str(round(sapi_in.bobot_awal, 2))),
            tanggal_ukur=sapi_in.tanggal_masuk,
            path_foto_samping=None,
            path_foto_belakang=None,
        )
        db.add(initial_measurement)
        db.commit()
        db.refresh(db_sapi)
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Ear tag '{sapi_in.ear_tag}' sudah digunakan pada peternakan Anda."
        )
    except SQLAlchemyError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Gagal menyimpan data sapi baru ke database: {str(exc)}"
        )

    return _enrich_sapi_with_measurement(db, db_sapi)


@router.get(
    "/",
    response_model=List[SapiResponse],
    summary="Daftar Sapi Milik Peternak"
)
def list_sapi(
    skip: int = Query(0, ge=0, description="Offset data untuk pagination"),
    limit: int = Query(100, ge=1, le=200, description="Batas maksimal data"),
    search: Optional[str] = Query(None, description="Pencarian berdasarkan ear tag"),
    status: Optional[str] = Query("all", description="Filter status: 'active', 'archived', atau 'all'"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> List[SapiResponse]:
    """
    Menampilkan daftar sapi milik peternak yang sedang login (Multi-tenancy enforced).
    Mendukung pagination, filter pencarian `ear_tag`, dan filter status sapi aktif/diarsipkan.
    """
    query = (
        db.query(Sapi)
        .options(joinedload(Sapi.jenis))
        .filter(Sapi.id_user == current_user.id_user)
    )

    if status == "active":
        query = query.filter(Sapi.tanggal_keluar.is_(None))
    elif status == "archived":
        query = query.filter(Sapi.tanggal_keluar.isnot(None))

    if search and search.strip():
        query = query.filter(Sapi.ear_tag.ilike(f"%{search.strip()}%"))

    sapi_list = query.order_by(Sapi.created_at.desc(), Sapi.id_sapi.desc()).offset(skip).limit(limit).all()

    return [_enrich_sapi_with_measurement(db, s) for s in sapi_list]


@router.get(
    "/{id_sapi}",
    response_model=SapiDetailResponse,
    summary="Detail Profil Sapi"
)
def get_sapi_detail(
    id_sapi: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> SapiDetailResponse:
    """
    Mengambil data detail seekor sapi beserta riwayat bobot terakhirnya.
    Wajib memvalidasi bahwa sapi tersebut milik `current_user`.
    """
    sapi = (
        db.query(Sapi)
        .options(joinedload(Sapi.jenis))
        .filter(
            Sapi.id_sapi == id_sapi,
            Sapi.id_user == current_user.id_user
        )
        .first()
    )
    if not sapi:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Sapi dengan ID {id_sapi} tidak ditemukan atau bukan milik peternakan Anda."
        )

    return _enrich_sapi_with_measurement(db, sapi)


@router.put(
    "/{id_sapi}",
    response_model=SapiResponse,
    summary="Perbarui Profil Sapi"
)
def update_sapi(
    id_sapi: int,
    sapi_in: SapiUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> SapiResponse:
    """
    Memperbarui atribut profil sapi milik peternak yang sedang login.
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

    # Validasi ear_tag jika diubah
    if sapi_in.ear_tag and sapi_in.ear_tag.strip() != sapi.ear_tag:
        cleaned_tag = sapi_in.ear_tag.strip()
        duplicate = db.query(Sapi).filter(
            Sapi.id_user == current_user.id_user,
            func.lower(Sapi.ear_tag) == cleaned_tag.lower(),
            Sapi.id_sapi != id_sapi
        ).first()
        if duplicate:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Ear tag '{cleaned_tag}' sudah digunakan oleh ternak Anda yang lain."
            )
        sapi.ear_tag = cleaned_tag

    # Resolusi ID jenis jika ada perubahan jenis / breed
    if sapi_in.id_jenis is not None or sapi_in.breed is not None:
        resolved_jenis = resolve_jenis_id(db, sapi_in.id_jenis, sapi_in.breed)
        if resolved_jenis is not None:
            sapi.id_jenis = resolved_jenis

    if sapi_in.jenis_kelamin is not None:
        sapi.jenis_kelamin = sapi_in.jenis_kelamin.strip()
    if sapi_in.umur_bulan is not None:
        sapi.umur_bulan = sapi_in.umur_bulan
    if sapi_in.tanggal_masuk is not None:
        sapi.tanggal_masuk = sapi_in.tanggal_masuk

    # Penanganan status active / archived
    if sapi_in.status == "archived" and sapi.tanggal_keluar is None:
        sapi.tanggal_keluar = date.today()
    elif sapi_in.status == "active":
        sapi.tanggal_keluar = None
    elif sapi_in.tanggal_keluar is not None:
        sapi.tanggal_keluar = sapi_in.tanggal_keluar

    try:
        db.commit()
        db.refresh(sapi)
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Terjadi konflik data saat memperbarui profil sapi."
        )

    return _enrich_sapi_with_measurement(db, sapi)


@router.patch(
    "/{id_sapi}/archive",
    response_model=SapiResponse,
    summary="Arsipkan Sapi (Soft Delete / Sapi Keluar)"
)
def archive_sapi(
    id_sapi: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> SapiResponse:
    """
    Memindahkan sapi aktif ke status arsip/keluar dengan mencatat tanggal_keluar = hari ini.
    Seluruh rekaman riwayat pengukuran tetap dipertahankan.
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

    sapi.tanggal_keluar = date.today()
    db.commit()
    db.refresh(sapi)

    return _enrich_sapi_with_measurement(db, sapi)


@router.patch(
    "/{id_sapi}/unarchive",
    response_model=SapiResponse,
    summary="Aktifkan Kembali Sapi yang Diarsipkan"
)
def unarchive_sapi(
    id_sapi: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> SapiResponse:
    """
    Mengaktifkan kembali sapi yang sebelumnya diarsipkan (menghapus tanggal_keluar).
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

    sapi.tanggal_keluar = None
    db.commit()
    db.refresh(sapi)

    return _enrich_sapi_with_measurement(db, sapi)


@router.delete(
    "/{id_sapi}",
    status_code=status.HTTP_200_OK,
    summary="Hapus Data Sapi (Permanen)"
)
def delete_sapi(
    id_sapi: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> dict:
    """
    Menghapus data sapi dan rekaman pengukurannya dari peternakan pengguna secara permanen.
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

    ear_tag = sapi.ear_tag
    db.delete(sapi)
    db.commit()
    return {
        "status": "success",
        "message": f"Sapi dengan ear tag '{ear_tag}' berhasil dihapus."
    }
