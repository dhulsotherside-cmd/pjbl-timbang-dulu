# Backend Product Requirement Document (PRD) — TimbangDulu API

**Komponen:** Backend Service (FastAPI)  
**Versi:** 1.0  
**Tanggal:** 11 November 2026  
**Target Pengembang:** Backend Software Engineer  
**Teknologi:** Python 3.10+, FastAPI, SQLAlchemy, Pydantic, Neon (PostgreSQL & Object Storage)  

---

## 1. Tanggung Jawab & Batasan Kerja Backend

Sebagai pengembang backend, ruang lingkup pengerjaan mencakup:
1. Menyediakan RESTful API berkinerja tinggi, asynchronous, dan terdokumentasi otomatis via OpenAPI (`/docs`).
2. Mengelola autentikasi berbasis token JWT serta memastikan isolasi data multi-tenancy (pengguna hanya dapat mengakses data ternak miliknya sendiri).
3. Menyediakan layer penyimpanan berkas citra ke Full Neon Object Storage (`cattle-images`, access: `public_read`) dengan arsitektur fail-fast, format path terstruktur (`sapi/<id_sapi>/<sudut>_<uuid>.<ext>`), dan rollback compensation.
4. Mengimplementasikan kalkulator Perkembangan Bobot Harian (PBH) beserta penanganan kondisinya.
5. Mengintegrasikan pipeline inferensi Computer Vision (Klasifikasi, Segmentasi, dan Regresi Bobot).

---

## 2. Struktur Direktori Layanan Backend

```text
backend/
├── app/
│   ├── api/
│   │   ├── deps.py               # Database session & get_current_user
│   │   └── v1/
│   │       ├── auth.py           # Endpoint: /register & /login
│   │       ├── sapi.py           # Endpoint: CRUD sapi & master jenis
│   │       └── pengukuran.py     # Endpoint: upload 2 citra, inferensi, riwayat, & PBH
│   ├── core/
│   │   ├── config.py             # Settings (Pydantic BaseSettings)
│   │   └── security.py           # Password hash (bcrypt) & JWT encoder/decoder
│   ├── db/
│   │   ├── base.py               # Declarative Base
│   │   └── session.py            # Engine & sessionmaker PostgreSQL Neon (Connection Pooling)
│   ├── models/                   # SQLAlchemy ORM Models
│   │   ├── user.py
│   │   ├── sapi.py
│   │   └── pengukuran.py
│   ├── schemas/                  # Pydantic Schemas (Request/Response)
│   │   ├── user.py
│   │   ├── sapi.py
│   │   └── pengukuran.py
│   ├── services/                 # Business Logic & External Adapters
│   │   ├── neon_storage.py       # Full Neon Object Storage (S3-compatible via boto3, fail-fast, no local fallback)
│   │   ├── pbh_calculator.py     # Logika kalkulasi PBH
│   │   ├── cattle_registration.py# Helper registrasi atomik & resolusi jenis sapi
│   │   └── ai_inference.py       # Pipeline Computer Vision: Classifier, Segmentasi, Regresi Bobot
│   └── main.py                   # FastAPI app entry point, CORS, router mount
├── .env.example
├── Dockerfile
└── requirements.txt
```

---

## 3. Spesifikasi Kontrak REST API

### 3.1. Modul Autentikasi (`/api/v1/auth`)

#### A. Registrasi Pengguna
* **Endpoint:** `POST /api/v1/auth/register`
* **Request Body (JSON):**
  ```json
  {
    "username": "peternak_makmur",
    "password": "PasswordAman123!",
    "nama_user": "Budi Santoso",
    "nama_peternakan": "Makmur Farm",
    "alamat": "Jl. Raya Bogor KM 30",
    "no_telp": "081234567890"
  }
  ```
* **Response (201 Created):**
  ```json
  {
    "status": "success",
    "message": "Pendaftaran berhasil",
    "data": {
      "id_user": 1,
      "username": "peternak_makmur",
      "nama_peternakan": "Makmur Farm"
    }
  }
  ```

#### B. Login Kredensial
* **Endpoint:** `POST /api/v1/auth/login`
* **Request Body (JSON atau Form URL-Encoded):**
  ```json
  {
    "username": "peternak_makmur",
    "password": "PasswordAman123!"
  }
  ```
* **Response (200 OK):**
  ```json
  {
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "token_type": "bearer",
    "user": {
      "id_user": 1,
      "username": "peternak_makmur",
      "nama_user": "Budi Santoso",
      "nama_peternakan": "Makmur Farm"
    }
  }
  ```

---

### 3.2. Modul Data Sapi (`/api/v1/sapi`)
*Semua endpoint mewajibkan header:* `Authorization: Bearer <token>`

#### A. Tambah Sapi Baru
* **Endpoint:** `POST /api/v1/sapi/`
* **Request Body (JSON):**
  ```json
  {
    "ear_tag": "ST-001",
    "id_jenis": 1,
    "jenis_kelamin": "Jantan",
    "umur_bulan": 18,
    "tanggal_masuk": "2026-11-01"
  }
  ```
