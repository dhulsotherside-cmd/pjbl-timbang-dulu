from datetime import date, datetime
from typing import List, Optional
from sqlalchemy import Date, DateTime, ForeignKey, Integer, String, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class Sapi(Base):
    __tablename__ = "sapi"

    id_sapi: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True, index=True)
    id_user: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("users.id_user", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    id_jenis: Mapped[Optional[int]] = mapped_column(
        Integer,
        ForeignKey("jenis_sapi.id_jenis", ondelete="SET NULL"),
        nullable=True,
        index=True
    )
    ear_tag: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    jenis_kelamin: Mapped[str] = mapped_column(String(10), nullable=False)  # "Jantan" / "Betina"
    umur_bulan: Mapped[int] = mapped_column(Integer, nullable=False)
    tanggal_masuk: Mapped[date] = mapped_column(Date, nullable=False)
    tanggal_keluar: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False
    )

    # Unique constraint per peternak (id_user, ear_tag)
    __table_args__ = (
        UniqueConstraint("id_user", "ear_tag", name="uq_user_ear_tag"),
    )

    # Relasi
    user: Mapped["User"] = relationship("User", back_populates="sapi_list")
    jenis: Mapped[Optional["JenisSapi"]] = relationship("JenisSapi", back_populates="sapi_list")
    pengukuran_list: Mapped[List["Pengukuran"]] = relationship(
        "Pengukuran",
        back_populates="sapi",
        cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<Sapi(id_sapi={self.id_sapi}, ear_tag='{self.ear_tag}', id_user={self.id_user})>"
