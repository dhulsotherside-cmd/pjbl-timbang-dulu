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

#### A. Tahap 1: Preview Estimasi Bobot (Inference Only)
* **Endpoint:** `POST /api/v1/pengukuran/predict`
* **Content-Type:** `multipart/form-data`
* **Form Data:**
  * Berkas Citra (Tepat 1 foto tampak samping penuh):
    * `foto` (UploadFile, wajib — alias `foto_samping` tetap didukung demi kompatibilitas).
* **Karakteristik & Alur Eksekusi:**
  1. Validasi berkas citra mentah (*raw bytes*, format JPG, PNG, atau WebP).
  2. Masukkan citra mentah langsung ke pipeline 3 model Keras AI (JANGAN dikompresi sebelum inferensi agar akurasi fitur visual tidak terdegradasi).
  3. Tahapan Model:
     - Klasifikasi: Verifikasi objek adalah sapi (ambang $\ge 0.5$, HTTP 422 jika non-sapi).
     - Segmentasi: Menghasilkan masker siluet tubuh sapi.
     - Regresi: Menghitung estimasi bobot ($\text{kg}$) berbasis citra + masker.
  4. **Strict Isolation:** Endpoint ini **TIDAK** menulis ke PostgreSQL dan **TIDAK** mengunggah berkas ke Neon Object Storage.
* **Response (200 OK):**
  ```json
  {
    "status": "success",
    "message": "Estimasi bobot berhasil dihitung",
    "estimated_weight_kg": 284.50,
    "confidence": 0.94,
    "model_version": "v3-keras-three-stage"
  }
  ```

#### B. Tahap 2: Simpan Pengukuran Permanen (Two-Step Commit)
* **Endpoint:** `POST /api/v1/pengukuran/save`
* **Content-Type:** `multipart/form-data`
* **Form Data:**
  * `foto` (UploadFile, wajib): Citra sapi yang diestimasi.
  * `bobot` (float, wajib): Nilai estimasi bobot hasil dari Tahap 1.
  * Target Sapi (pilih salah satu alur):
    * Opsi Sapi Terdaftar: `id_sapi` (int, opsional).
    * Opsi Onboarding Sapi Baru (One-Step): `ear_tag` (str), `id_jenis` (int), `jenis_kelamin` (str: "Jantan"/"Betina"), `umur_bulan` (int).
* **Alur Eksekusi Service:**
  1. Kompresi gambar: Konversi citra ke `.webp` via `compress_to_webp(quality=80, max_size=1280)` dengan normalisasi orientasi `ImageOps.exif_transpose` dan RGB conversion.
  2. Unggah berkas `.webp` ke Neon Object Storage (`cattle-images`) dengan `ContentType="image/webp"`.
  3. Struktur path objek: `sapi/{id_sapi}/{uuid}.webp`.
  4. Transaksi Atomik Database:
     - Jika onboarding: daftarkan sapi baru terlebih dahulu.
     - Simpan baris baru ke tabel `pengukuran`. Simpan **relative object key** ke kolom `path_foto_samping` (biarkan `path_foto_belakang` bernilai `NULL`).
  5. Rollback Compensation: Jika transaksi database gagal, otomatis jalankan `delete_uploaded_image(object_key)` ke Neon Object Storage untuk mencegah orphan files.
  6. Kembalikan response dengan URL presigned untuk tampilan instan di antarmuka pengguna.
* **Response (201 Created):**
  ```json
  {
    "status": "success",
    "message": "Pengukuran berhasil disimpan",
    "data": {
      "id_pengukuran": 105,
      "id_sapi": 12,
      "bobot": 284.50,
      "tanggal_ukur": "2026-11-26",
      "foto_url": "https://xyz.storage.us-east-2.neon.tech/cattle-images/sapi/12/3fa85f64-5717-4562-b3fc-2c963f66afa6.webp?X-Amz-Signature=...",
      "pbh_info": {
        "pbh_kg_hari": 0.85,
        "selang_hari": 14,
        "status": "NORMAL"
      }
    }
  }
  ```

