import io
import pytest
from datetime import date, timedelta
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.api.deps import get_db
from app.db.base import Base
from app.main import app
from app.models.jenis_sapi import JenisSapi
from app.models.pengukuran import Pengukuran
from app.models.sapi import Sapi
from app.models.user import User

# Gunakan database in-memory SQLite khusus untuk pengujian terisolasi
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db

client = TestClient(app)


@pytest.fixture(autouse=True)
def setup_and_teardown_db():
    Base.metadata.create_all(bind=engine)
    # Seed jenis sapi
    with TestingSessionLocal() as db:
        jenis_list = ["Simental", "Limousin", "Brahman", "PO", "Bali"]
        for j in jenis_list:
            db.add(JenisSapi(nama_jenis=j))
        db.commit()
    yield
    Base.metadata.drop_all(bind=engine)


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
        "tanggal_masuk": "2026-11-01"
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


def test_pengukuran_prediction_and_pbh():
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
        "tanggal_masuk": "2026-10-01"
    }, headers=headers)
    id_sapi = sapi_res.json()["id_sapi"]

    # Buat dummy images
    lateral_bytes = b"fake lateral jpg image content"
    posterior_bytes = b"fake posterior png image content"

    files = {
        "foto_samping": ("lateral.jpg", io.BytesIO(lateral_bytes), "image/jpeg"),
        "foto_belakang": ("posterior.png", io.BytesIO(posterior_bytes), "image/png"),
    }
    data = {"id_sapi": id_sapi}

    # 1. Eksekusi Prediksi Pertama
    pred1 = client.post("/api/v1/pengukuran/predict", data=data, files=files, headers=headers)
    assert pred1.status_code == 201
    pred1_json = pred1.json()
    assert pred1_json["status"] == "success"
    assert pred1_json["data"]["id_sapi"] == id_sapi
    assert 60.0 <= pred1_json["data"]["bobot_estimasi_kg"] <= 450.0
    assert pred1_json["data"]["foto_samping_url"] != ""
    assert pred1_json["data"]["foto_belakang_url"] != ""
    # Pengukuran pertama belum memiliki data historis sebelumnya
    assert pred1_json["data"]["pbh_info"] is None

    # Simulasikan pengukuran 14 hari yang lalu di DB agar saat pengukuran hari ini PBH terhitung
    with TestingSessionLocal() as db:
        old_record = db.query(Pengukuran).filter(Pengukuran.id_sapi == id_sapi).first()
        old_record.tanggal_ukur = date.today() - timedelta(days=14)
        old_record.bobot = 250.00
        db.commit()

    # 2. Eksekusi Prediksi Kedua (setelah ada selang hari historis)
    files2 = {
        "foto_samping": ("lateral2.jpg", io.BytesIO(lateral_bytes), "image/jpeg"),
        "foto_belakang": ("posterior2.png", io.BytesIO(posterior_bytes), "image/png"),
    }
    pred2 = client.post("/api/v1/pengukuran/predict", data=data, files=files2, headers=headers)
    assert pred2.status_code == 201
    pred2_json = pred2.json()
    assert pred2_json["data"]["pbh_info"] is not None
    assert pred2_json["data"]["pbh_info"]["selang_hari"] == 14
    assert "status" in pred2_json["data"]["pbh_info"]

    # 3. Ambil riwayat pengukuran sapi
    riwayat = client.get(f"/api/v1/pengukuran/sapi/{id_sapi}", headers=headers)
    assert riwayat.status_code == 200
    riwayat_list = riwayat.json()
    assert len(riwayat_list) == 2


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
