from datetime import date, datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, Field


# --- Master Jenis Sapi Schemas ---
class JenisSapiBase(BaseModel):
    nama_jenis: str = Field(..., max_length=50, examples=["Simental"])


class JenisSapiCreate(JenisSapiBase):
    pass


class JenisSapiResponse(JenisSapiBase):
    id_jenis: int

    model_config = ConfigDict(from_attributes=True)


# --- Sapi Schemas ---
class SapiBase(BaseModel):
    ear_tag: str = Field(..., max_length=50, examples=["ST-001"])
    id_jenis: Optional[int] = Field(None, examples=[1])
    jenis_kelamin: str = Field(..., examples=["Jantan"], description="Jantan atau Betina")
    umur_bulan: int = Field(..., ge=1, le=240, examples=[18], description="Umur dalam satuan bulan")
    tanggal_masuk: date = Field(..., examples=["2026-11-01"])
    tanggal_keluar: Optional[date] = Field(None, examples=[None])


class SapiCreate(SapiBase):
    pass


class SapiUpdate(BaseModel):
    ear_tag: Optional[str] = Field(None, max_length=50)
    id_jenis: Optional[int] = None
    jenis_kelamin: Optional[str] = None
    umur_bulan: Optional[int] = Field(None, ge=1, le=240)
    tanggal_masuk: Optional[date] = None
    tanggal_keluar: Optional[date] = None


class SapiResponse(SapiBase):
    id_sapi: int
    id_user: int
    created_at: datetime
    jenis: Optional[JenisSapiResponse] = None

    model_config = ConfigDict(from_attributes=True)


class SapiDetailResponse(SapiResponse):
    bobot_terakhir: Optional[float] = None
    tanggal_ukur_terakhir: Optional[date] = None
    total_pengukuran: int = 0

    model_config = ConfigDict(from_attributes=True)
