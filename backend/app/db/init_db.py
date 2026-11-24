import logging
import sys
from typing import Dict, Any
from sqlalchemy import text, inspect
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.security import get_password_hash
from app.db.base import Base
from app.db.session import SessionLocal, engine
# Import semua model agar terdaftar pada Base.metadata
from app.models.jenis_sapi import JenisSapi
from app.models.pengukuran import Pengukuran
from app.models.sapi import Sapi
from app.models.user import User

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("init_db")

DEFAULT_JENIS_SAPI = [
    "Simental",
    "Limousin",
    "Brahman",
    "PO (Peranakan Ongole)",
    "Bali",
    "Madura",
    "Angus",
    "Brangus"
]

DUMMY_USER_CREDENTIALS = {
    "username": "peternak_demo",
    "password": "Password123!",
    "nama_user": "Budi Santoso",
    "nama_peternakan": "Peternakan Makmur Jaya",
    "alamat": "Jl. Raya Dramaga No. 12, Bogor, Jawa Barat",
    "no_telp": "081234567890"
}


def analyze_database_host(target_url: str = None) -> Dict[str, Any]:
    """
    Menganalisis konfigurasi host database (Pooled vs Direct host, SSL mode).
    """
    raw_url = str(target_url or settings.DATABASE_URL)
    info = {
        "raw_url": raw_url,
        "is_placeholder": "<user>" in raw_url or "<ep-pooler-host>" in raw_url,
        "is_neon": "neon.tech" in raw_url,
        "is_pooled": "-pooler" in raw_url,
        "has_ssl": "sslmode=require" in raw_url,
        "host_type": "Unknown"
    }

    if info["is_placeholder"]:
        info["host_type"] = "Placeholder (Needs User Configuration)"
    elif info["is_neon"]:
        info["host_type"] = "Neon Connection Pooling (-pooler)" if info["is_pooled"] else "Neon Direct Connection"
    elif raw_url.startswith("sqlite"):
        info["host_type"] = "SQLite (Local File/Memory)"
    else:
        info["host_type"] = "PostgreSQL Standalone / Self-hosted"

    return info


def check_connection(target_engine=None) -> bool:
    """
    Menguji konektivitas ke database PostgreSQL Neon / Standalone.
    """
    active_engine = target_engine or engine
    db_info = analyze_database_host(str(active_engine.url))
    
    if db_info["is_placeholder"]:
        logger.warning(
            "DATABASE_URL di file backend/.env masih menggunakan format placeholder: %s",
            settings.DATABASE_URL
        )
        return False

    url_str = str(active_engine.url)
    host_part = url_str.split("@")[-1] if "@" in url_str else url_str
    logger.info("Menguji koneksi ke database host: %s (Tipe: %s)", host_part, db_info["host_type"])
    try:
        with active_engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        logger.info("Koneksi ke database BERHASIL.")
        return True
    except Exception as e:
        logger.error("Gagal terhubung ke database: %s", e)
        return False


def seed_master_jenis(db: Session) -> None:
    """
    Mengisi data master jenis sapi awal jika tabel masih kosong.
    """
    existing_count = db.query(JenisSapi).count()
    if existing_count == 0:
        logger.info("Melakukan seeding data master jenis sapi...")
        for nama in DEFAULT_JENIS_SAPI:
            db.add(JenisSapi(nama_jenis=nama))
        db.commit()
        logger.info("Berhasil menambahkan %d ras/jenis sapi master.", len(DEFAULT_JENIS_SAPI))
    else:
        logger.info("Tabel jenis_sapi sudah terisi (%d data). Seeding dilewati.", existing_count)


