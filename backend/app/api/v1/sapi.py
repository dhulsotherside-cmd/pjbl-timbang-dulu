from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session, joinedload

from app.api.deps import get_current_user, get_db
from app.models.jenis_sapi import JenisSapi
from app.models.pengukuran import Pengukuran
from app.models.sapi import Sapi
from app.models.user import User
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


# --- CRUD Sapi (Multi-Tenant Isolated) ---
@router.post(
    "/",
    response_model=SapiResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Tambah Sapi Baru"
)
def create_sapi(
    sapi_in: SapiCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Sapi:
    """
    Mendaftarkan ternak sapi baru ke peternakan milik pengguna yang sedang login.
    - Validasi keunikan `ear_tag` khusus untuk akun peternak ini.
    - Menghubungkan ID jenis sapi yang valid jika diisi.
    """
    # 1. Validasi keunikan ear_tag per user
    existing_ear_tag = db.query(Sapi).filter(
        Sapi.id_user == current_user.id_user,
        Sapi.ear_tag == sapi_in.ear_tag
    ).first()
    if existing_ear_tag:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Ear tag '{sapi_in.ear_tag}' sudah terdaftar pada peternakan Anda."
        )

    # 2. Validasi id_jenis jika disertakan
    if sapi_in.id_jenis is not None:
        jenis_exists = db.query(JenisSapi).filter(
            JenisSapi.id_jenis == sapi_in.id_jenis
        ).first()
        if not jenis_exists:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Jenis sapi dengan ID {sapi_in.id_jenis} tidak ditemukan."
            )

    db_sapi = Sapi(
        id_user=current_user.id_user,
        id_jenis=sapi_in.id_jenis,
        ear_tag=sapi_in.ear_tag,
        jenis_kelamin=sapi_in.jenis_kelamin,
        umur_bulan=sapi_in.umur_bulan,
        tanggal_masuk=sapi_in.tanggal_masuk,
        tanggal_keluar=sapi_in.tanggal_keluar,
    )
    db.add(db_sapi)
    db.commit()
    db.refresh(db_sapi)

    return db_sapi


@router.get(
    "/",
    response_model=List[SapiResponse],
    summary="Daftar Sapi Milik Peternak"
)
def list_sapi(
    skip: int = Query(0, ge=0, description="Offset data untuk pagination"),
    limit: int = Query(50, ge=1, le=100, description="Batas maksimal data"),
    search: Optional[str] = Query(None, description="Pencarian berdasarkan ear tag"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> List[Sapi]:
    """
    Menampilkan daftar sapi milik peternak yang sedang login (Multi-tenancy enforced).
    Mendukung pagination dan filter pencarian `ear_tag`.
    """
    query = (
        db.query(Sapi)
        .options(joinedload(Sapi.jenis))
        .filter(Sapi.id_user == current_user.id_user)
    )

    if search:
        query = query.filter(Sapi.ear_tag.ilike(f"%{search.strip()}%"))

    return query.order_by(Sapi.created_at.desc()).offset(skip).limit(limit).all()


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

    # Ambil data pengukuran bobot terakhir
    latest_pengukuran = (
        db.query(Pengukuran)
        .filter(Pengukuran.id_sapi == id_sapi)
        .order_by(Pengukuran.tanggal_ukur.desc(), Pengukuran.id_pengukuran.desc())
        .first()
    )

    total_pengukuran = (
        db.query(Pengukuran)
        .filter(Pengukuran.id_sapi == id_sapi)
        .count()
    )

    return SapiDetailResponse(
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
) -> Sapi:
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

    # Jika mengubah ear_tag, pastikan tidak bentrok dengan sapi lain milik user yang sama
    if sapi_in.ear_tag and sapi_in.ear_tag != sapi.ear_tag:
        duplicate = db.query(Sapi).filter(
            Sapi.id_user == current_user.id_user,
            Sapi.ear_tag == sapi_in.ear_tag,
            Sapi.id_sapi != id_sapi
        ).first()
        if duplicate:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Ear tag '{sapi_in.ear_tag}' sudah digunakan oleh ternak Anda yang lain."
            )
        sapi.ear_tag = sapi_in.ear_tag

    if sapi_in.id_jenis is not None:
        jenis_exists = db.query(JenisSapi).filter(
            JenisSapi.id_jenis == sapi_in.id_jenis
        ).first()
        if not jenis_exists:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Jenis sapi dengan ID {sapi_in.id_jenis} tidak ditemukan."
            )
        sapi.id_jenis = sapi_in.id_jenis

    if sapi_in.jenis_kelamin is not None:
        sapi.jenis_kelamin = sapi_in.jenis_kelamin
    if sapi_in.umur_bulan is not None:
        sapi.umur_bulan = sapi_in.umur_bulan
    if sapi_in.tanggal_masuk is not None:
        sapi.tanggal_masuk = sapi_in.tanggal_masuk
    if sapi_in.tanggal_keluar is not None:
        sapi.tanggal_keluar = sapi_in.tanggal_keluar

    db.commit()
    db.refresh(sapi)
    return sapi


@router.delete(
    "/{id_sapi}",
    status_code=status.HTTP_200_OK,
    summary="Hapus Data Sapi"
)
def delete_sapi(
    id_sapi: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> dict:
    """
    Menghapus data sapi dan rekaman pengukurannya dari peternakan pengguna.
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

    db.delete(sapi)
    db.commit()
    return {
        "status": "success",
        "message": f"Sapi dengan ear tag '{sapi.ear_tag}' berhasil dihapus."
    }