#### C. Analitik Pertumbuhan PBH & Histori Foto Dinamis
* **Endpoint:** `GET /api/v1/pengukuran/history/{id_sapi}`
* **Header:** `Authorization: Bearer <token>`
* **Karakteristik & Perhitungan:**
  1. Validasi multi-tenancy: pastikan sapi dengan `id_sapi` terdaftar milik `current_user`.
  2. Ambil seluruh data pengukuran terurut kronologis (`tanggal_ukur` ascending).
  3. Perhitungan Metrik Agregat:
     - `bobot_awal`: Bobot pertama kali sapi ditimbang.
     - `bobot_terkini`: Bobot pengukuran paling akhir.
     - `total_pertambahan_kg`: `bobot_terkini - bobot_awal`.
     - `rata_rata_pbh`: Rata-rata penambahan bobot harian (kg/hari).
     - `is_weight_loss`: `True` jika tren PBH terakhir atau rata-rata bernilai negatif.
  4. Guardrails Pembagian Nol:
     - Jika hanya ada 1 data penimbangan atau selisih hari pengukuran bernilai 0 (`selisih_hari == 0`), nilai interval PBH dan `rata_rata_pbh` bernilai `null` (bukan error).
  5. Konversi URL Dinamis:
     - Setiap object key `.webp` yang tersimpan pada `path_foto_samping` dikonversi menjadi URL presigned/akses valid pada field `foto_url`.
* **Response (200 OK):**
  ```json
  {
    "id_sapi": 12,
    "ear_tag": "ST-001",
    "ringkasan": {
      "bobot_awal": 250.0,
      "bobot_terkini": 284.5,
      "total_pertambahan_kg": 34.5,
      "rata_rata_pbh": 0.86,
      "is_weight_loss": false
    },
    "riwayat": [
      {
        "id_pengukuran": 101,
        "tanggal_ukur": "2026-10-15",
        "bobot_kg": 250.0,
        "pbh_kg_hari": null,
        "selang_hari": null,
        "status_pbh": null,
        "foto_url": "https://xyz.storage.us-east-2.neon.tech/cattle-images/sapi/12/init.webp?..."
      },
      {
        "id_pengukuran": 105,
        "tanggal_ukur": "2026-11-26",
        "bobot_kg": 284.5,
        "pbh_kg_hari": 0.82,
        "selang_hari": 42,
        "status_pbh": "NORMAL",
        "foto_url": "https://xyz.storage.us-east-2.neon.tech/cattle-images/sapi/12/3fa85f64.webp?..."
      }
    ]
  }
  ```

#### D. Riwayat Pengukuran Sapi Sederhana
* **Endpoint:** `GET /api/v1/pengukuran/sapi/{id_sapi}`
* **Response (200 OK):** List riwayat pengukuran terurut secara descending berdasarkan `tanggal_ukur`.

#### E. Kalkulator PBH Kustom
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

### 4.2. Utilitas Kompresi WebP & Neon Object Storage (`app/services/image_utils.py` & `app/services/neon_storage.py`)
```python
import io
import uuid
import boto3
from PIL import Image, ImageOps
from botocore.config import Config
from app.core.config import settings

def compress_to_webp(image_bytes: bytes, max_size: int = 1280, quality: int = 80) -> bytes:
    """Mengubah format citra ke WEBP terkompresi dengan EXIF transpose dan resizing proporsional."""
    img = Image.open(io.BytesIO(image_bytes))
    img = ImageOps.exif_transpose(img)
    img = img.convert("RGB")
    
    if max(img.size) > max_size:
        img.thumbnail((max_size, max_size), Image.Resampling.LANCZOS)
        
    out = io.BytesIO()
    img.save(out, format="WEBP", quality=quality, optimize=True)
    return out.getvalue()

def upload_bytes_to_neon(image_bytes: bytes, object_key: str, content_type: str = "image/webp") -> str:
    """Mengunggah raw bytes terkompresi ke Neon Object Storage secara fail-fast."""
    s3_client.put_object(
        Bucket=settings.NEON_STORAGE_BUCKET_NAME,
        Key=object_key,
        Body=image_bytes,
        ContentType=content_type,
    )
    return object_key
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