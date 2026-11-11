from datetime import date, datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field


# --- PBH Info Schema ---
class PBHInfo(BaseModel):
    pbh_kg_hari: float = Field(..., description="Perkembangan Bobot Harian (kg/hari)")
    selang_hari: int = Field(..., description="Selisih hari antar pengukuran")
    selisih_bobot_kg: Optional[float] = Field(None, description="Kenaikan/penurunan bobot total (kg)")
    status: str = Field(..., description="Status pertumbuhan: NORMAL / POSITIF / PERINGATAN_PENURUNAN")
    pesan: Optional[str] = Field(None, description="Catatan atau saran evaluasi peternak")


# --- Pengukuran Schemas ---
class PengukuranBase(BaseModel):
    id_sapi: int
    bobot: float
    tanggal_ukur: date
    path_foto_samping: str
    path_foto_belakang: str


class PengukuranResponse(BaseModel):
    id_pengukuran: int
    id_sapi: int
    bobot: float
    tanggal_ukur: date
    path_foto_samping: str
    path_foto_belakang: str
    created_at: datetime
    pbh_info: Optional[PBHInfo] = None

    model_config = ConfigDict(from_attributes=True)


# --- Prediction API Responses ---
class PredictResponseData(BaseModel):
    id_pengukuran: int
    id_sapi: int
    bobot_estimasi_kg: float
    tanggal_ukur: date
    foto_samping_url: str
    foto_belakang_url: str
    pbh_info: Optional[PBHInfo] = None


class PredictResponse(BaseModel):
    status: str = "success"
    message: str = "Estimasi bobot berhasil diproses"
    data: PredictResponseData


# --- Standalone PBH Calculator Schemas ---
class KalkulatorPBHRequest(BaseModel):
    bobot_awal: float = Field(..., gt=0, examples=[250.0], description="Bobot awal ternak (kg)")
    bobot_akhir: float = Field(..., gt=0, examples=[272.5], description="Bobot akhir ternak (kg)")
    jumlah_hari: int = Field(..., gt=0, examples=[25], description="Jumlah selang hari pemeliharaan")


class KalkulatorPBHResponse(BaseModel):
    pbh_kg_hari: float = Field(..., description="Pertambahan bobot rata-rata per hari")
    jumlah_hari: int = Field(..., description="Selang hari antar pengukuran")
    selisih_bobot_kg: Optional[float] = None
    status: str = Field(..., description="NORMAL / POSITIF / PERINGATAN_PENURUNAN")
    pesan: str = Field(..., description="Rekomendasi tindakan peternak")