* **Response (201 Created):** Objek data sapi yang berhasil tersimpan.
* **Validasi Error (400 Bad Request):** Jika `ear_tag` sudah terdaftar pada pengguna yang sama.

#### B. Daftar Sapi Pengguna
* **Endpoint:** `GET /api/v1/sapi/`
* **Query Params:** `skip=0&limit=50&search=ST-001`
* **Response (200 OK):** Array objek sapi milik `current_user`.

#### C. Detail Sapi
* **Endpoint:** `GET /api/v1/sapi/{id_sapi}`
* **Response (200 OK):** Detail profil sapi dan riwayat pengukuran bobot terakhir.

---

### 3.3. Modul Pengukuran & AI Inferensi (`/api/v1/pengukuran`)

#### A. Eksekusi Prediksi & Simpan Pengukuran
* **Endpoint:** `POST /api/v1/pengukuran/predict`
* **Content-Type:** `multipart/form-data`
* **Form Data:**
  * Opsi Sapi Terdaftar:
    * `id_sapi` (int, opsional): ID sapi yang diukur.
  * Opsi Onboarding Sapi Baru (One-Step):
    * `ear_tag` (str, opsional): Tag telinga sapi baru.
    * `id_jenis` (int, opsional): ID jenis/ras sapi.
    * `jenis_kelamin` (str, opsional): "Jantan" atau "Betina".
    * `umur_bulan` (int, opsional): Umur sapi dalam bulan.
  * Berkas Citra (Tepat 1 foto):
    * `foto_samping` (UploadFile, opsional): Citra lateral sapi.
    * `foto_belakang` (UploadFile, opsional): Citra posterior sapi.
* **Alur Eksekusi Service:**
  1. Validasi masukan: Pastikan tepat 1 foto diunggah (`foto_samping` ATAU `foto_belakang`).
  2. Validasi kepemilikan sapi (`id_sapi`) atau verifikasi identitas sapi baru (`ear_tag` belum terdaftar pada user).
  3. Validasi format berkas citra (JPG, PNG, WebP).
  4. Eksekusi `CattleVisionService.predict_weight(...)`:
     - Klasifikasi: Verifikasi objek foto adalah sapi (ambang $\ge 0.5$, HTTP 422 jika non-sapi).
     - Segmentasi: Menghasilkan masker biner siluet sapi.
     - Regresi: Menghasilkan estimasi bobot ($\text{kg}$) berbasis 4-kanal (RGB + Masker).
  5. Unggah citra ke Full Neon Object Storage (`cattle-images`) dengan struktur path `sapi/<id_sapi>/<sudut>_<uuid>.<ext>` atau `sapi/onboarding/<sudut>_<uuid>.<ext>`.
  6. Simpan baris baru ke tabel `pengukuran` (dan tabel `sapi` jika onboarding sapi baru) secara atomik.
  7. Hitung kalkulasi PBH terhadap pengukuran historis sebelumnya.
  8. Rollback compensation: Jika database gagal commit, berkas di Neon Object Storage otomatis dibersihkan via `delete_object`.
* **Response (201 Created):**
  ```json
  {
    "status": "success",
    "message": "Estimasi bobot berhasil diproses",
    "data": {
      "id_pengukuran": 105,
      "id_sapi": 12,
      "bobot_estimasi_kg": 284.50,
      "tanggal_ukur": "2026-11-26",
      "foto_samping_url": "https://xyz.storage.us-east-2.neon.tech/cattle-images/sapi/12/samping_8b3f.jpg",
      "foto_belakang_url": null,
      "pbh_info": {
        "pbh_kg_hari": 0.85,
        "selang_hari": 14,
        "status": "NORMAL"
      }
    }
  }
  ```

#### B. Riwayat Pengukuran Sapi Tertentu
* **Endpoint:** `GET /api/v1/pengukuran/sapi/{id_sapi}`
* **Response (200 OK):** List riwayat pengukuran terurut secara descending berdasarkan `tanggal_ukur`.

#### C. Kalkulator PBH Kustom
* **Endpoint:** `POST /api/v1/pengukuran/kalkulator-pbh`
* **Request Body (JSON):**
  ```json
  {
    "bobot_awal": 250.0,
    "bobot_akhir": 272.5,
    "jumlah_hari": 25
  }
  ```
* **Response (200 OK):**
  ```json
  {
    "pbh_kg_hari": 0.90,
    "jumlah_hari": 25,
    "status": "POSITIF",
    "pesan": "Pertumbuhan bobot optimal."
  }
  ```
* **Response Kasus Negatif (200 OK):**
  ```json
  {
    "pbh_kg_hari": -0.30,
    "jumlah_hari": 20,
    "status": "PERINGATAN_PENURUNAN",
    "pesan": "Perhatian: Terjadi penurunan bobot badan. Evaluasi pakan atau cek kondisi kesehatan."
  }
  ```

---

## 4. Implementasi Logika Bisnis & Layanan

