from typing import List
from sqlalchemy import Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class JenisSapi(Base):
    __tablename__ = "jenis_sapi"

    id_jenis: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True, index=True)
    nama_jenis: Mapped[str] = mapped_column(String(50), unique=True, nullable=False, index=True)

    # Relasi one-to-many ke Sapi
    sapi_list: Mapped[List["Sapi"]] = relationship(
        "Sapi",
        back_populates="jenis"
    )

    def __repr__(self) -> str:
        return f"<JenisSapi(id_jenis={self.id_jenis}, nama_jenis='{self.nama_jenis}')>"
