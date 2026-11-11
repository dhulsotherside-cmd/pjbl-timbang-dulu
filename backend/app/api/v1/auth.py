from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db
from app.core.security import create_access_token, get_password_hash, verify_password
from app.models.user import User
from app.schemas.user import (
    LoginResponse,
    RegisterResponse,
    UserCreate,
    UserLogin,
    UserLoginData,
    UserRegisterData,
    UserResponse,
)

router = APIRouter(prefix="/auth", tags=["Autentikasi"])


@router.post(
    "/register",
    response_model=RegisterResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Registrasi Akun Peternak Baru"
)
def register(
    user_in: UserCreate,
    db: Session = Depends(get_db)
) -> RegisterResponse:
    """
    Mendaftarkan pengguna peternak baru ke dalam sistem.
    - Validasi keunikan username.
    - Password dienkripsi dengan algoritma bcrypt.
    """
    existing_user = db.query(User).filter(User.username == user_in.username).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Username '{user_in.username}' sudah digunakan. Silakan pilih username lain."
        )

    db_user = User(
        username=user_in.username,
        password_hash=get_password_hash(user_in.password),
        nama_user=user_in.nama_user,
        nama_peternakan=user_in.nama_peternakan,
        alamat=user_in.alamat,
        no_telp=user_in.no_telp
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)

    return RegisterResponse(
        status="success",
        message="Pendaftaran berhasil",
        data=UserRegisterData(
            id_user=db_user.id_user,
            username=db_user.username,
            nama_peternakan=db_user.nama_peternakan
        )
    )


@router.post(
    "/login",
    response_model=LoginResponse,
    summary="Login Kredensial Pengguna"
)
async def login(
    request: Request,
    db: Session = Depends(get_db)
) -> LoginResponse:
    """
    Autentikasi kredensial pengguna (username & password).
    Mendukung format JSON body maupun Form URL-encoded (kompatibel Swagger UI).
    Mengembalikan token JWT Bearer.
    """
    content_type = request.headers.get("content-type", "")
    username: Optional[str] = None
    password: Optional[str] = None

    if "application/json" in content_type:
        try:
            body = await request.json()
            username = body.get("username")
            password = body.get("password")
        except Exception:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Format JSON tidak valid."
            )
    else:
        # Form URL-encoded fallback
        form = await request.form()
        username = form.get("username")
        password = form.get("password")

    if not username or not password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Field 'username' dan 'password' wajib diisi."
        )

    user = db.query(User).filter(User.username == username).first()
    if not user or not verify_password(password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Username atau kata sandi tidak valid.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token = create_access_token(subject=str(user.id_user))

    return LoginResponse(
        access_token=access_token,
        token_type="bearer",
        user=UserLoginData(
            id_user=user.id_user,
            username=user.username,
            nama_user=user.nama_user,
            nama_peternakan=user.nama_peternakan
        )
    )


@router.get(
    "/me",
    response_model=UserResponse,
    summary="Dapatkan Profil Peternak Sedang Login"
)
def get_current_user_profile(
    current_user: User = Depends(get_current_user)
) -> User:
    """
    Mengambil data profil pengguna yang sedang login berdasarkan token JWT.
    """
    return current_user