def seed_dummy_user(db: Session) -> User:
    """
    Melakukan seeding 1 user dummy pengujian dengan password ter-hash bcrypt.
    """
    username = DUMMY_USER_CREDENTIALS["username"]
    existing_user = db.query(User).filter(User.username == username).first()
    if not existing_user:
        logger.info("Melakukan seeding akun dummy pengujian: '%s'...", username)
        hashed_password = get_password_hash(DUMMY_USER_CREDENTIALS["password"])
        new_user = User(
            username=username,
            password_hash=hashed_password,
            nama_user=DUMMY_USER_CREDENTIALS["nama_user"],
            nama_peternakan=DUMMY_USER_CREDENTIALS["nama_peternakan"],
            alamat=DUMMY_USER_CREDENTIALS["alamat"],
            no_telp=DUMMY_USER_CREDENTIALS["no_telp"]
        )
        db.add(new_user)
        db.commit()
        db.refresh(new_user)
        logger.info("Akun dummy '%s' berhasil di-seed (ID: %s).", username, new_user.id_user)
        return new_user
    else:
        logger.info("Akun dummy '%s' sudah terdaftar (ID: %s). Seeding dilewati.", username, existing_user.id_user)
        return existing_user


def verify_schema(target_engine=None) -> Dict[str, Any]:
    """
    Memverifikasi struktur skema tabel, Primary Key, Foreign Key, dan Unique Constraints.
    """
    active_engine = target_engine or engine
    inspector = inspect(active_engine)
    tables = inspector.get_table_names()
    
    schema_report = {}
    for table in ["users", "jenis_sapi", "sapi", "pengukuran"]:
        if table in tables:
            columns = inspector.get_columns(table)
            pk = inspector.get_pk_constraint(table)
            fks = inspector.get_foreign_keys(table)
            uqs = inspector.get_unique_constraints(table)
            indexes = inspector.get_indexes(table)
            
            schema_report[table] = {
                "exists": True,
                "columns": [col["name"] for col in columns],
                "primary_key": pk.get("constrained_columns", []),
                "foreign_keys": [
                    {
                        "constrained_columns": fk.get("constrained_columns"),
                        "referred_table": fk.get("referred_table"),
                        "referred_columns": fk.get("referred_columns")
                    } for fk in fks
                ],
                "unique_constraints": [
                    {
                        "name": uq.get("name"),
                        "column_names": uq.get("column_names")
                    } for uq in uqs
                ],
                "indexes": [
                    {
                        "name": idx.get("name"),
                        "column_names": idx.get("column_names"),
                        "unique": idx.get("unique")
                    } for idx in indexes
                ]
            }
        else:
            schema_report[table] = {"exists": False}

    return schema_report


def init_db(target_engine=None, target_session_factory=None) -> bool:
    """
    Membuat seluruh tabel skema relasional, inisialisasi master data, dan seed user dummy.
    """
    active_engine = target_engine or engine
    session_factory = target_session_factory or SessionLocal

    logger.info("Memulai inisialisasi skema database TimbangDulu...")
    if not check_connection(active_engine):
        logger.warning(
            "Tidak dapat menghubungi database aktif. Pastikan DATABASE_URL di file backend/.env "
            "telah terisi dengan connection string Neon PostgreSQL aktif."
        )
        return False

    try:
        logger.info("Menjalankan Base.metadata.create_all(bind=engine)...")
        Base.metadata.create_all(bind=active_engine)
        logger.info("Semua tabel relasional (users, jenis_sapi, sapi, pengukuran) berhasil disinkronkan.")

        # Seed master data & dummy test user
        with session_factory() as db:
            seed_master_jenis(db)
            seed_dummy_user(db)

        # Verifikasi skema
        report = verify_schema(active_engine)
        logger.info("Verifikasi Skema: %d tabel berhasil diverifikasi.", len(report))
        for tbl, data in report.items():
            logger.info(" - Tabel '%s': PK=%s, FKs=%d, Uniques=%d, Indexes=%d",
                        tbl, data["primary_key"], len(data["foreign_keys"]),
                        len(data["unique_constraints"]), len(data["indexes"]))

        logger.info("Inisialisasi database dan seeding data selesai dengan sukses!")
        return True
    except Exception as e:
        logger.error("Terjadi kegagalan saat inisialisasi database: %s", e)
        return False


if __name__ == "__main__":
    success = init_db()
    sys.exit(0 if success else 1)
