from typing import Generator
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.security import decode_access_token
from app.db.session import SessionLocal
from app.models.user import User

oauth2_scheme = OAuth2PasswordBearer(
    tokenUrl=f"{settings.API_V1_STR}/auth/login"
)


def get_db() -> Generator[Session, None, None]:
    """
    Dependency untuk menyediakan SQLAlchemy database session per-request.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def get_current_user(
    db: Session = Depends(get_db),
    token: str = Depends(oauth2_scheme)
) -> User:
    """
    Dependency untuk memverifikasi JWT dan mengembalikan objek User yang sedang login.
    Memastikan multi-tenancy aman: semua operasi endpoint dapat memfilter data berdasarkan
    current_user.id_user.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Kredensial autentikasi tidak valid atau telah kedaluwarsa.",
        headers={"WWW-Authenticate": "Bearer"},
    )

    payload = decode_access_token(token)
    if payload is None:
        raise credentials_exception

    subject = payload.get("sub")
    if subject is None:
        raise credentials_exception

    # Subject dapat berupa id_user (string angka) atau username
    if str(subject).isdigit():
        user = db.query(User).filter(User.id_user == int(subject)).first()
    else:
        user = db.query(User).filter(User.username == str(subject)).first()

    if user is None:
        raise credentials_exception

    return user
