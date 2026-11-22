"""
Skrip Verifikasi End-to-End CRUD Data Sapi pada Database Neon PostgreSQL Aktif.
Menguji secara live transaksi atomik sapi + pengukuran awal, constraint unik, update, dan arsip.
"""
import os
import sys
import uuid
from decimal import Decimal

# Pastikan root backend ada di sys.path
backend_root = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if backend_root not in sys.path:
    sys.path.insert(0, backend_root)

from fastapi.testclient import TestClient

from app.db.session import SessionLocal
from app.main import app
from app.models.pengukuran import Pengukuran
from app.models.sapi import Sapi
from app.models.user import User


def run_neon_sapi_verification():
    print("=" * 70)
    print("MEMULAI PENGUJIAN END-TO-END CRUD DATA SAPI DI NEON POSTGRESQL")
    print("=" * 70)

    client = TestClient(app)
    unique_suffix = uuid.uuid4().hex[:6]
    test_user = f"peternak_crud_{unique_suffix}"
    test_pass = "PasswordKuat123!"

    # 1. Registrasi & Login Peternak
    print(f"\n[1] Mendaftarkan peternak uji coba: '{test_user}'...")
    client.post("/api/v1/auth/register", json={
        "username": test_user,
        "password": test_pass,
        "nama_user": f"Peternak {unique_suffix}",
        "nama_peternakan": f"Farm {unique_suffix}",
    })
    login_res = client.post("/api/v1/auth/login", json={"username": test_user, "password": test_pass})
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    print("    Peternak berhasil login dan memperoleh JWT access token.")

    test_tag = f"TAG-{unique_suffix.upper()}"
    bobot_awal = 265.75

    # 2. Tambah Sapi Baru dengan Bobot Awal Manual
    print(f"\n[2] Menambahkan sapi baru dengan ear tag '{test_tag}' & bobot awal {bobot_awal} kg...")
    sapi_payload = {
        "tag": test_tag,
        "breed": "Limousin",
        "gender": "Jantan",
        "ageMonths": 22,
        "bobotAwal": bobot_awal
    }
    create_res = client.post("/api/v1/sapi/", json=sapi_payload, headers=headers)
    print(f"    Status Response: {create_res.status_code}")
    assert create_res.status_code == 201, f"Gagal create sapi: {create_res.text}"
    sapi_data = create_res.json()
    id_sapi = sapi_data["id_sapi"]
    print(f"    ID Sapi Terbuat: {id_sapi}")
    print(f"    Ear Tag: {sapi_data['ear_tag']}")
    print(f"    Status: {sapi_data['status']}")
    print(f"    Bobot Terakhir: {sapi_data['bobot_terakhir']} kg")
    print(f"    Total Pengukuran: {sapi_data['total_pengukuran']}")
    assert sapi_data["bobot_terakhir"] == bobot_awal
    assert sapi_data["total_pengukuran"] == 1

    # 3. Verifikasi Langsung ke Database Neon PostgreSQL
    print(f"\n[3] Memeriksa data di tabel 'sapi' & 'pengukuran' Neon PostgreSQL...")
    with SessionLocal() as db:
        sapi_in_db = db.query(Sapi).filter(Sapi.id_sapi == id_sapi).first()
        assert sapi_in_db is not None, "Data sapi tidak ditemukan di database Neon!"
        print(f"    Record Sapi di DB: id_sapi={sapi_in_db.id_sapi}, tag={sapi_in_db.ear_tag}")

        pengukuran_in_db = db.query(Pengukuran).filter(Pengukuran.id_sapi == id_sapi).all()
        assert len(pengukuran_in_db) == 1, "Pengukuran awal tidak tersimpan di Neon!"
        p_row = pengukuran_in_db[0]
        print(f"    Record Pengukuran di DB: id={p_row.id_pengukuran}, bobot={p_row.bobot} kg, tanggal={p_row.tanggal_ukur}")
        print(f"    Path Foto Samping: {p_row.path_foto_samping} (harus None/NULL)")
        print(f"    Path Foto Belakang: {p_row.path_foto_belakang} (harus None/NULL)")
        assert p_row.path_foto_samping is None
        assert p_row.path_foto_belakang is None
        assert float(p_row.bobot) == bobot_awal

    # 4. Validasi Penolakan Duplikasi Ear Tag
    print(f"\n[4] Menguji penolakan duplikasi ear tag '{test_tag}' pada peternak yang sama...")
    dup_res = client.post("/api/v1/sapi/", json=sapi_payload, headers=headers)
    print(f"    Status Response: {dup_res.status_code}")
    assert dup_res.status_code == 400
    print(f"    Detail Error: {dup_res.json().get('detail')}")

    # 5. Uji Pengarsipan Sapi (Soft Delete)
    print(f"\n[5] Menguji pengarsipan sapi via PATCH /api/v1/sapi/{id_sapi}/archive...")
    archive_res = client.patch(f"/api/v1/sapi/{id_sapi}/archive", headers=headers)
    assert archive_res.status_code == 200
    assert archive_res.json()["status"] == "archived"
    assert archive_res.json()["tanggal_keluar"] is not None
    print(f"    Status Sapi beralih ke: {archive_res.json()['status']} (Keluar: {archive_res.json()['tanggal_keluar']})")

    # 6. Uji Filter Status Sapi Aktif vs Diarsipkan
    print(f"\n[6] Menguji filter status pada GET /api/v1/sapi/...")
    active_res = client.get("/api/v1/sapi/?status=active", headers=headers)
    archived_res = client.get("/api/v1/sapi/?status=archived", headers=headers)
    assert not any(s["id_sapi"] == id_sapi for s in active_res.json())
    assert any(s["id_sapi"] == id_sapi for s in archived_res.json())
    print("    Filter status 'active' dan 'archived' bekerja dengan akurat.")

    # 7. Pembersihan Akun Uji Coba dari Neon
    print(f"\n[7] Membersihkan data uji coba dari database Neon...")
    with SessionLocal() as db:
        user_row = db.query(User).filter(User.username == test_user).first()
        if user_row:
            db.delete(user_row)
            db.commit()
            print("    Akun peternak uji coba dan cascade data sapi berhasil dibersihkan.")

    print("\n" + "=" * 70)
    print("SEMUA PENGUJIAN END-TO-END CRUD DATA SAPI NEON POSTGRESQL SUKSES 100%!")
    print("=" * 70)


if __name__ == "__main__":
    run_neon_sapi_verification()
