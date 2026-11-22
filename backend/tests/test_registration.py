import pytest
from app.core.security import verify_password
from app.models.user import User
from tests.conftest import client, TestingSessionLocal


def test_registration_success_and_db_verification():
    """
    Kasus Sukses: Mendaftarkan user baru, memverifikasi status 201 Created,
    memastikan data tersimpan di database dengan password berupa bcrypt hash
    dan response tidak membocorkan password_hash.
    """
    payload = {
        "username": "peternak_sukses",
        "password": "PasswordKuat123!",
        "nama_user": "Ahmad Subagyo",
        "nama_peternakan": "Subagyo Farm",
        "alamat": "Jl. Peternakan Sejahtera No. 5",
        "no_telp": "081298765432"
    }

    res = client.post("/api/v1/auth/register", json=payload)
    assert res.status_code == 201
    res_data = res.json()

    assert res_data["status"] == "success"
    assert res_data["message"] == "Pendaftaran berhasil"
    data = res_data["data"]
    assert data["username"] == "peternak_sukses"
    assert data["nama_user"] == "Ahmad Subagyo"
    assert data["nama_peternakan"] == "Subagyo Farm"
    assert data["alamat"] == "Jl. Peternakan Sejahtera No. 5"
    assert data["no_telp"] == "081298765432"
    assert "password_hash" not in data
    assert "password" not in data

    # Verifikasi langsung ke database
    with TestingSessionLocal() as db:
        user_in_db = db.query(User).filter(User.username == "peternak_sukses").first()
        assert user_in_db is not None
        assert user_in_db.nama_user == "Ahmad Subagyo"
        assert user_in_db.password_hash != "PasswordKuat123!"
        assert user_in_db.password_hash.startswith("$2")
        assert verify_password("PasswordKuat123!", user_in_db.password_hash) is True


def test_registration_duplicate_username_rejected():
    """
    Kasus Duplikasi: Mendaftar ulang dengan username yang sama,
    memastikan sistem menolak dengan status 400 Bad Request.
    """
    payload = {
        "username": "peternak_kembar",
        "password": "Password123!",
        "nama_user": "Peternak Pertama",
        "nama_peternakan": "Farm Pertama"
    }

    first_res = client.post("/api/v1/auth/register", json=payload)
    assert first_res.status_code == 201

    duplicate_res = client.post("/api/v1/auth/register", json=payload)
    assert duplicate_res.status_code == 400
    detail = duplicate_res.json()["detail"]
    assert "sudah digunakan" in detail or "sudah terdaftar" in detail


def test_registration_frontend_email_fallback():
    """
    Kasus Frontend Payload: Mengirim form dengan field 'email' (seperti dari input form frontend)
    terpetakan dengan tepat menjadi username.
    """
    payload = {
        "email": "peternak.modern@example.com",
        "password": "PasswordModern123!",
        "nama_user": "Siti Rahma",
        "nama_peternakan": "Rahma Dairy Farm"
    }

    res = client.post("/api/v1/auth/register", json=payload)
    assert res.status_code == 201
    assert res.json()["data"]["username"] == "peternak.modern@example.com"


def test_registered_user_immediate_login():
    """
    Kasus Kompatibilitas Login: Akun yang baru saja didaftarkan
    langsung dapat digunakan untuk login dan menghasilkan JWT token.
    """
    reg_payload = {
        "username": "user_langsung_login",
        "password": "PasswordValid123!",
        "nama_user": "Rudi Hartono",
        "nama_peternakan": "Hartono Cattle"
    }

    reg_res = client.post("/api/v1/auth/register", json=reg_payload)
    assert reg_res.status_code == 201

    # Login dengan kredensial yang didaftarkan
    login_res = client.post("/api/v1/auth/login", json={
        "username": "user_langsung_login",
        "password": "PasswordValid123!"
    })
    assert login_res.status_code == 200
    login_data = login_res.json()

    assert "access_token" in login_data
    assert login_data["token_type"] == "bearer"
    assert login_data["user"]["username"] == "user_langsung_login"
    assert login_data["user"]["nama_user"] == "Rudi Hartono"

    # Verifikasi token dapat mengakses /api/v1/auth/me
    token = login_data["access_token"]
    me_res = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me_res.status_code == 200
    assert me_res.json()["username"] == "user_langsung_login"


def test_registration_password_length_validation():
    """
    Validasi Pydantic: Password di bawah 6 karakter harus ditolak (422 Unprocessable Entity).
    """
    payload = {
        "username": "user_pendek",
        "password": "123",
        "nama_user": "User Pendek",
        "nama_peternakan": "Farm Pendek"
    }

    res = client.post("/api/v1/auth/register", json=payload)
    assert res.status_code == 422
