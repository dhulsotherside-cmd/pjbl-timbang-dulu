import pytest
from app.models.sapi import Sapi
from app.models.user import User
from tests.conftest import client, TestingSessionLocal


def register_and_login(username, password="Password123!"):
    client.post("/api/v1/auth/register", json={
        "username": username,
        "password": password,
        "nama_user": f"Nama {username}",
        "nama_peternakan": f"Farm {username}",
    })
    res = client.post("/api/v1/auth/login", json={
        "username": username,
        "password": password
    })
    token = res.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def test_ear_tag_reuse_after_archived():
    """
    Validasi FASE 1:
    - Ear tag sama dengan sapi aktif -> DITOLAK (400).
    - Ear tag sama setelah sapi lama diarsipkan -> BERHASIL (201).
    - Ear tag sama untuk sapi aktif kedua -> DITOLAK (400).
    """
    headers = register_and_login("peternak_ear_tag_reuse")

    payload = {
        "ear_tag": "TAG-DAUR-ULANG",
        "breed": "Simental",
        "jenis_kelamin": "Jantan",
        "umur_bulan": 18,
        "bobot_awal": 280.0
    }

    # 1. Pendaftaran pertama (sapi aktif)
    res1 = client.post("/api/v1/sapi/", json=payload, headers=headers)
    assert res1.status_code == 201
    sapi1_id = res1.json()["id_sapi"]

    # 2. Registrasi kedua saat sapi pertama masih aktif -> DITOLAK (400)
    res_dup = client.post("/api/v1/sapi/", json=payload, headers=headers)
    assert res_dup.status_code == 400
    assert "sudah terdaftar" in res_dup.json()["detail"]

    # 3. Arsipkan sapi pertama
    res_archive = client.patch(f"/api/v1/sapi/{sapi1_id}/archive", headers=headers)
    assert res_archive.status_code == 200
    assert res_archive.json()["status"] == "archived"

    # 4. Registrasi sapi kedua dengan ear_tag yang sama -> BERHASIL (201)
    res2 = client.post("/api/v1/sapi/", json=payload, headers=headers)
    assert res2.status_code == 201
    sapi2_id = res2.json()["id_sapi"]
    assert sapi1_id != sapi2_id

    # 5. Registrasi sapi ketiga dengan ear_tag yang sama saat sapi 2 masih aktif -> DITOLAK (400)
    res_dup2 = client.post("/api/v1/sapi/", json=payload, headers=headers)
    assert res_dup2.status_code == 400

    # 6. Verifikasi database: ada 2 sapi, satu keluar dan satu aktif
    with TestingSessionLocal() as db:
        cows = db.query(Sapi).filter(Sapi.ear_tag == "TAG-DAUR-ULANG").all()
        assert len(cows) == 2
        active_cows = [c for c in cows if c.tanggal_keluar is None]
        archived_cows = [c for c in cows if c.tanggal_keluar is not None]
        assert len(active_cows) == 1
        assert len(archived_cows) == 1


def test_update_user_profile_me():
    """
    Validasi FASE 1:
    - Endpoint update profil peternak (PUT /api/v1/auth/me & PUT /api/v1/users/me).
    - Memperbarui nama_user, nama_peternakan, alamat, dan no_telp.
    - Username tetap utuh / tidak boleh diubah.
    """
    headers = register_and_login("peternak_edit_profile")

    # 1. Cek profil awal
    res_me = client.get("/api/v1/auth/me", headers=headers)
    assert res_me.status_code == 200
    initial_data = res_me.json()
    assert initial_data["username"] == "peternak_edit_profile"

    # 2. Update via PUT /api/v1/auth/me
    update_payload = {
        "nama_user": "Budi Santoso Terkini",
        "nama_peternakan": "Peternakan Makmur Jaya Abadi",
        "alamat": "Jl. Raya Bogor No. 123",
        "no_telp": "081299887766"
    }
    res_update = client.put("/api/v1/auth/me", json=update_payload, headers=headers)
    assert res_update.status_code == 200
    updated_data = res_update.json()

    assert updated_data["username"] == "peternak_edit_profile"
    assert updated_data["nama_user"] == "Budi Santoso Terkini"
    assert updated_data["nama_peternakan"] == "Peternakan Makmur Jaya Abadi"
    assert updated_data["alamat"] == "Jl. Raya Bogor No. 123"
    assert updated_data["no_telp"] == "081299887766"

    # 3. Update via alias PUT /api/v1/users/me
    res_alias = client.put("/api/v1/users/me", json={"nama_peternakan": "Berkah Farm Baru"}, headers=headers)
    assert res_alias.status_code == 200
    assert res_alias.json()["nama_peternakan"] == "Berkah Farm Baru"
    assert res_alias.json()["nama_user"] == "Budi Santoso Terkini"

    # 4. Validasi di DB
    with TestingSessionLocal() as db:
        user_db = db.query(User).filter(User.username == "peternak_edit_profile").first()
        assert user_db is not None
        assert user_db.nama_user == "Budi Santoso Terkini"
        assert user_db.nama_peternakan == "Berkah Farm Baru"
        assert user_db.alamat == "Jl. Raya Bogor No. 123"
        assert user_db.no_telp == "081299887766"
