from fastapi import APIRouter, Depends
from sqlalchemy import extract, func, select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db
from app.models.pengukuran import Pengukuran
from app.models.sapi import Sapi
from app.models.user import User

router = APIRouter(tags=["Dashboard"])


@router.get("/dashboard")
def dashboard(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    owner = Sapi.id_user == current_user.id_user
    active = Sapi.tanggal_keluar.is_(None)
    newest = (Pengukuran.tanggal_ukur.desc(), Pengukuran.id_pengukuran.desc())
    last_weight = (
        select(Pengukuran.bobot).where(Pengukuran.id_sapi == Sapi.id_sapi)
        .order_by(*newest).limit(1).scalar_subquery()
    )
    herd = db.execute(select(Sapi.jenis_kelamin, last_weight).where(owner, active)).all()
    weights = [weight for _, weight in herd if weight is not None]

    records = select().select_from(Pengukuran).join(Sapi).where(owner)
    total = db.scalar(records.with_only_columns(func.count()))
    year = extract("year", Pengukuran.tanggal_ukur)
    month = extract("month", Pengukuran.tanggal_ukur)
    monthly = db.execute(
        records.with_only_columns(year, month, func.avg(Pengukuran.bobot))
        .where(active).group_by(year, month).order_by(year, month)
    )
    recent = db.execute(
        records.with_only_columns(Pengukuran.id_pengukuran, Sapi.id_sapi, Sapi.ear_tag,
                                  Pengukuran.bobot, Pengukuran.tanggal_ukur)
        .where(active).order_by(*newest).limit(3)
    )
    return {
        "sapi_aktif": len(herd),
        "jantan": sum(gender == "Jantan" for gender, _ in herd),
        "betina": sum(gender == "Betina" for gender, _ in herd),
        "total_pengukuran": total,
        "rata_bobot": round(sum(weights) / len(weights)) if weights else None,
        "tren_bulanan": [
            {"bulan": f"{int(y):04d}-{int(m):02d}", "bobot": round(avg)}
            for y, m, avg in monthly
        ],
        "aktivitas": [dict(row._mapping) for row in recent],
    }
