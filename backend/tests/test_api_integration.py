import io
import pytest
from datetime import date, timedelta
from fastapi.testclient import TestClient

from app.models.jenis_sapi import JenisSapi
from app.models.pengukuran import Pengukuran
from app.models.sapi import Sapi
from app.models.user import User
from tests.conftest import client, TestingSessionLocal, make_dummy_image
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

    # Buat dummy images valid
    lateral_bytes = make_dummy_image("JPEG")
    posterior_bytes = make_dummy_image("PNG")

    files = {
        "foto_samping": ("lateral.jpg", io.BytesIO(lateral_bytes), "image/jpeg"),
    }

    # 1. Tahap 1: Eksekusi Preview Prediksi (tanpa menyimpan ke DB/Storage)
    pred1 = client.post("/api/v1/pengukuran/predict", files=files, headers=headers)
    assert pred1.status_code == 200
    pred1_json = pred1.json()
    assert pred1_json["status"] == "success"
    assert pred1_json["data"]["estimated_weight_kg"] == 222.75
    assert pred1_json["data"]["bobot"] == 222.75
    # Pastikan belum ada berkas di storage
    assert len(list(photo_prediction.iterdir())) == 0

    # 2. Tahap 2: Simpan Pengukuran Permanen (setelah selang 14 hari dari bobot awal)
    files_save = {
        "foto": ("lateral.jpg", io.BytesIO(lateral_bytes), "image/jpeg"),
    }
    save1 = client.post("/api/v1/pengukuran/save", data={"id_sapi": id_sapi, "bobot": 222.75}, files=files_save, headers=headers)
    assert save1.status_code == 201
    save1_json = save1.json()
    assert save1_json["status"] == "success"
    assert save1_json["data"]["id_sapi"] == id_sapi
    assert save1_json["data"]["bobot"] == 222.75
    assert save1_json["data"]["path_foto_samping"].endswith(".webp")
    assert save1_json["data"]["foto_url"] is not None
    assert save1_json["data"]["pbh_info"] is not None
    assert save1_json["data"]["pbh_info"]["selang_hari"] == 14
    assert len(list(photo_prediction.iterdir())) == 1

    # Simulasikan pembaruan tanggal ukur pengukuran terakhir di DB agar saat pengukuran kedua selang hari terhitung
    with TestingSessionLocal() as db:
        last_m = db.query(Pengukuran).filter(Pengukuran.id_sapi == id_sapi).order_by(Pengukuran.id_pengukuran.desc()).first()
        last_m.tanggal_ukur = date.today() - timedelta(days=14)
        last_m.bobot = 250.00
        db.commit()

    # 3. Eksekusi Pengukuran Kedua (Two-step flow: save langsung dengan foto baru)
    files2 = {
        "foto": ("posterior2.png", io.BytesIO(posterior_bytes), "image/png"),
    }
    save2 = client.post("/api/v1/pengukuran/save", data={"id_sapi": id_sapi, "bobot": 265.0}, files=files2, headers=headers)
    assert save2.status_code == 201
    save2_json = save2.json()
    assert save2_json["data"]["bobot"] == 265.0
    assert save2_json["data"]["pbh_info"] is not None
    assert save2_json["data"]["pbh_info"]["selang_hari"] == 14
    assert "status" in save2_json["data"]["pbh_info"]

    # 4. Ambil riwayat analitik baru via /history/{id_sapi}
    history_res = client.get(f"/api/v1/pengukuran/history/{id_sapi}", headers=headers)
    assert history_res.status_code == 200
    hist_json = history_res.json()
    assert hist_json["summary"]["bobot_awal"] == 210.0
    assert hist_json["summary"]["bobot_terkini"] == 265.0
    assert hist_json["summary"]["total_pertambahan_kg"] == 55.0
    assert len(hist_json["history"]) == 3


def test_new_photo_measurement_is_atomic_and_visible(photo_prediction, monkeypatch):
    from fastapi import HTTPException
    from app.api.v1 import pengukuran
    from tests.test_sapi_crud import register_and_login

    headers = register_and_login("foto_baru")
    data = {"ear_tag": "FOTO-1", "id_jenis": 1, "jenis_kelamin": "Betina", "umur_bulan": 18, "bobot": 222.75}
    rear = ("rear.png", make_dummy_image("PNG"), "image/png")
    files = {"foto": rear}
    url_predict = "/api/v1/pengukuran/predict"
    url_save = "/api/v1/pengukuran/save"

    # Validasi reject non-cattle pada predict
    with monkeypatch.context() as patch:
        async def reject(**kwargs):
            raise HTTPException(422, "Foto bukan sapi.")
        patch.setattr(CattleVisionService, "predict_weight", reject)
        assert client.post(url_predict, files=files, headers=headers).status_code == 422

    # Validasi failure saat upload S3
    with monkeypatch.context() as patch:
        async def fail_upload(*args, **kwargs):
            raise HTTPException(503, "Foto gagal disimpan.")
        patch.setattr(pengukuran, "upload_bytes_to_neon", fail_upload)
        assert client.post(url_save, data=data, files=files, headers=headers).status_code == 503

    assert client.get("/api/v1/sapi/", headers=headers).json() == []

    # Eksekusi save dengan onboarding sapi baru
    response = client.post(url_save, data=data, files=files, headers=headers)
    assert response.status_code == 201, response.text
    result = response.json()["data"]
    cattle, = client.get("/api/v1/sapi/", headers=headers).json()
    assert cattle["id_sapi"] == result["id_sapi"]
    assert cattle["ear_tag"] == "FOTO-1"
    assert cattle["bobot_terakhir"] == result["bobot"] == 222.75
    assert cattle["total_pengukuran"] == 1

    # Mencegah duplikasi ear tag
    assert client.post(url_save, data=data, files=files, headers=headers).status_code == 400


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
