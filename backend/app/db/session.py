from typing import Generator
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from app.core.config import settings

# Format URL: Jika menggunakan postgresql://, arahkan ke driver psycopg2 yang terpasang
database_url = settings.DATABASE_URL
if database_url.startswith("postgresql://"):
    database_url = database_url.replace("postgresql://", "postgresql+psycopg2://", 1)

# Engine configuration with connection pooling for Neon PostgreSQL resilience
connect_args = {}
engine_kwargs = {}

if database_url.startswith("sqlite"):
    connect_args["check_same_thread"] = False
else:
    # Timeout koneksi 15 detik untuk mengakomodasi waktu wake-up Neon saat scale-to-zero (cold start)
    connect_args["connect_timeout"] = 15
    engine_kwargs.update({
        "pool_size": 10,
        "max_overflow": 20,
        "pool_pre_ping": True,  # Test koneksi sebelum digunakan guna mengeliminasi socket mati akibat auto-suspend Neon
        "pool_recycle": 300,    # Daur ulang koneksi setiap 5 menit (300 detik) untuk mencegah timeout PgBouncer/Neon
    })

engine = create_engine(
    database_url,
    connect_args=connect_args,
    **engine_kwargs
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)



def get_db_session() -> Generator[Session, None, None]:
    """
    Generator dependency untuk mendapatkan sesi database SQLAlchemy.
    Menjamin sesi selalu ditutup setelah request selesai.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
