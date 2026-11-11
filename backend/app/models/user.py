from datetime import datetime
from typing import List, Optional
from sqlalchemy import DateTime, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class User(Base):
    __tablename__ = "users"

    id_user: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True, index=True)
    username: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    nama_user: Mapped[str] = mapped_column(String(100), nullable=False)
    nama_peternakan: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    alamat: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    no_telp: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False
    )

    # Relasi one-to-many ke Sapi
    sapi_list: Mapped[List["Sapi"]] = relationship(
        "Sapi",
        back_populates="user",
        cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<User(id_user={self.id_user}, username='{self.username}', nama='{self.nama_user}')>"