### 4.1. Kalkulator PBH (`app/services/pbh_calculator.py`)
```python
from typing import Dict, Any
from fastapi import HTTPException

def calculate_pbh(bobot_awal: float, bobot_akhir: float, jumlah_hari: int) -> Dict[str, Any]:
    if jumlah_hari <= 0:
        raise HTTPException(
            status_code=400, 
            detail="Jumlah hari antar-pengukuran harus lebih besar dari 0 hari."
        )

    kenaikan = bobot_akhir - bobot_awal
    pbh = round(kenaikan / jumlah_hari, 2)

    if pbh < 0:
        status = "PERINGATAN_PENURUNAN"
        pesan = "Perhatian: Terjadi penurunan bobot badan. Evaluasi asupan nutrisi/pakan."
    else:
        status = "NORMAL"
        pesan = "Pertumbuhan bobot berjalan normal."

    return {
        "pbh_kg_hari": pbh,
        "selang_hari": jumlah_hari,
        "selisih_bobot_kg": round(kenaikan, 2),
        "status": status,
        "pesan": pesan
    }
```

### 4.2. Neon Object Storage Service (`app/services/neon_storage.py`)
```python
import uuid
import os
import boto3
from botocore.config import Config
from fastapi import UploadFile, HTTPException

ENDPOINT_URL = os.getenv("AWS_ENDPOINT_URL_S3")
ACCESS_KEY = os.getenv("AWS_ACCESS_KEY_ID")
SECRET_KEY = os.getenv("AWS_SECRET_ACCESS_KEY")
STORAGE_BUCKET = os.getenv("NEON_STORAGE_BUCKET_NAME", "cattle-images")

s3_config = Config(s3={"addressing_style": "path"})
s3_client = boto3.client(
    "s3",
    endpoint_url=ENDPOINT_URL,
    aws_access_key_id=ACCESS_KEY,
    aws_secret_access_key=SECRET_KEY,
    config=s3_config
)

async def upload_image_to_neon(file: UploadFile) -> str:
    content_type = file.content_type
    if not content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Berkas harus berupa gambar valid")

    file_bytes = await file.read()
    file_ext = file.filename.split(".")[-1]
    unique_filename = f"{uuid.uuid4()}.{file_ext}"

    try:
        s3_client.put_object(
            Bucket=STORAGE_BUCKET,
            Key=unique_filename,
            Body=file_bytes,
            ContentType=content_type
        )
        return f"{ENDPOINT_URL.rstrip('/')}/{STORAGE_BUCKET}/{unique_filename}"
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Gagal mengunggah citra ke Neon Object Storage: {str(e)}")
```

### 4.3. AI Inference Abstraction & Mock Service (`app/services/ai_inference.py`)
```python
import os
import random
import asyncio
from fastapi import HTTPException, UploadFile

USE_MOCK_AI = os.getenv("USE_MOCK_AI", "True").lower() == "true"

class CattleVisionService:
    @staticmethod
    async def predict_weight(
        foto_samping: UploadFile,
        foto_belakang: UploadFile,
        umur_bulan: int,
        jenis_kelamin: str
    ) -> float:
        """
        Abstraksi AI Engine:
        Jika USE_MOCK_AI=True: Menghasilkan nilai regresi tersimulasi (60 - 450 kg)
        Jika USE_MOCK_AI=False: Memanggil runtime model YOLOv5 + CNN ONNX
        """
        if USE_MOCK_AI:
            # Simulasi latensi pemrosesan pipeline computer vision
            await asyncio.sleep(0.6)

            # Hitung estimasi berbasis umur dan jenis kelamin ternak
            faktor_gender = 1.1 if jenis_kelamin.lower() == "jantan" else 1.0
            base_weight = (120.0 + (umur_bulan * 6.5)) * faktor_gender
            noise = random.uniform(-10.0, 10.0)
            
            # Batasi dalam rentang operasional valid (60 - 450 kg)
            simulated_weight = round(min(max(base_weight + noise, 60.0), 450.0), 2)
            return simulated_weight

        # Integrasi nyata saat artifak model dari /ai_engine telah tersedia
        raise NotImplementedError("Real AI Engine model weights belum dihubungkan ke server.")
```

---

## 5. Kebutuhan Non-Fungsional (Backend Specific)

1. **Keamanan Data (Multi-tenancy):**
   * Semua query pembacaan, pengubahan, dan penghapusan tabel `sapi` dan `pengukuran` **wajib** menyaring kondisi `sapi.id_user == current_user.id_user`.
2. **Latensi Layanan:**
   * Waktu respon endpoint inferensi $\le 2\text{ detik}$ (termasuk upload ke Neon Object Storage dan komputasi model).
3. **Penyimpanan Berkas Terstandarisasi:**
   * Nama berkas asli pengguna tidak boleh digunakan di disk atau storage; wajib menggunakan representasi UUID acak (`uuid4.ext`).
4. **Resiliensi Koneksi Database:**
   * Menggunakan *connection pooling* via SQLAlchemy dengan parameter `pool_size=10` dan `max_overflow=20` untuk mengakomodasi auto-suspend dan cold-start Neon PostgreSQL Serverless.