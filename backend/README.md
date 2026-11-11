# TimbangDulu Backend API Service

Backend RESTful API untuk platform **TimbangDulu** — Solusi estimasi bobot sapi berbasis Computer Vision dan pemantauan Perkembangan Bobot Harian (PBH).

Dibangun menggunakan **FastAPI**, **SQLAlchemy 2.0**, **PostgreSQL (Supabase)**, dan **Supabase Storage** dengan arsitektur decoupled dan pluggable Mock AI Inference.

---

## 📁 Struktur Direktori

```text
backend/
├── app/
│   ├── api/
│   │   ├── deps.py               # Dependency injection: database session & get_current_user (JWT)
│   │   └── v1/
│   │       ├── auth.py           # Endpoint: /register, /login, & /me
│   │       ├── sapi.py           # Endpoint: CRUD sapi & master jenis sapi
│   │       └── pengukuran.py     # Endpoint: /predict, riwayat pengukuran, & /kalkulator-pbh
│   ├── core/
│   │   ├── config.py             # App Settings (Pydantic BaseSettings)
│   │   └── security.py           # Bcrypt hashing & JWT encoder/decoder
│   ├── db/
│   │   ├── base.py               # SQLAlchemy 2.0 DeclarativeBase
│   │   ├── session.py            # SQLAlchemy Engine & SessionMaker dengan Connection Pooling
│   │   └── init_db.py            # Skrip verifikasi koneksi & sinkronisasi tabel
│   ├── models/                   # SQLAlchemy ORM Models
│   │   ├── user.py               # Tabel users
│   │   ├── jenis_sapi.py         # Tabel jenis_sapi
│   │   ├── sapi.py               # Tabel sapi (UniqueConstraint: id_user + ear_tag)
│   │   └── pengukuran.py         # Tabel pengukuran bobot & path foto
│   ├── schemas/                  # Pydantic Schemas (Request/Response DTO)
│   │   ├── user.py
│   │   ├── sapi.py
│   │   └── pengukuran.py
│   ├── services/                 # Business Logic & Adapters
│   │   ├── supabase_storage.py   # Upload citra ke Supabase Storage (UUID unik)
│   │   ├── pbh_calculator.py     # Kalkulator Perkembangan Bobot Harian (ADG)
│   │   └── ai_inference.py       # CattleVisionService (Mock / ONNX Model)
│   └── main.py                   # FastAPI Application Entrypoint & CORS Middleware
├── tests/                        # Automated Pytest Suite
│   ├── test_ai_inference.py
│   ├── test_api_integration.py
│   ├── test_pbh.py
│   └── test_security.py
├── .env.example                  # Template variabel lingkungan
├── .env                          # Konfigurasi aktif
├── .gitignore
├── requirements.txt
└── README.md
```

---

## 🚀 Panduan Memulai Cepat (Quick Start)

### 1. Prasyarat Lingkungan
- Python 3.10+ (atau Python 3.13)
- Database PostgreSQL (atau Supabase Project)

### 2. Konfigurasi Lingkungan (.env)
Salin `.env.example` menjadi `.env` dan sesuaikan nilainya:
```bash
cp .env.example .env
```

Isi konfigurasi pada berkas `.env`:
```env
# Database
DATABASE_URL="postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres"

# Supabase Storage
SUPABASE_URL="https://[PROJECT-REF].supabase.co"
SUPABASE_KEY="[SERVICE_ROLE_OR_ANON_KEY]"
SUPABASE_BUCKET_NAME="cattle-images"

# JWT
SECRET_KEY="supersecretjwtkeyforlocaldevelopmentchangesinprod"
ALGORITHM="HS256"
ACCESS_TOKEN_EXPIRE_MINUTES=1440

# Mode Mock AI (True: Simulasi 60-450 kg, False: Model Riil)
USE_MOCK_AI=True
```

### 3. Setup Virtual Environment & Dependensi
```bash
python -m venv .venv

# Windows PowerShell:
.\.venv\Scripts\Activate.ps1

# Linux / macOS:
source .venv/bin/activate

# Instal dependensi:
pip install -r requirements.txt
```

### 4. Inisialisasi Database
Jalankan skrip `init_db.py` untuk menguji koneksi database, membuat tabel relasional, dan seeding master data jenis sapi:
```bash
python -m app.db.init_db
```

### 5. Menjalankan Server Backend
```bash
uvicorn app.main:app --reload
```
Layanan akan aktif di `http://127.0.0.1:8000`.

- **Interactive API Documentation (Swagger UI):** [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
- **Alternative ReDoc Documentation:** [http://127.0.0.1:8000/redoc](http://127.0.0.1:8000/redoc)

---

## 🧪 Menjalankan Automated Test Suite

Untuk memastikan seluruh logika bisnis, multi-tenancy, dan kalkulator PBH berjalan akurat:
```bash
pytest -v
```

---

## 🔑 Fitur Utama & Logika Bisnis

1. **Multi-Tenancy Isolation:**
   - Semua operasi data `sapi` dan `pengukuran` difilter ketat terhadap `current_user.id_user`.
   - Ear tag unik per peternak (Peternak A dan Peternak B dapat menggunakan ear tag yang sama tanpa bentrok).
2. **Pipeline Inferensi Citra (`POST /api/v1/pengukuran/predict`):**
   - Menerima dua berkas citra: `foto_samping` (lateral) dan `foto_belakang` (posterior).
   - Validasi MIME type dan ekstensi gambar (`.jpg`, `.jpeg`, `.png`, `.webp`).
   - Eksekusi `CattleVisionService.predict_weight()`:
     - Jika `USE_MOCK_AI=True`: Latensi 0.5 - 0.8 detik, bobot 60 - 450 kg berdasarkan umur dan jenis kelamin.
   - Upload kedua gambar dengan nama acak `uuid4().ext` ke Supabase Object Storage.
   - Simpan data pengukuran ke database PostgreSQL.
   - Secara otomatis menghitung PBH terhadap pengukuran historis sebelumnya.
3. **Kalkulator PBH (Perkembangan Bobot Harian):**
   - Rumus: $\text{PBH} = \frac{\text{Bobot Akhir} - \text{Bobot Awal}}{\Delta \text{Hari}}$.
   - Guardrail: $\Delta \text{Hari} > 0$ (mencegah pembagian dengan nol atau tanggal invalid).
   - Alert Status: `PERINGATAN_PENURUNAN` jika PBH negatif, memberikan saran evaluasi nutrisi dan kesehatan.
