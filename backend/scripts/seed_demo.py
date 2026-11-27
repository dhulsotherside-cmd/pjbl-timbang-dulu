"""
Database Seeder Script untuk Proyek TimbangDulu
Mengisi data master ras sapi, user akun demo, ternak sapi realistis,
dan riwayat pengukuran time-series untuk demo aplikasi & pengujian komprehensif.

Penggunaan:
    python scripts/seed_demo.py [--username demo_peternak] [--clean]
"""
import argparse
import sys
from datetime import date, timedelta
from decimal import Decimal
from pathlib import Path
from typing import Dict, List, Optional

# Tambahkan backend root ke sys.path agar impor modul internal app berfungsi
BACKEND_DIR = Path(__file__).resolve().parent.parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from sqlalchemy import func
from app.core.security import get_password_hash
from app.db.session import SessionLocal
from app.models.jenis_sapi import JenisSapi
from app.models.pengukuran import Pengukuran
from app.models.sapi import Sapi
from app.models.user import User

DESIRED_BREEDS = [
    "Simental",
    "Limousin",
    "Brahman",
    "Bali",
    "Peranakan Ongole (PO)",
]


def seed_master_breeds(db) -> Dict[str, int]:
    """
    Menyisipkan master jenis_sapi jika belum ada (idempotent).
    Mengembalikan dictionary mapping nama jenis sapi (lowercase) ke id_jenis.
    """
    print("\n[1/3] Memeriksa & Seeding Master Jenis Sapi...")
    for breed_name in DESIRED_BREEDS:
        existing = (
            db.query(JenisSapi)
            .filter(func.lower(JenisSapi.nama_jenis) == breed_name.lower())
            .first()
        )
        if not existing:
            new_breed = JenisSapi(nama_jenis=breed_name)
            db.add(new_breed)
            db.commit()
            db.refresh(new_breed)
            print(f"  [+] Ditambahkan: '{breed_name}' (ID: {new_breed.id_jenis})")
        else:
            print(f"  [i] Sudah tersedia: '{existing.nama_jenis}' (ID: {existing.id_jenis})")

    # Ambil seluruh jenis sapi untuk referensi ID
    all_breeds = db.query(JenisSapi).all()
    breed_map: Dict[str, int] = {}
    for b in all_breeds:
        breed_map[b.nama_jenis.lower()] = b.id_jenis
        # Alias khusus untuk ras Peranakan Ongole
        if "ongole" in b.nama_jenis.lower() or "po" in b.nama_jenis.lower():
            breed_map["po"] = b.id_jenis
            breed_map["peranakan ongole"] = b.id_jenis
            breed_map["peranakan ongole (po)"] = b.id_jenis

    return breed_map


