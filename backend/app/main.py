from contextlib import asynccontextmanager
import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.v1 import api_v1_router
from app.core.config import settings

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("timbangdulu")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Siklus hidup aplikasi FastAPI (startup & shutdown).
    """
    logger.info("Memulai %s v%s...", settings.PROJECT_NAME, settings.VERSION)
    logger.info("Mode Mock AI: %s", settings.USE_MOCK_AI)
    logger.info("Database URL configured: %s", bool(settings.DATABASE_URL))
    yield
    logger.info("Menghentikan %s...", settings.PROJECT_NAME)


app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description=(
        "API Backend untuk platform TimbangDulu — Solusi estimasi bobot sapi "
        "berbasis Computer Vision dan pemantauan Perkembangan Bobot Harian (PBH)."
    ),
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# Konfigurasi Cross-Origin Resource Sharing (CORS)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Hubungkan router versi 1
app.include_router(api_v1_router, prefix=settings.API_V1_STR)


@app.get("/", tags=["Health Check"])
def root():
    """
    Root endpoint untuk memastikan status layanan aktif.
    """
    return {
        "app": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "status": "online",
        "docs_url": "/docs",
        "mock_ai": settings.USE_MOCK_AI
    }


@app.get("/health", tags=["Health Check"])
def health_check():
    """
    Liveness & Readiness probe endpoint.
    """
    return {
        "status": "healthy",
        "version": settings.VERSION
    }
