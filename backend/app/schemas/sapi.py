from datetime import date, datetime
from typing import Any, List, Optional
from pydantic import BaseModel, ConfigDict, Field, computed_field, model_validator


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
    ear_tag: str = Field(..., min_length=1, max_length=50, examples=["ST-001"])
    id_jenis: Optional[int] = Field(None, examples=[1])
    breed: Optional[str] = Field(None, examples=["Simental"], description="Nama jenis/ras sapi")
    jenis_kelamin: str = Field(..., examples=["Jantan"], description="Jantan atau Betina")
    umur_bulan: int = Field(..., ge=1, le=360, examples=[18], description="Umur dalam satuan bulan")
    tanggal_masuk: date = Field(default_factory=date.today, examples=["2026-11-23"], description="Tanggal masuk peternakan")
    tanggal_keluar: Optional[date] = Field(None, examples=[None], description="Tanggal keluar/arsip")


class SapiCreate(SapiBase):
    bobot_awal: float = Field(..., gt=0, examples=[250.0], description="Bobot awal sapi saat didaftarkan dalam kg")

    @model_validator(mode="before")
    @classmethod
    def handle_frontend_aliases(cls, values: Any) -> Any:
        if isinstance(values, dict):
            # Mapping alias Ear Tag
            if not values.get("ear_tag") and values.get("tag"):
                values["ear_tag"] = str(values["tag"]).strip()
            elif values.get("ear_tag"):
                values["ear_tag"] = str(values["ear_tag"]).strip()

            # Mapping alias Gender
            if not values.get("jenis_kelamin") and values.get("gender"):
                values["jenis_kelamin"] = str(values["gender"]).strip()

            # Mapping alias Age in Months
            if values.get("umur_bulan") is None and values.get("ageMonths") is not None:
                try:
                    values["umur_bulan"] = int(values["ageMonths"])
                except (ValueError, TypeError):
                    pass

            # Mapping alias Bobot Awal (mendukung berbagai format penamaan frontend)
            if values.get("bobot_awal") is None:
                for alias in ["bobotAwal", "bobot_awal", "bobot", "weight", "initialWeight", "initial_weight"]:
                    if values.get(alias) is not None:
                        try:
                            values["bobot_awal"] = float(values[alias])
                            break
                        except (ValueError, TypeError):
                            pass

            # Mapping alias Tanggal Masuk
            if not values.get("tanggal_masuk") and values.get("tanggalMasuk"):
                values["tanggal_masuk"] = values["tanggalMasuk"]
            elif not values.get("tanggal_masuk"):
                values["tanggal_masuk"] = date.today()
        return values


class SapiUpdate(BaseModel):
    ear_tag: Optional[str] = Field(None, min_length=1, max_length=50)
    id_jenis: Optional[int] = None
    breed: Optional[str] = None
    jenis_kelamin: Optional[str] = None
    umur_bulan: Optional[int] = Field(None, ge=1, le=360)
    tanggal_masuk: Optional[date] = None
    tanggal_keluar: Optional[date] = None
    status: Optional[str] = None  # "active" atau "archived"

    @model_validator(mode="before")
    @classmethod
    def handle_frontend_update_aliases(cls, values: Any) -> Any:
        if isinstance(values, dict):
            if not values.get("ear_tag") and values.get("tag"):
                values["ear_tag"] = str(values["tag"]).strip()
            if not values.get("jenis_kelamin") and values.get("gender"):
                values["jenis_kelamin"] = str(values["gender"]).strip()
            if values.get("umur_bulan") is None and values.get("ageMonths") is not None:
                try:
                    values["umur_bulan"] = int(values["ageMonths"])
                except (ValueError, TypeError):
                    pass
        return values


class SapiResponse(BaseModel):
    id_sapi: int
    id_user: int
    ear_tag: str
    id_jenis: Optional[int] = None
    jenis_kelamin: str
    umur_bulan: int
    tanggal_masuk: date
    tanggal_keluar: Optional[date] = None
    created_at: datetime
    jenis: Optional[JenisSapiResponse] = None
    bobot_terakhir: Optional[float] = None
    tanggal_ukur_terakhir: Optional[date] = None
    total_pengukuran: int = 0

    model_config = ConfigDict(from_attributes=True)

    @computed_field
    def status(self) -> str:
        return "archived" if self.tanggal_keluar is not None else "active"

    @computed_field
    def breed(self) -> str:
        return self.jenis.nama_jenis if self.jenis else "Tidak diketahui"

    @computed_field
    def tag(self) -> str:
        return self.ear_tag

    @computed_field
    def gender(self) -> str:
        return self.jenis_kelamin

    @computed_field
    def ageMonths(self) -> int:
        return self.umur_bulan

    @computed_field
    def latestWeight(self) -> Optional[float]:
        return self.bobot_terakhir

    @computed_field
    def lastMeasuredAt(self) -> Optional[date]:
        return self.tanggal_ukur_terakhir


class SapiDetailResponse(SapiResponse):
    pass
