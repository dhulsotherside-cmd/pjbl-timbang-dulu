import io
import pytest
from datetime import date, timedelta
from fastapi.testclient import TestClient

from app.models.jenis_sapi import JenisSapi
from app.models.pengukuran import Pengukuran
from app.models.sapi import Sapi
from app.models.user import User
from tests.conftest import client, TestingSessionLocal
from app.services.ai_inference import CattleVisionService
from app.services import neon_storage


def test_auth_and_user_flow():
    # 1. Registrasi Akun Peternak 1
    reg_payload = {
        "username": "peternak_makmur",
        "password": "PasswordAman123!",
        "nama_user": "Budi Santoso",
        "nama_peternakan": "Makmur Farm",
        "alamat": "Jl. Raya Bogor KM 30",
        "no_telp": "081234567890"
    }
    res = client.post("/api/v1/auth/register", json=reg_payload)
    assert res.status_code == 201
    data = res.json()
    assert data["status"] == "success"
    assert data["data"]["username"] == "peternak_makmur"
    assert data["data"]["nama_peternakan"] == "Makmur Farm"

    # 2. Coba registrasi ulang dengan username yang sama (harus 400 Bad Request)
    dup_res = client.post("/api/v1/auth/register", json=reg_payload)
    assert dup_res.status_code == 400
    assert "sudah digunakan" in dup_res.json()["detail"]

    # 3. Login sukses
    login_res = client.post("/api/v1/auth/login", json={
        "username": "peternak_makmur",
        "password": "PasswordAman123!"
    })
    assert login_res.status_code == 200
    token_data = login_res.json()
    assert "access_token" in token_data
    token = token_data["access_token"]
    assert token_data["user"]["username"] == "peternak_makmur"

    # 4. Login dengan password salah (harus 401 Unauthorized)
    wrong_login = client.post("/api/v1/auth/login", json={
        "username": "peternak_makmur",
        "password": "PasswordSalah"
    })
    assert wrong_login.status_code == 401

    # 5. Akses /auth/me menggunakan Bearer token
    headers = {"Authorization": f"Bearer {token}"}
    me_res = client.get("/api/v1/auth/me", headers=headers)
    assert me_res.status_code == 200
    assert me_res.json()["username"] == "peternak_makmur"


def test_sapi_multi_tenancy_and_crud():
    # Buat User 1
    client.post("/api/v1/auth/register", json={
        "username": "user1",
        "password": "Password123!",
        "nama_user": "User Satu",
        "nama_peternakan": "Farm 1"
    })
    token1 = client.post("/api/v1/auth/login", json={"username": "user1", "password": "Password123!"}).json()["access_token"]
    headers1 = {"Authorization": f"Bearer {token1}"}

    # Buat User 2
    client.post("/api/v1/auth/register", json={
        "username": "user2",
        "password": "Password123!",
        "nama_user": "User Dua",
        "nama_peternakan": "Farm 2"
    })
    token2 = client.post("/api/v1/auth/login", json={"username": "user2", "password": "Password123!"}).json()["access_token"]
    headers2 = {"Authorization": f"Bearer {token2}"}

    # Ambil master jenis
    jenis_res = client.get("/api/v1/sapi/jenis")
    assert jenis_res.status_code == 200
    jenis_id = jenis_res.json()[0]["id_jenis"]

    # 1. User 1 menambahkan sapi 'ST-001'
    sapi_payload = {
        "ear_tag": "ST-001",
        "id_jenis": jenis_id,
        "jenis_kelamin": "Jantan",
        "umur_bulan": 18,
        "tanggal_masuk": "2026-11-01",
        "bobot_awal": 250.0
    }
    sapi1_res = client.post("/api/v1/sapi/", json=sapi_payload, headers=headers1)
    assert sapi1_res.status_code == 201
    sapi1_data = sapi1_res.json()
    id_sapi1 = sapi1_data["id_sapi"]

    # 2. User 1 coba tambah lagi ear_tag 'ST-001' (harus gagal 400)
    dup_sapi = client.post("/api/v1/sapi/", json=sapi_payload, headers=headers1)
    assert dup_sapi.status_code == 400
    assert "sudah terdaftar" in dup_sapi.json()["detail"]

    # 3. User 2 menambahkan sapi dengan ear_tag yang sama 'ST-001' (harus berhasil karena beda user)
    sapi2_res = client.post("/api/v1/sapi/", json=sapi_payload, headers=headers2)
    assert sapi2_res.status_code == 201
    id_sapi2 = sapi2_res.json()["id_sapi"]

    # 4. User 1 melihat daftar sapinya (hanya boleh melihat 1 sapi miliknya)
    list1 = client.get("/api/v1/sapi/", headers=headers1).json()
    assert len(list1) == 1
    assert list1[0]["id_sapi"] == id_sapi1

    # 5. User 2 TIDAK BISA mengakses detail sapi milik User 1 (harus 404)
    forbidden_get = client.get(f"/api/v1/sapi/{id_sapi1}", headers=headers2)
    assert forbidden_get.status_code == 404

    # 6. User 1 mengakses detail sapinya
    detail1 = client.get(f"/api/v1/sapi/{id_sapi1}", headers=headers1)
    assert detail1.status_code == 200
    assert detail1.json()["ear_tag"] == "ST-001"


