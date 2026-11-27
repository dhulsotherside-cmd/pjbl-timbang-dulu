from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
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
    UserUpdate,
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
    Mendaftarkan pengguna peternak baru ke dalam sistem:
    1. Validasi keunikan username (400 Bad Request jika sudah digunakan).
    2. Hashing password plain-text dengan algoritma bcrypt.
    3. Simpan record pengguna ke database Neon PostgreSQL.
    4. Tangani potensi error transaksi database dengan rollback otomatis.
    5. Kembalikan response 201 Created dengan data user baru tanpa password_hash.
    """
    cleaned_username = user_in.username.strip()

    # 1. Cek duplikasi username
    existing_user = db.query(User).filter(User.username == cleaned_username).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Username '{cleaned_username}' sudah digunakan. Silakan pilih username lain."
        )

    # 2. Hash password plain-text menggunakan utilitas bcrypt
    hashed_password = get_password_hash(user_in.password)

    # 3. Buat instance model User baru
    db_user = User(
        username=cleaned_username,
        password_hash=hashed_password,
        nama_user=user_in.nama_user.strip(),
        nama_peternakan=user_in.nama_peternakan.strip() if user_in.nama_peternakan else None,
        alamat=user_in.alamat.strip() if user_in.alamat else None,
        no_telp=user_in.no_telp.strip() if user_in.no_telp else None
    )

    # 4. Transaksi database dengan penanganan rollback
    try:
        db.add(db_user)
        db.commit()
        db.refresh(db_user)
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Username '{cleaned_username}' sudah terdaftar dalam sistem."
        )
    except SQLAlchemyError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Terjadi kegagalan saat menyimpan data pengguna baru ke database."
        )

    # 5. Response sukses 201 Created
    return RegisterResponse(
        status="success",
        message="Pendaftaran berhasil",
        data=UserRegisterData(
            id_user=db_user.id_user,
            username=db_user.username,
            nama_user=db_user.nama_user,
            nama_peternakan=db_user.nama_peternakan,
            alamat=db_user.alamat,
            no_telp=db_user.no_telp,
            created_at=db_user.created_at
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

    cleaned_username = username.strip()
    user = db.query(User).filter(User.username == cleaned_username).first()
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


@router.put(
    "/me",
    response_model=UserResponse,
    summary="Perbarui Profil Peternak Sedang Login"
)
def update_current_user_profile(
    user_update: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> User:
    """
    Memperbarui data profil pengguna yang sedang login pada field:
    nama_user, nama_peternakan, alamat, dan no_telp.
    Field username tidak boleh diubah.
    """
    if user_update.nama_user is not None:
        if len(user_update.nama_user.strip()) < 2:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Nama pengguna minimal 2 karakter."
            )
        current_user.nama_user = user_update.nama_user.strip()

    if "nama_peternakan" in user_update.model_fields_set:
        current_user.nama_peternakan = user_update.nama_peternakan.strip() if user_update.nama_peternakan else None

    if "alamat" in user_update.model_fields_set:
        current_user.alamat = user_update.alamat.strip() if user_update.alamat else None

    if "no_telp" in user_update.model_fields_set:
        current_user.no_telp = user_update.no_telp.strip() if user_update.no_telp else None

    try:
        db.add(current_user)
        db.commit()
        db.refresh(current_user)
    except SQLAlchemyError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Gagal memperbarui profil pengguna ke database."
        )

    return current_user