def get_or_create_user(db, username: str) -> User:
    """
    Mengambil user berdasarkan username. Jika belum ada, membuat akun demo baru.
    """
    print(f"\n[2/3] Memeriksa Akun Pengguna Target ('{username}')...")
    user = db.query(User).filter(User.username == username).first()
    if user:
        print(f"  [*] Menggunakan akun peternak terdaftar: '{user.username}' (ID: {user.id_user})")
        print(f"      Nama Peternakan: {user.nama_peternakan or '-'}")
        return user

    print(f"  [+] Akun '{username}' belum ada. Membuat akun demo baru...")
    new_user = User(
        username=username,
        password_hash=get_password_hash("demo1234"),
        nama_user="Budi Santoso",
        nama_peternakan="Peternakan Maju Jaya",
        alamat="Bogor, Jawa Barat",
        no_telp="081234567890",
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    print(f"  [✓] Akun demo berhasil dibuat: '{new_user.username}' (ID: {new_user.id_user}, Password: demo1234)")
    return new_user


def clean_demo_data(db, user_id: int) -> int:
    """
    Menghapus hanya data sapi milik target user yang memiliki ear_tag berawalan 'DEMO-'.
    """
    print("\n[*] Menjalankan opsi --clean (Pembersihan data demo sebelumnya)...")
    demo_cows = (
        db.query(Sapi)
        .filter(
            Sapi.id_user == user_id,
            Sapi.ear_tag.ilike("DEMO-%")
        )
        .all()
    )
    if not demo_cows:
        print("  [i] Tidak ada sapi ber-prefix 'DEMO-' yang ditemukan. Tidak ada data yang dihapus.")
        return 0

    count = len(demo_cows)
    for cow in demo_cows:
        db.delete(cow)
    db.commit()
    print(f"  [✓] Berhasil menghapus {count} data sapi demo lama beserta riwayat pengukurannya.")
    return count


def resolve_breed_id(breed_name: str, breed_map: Dict[str, int]) -> Optional[int]:
    """
    Mencari ID jenis sapi berdasarkan nama atau fallback keyword.
    """
    cleaned = breed_name.strip().lower()
    if cleaned in breed_map:
        return breed_map[cleaned]
    for key, val in breed_map.items():
        if key in cleaned or cleaned in key:
            return val
    return None


def seed_cattle_and_measurements(db, user: User, breed_map: Dict[str, int]):
    """
    Menyisipkan data sapi dan riwayat pengukuran realistis ke database.
    """
    print("\n[3/3] Seeding Data Sapi & Pengukuran Time-Series...")
    today = date.today()

    demo_cattle_specs = [
        # --- 1. Lima (5) Ekor Sapi Aktif (PBH Positif - Jantan & Betina Berimbang) ---
        {
            "ear_tag": "DEMO-001",
            "breed": "Simental",
            "gender": "Jantan",
            "age_months": 18,
            "tanggal_masuk": today - timedelta(days=120),
            "tanggal_keluar": None,
            "measurements": [
                (today - timedelta(days=120), 310.0),
                (today - timedelta(days=90), 338.0),
                (today - timedelta(days=60), 365.0),
                (today - timedelta(days=30), 392.0),
                (today, 420.0),
            ],
            "deskripsi": "Simental Jantan (PBH ~0.92 kg/hari, 5 pengukuran)",
        },
        {
            "ear_tag": "DEMO-002",
            "breed": "Limousin",
            "gender": "Jantan",
            "age_months": 20,
            "tanggal_masuk": today - timedelta(days=120),
            "tanggal_keluar": None,
            "measurements": [
                (today - timedelta(days=120), 340.0),
                (today - timedelta(days=90), 368.0),
                (today - timedelta(days=60), 395.0),
                (today - timedelta(days=30), 418.0),
                (today, 445.0),
            ],
            "deskripsi": "Limousin Jantan (PBH ~0.88 kg/hari, 5 pengukuran)",
        },
        {
            "ear_tag": "DEMO-003",
            "breed": "Brahman",
            "gender": "Betina",
            "age_months": 16,
            "tanggal_masuk": today - timedelta(days=90),
            "tanggal_keluar": None,
            "measurements": [
                (today - timedelta(days=90), 260.0),
                (today - timedelta(days=60), 282.0),
                (today - timedelta(days=30), 305.0),
                (today, 326.0),
            ],
            "deskripsi": "Brahman Betina (PBH ~0.73 kg/hari, 4 pengukuran)",
        },
        {
            "ear_tag": "DEMO-004",
            "breed": "Bali",
            "gender": "Betina",
            "age_months": 14,
            "tanggal_masuk": today - timedelta(days=90),
            "tanggal_keluar": None,
            "measurements": [
                (today - timedelta(days=90), 195.0),
                (today - timedelta(days=60), 212.0),
                (today - timedelta(days=30), 228.0),
                (today, 245.0),
            ],
            "deskripsi": "Bali Betina (PBH ~0.56 kg/hari, 4 pengukuran)",
        },
        {
            "ear_tag": "DEMO-005",
            "breed": "Peranakan Ongole (PO)",
            "gender": "Jantan",
            "age_months": 15,
            "tanggal_masuk": today - timedelta(days=90),
            "tanggal_keluar": None,
            "measurements": [
                (today - timedelta(days=90), 240.0),
                (today - timedelta(days=60), 262.0),
                (today - timedelta(days=30), 285.0),
                (today, 308.0),
            ],
            "deskripsi": "PO Jantan (PBH ~0.76 kg/hari, 4 pengukuran)",
        },

        # --- 2. Satu (1) Ekor Sapi Aktif dengan PBH Negatif (Demo Alert Penyusutan Bobot) ---
        {
            "ear_tag": "DEMO-006",
            "breed": "Simental",
            "gender": "Betina",
            "age_months": 17,
            "tanggal_masuk": today - timedelta(days=90),
            "tanggal_keluar": None,
            "measurements": [
                (today - timedelta(days=90), 290.0),
                (today - timedelta(days=60), 312.0),
                (today - timedelta(days=30), 325.0),
                (today, 315.0),  # Turun 10 kg memicu is_weight_loss & warning PBH < 0
            ],
            "deskripsi": "Simental Betina (PBH Negatif: -0.33 kg/hari pada interval akhir)",
        },

        # --- 3. Satu (1) Ekor Sapi Aktif Baru Masuk (Demo Edge Case PBH Null) ---
        {
            "ear_tag": "DEMO-007",
            "breed": "Bali",
            "gender": "Jantan",
            "age_months": 12,
            "tanggal_masuk": today,
            "tanggal_keluar": None,
            "measurements": [
                (today, 210.0),  # 1 pengukuran saja -> PBH Null
            ],
            "deskripsi": "Bali Jantan (Sapi Baru Masuk: 1 pengukuran, PBH Null)",
        },

        # --- 4. Dua (2) Ekor Sapi Berstatus Arsip (tanggal_keluar terisi) ---
        {
            "ear_tag": "DEMO-ARSIP-01",
            "breed": "Limousin",
            "gender": "Jantan",
            "age_months": 24,
            "tanggal_masuk": today - timedelta(days=150),
            "tanggal_keluar": today - timedelta(days=14),
            "measurements": [
                (today - timedelta(days=150), 380.0),
                (today - timedelta(days=90), 415.0),
                (today - timedelta(days=14), 450.0),
            ],
            "deskripsi": "Limousin Jantan (Arsip: Keluar 2 minggu lalu)",
        },
        {
            "ear_tag": "DEMO-ARSIP-02",
            "breed": "Brahman",
            "gender": "Betina",
            "age_months": 22,
            "tanggal_masuk": today - timedelta(days=120),
            "tanggal_keluar": today - timedelta(days=30),
            "measurements": [
                (today - timedelta(days=120), 310.0),
                (today - timedelta(days=30), 340.0),
            ],
            "deskripsi": "Brahman Betina (Arsip: Keluar 1 bulan lalu)",
        },
    ]

    total_cows_created = 0
    total_measurements_created = 0
    summary_rows = []

    for spec in demo_cattle_specs:
        tag = spec["ear_tag"]
        is_active = spec["tanggal_keluar"] is None

        # Pengecekan idempotensi: Lewati jika sapi aktif dengan ear_tag sama sudah ada
        if is_active:
            existing = (
                db.query(Sapi)
                .filter(
                    Sapi.id_user == user.id_user,
                    func.lower(Sapi.ear_tag) == tag.lower(),
                    Sapi.tanggal_keluar.is_(None)
                )
                .first()
            )
            if existing:
                print(f"  [!] Melewati '{tag}': Sapi aktif sudah terdaftar (ID: {existing.id_sapi}).")
                continue
        else:
            existing_archived = (
                db.query(Sapi)
                .filter(
                    Sapi.id_user == user.id_user,
                    func.lower(Sapi.ear_tag) == tag.lower(),
                    Sapi.tanggal_keluar.isnot(None)
                )
                .first()
            )
            if existing_archived:
                print(f"  [!] Melewati '{tag}': Sapi arsip sudah terdaftar (ID: {existing_archived.id_sapi}).")
                continue

        id_jenis = resolve_breed_id(spec["breed"], breed_map)

        sapi = Sapi(
            id_user=user.id_user,
            id_jenis=id_jenis,
            ear_tag=tag,
            jenis_kelamin=spec["gender"],
            umur_bulan=spec["age_months"],
            tanggal_masuk=spec["tanggal_masuk"],
            tanggal_keluar=spec["tanggal_keluar"],
        )
        db.add(sapi)
        db.flush()  # Dapatkan id_sapi dari sequence DB

        measurement_count = 0
        latest_weight = None

        for tgl_ukur, bobot in spec["measurements"]:
            pengukuran = Pengukuran(
                id_sapi=sapi.id_sapi,
                bobot=Decimal(str(round(bobot, 2))),
                tanggal_ukur=tgl_ukur,
                path_foto_samping=None,
                path_foto_belakang=None,
            )
            db.add(pengukuran)
            measurement_count += 1
            latest_weight = bobot

        db.commit()
        total_cows_created += 1
        total_measurements_created += measurement_count

        status_str = "Aktif" if is_active else "Arsip"
        print(f"  [+] Ditambahkan: {tag} ({spec['breed']}, {spec['gender']}, {status_str}) -> {measurement_count} pengukuran")

        summary_rows.append({
            "ear_tag": tag,
            "breed": spec["breed"],
            "gender": spec["gender"],
            "status": status_str,
            "count": measurement_count,
            "latest_weight": f"{latest_weight} kg" if latest_weight else "-",
            "info": spec["deskripsi"],
        })

    print("\n" + "=" * 80)
    print("RINGKASAN HASIL SEEDING DEMO")
    print("=" * 80)
    print(f"Target Pengguna  : {user.username} (ID: {user.id_user})")
    print(f"Peternakan       : {user.nama_peternakan}")
    print(f"Total Sapi Dibuat: {total_cows_created} ekor")
    print(f"Total Pengukuran : {total_measurements_created} rekor")
    print("-" * 80)
    print(f"{'Ear Tag':<15} {'Ras Sapi':<12} {'Gender':<8} {'Status':<8} {'Jml Ukur':<10} {'Bobot Terkini':<15}")
    print("-" * 80)
    for row in summary_rows:
        print(f"{row['ear_tag']:<15} {row['breed']:<12} {row['gender']:<8} {row['status']:<8} {row['count']:<10} {row['latest_weight']:<15}")
    print("=" * 80)


def main():
    parser = argparse.ArgumentParser(
        description="Skrip Seeder Data Demo Sapi & Pengukuran Realistis TimbangDulu"
    )
    parser.add_argument(
        "--username",
        type=str,
        default="demo_peternak",
        help="Target username pemilik data (default: 'demo_peternak')",
    )
    parser.add_argument(
        "--clean",
        action="store_true",
        help="Bersihkan data sapi lama dengan prefix 'DEMO-' milik user ini sebelum seeding",
    )
    args = parser.parse_args()

    print("=" * 80)
    print("TIMBANGDULU - DATABASE SEEDER DEMO")
    print("=" * 80)

    db = SessionLocal()
    try:
        # 1. Pastikan master jenis_sapi tersedia
        breed_map = seed_master_breeds(db)

        # 2. Dapatkan atau buat akun target
        user = get_or_create_user(db, args.username)

        # 3. Bersihkan data demo sebelumnya jika flag --clean diberikan
        if args.clean:
            clean_demo_data(db, user.id_user)

        # 4. Lakukan seeding sapi dan pengukuran
        seed_cattle_and_measurements(db, user, breed_map)

        print("\n[✓] Proses seeding database selesai dengan sukses!\n")
    except Exception as e:
        db.rollback()
        print(f"\n[!] TERJADI KESALAHAN SAAT SEEDING: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    main()