@pytest.fixture
def photo_prediction(monkeypatch):
    class StorageTracker:
        def __init__(self):
            self.uploaded = {}

        def iterdir(self):
            return list(self.uploaded.keys())

    tracker = StorageTracker()

    class MockS3Client:
        def put_object(self, Bucket, Key, Body, ContentType=None):
            tracker.uploaded[Key] = Body
            return {"ResponseMetadata": {"HTTPStatusCode": 200}}

        def delete_object(self, Bucket, Key):
            tracker.uploaded.pop(Key, None)
            return {"ResponseMetadata": {"HTTPStatusCode": 204}}

    mock_client = MockS3Client()

    async def predict(**kwargs):
        return 222.75

    monkeypatch.setattr(CattleVisionService, "predict_weight", predict)
    monkeypatch.setattr(neon_storage, "get_neon_s3_client", lambda: mock_client)
    monkeypatch.setattr(neon_storage, "validate_storage_config", lambda: None)
    return tracker


def test_pengukuran_prediction_and_pbh(photo_prediction):
    # Setup user & sapi
    client.post("/api/v1/auth/register", json={
        "username": "peternak_vision",
        "password": "Password123!",
        "nama_user": "Vision User"
    })
    token = client.post("/api/v1/auth/login", json={"username": "peternak_vision", "password": "Password123!"}).json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    sapi_res = client.post("/api/v1/sapi/", json={
        "ear_tag": "BEEF-99",
        "jenis_kelamin": "Jantan",
        "umur_bulan": 15,
        "tanggal_masuk": str(date.today() - timedelta(days=14)),
        "bobot_awal": 210.0
    }, headers=headers)
    id_sapi = sapi_res.json()["id_sapi"]

    # Buat dummy images
    lateral_bytes = b"fake lateral jpg image content"
    posterior_bytes = b"fake posterior png image content"

    files = {
        "foto_samping": ("lateral.jpg", io.BytesIO(lateral_bytes), "image/jpeg"),
    }
    data = {"id_sapi": id_sapi}

    # 1. Eksekusi Prediksi Pertama (setelah selang 14 hari dari pendaftaran bobot awal)
    pred1 = client.post("/api/v1/pengukuran/predict", data=data, files=files, headers=headers)
    assert pred1.status_code == 201
    pred1_json = pred1.json()
    assert pred1_json["status"] == "success"
    assert pred1_json["data"]["id_sapi"] == id_sapi
    assert pred1_json["data"]["bobot_estimasi_kg"] == 222.75
    assert pred1_json["data"]["foto_samping_url"]
    assert pred1_json["data"]["foto_belakang_url"] is None
    # Sapi telah memiliki rekor bobot awal 14 hari lalu, sehingga PBH terhitung
    assert pred1_json["data"]["pbh_info"] is not None
    assert pred1_json["data"]["pbh_info"]["selang_hari"] == 14

    # Simulasikan pembaruan tanggal ukur pengukuran terakhir di DB agar saat pengukuran kedua selang hari terhitung
    with TestingSessionLocal() as db:
        last_m = db.query(Pengukuran).filter(Pengukuran.id_sapi == id_sapi).order_by(Pengukuran.id_pengukuran.desc()).first()
        last_m.tanggal_ukur = date.today() - timedelta(days=14)
        last_m.bobot = 250.00
        db.commit()

    # 2. Eksekusi Prediksi Kedua (setelah ada selang hari historis)
    files2 = {
        "foto_belakang": ("posterior2.png", io.BytesIO(posterior_bytes), "image/png"),
    }
    pred2 = client.post("/api/v1/pengukuran/predict", data=data, files=files2, headers=headers)
    assert pred2.status_code == 201
    pred2_json = pred2.json()
    assert pred2_json["data"]["foto_samping_url"] is None
    assert pred2_json["data"]["foto_belakang_url"]
    assert pred2_json["data"]["pbh_info"] is not None
    assert pred2_json["data"]["pbh_info"]["selang_hari"] == 14
    assert "status" in pred2_json["data"]["pbh_info"]

    # 3. Ambil riwayat pengukuran sapi (total 3: bobot awal + pred1 + pred2)
    riwayat = client.get(f"/api/v1/pengukuran/sapi/{id_sapi}", headers=headers)
    assert riwayat.status_code == 200
    riwayat_list = riwayat.json()
    assert len(riwayat_list) == 3


