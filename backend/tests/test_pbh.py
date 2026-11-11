import pytest
from fastapi import HTTPException
from app.services.pbh_calculator import calculate_pbh


def test_calculate_pbh_normal_growth():
    """Menguji kalkulasi PBH saat pertambahan bobot positif/normal."""
    result = calculate_pbh(bobot_awal=250.0, bobot_akhir=272.5, jumlah_hari=25)
    assert result["pbh_kg_hari"] == 0.90
    assert result["selang_hari"] == 25
    assert result["selisih_bobot_kg"] == 22.5
    assert result["status"] == "NORMAL"
    assert "normal" in result["pesan"].lower()


def test_calculate_pbh_negative_warning():
    """Menguji kalkulasi PBH saat terjadi penurunan bobot (alert)."""
    result = calculate_pbh(bobot_awal=300.0, bobot_akhir=294.0, jumlah_hari=20)
    assert result["pbh_kg_hari"] == -0.30
    assert result["selang_hari"] == 20
    assert result["selisih_bobot_kg"] == -6.0
    assert result["status"] == "PERINGATAN_PENURUNAN"
    assert "penurunan bobot" in result["pesan"].lower()


def test_calculate_pbh_zero_days_guardrail():
    """Menguji guardrail error saat selang hari <= 0."""
    with pytest.raises(HTTPException) as exc_info:
        calculate_pbh(bobot_awal=250.0, bobot_akhir=260.0, jumlah_hari=0)
    assert exc_info.value.status_code == 400
    assert "lebih besar dari 0" in exc_info.value.detail


def test_calculate_pbh_negative_days_guardrail():
    """Menguji guardrail error saat selang hari bernilai negatif."""
    with pytest.raises(HTTPException) as exc_info:
        calculate_pbh(bobot_awal=250.0, bobot_akhir=260.0, jumlah_hari=-5)
    assert exc_info.value.status_code == 400
