import os
import sys
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

# Pastikan root backend ada di sys.path
backend_root = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if backend_root not in sys.path:
    sys.path.insert(0, backend_root)

from app.api.deps import get_db
from app.db.base import Base
from app.main import app
from app.models.jenis_sapi import JenisSapi

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


@pytest.fixture(autouse=True)
def setup_and_teardown_db():
    Base.metadata.create_all(bind=engine)
    # Seed jenis sapi default
    with TestingSessionLocal() as db:
        jenis_list = ["Simental", "Limousin", "Brahman", "PO", "Bali"]
        for j in jenis_list:
            db.add(JenisSapi(nama_jenis=j))
        db.commit()
    yield
    Base.metadata.drop_all(bind=engine)


# Global TestClient instance untuk kompatibilitas import langsung
client = TestClient(app)
