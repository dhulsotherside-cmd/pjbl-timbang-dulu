from fastapi import APIRouter
from app.api.v1.auth import router as auth_router
from app.api.v1.sapi import router as sapi_router
from app.api.v1.pengukuran import router as pengukuran_router

api_v1_router = APIRouter()
api_v1_router.include_router(auth_router)
api_v1_router.include_router(sapi_router)
api_v1_router.include_router(pengukuran_router)

__all__ = ["api_v1_router", "auth_router", "sapi_router", "pengukuran_router"]