def test_new_photo_measurement_is_atomic_and_visible(photo_prediction, monkeypatch):
    from fastapi import HTTPException
    from app.api.v1 import pengukuran
    from tests.test_sapi_crud import register_and_login

    headers = register_and_login("foto_baru")
    data = {"ear_tag": "FOTO-1", "id_jenis": 1, "jenis_kelamin": "Betina", "umur_bulan": 18}
    rear = ("rear.png", b"rear", "image/png")
    files = {"foto_belakang": rear}
    url = "/api/v1/pengukuran/predict"
    for invalid in ({}, {"foto_samping": rear, **files}, {"foto_depan": rear, **files},
                    [("foto_belakang", rear), ("foto_belakang", rear)]):
        assert client.post(url, data=data, files=invalid, headers=headers).status_code == 422
    with monkeypatch.context() as patch:
        async def reject(**kwargs):
            raise HTTPException(422, "Foto belakang bukan sapi.")
        patch.setattr(CattleVisionService, "predict_weight", reject)
        assert client.post(url, data=data, files=files, headers=headers).status_code == 422
    with monkeypatch.context() as patch:
        async def fail_rear(photo, *args, **kwargs):
            raise HTTPException(503, "Foto gagal disimpan.")
        patch.setattr(pengukuran, "upload_image_to_neon", fail_rear)
        assert client.post(url, data=data, files=files, headers=headers).status_code == 503
    assert client.get("/api/v1/sapi/", headers=headers).json() == []
    assert list(photo_prediction.iterdir()) == []

    response = client.post(url, data=data, files=files, headers=headers)
    assert response.status_code == 201, response.text
    result = response.json()["data"]
    cattle, = client.get("/api/v1/sapi/", headers=headers).json()
    assert cattle["id_sapi"] == result["id_sapi"]
    assert cattle["ear_tag"] == "FOTO-1"
    assert cattle["bobot_terakhir"] == result["bobot_estimasi_kg"] == 222.75
    assert cattle["total_pengukuran"] == 1
    assert len(list(photo_prediction.iterdir())) == 1
    assert client.post(url, data=data, files=files, headers=headers).status_code == 400
    assert len(list(photo_prediction.iterdir())) == 1


def test_custom_pbh_calculator_endpoint():
    res = client.post("/api/v1/pengukuran/kalkulator-pbh", json={
        "bobot_awal": 250.0,
        "bobot_akhir": 272.5,
        "jumlah_hari": 25
    })
    assert res.status_code == 200
    data = res.json()
    assert data["pbh_kg_hari"] == 0.90
    assert data["jumlah_hari"] == 25
    assert data["status"] == "NORMAL"
