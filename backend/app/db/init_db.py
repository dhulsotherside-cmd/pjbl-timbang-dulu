import logging
import sys
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.core.config import settings
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


def check_connection() -> bool:
    """
    Menguji konektivitas ke database PostgreSQL / Supabase.
    """
    logger.info("Menguji koneksi ke database: %s", settings.DATABASE_URL.split("@")[-1])
    try:
        with engine.connect() as conn:
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


def init_db() -> bool:
    """
    Membuat seluruh tabel skema relasional dan inisialisasi master data.
    """
    logger.info("Memulai inisialisasi skema database TimbangDulu...")
    if not check_connection():
        logger.warning(
            "Tidak dapat menghubungi database. Pastikan DATABASE_URL di berkas .env "
            "telah sesuai dengan kredensial Supabase / PostgreSQL aktif."
        )
        return False

    try:
        logger.info("Menjalankan Base.metadata.create_all(bind=engine)...")
        Base.metadata.create_all(bind=engine)
        logger.info("Tabel relasional (users, jenis_sapi, sapi, pengukuran) berhasil disinkronkan.")

        # Seed master data
        with SessionLocal() as db:
            seed_master_jenis(db)

        logger.info("Inisialisasi database selesai dengan sukses.")
        return True
    except Exception as e:
        logger.error("Terjadi kegagalan saat inisialisasi database: %s", e)
        return False


if __name__ == "__main__":
    success = init_db()
    sys.exit(0 if success else 1)
