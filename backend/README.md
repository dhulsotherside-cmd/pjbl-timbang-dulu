# TimbangDulu Backend API Service

Backend RESTful API untuk platform **TimbangDulu** — Solusi estimasi bobot sapi berbasis Computer Vision dan pemantauan Perkembangan Bobot Harian (PBH).

Dibangun menggunakan **FastAPI**, **SQLAlchemy**, **TensorFlow/Keras**, dan **Neon PostgreSQL**. Untuk pengembangan lokal, backend juga mendukung SQLite dan penyimpanan foto ke disk.

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
│   │   ├── neon_storage.py       # Upload citra ke Neon Object Storage S3-compatible (UUID unik)
│   │   ├── pbh_calculator.py     # Kalkulator Perkembangan Bobot Harian (ADG)
│   │   └── ai_inference.py       # Klasifikasi, segmentasi dan regresi bobot
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
- Python 3.12 (versi yang diuji)
- Database SQLite lokal atau PostgreSQL
- Berkas model di `model_prediksi/` di sebelah direktori `backend/`

### 2. Konfigurasi Lingkungan (.env)
Pada instalasi baru, salin `.env.example` menjadi `.env`.
```bash
cp .env.example .env
```

Template menggunakan SQLite lokal. Untuk memakai Neon, isi `DATABASE_URL` dengan connection string PostgreSQL. Jika ketiga variabel kredensial S3 dikosongkan, backend menyimpan foto di `backend/uploads/` dan menyajikannya lewat `/uploads/`. Untuk memakai bucket Neon, isi `AWS_ENDPOINT_URL_S3`, `AWS_ACCESS_KEY_ID`, dan `AWS_SECRET_ACCESS_KEY`.

#### Memilih model penimbangan

Ubah pengaturan berikut di `backend/.env`, lalu mulai ulang `python main.py`. Path relatif dihitung dari folder `backend/`. Path absolut juga didukung.

```env
CATTLE_CLASSIFIER_PATH=../model_prediksi/sapibukan_cifor.keras
CATTLE_SEGMENTATION_PATH=../model_prediksi/best_seg_model.keras
CATTLE_REGRESSION_PATH=../model_prediksi/best_reg_model.keras
```

Classifier Keras menerima foto dengan probabilitas sapi minimal 0,5 sesuai `cattle_check_meta.json`. Untuk memakai checkpoint PyTorch, jalankan `python -m pip install -r requirements-pytorch.txt`, ganti `CATTLE_CLASSIFIER_PATH` menjadi `../model_prediksi/klasifikasi_sapibukan.pth`, lalu mulai ulang backend. Model ini memilih kelas dengan skor tertinggi sesuai `klasifikasi_sapibukan.ipynb`. Kelas `cow` memiliki indeks 13 pada urutan folder dataset pelatihan. [Daftar kelas pada dataset](https://www.kaggle.com/dsv/9339402)

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
Jalankan server aplikasi secara langsung dengan:
```bash
python main.py
```
*(Atau menggunakan perintah CLI Uvicorn secara langsung: `uvicorn app.main:app --reload --port 8000`)*

Layanan akan aktif di `http://127.0.0.1:8000`.

- **Interactive API Documentation (Swagger UI):** [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
- **Alternative ReDoc Documentation:** [http://127.0.0.1:8000/redoc](http://127.0.0.1:8000/redoc)

---

## 🧪 Menjalankan Automated Test Suite

Untuk memastikan seluruh logika bisnis, multi-tenancy, dan kalkulator PBH berjalan akurat:
```bash
python -m pip install pytest httpx
python -m pytest -v
```

---

## 🔑 Fitur Utama & Logika Bisnis

1. **Multi-Tenancy Isolation:**
   - Semua operasi data `sapi` dan `pengukuran` difilter ketat terhadap `current_user.id_user`.
   - Ear tag unik per peternak (Peternak A dan Peternak B dapat menggunakan ear tag yang sama tanpa bentrok).
2. **Penimbangan melalui `POST /api/v1/pengukuran/predict`**
   - Kirim satu foto melalui `multipart/form-data`. Gunakan field `foto_samping` atau `foto_belakang` sesuai sudut pengambilan (JPEG, PNG, atau WebP).
   - Untuk sapi terdaftar, kirim `id_sapi`. Untuk sapi baru, kirim `ear_tag`, `id_jenis`, `jenis_kelamin` dan `umur_bulan`.
   - Backend memeriksa apakah foto berisi sapi. Jika ditolak, API mengembalikan HTTP 422 dan pengguna dapat mengganti foto.
   - Sesuai `model_prediksi/cekbobotsapi.ipynb`, model segmentasi menerima RGB berukuran 224 × 224 dalam rentang 0–1. Regresi menggunakan RGB dan masker hasil segmentasi sebagai empat kanal. Pengukuran menyimpan bobot dari satu keluaran regresi dalam kilogram, dibulatkan hingga dua desimal, beserta foto pada kolom sudut yang dipilih.
   - Respons HTTP 201 memuat ID sapi, ID pengukuran dan bobot yang tersimpan. Untuk sapi baru, profil dan pengukuran pertama tersimpan dalam satu transaksi. Data Sapi, riwayat, dan dashboard membaca database yang sama.
3. **Kalkulator PBH (Perkembangan Bobot Harian):**
   - Rumus: $\text{PBH} = \frac{\text{Bobot Akhir} - \text{Bobot Awal}}{\Delta \text{Hari}}$.
   - Guardrail: $\Delta \text{Hari} > 0$ (mencegah pembagian dengan nol atau tanggal invalid).
   - Alert Status: `PERINGATAN_PENURUNAN` jika PBH negatif, memberikan saran evaluasi nutrisi dan kesehatan.
