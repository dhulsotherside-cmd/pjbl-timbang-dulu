import asyncio
import io
from fastapi import UploadFile
from app.services.ai_inference import CattleVisionService


def test_mock_ai_inference_range_and_latency():
    """
    Menguji bahwa CattleVisionService pada mode mock menghasilkan bobot
    dalam rentang operasional valid (60.0 - 450.0 kg).
    """
    async def run_test():
        mock_file1 = UploadFile(filename="lateral.jpg", file=io.BytesIO(b"dummy image data 1"))
        mock_file2 = UploadFile(filename="posterior.jpg", file=io.BytesIO(b"dummy image data 2"))

        # Test untuk sapi jantan umur 18 bulan
        predicted = await CattleVisionService.predict_weight(
            foto_samping=mock_file1,
            foto_belakang=mock_file2,
            umur_bulan=18,
            jenis_kelamin="Jantan"
        )

        assert isinstance(predicted, float)
        assert 60.0 <= predicted <= 450.0

        # Test untuk pedet betina umur 2 bulan
        pedet_weight = await CattleVisionService.predict_weight(
            foto_samping=mock_file1,
            foto_belakang=mock_file2,
            umur_bulan=2,
            jenis_kelamin="Betina"
        )
        assert 60.0 <= pedet_weight <= 450.0

    asyncio.run(run_test())
