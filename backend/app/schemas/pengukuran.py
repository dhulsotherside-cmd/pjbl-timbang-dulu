from datetime import date, datetime
from typing import List, Optional
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
    path_foto_samping: Optional[str] = None
    path_foto_belakang: Optional[str] = None


class PengukuranResponse(BaseModel):
    id_pengukuran: int
    id_sapi: int
    bobot: float
    tanggal_ukur: date
    path_foto_samping: Optional[str] = None
    path_foto_belakang: Optional[str] = None
    created_at: datetime
    pbh_info: Optional[PBHInfo] = None

    model_config = ConfigDict(from_attributes=True)


# --- Prediction API Responses ---
class PredictPreviewData(BaseModel):
    estimated_weight_kg: float = Field(..., description="Estimasi bobot hasil model AI (kg)")
    bobot: float = Field(..., description="Alias bobot hasil estimasi (kg)")
    confidence: Optional[str] = Field("Tinggi", description="Tingkat keyakinan model")
    status: str = Field("VALID", description="Status validasi foto sapi")


class PredictPreviewResponse(BaseModel):
    status: str = "success"
    message: str = "Estimasi bobot berhasil diproses"
    data: PredictPreviewData


class MeasurementSaveData(BaseModel):
    id_pengukuran: int
    id_sapi: int
    bobot: float
    tanggal_ukur: date
    path_foto_samping: Optional[str] = None
    foto_url: Optional[str] = None
    pbh_info: Optional[PBHInfo] = None


class MeasurementSaveResponse(BaseModel):
    status: str = "success"
    message: str = "Data pengukuran berhasil disimpan permanen"
    data: MeasurementSaveData


class PredictResponseData(BaseModel):
    id_pengukuran: int
    id_sapi: int
    bobot_estimasi_kg: float
    tanggal_ukur: date
    foto_samping_url: Optional[str] = None
    foto_belakang_url: Optional[str] = None
    pbh_info: Optional[PBHInfo] = None


class PredictResponse(BaseModel):
    status: str = "success"
    message: str = "Estimasi bobot berhasil diproses"
    data: PredictResponseData


# --- History & Analytics Schemas ---
class CattleHistorySummary(BaseModel):
    id_sapi: int
    ear_tag: str
    bobot_awal: Optional[float] = None
    bobot_terkini: Optional[float] = None
    total_pertambahan_kg: Optional[float] = None
    rata_rata_pbh: Optional[float] = None
    is_weight_loss: bool = False
    total_pengukuran: int = 0


class CattleHistoryItem(BaseModel):
    id_pengukuran: int
    id_sapi: int
    bobot: float
    tanggal_ukur: date
    selisih_hari: Optional[int] = None
    pbh_kg_hari: Optional[float] = None
    status: Optional[str] = None
    path_foto_samping: Optional[str] = None
    foto_url: Optional[str] = None


class CattleHistoryResponse(BaseModel):
    status: str = "success"
    summary: CattleHistorySummary
    history: List[CattleHistoryItem]


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
