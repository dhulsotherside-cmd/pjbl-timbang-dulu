from datetime import date, datetime
from decimal import Decimal
from typing import Optional
from sqlalchemy import Date, DateTime, ForeignKey, Index, Integer, Numeric, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class Pengukuran(Base):
    __tablename__ = "pengukuran"

    id_pengukuran: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
        autoincrement=True,
        index=True
    )
    id_sapi: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("sapi.id_sapi", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    bobot: Mapped[Decimal] = mapped_column(
        Numeric(6, 2),
        nullable=False
    )
    tanggal_ukur: Mapped[date] = mapped_column(
        Date,
        nullable=False,
        default=func.current_date()
    )
    path_foto_samping: Mapped[Optional[str]] = mapped_column(
        String(500),
        nullable=True
    )
    path_foto_belakang: Mapped[Optional[str]] = mapped_column(
        String(500),
        nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False
    )

    # Composite index untuk query time-series pengukuran per sapi
    __table_args__ = (
        Index("idx_pengukuran_sapi_tanggal", "id_sapi", "tanggal_ukur"),
    )

    # Relasi balik ke Sapi
    sapi: Mapped["Sapi"] = relationship("Sapi", back_populates="pengukuran_list")

    def __repr__(self) -> str:
        return (
            f"<Pengukuran(id_pengukuran={self.id_pengukuran}, "
            f"id_sapi={self.id_sapi}, bobot={self.bobot}, "
            f"tanggal_ukur={self.tanggal_ukur})>"
        )
