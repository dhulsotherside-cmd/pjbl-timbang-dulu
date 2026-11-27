from typing import Optional

from fastapi import HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.jenis_sapi import JenisSapi
from app.models.sapi import Sapi
from app.schemas.sapi import SapiBase


def resolve_jenis_id(db: Session, id_jenis: Optional[int], breed: Optional[str]) -> Optional[int]:
    """
    Utilitas untuk memvalidasi dan me-resolve ID jenis sapi baik dari ID maupun nama breed.
    """
    if id_jenis is not None:
        exists = db.query(JenisSapi).filter(JenisSapi.id_jenis == id_jenis).first()
        if not exists:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Jenis sapi dengan ID {id_jenis} tidak ditemukan."
            )
        return id_jenis

    if breed and breed.strip():
        cleaned_breed = breed.strip()
        match = db.query(JenisSapi).filter(JenisSapi.nama_jenis.ilike(f"%{cleaned_breed}%")).first()
        if match:
            return match.id_jenis

    return None


def prepare_sapi(db: Session, user_id: int, profile: SapiBase) -> Sapi:
    tag = profile.ear_tag.strip()
    if not tag:
        raise HTTPException(422, "Ear tag wajib diisi.")
    duplicate = db.query(Sapi.id_sapi).filter(
        Sapi.id_user == user_id,
        func.lower(Sapi.ear_tag) == tag.lower(),
        Sapi.tanggal_keluar.is_(None)
    ).first()
    if duplicate:
        raise HTTPException(400, f"Ear tag '{tag}' sudah terdaftar pada peternakan Anda.")
    return Sapi(
        id_user=user_id, ear_tag=tag, id_jenis=resolve_jenis_id(db, profile.id_jenis, profile.breed),
        jenis_kelamin=profile.jenis_kelamin, umur_bulan=profile.umur_bulan,
        tanggal_masuk=profile.tanggal_masuk, tanggal_keluar=profile.tanggal_keluar,
    )
