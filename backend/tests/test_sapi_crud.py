import pytest
from app.models.sapi import Sapi
from app.models.pengukuran import Pengukuran
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


def test_create_sapi_with_initial_weight_atomic():
    """
    Menguji pendaftaran sapi baru dengan bobot awal manual:
    - Sapi tersimpan di tabel sapi.
    - Pengukuran pertama otomatis tercatat di tabel pengukuran (bobot awal, foto null).
    - Response langsung memuat bobot_terakhir dan total_pengukuran = 1.
    """
    headers = register_and_login("peternak_sapi_atomic")

    payload = {
        "tag": "SAPI-ATOMIC-01",
        "breed": "Simental",
        "gender": "Jantan",
        "ageMonths": 18,
        "bobotAwal": 275.5,
        "tanggalMasuk": "2026-11-20"
    }

    res = client.post("/api/v1/sapi/", json=payload, headers=headers)
    assert res.status_code == 201
    data = res.json()

    assert data["ear_tag"] == "SAPI-ATOMIC-01"
    assert data["breed"] == "Simental"
    assert data["jenis_kelamin"] == "Jantan"
    assert data["umur_bulan"] == 18
    assert data["bobot_terakhir"] == 275.5
    assert data["latestWeight"] == 275.5
    assert data["status"] == "active"
    assert data["total_pengukuran"] == 1
    id_sapi = data["id_sapi"]

    # Verifikasi langsung di database
    with TestingSessionLocal() as db:
        sapi_db = db.query(Sapi).filter(Sapi.id_sapi == id_sapi).first()
        assert sapi_db is not None
        assert sapi_db.ear_tag == "SAPI-ATOMIC-01"

        # Cek pengukuran pertama
        m_list = db.query(Pengukuran).filter(Pengukuran.id_sapi == id_sapi).all()
        assert len(m_list) == 1
        m_first = m_list[0]
        assert float(m_first.bobot) == 275.5
        assert str(m_first.tanggal_ukur) == "2026-11-20"
        assert m_first.path_foto_samping is None
        assert m_first.path_foto_belakang is None


def test_duplicate_ear_tag_rejected_for_same_user():
    """
    Kasus Duplikasi: Peternak yang sama tidak boleh mendaftarkan ear_tag yang sama.
    """
    headers = register_and_login("peternak_dup_tag")

    payload = {
        "ear_tag": "TAG-UNIQUE-99",
        "breed": "Limousin",
        "jenis_kelamin": "Betina",
        "umur_bulan": 20,
        "bobot_awal": 240.0
    }

    first_res = client.post("/api/v1/sapi/", json=payload, headers=headers)
    assert first_res.status_code == 201

    # Coba tambah ulang dengan tag yang sama (case-insensitive)
    dup_payload = {**payload, "ear_tag": "tag-unique-99"}
    dup_res = client.post("/api/v1/sapi/", json=dup_payload, headers=headers)
    assert dup_res.status_code == 400
    assert "sudah terdaftar" in dup_res.json()["detail"]


def test_same_ear_tag_allowed_for_different_users():
    """
    Multi-tenancy: Dua peternak berbeda diizinkan menggunakan ear_tag yang sama.
    """
    headers1 = register_and_login("peternak_alpha")
    headers2 = register_and_login("peternak_beta")

    payload = {
        "ear_tag": "TAG-SHARED-01",
        "breed": "PO",
        "jenis_kelamin": "Jantan",
        "umur_bulan": 16,
        "bobot_awal": 220.0
    }

    res1 = client.post("/api/v1/sapi/", json=payload, headers=headers1)
    res2 = client.post("/api/v1/sapi/", json=payload, headers=headers2)

    assert res1.status_code == 201
    assert res2.status_code == 201
    assert res1.json()["id_sapi"] != res2.json()["id_sapi"]


def test_archive_and_filter_status():
    """
    Menguji alur pengarsipan (soft delete) dan filter status pada list sapi:
    - Sapi baru dibuat berstatus active.
    - Diarsipkan via PATCH /sapi/{id}/archive -> status jadi archived.
    - Filter status active vs archived pada GET /sapi/
    """
    headers = register_and_login("peternak_archive_tester")

    # Buat sapi
    create_res = client.post("/api/v1/sapi/", json={
        "ear_tag": "SAPI-ARSIP-01",
        "breed": "Brahman",
        "jenis_kelamin": "Jantan",
        "umur_bulan": 24,
        "bobot_awal": 310.0
    }, headers=headers)
    id_sapi = create_res.json()["id_sapi"]
    assert create_res.json()["status"] == "active"

    # Verifikasi muncul di filter active
    active_list = client.get("/api/v1/sapi/?status=active", headers=headers).json()
    assert any(s["id_sapi"] == id_sapi for s in active_list)

    # Arsipkan sapi
    archive_res = client.patch(f"/api/v1/sapi/{id_sapi}/archive", headers=headers)
    assert archive_res.status_code == 200
    assert archive_res.json()["status"] == "archived"
    assert archive_res.json()["tanggal_keluar"] is not None

    # Verifikasi tidak muncul di active tapi muncul di archived
    active_after = client.get("/api/v1/sapi/?status=active", headers=headers).json()
    assert not any(s["id_sapi"] == id_sapi for s in active_after)

    archived_list = client.get("/api/v1/sapi/?status=archived", headers=headers).json()
    assert any(s["id_sapi"] == id_sapi for s in archived_list)

    # Aktifkan kembali via unarchive
    unarchive_res = client.patch(f"/api/v1/sapi/{id_sapi}/unarchive", headers=headers)
    assert unarchive_res.status_code == 200
    assert unarchive_res.json()["status"] == "active"


def test_update_sapi_profile():
    """
    Menguji pembaruan profil sapi (breed, umur, gender).
    """
    headers = register_and_login("peternak_updater")

    create_res = client.post("/api/v1/sapi/", json={
        "ear_tag": "SAPI-UPDATE-01",
        "breed": "Simental",
        "jenis_kelamin": "Jantan",
        "umur_bulan": 12,
        "bobot_awal": 180.0
    }, headers=headers)
    id_sapi = create_res.json()["id_sapi"]

    update_res = client.put(f"/api/v1/sapi/{id_sapi}", json={
        "breed": "Limousin",
        "umur_bulan": 14,
        "gender": "Jantan"
    }, headers=headers)
    assert update_res.status_code == 200
    updated = update_res.json()
    assert updated["breed"] == "Limousin"
    assert updated["umur_bulan"] == 14
