import asyncio
import logging
import random
from fastapi import HTTPException, UploadFile, status

from app.core.config import settings

logger = logging.getLogger(__name__)


class CattleVisionService:
    """
    Abstraksi Layanan AI Engine Computer Vision.
    Mendukung decoupling penuh antara tim backend dan tim model AI.
    
    Mode Mock (USE_MOCK_AI = True):
    - Mensimulasikan latensi inferensi citra (0.5 - 0.8 detik).
    - Menghitung estimasi bobot realistis berdasarkan umur dan jenis kelamin (60 - 450 kg).
    
    Mode Produksi (USE_MOCK_AI = False):
    - Siap dihubungkan ke ONNX Runtime / PyTorch wrapper dari tim ai_engine.
    """

    @staticmethod
    async def predict_weight(
        foto_samping: UploadFile,
        foto_belakang: UploadFile,
        umur_bulan: int,
        jenis_kelamin: str
    ) -> float:
        if settings.USE_MOCK_AI:
            logger.info(
                "Menjalankan Mock AI Inference: sapi umur=%d bulan, gender=%s",
                umur_bulan,
                jenis_kelamin
            )
            # Simulasi latensi pemrosesan pipeline computer vision (0.5 - 0.8 detik)
            latency = random.uniform(0.5, 0.8)
            await asyncio.sleep(latency)

            # Hitung estimasi berbasis umur dan jenis kelamin ternak
            faktor_gender = 1.1 if jenis_kelamin.lower() == "jantan" else 1.0
            base_weight = (120.0 + (umur_bulan * 6.5)) * faktor_gender
            noise = random.uniform(-10.0, 10.0)

            # Batasi dalam rentang operasional valid (60.0 - 450.0 kg)
            simulated_weight = round(min(max(base_weight + noise, 60.0), 450.0), 2)
            logger.info("Mock AI Inference selesai: estimasi bobot = %.2f kg", simulated_weight)
            return simulated_weight

        # Integrasi nyata saat artifak model dari /ai_engine telah tersedia
        raise NotImplementedError(
            "Real AI Engine model weights (YOLOv5 + CNN ONNX) belum dihubungkan ke server."
        )
