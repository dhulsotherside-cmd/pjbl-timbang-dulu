"""
Skrip Verifikasi End-to-End Registrasi Pengguna pada Database Neon PostgreSQL Aktif.
Menguji secara langsung siklus registrasi -> cek DB -> duplikasi -> login -> token verifikasi.
"""
import os
import sys
import uuid

# Tambahkan direktori root backend ke sys.path
backend_root = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if backend_root not in sys.path:
    sys.path.insert(0, backend_root)

from fastapi.testclient import TestClient

from app.core.security import verify_password
from app.db.session import SessionLocal
from app.main import app
from app.models.user import User


def run_neon_registration_verification():
    print("=" * 70)
    print("MEMULAI PENGUJIAN END-TO-END REGISTRASI PADA DATABASE NEON POSTGRESQL")
    print("=" * 70)

    client = TestClient(app)
    unique_suffix = uuid.uuid4().hex[:8]
    test_username = f"peternak_neon_{unique_suffix}"
    test_password = "PasswordNeon123!"
    test_nama = f"Peternak Neon {unique_suffix}"
    test_farm = f"Neon Cattle Farm {unique_suffix}"
    test_alamat = "Jl. Jalur Sutera No. 88, Tangerang"
    test_telp = "081311223344"

    reg_payload = {
        "username": test_username,
        "password": test_password,
        "nama_user": test_nama,
        "nama_peternakan": test_farm,
        "alamat": test_alamat,
        "no_telp": test_telp,
    }

    # 1. UJI REGISTRASI SUKSES
    print(f"\n[1] Mendaftarkan user baru: '{test_username}'...")
    res = client.post("/api/v1/auth/register", json=reg_payload)
    print(f"    Status Response: {res.status_code}")
    assert res.status_code == 201, f"Registrasi gagal: {res.text}"
    body = res.json()
    print(f"    Status: {body.get('status')}")
    print(f"    Message: {body.get('message')}")
    user_data = body.get("data", {})
    created_id = user_data.get("id_user")
    print(f"    ID User Baru: {created_id}")
    print(f"    Username: {user_data.get('username')}")
    print(f"    Password hash disembunyikan: {'password_hash' not in user_data}")
    assert "password_hash" not in user_data
    assert "password" not in user_data

    # 2. VERIFIKASI KE DATABASE NEON POSTGRESQL
    print(f"\n[2] Memeriksa data tersimpan di tabel 'users' Neon PostgreSQL...")
    with SessionLocal() as db:
        user_row = db.query(User).filter(User.username == test_username).first()
        assert user_row is not None, "Data pengguna tidak ditemukan di database Neon!"
        print(f"    Record ditemukan di DB: id_user={user_row.id_user}, username='{user_row.username}'")
        print(f"    Password di DB berupa HASH: {user_row.password_hash[:20]}... (Panjang: {len(user_row.password_hash)})")
        assert user_row.password_hash != test_password, "PERINGATAN: Password tersimpan dalam bentuk plain-text!"
        assert user_row.password_hash.startswith("$2"), "Hash bukan format bcrypt!"
        assert verify_password(test_password, user_row.password_hash) is True
        print("    Verifikasi hash bcrypt berhasil cocok dengan plain text!")

    # 3. UJI VALIDASI DUPLIKASI USERNAME
    print(f"\n[3] Menguji penolakan duplikasi username '{test_username}'...")
    dup_res = client.post("/api/v1/auth/register", json=reg_payload)
    print(f"    Status Response: {dup_res.status_code}")
    assert dup_res.status_code == 400, f"Duplikasi tidak ditolak dengan 400: {dup_res.text}"
    print(f"    Detail Error: {dup_res.json().get('detail')}")

    # 4. UJI KOMPATIBILITAS LOGIN DENGAN AKUN BARU
    print(f"\n[4] Menguji proses login dengan akun baru...")
    login_res = client.post("/api/v1/auth/login", json={
        "username": test_username,
        "password": test_password,
    })
    print(f"    Status Response: {login_res.status_code}")
    assert login_res.status_code == 200, f"Login gagal: {login_res.text}"
    login_body = login_res.json()
    token = login_body.get("access_token")
    print(f"    JWT Access Token berhasil diperoleh: {token[:25]}...")
    print(f"    Logged-in User: {login_body.get('user', {}).get('nama_user')}")

    # 5. UJI AKSES PROFILE DENGAN TOKEN
    print(f"\n[5] Menguji akses GET /api/v1/auth/me dengan Bearer token...")
    me_res = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
    print(f"    Status Response: {me_res.status_code}")
    assert me_res.status_code == 200
    print(f"    Profile: {me_res.json()}")

    # 6. BERSIHKAN DATA UJI COBA
    print(f"\n[6] Membersihkan akun uji coba dari database Neon...")
    with SessionLocal() as db:
        user_to_delete = db.query(User).filter(User.username == test_username).first()
        if user_to_delete:
            db.delete(user_to_delete)
            db.commit()
            print("    Akun uji coba berhasil dibersihkan dari tabel 'users'.")

    print("\n" + "=" * 70)
    print("SEMUA PENGUJIAN END-TO-END REGISTRASI NEON BERHASIL 100%!")
    print("=" * 70)


if __name__ == "__main__":
    run_neon_registration_verification()
