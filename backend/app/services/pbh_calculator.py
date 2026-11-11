from typing import Any, Dict
from fastapi import HTTPException, status


def calculate_pbh(bobot_awal: float, bobot_akhir: float, jumlah_hari: int) -> Dict[str, Any]:
    """
    Menghitung Perkembangan Bobot Harian (PBH) atau Average Daily Gain (ADG).
    
    Rumus: PBH = (Bobot Akhir - Bobot Awal) / Selang Hari
    
    Kondisi Khusus:
    - Selang hari <= 0: Dilempar HTTPException 400 Bad Request.
    - PBH < 0: Menghasilkan status PERINGATAN_PENURUNAN dan anjuran evaluasi nutrisi.
    - PBH >= 0: Menghasilkan status NORMAL.
    """
    if jumlah_hari <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Jumlah hari antar-pengukuran harus lebih besar dari 0 hari."
        )

    kenaikan = bobot_akhir - bobot_awal
    pbh = round(kenaikan / jumlah_hari, 2)

    if pbh < 0:
        status_pertumbuhan = "PERINGATAN_PENURUNAN"
        pesan = "Perhatian: Terjadi penurunan bobot badan. Evaluasi asupan nutrisi/pakan atau cek kondisi kesehatan."
    else:
        status_pertumbuhan = "NORMAL"
        pesan = "Pertumbuhan bobot berjalan normal."

    return {
        "pbh_kg_hari": pbh,
        "selang_hari": jumlah_hari,
        "selisih_bobot_kg": round(kenaikan, 2),
        "status": status_pertumbuhan,
        "pesan": pesan
    }
