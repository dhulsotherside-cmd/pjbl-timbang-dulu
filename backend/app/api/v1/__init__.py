from fastapi import APIRouter
from app.api.v1.auth import router as auth_router, get_current_user_profile, update_current_user_profile
from app.api.v1.dashboard import router as dashboard_router
from app.api.v1.sapi import router as sapi_router
from app.api.v1.pengukuran import router as pengukuran_router
from app.schemas.user import UserResponse

api_v1_router = APIRouter()
api_v1_router.include_router(auth_router)
api_v1_router.include_router(dashboard_router)
api_v1_router.include_router(sapi_router)
api_v1_router.include_router(pengukuran_router)

# Alias router untuk /users/me
users_router = APIRouter(prefix="/users", tags=["Users"])
users_router.add_api_route("/me", get_current_user_profile, methods=["GET"], response_model=UserResponse)
users_router.add_api_route("/me", update_current_user_profile, methods=["PUT"], response_model=UserResponse)
api_v1_router.include_router(users_router)

__all__ = ["api_v1_router", "auth_router", "users_router", "sapi_router", "pengukuran_router"]
