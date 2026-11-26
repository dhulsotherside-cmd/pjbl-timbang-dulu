from datetime import date

from app.api.v1.dashboard import dashboard
from app.models.pengukuran import Pengukuran
from app.models.sapi import Sapi
from app.models.user import User
from tests.conftest import TestingSessionLocal


def test_dashboard_uses_owner_records_and_active_herd():
    with TestingSessionLocal() as db:
        owner = User(username="owner", nama_user="Owner", password_hash="test")
        other = User(username="other", nama_user="Other", password_hash="test")
        db.add_all([owner, other])
        db.flush()

        for user, tag, end_date, weights in [
            (owner, "ACT", None, [100, 120]),
            (owner, "ARC", date(2025, 3, 1), [180]),
            (other, "EXT", None, [400]),
        ]:
            cow = Sapi(id_user=user.id_user, ear_tag=tag, jenis_kelamin="Jantan", umur_bulan=12,
                       tanggal_masuk=date(2025, 1, 1), tanggal_keluar=end_date)
            db.add(cow)
            db.flush()
            db.add_all([Pengukuran(id_sapi=cow.id_sapi, tanggal_ukur=date(2025, 2, 1), bobot=w)
                        for w in weights])
        db.flush()
        result = dashboard(owner, db)
        assert result["sapi_aktif"] == result["jantan"] == 1
        assert result["total_pengukuran"] == 3
        assert result["rata_bobot"] == 120
        assert result["tren_bulanan"] == [{"bulan": "2025-02", "bobot": 110}]
        assert [a["bobot"] for a in result["aktivitas"]] == [120, 100]
