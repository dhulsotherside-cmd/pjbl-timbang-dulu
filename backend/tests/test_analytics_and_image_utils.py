import io
from datetime import date, timedelta
from PIL import Image
import pytest

from tests.conftest import client, TestingSessionLocal
from app.models.pengukuran import Pengukuran
from app.services.image_utils import compress_to_webp
from tests.test_sapi_crud import register_and_login


def test_compress_to_webp_resizes_and_optimizes():
    # Buat gambar dummy ukuran besar (2000 x 1500 px)
    large_image = Image.new("RGB", (2000, 1500), color=(120, 80, 40))
    buffer = io.BytesIO()
    large_image.save(buffer, format="JPEG", quality=95)
    raw_bytes = buffer.getvalue()

    compressed = compress_to_webp(raw_bytes, max_size=1280, quality=80)
    assert len(compressed) > 0
    assert len(compressed) < len(raw_bytes)

    # Validasi format hasil kompresi adalah WebP dan dimensinya <= 1280
    with Image.open(io.BytesIO(compressed)) as res_img:
        assert res_img.format == "WEBP"
        w, h = res_img.size
        assert max(w, h) <= 1280
        # Aspect ratio 2000:1500 = 4:3 -> 1280 x 960
        assert w == 1280
        assert h == 960


def test_history_analytics_single_measurement_and_zero_day_guardrail(photo_prediction):
    headers = register_and_login("peternak_analytics")

    # 1. Daftarkan sapi baru dengan bobot awal 200 kg
    res_sapi = client.post("/api/v1/sapi/", json={
        "ear_tag": "ANALYTICS-01",
        "jenis_kelamin": "Jantan",
        "umur_bulan": 12,
        "bobot_awal": 200.0,
        "tanggal_masuk": str(date.today() - timedelta(days=20)),
    }, headers=headers)
    assert res_sapi.status_code == 201
    id_sapi = res_sapi.json()["id_sapi"]

    # Test edge case: Hanya ada 1 pengukuran (bobot awal saat pendaftaran)
    hist1 = client.get(f"/api/v1/pengukuran/history/{id_sapi}", headers=headers)
    assert hist1.status_code == 200
    data1 = hist1.json()
    summary1 = data1["summary"]
    assert summary1["id_sapi"] == id_sapi
    assert summary1["bobot_awal"] == 200.0
    assert summary1["bobot_terkini"] == 200.0
    assert summary1["total_pertambahan_kg"] == 0.0
    # Guardrail: Hanya 1 data, rata_rata_pbh harus None (bukan division by zero)
    assert summary1["rata_rata_pbh"] is None
    assert summary1["is_weight_loss"] is False
    assert len(data1["history"]) == 1
    assert data1["history"][0]["pbh_kg_hari"] is None

    # Test edge case: Tambah pengukuran di hari yang sama (selisih_hari == 0)
    with TestingSessionLocal() as db:
        m_same_day = Pengukuran(
            id_sapi=id_sapi,
            bobot=205.0,
            tanggal_ukur=date.today() - timedelta(days=20), # tanggal sama
            path_foto_samping="sapi/1/test_dummy.webp",
        )
        db.add(m_same_day)
        db.commit()

    hist2 = client.get(f"/api/v1/pengukuran/history/{id_sapi}", headers=headers)
    assert hist2.status_code == 200
    data2 = hist2.json()
    # Pengukuran di hari yang sama tidak boleh menyebabkan ZeroDivisionError
    assert data2["summary"]["rata_rata_pbh"] is None
    # Foto key harus terkonversi menjadi foto_url (presigned URL)
    item_with_photo = next(item for item in data2["history"] if item["path_foto_samping"])
    assert item_with_photo["foto_url"] is not None
    assert "signature" in item_with_photo["foto_url"] or "http" in item_with_photo["foto_url"]


def test_history_analytics_weight_loss_warning(photo_prediction):
    headers = register_and_login("peternak_weight_loss")

    # Daftarkan sapi dengan bobot awal 300 kg (30 hari lalu)
    res_sapi = client.post("/api/v1/sapi/", json={
        "ear_tag": "LOSS-01",
        "jenis_kelamin": "Betina",
        "umur_bulan": 24,
        "bobot_awal": 300.0,
        "tanggal_masuk": str(date.today() - timedelta(days=30)),
    }, headers=headers)
    id_sapi = res_sapi.json()["id_sapi"]

    # Simpan pengukuran kedua (hari ini) dengan bobot turun menjadi 285 kg (-15 kg dalam 30 hari)
    with TestingSessionLocal() as db:
        m2 = Pengukuran(
            id_sapi=id_sapi,
            bobot=285.0,
            tanggal_ukur=date.today(),
            path_foto_samping="sapi/loss/side.webp",
        )
        db.add(m2)
        db.commit()

    hist = client.get(f"/api/v1/pengukuran/history/{id_sapi}", headers=headers)
    assert hist.status_code == 200
    summary = hist.json()["summary"]

    assert summary["bobot_awal"] == 300.0
    assert summary["bobot_terkini"] == 285.0
    assert summary["total_pertambahan_kg"] == -15.0
    assert summary["rata_rata_pbh"] == -0.50  # -15 kg / 30 hari = -0.5 kg/hari
    assert summary["is_weight_loss"] is True

    history_items = hist.json()["history"]
    assert len(history_items) == 2
    # Pengukuran terbaru (index 0 pada descending view) mendeteksi status penurunan
    latest_item = history_items[0]
    assert latest_item["pbh_kg_hari"] == -0.50
    assert latest_item["status"] == "PERINGATAN_PENURUNAN"
