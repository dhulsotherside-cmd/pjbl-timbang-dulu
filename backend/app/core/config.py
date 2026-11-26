from pathlib import Path
from typing import List
from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_DIR = Path(__file__).resolve().parent.parent.parent
ENV_PATH = BACKEND_DIR / ".env"


class Settings(BaseSettings):
    PROJECT_NAME: str = "TimbangDulu API"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"

    # CORS Configuration
    BACKEND_CORS_ORIGINS: List[str] = [
        "http://localhost",
        "http://localhost:3000",
        "http://localhost:5173",
        "http://localhost:8000",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173",
        "*"
    ]

    # Database Configuration (PostgreSQL Neon / Local)
    DATABASE_URL: str = "postgresql://<user>:<password>@<ep-pooler-host>/<dbname>?sslmode=require"

    # Neon Object Storage (S3-Compatible) Configuration
    AWS_ENDPOINT_URL_S3: str = ""
    AWS_ACCESS_KEY_ID: str = ""
    AWS_SECRET_ACCESS_KEY: str = ""
    AWS_REGION: str = "us-east-2"
    NEON_STORAGE_BUCKET_NAME: str = "cattle-images"

    # Security & JWT Configuration
    SECRET_KEY: str = "timbangdulu-super-secret-key-for-development-2026-secure"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440  # 24 hours

    CATTLE_CLASSIFIER_PATH: Path = Path("../model_prediksi/sapibukan_cifor.keras")
    CATTLE_SEGMENTATION_PATH: Path = Path("../model_prediksi/best_seg_model.keras")
    CATTLE_REGRESSION_PATH: Path = Path("../model_prediksi/best_reg_model.keras")

    @field_validator("CATTLE_CLASSIFIER_PATH", "CATTLE_SEGMENTATION_PATH", "CATTLE_REGRESSION_PATH")
    @classmethod
    def resolve_model_path(cls, value: Path) -> Path:
        return (BACKEND_DIR / value).resolve()

    model_config = SettingsConfigDict(
        env_file=[str(ENV_PATH), ".env"],
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore"
    )


settings = Settings()
