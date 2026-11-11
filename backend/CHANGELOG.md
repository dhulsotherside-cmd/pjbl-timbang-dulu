# Changelog — TimbangDulu Backend Service

Semua perubahan pada proyek backend TimbangDulu didokumentasikan di berkas ini.
Format pencatatan berpedoman pada [Keep a Changelog](https://keepachangelog.com/id/1.0.0/) dan menganut penomoran versi [Semantic Versioning (SemVer)](https://semver.org/).

---

## [0.1.0] - 2026-11-11 — Initial Backend MVP Setup

Tahap fondasi pertama arsitektur backend mandiri (decoupled) untuk layanan estimasi bobot sapi dan pemantauan bobot harian (PBH).

### Added
- **Core Configuration & Security Layer:**
  - `app/core/config.py`: Pengaturan lingkungan berbasis Pydantic `BaseSettings` (`SettingsConfigDict`) yang memuat konfigurasi database, Supabase Object Storage, JWT, dan toggle Mock AI.
  - `app/core/security.py`: Implementasi enkripsi password via `bcrypt`, verifikasi kredensial aman, pembuatan JWT token (`HS256`), dan decoder payload klaim `sub` / `exp`.
- **Database Layer & Connection Pooling:**
  - `app/db/base.py`: `DeclarativeBase` standar SQLAlchemy 2.0.
  - `app/db/session.py`: Inisialisasi engine PostgreSQL dengan connection pooling (`pool_size=10`, `max_overflow=20`, `pool_recycle=300`, `pool_pre_ping=True`) untuk resiliensi Supabase.
  - `app/db/init_db.py`: Skrip utilitas migrasi tabel (`Base.metadata.create_all`) dan seeding master ras sapi.
- **Relational ORM Models:**
  - `app/models/user.py`: Model tabel `users` (akun peternak).
  - `app/models/jenis_sapi.py`: Model tabel `jenis_sapi` (master data ras).
  - `app/models/sapi.py`: Model tabel `sapi` dengan relasi foreign key ke user dan jenis sapi.
  - `app/models/pengukuran.py`: Model tabel `pengukuran` (riwayat bobot, tanggal ukur, path berkas foto).
- **Pydantic Data Transfer Objects (DTO):**
  - `app/schemas/user.py`: Schema `UserCreate`, `UserLogin`, `RegisterResponse`, `LoginResponse`, dan `TokenPayload`.
  - `app/schemas/sapi.py`: Schema `JenisSapiResponse`, `SapiCreate`, `SapiUpdate`, `SapiResponse`, dan `SapiDetailResponse`.
  - `app/schemas/pengukuran.py`: Schema `PBHInfo`, `PredictResponseData`, `PredictResponse`, `KalkulatorPBHRequest`, dan `KalkulatorPBHResponse`.
- **Decoupled Business Services & Adapters:**
  - `app/services/supabase_storage.py`: Adapter Supabase Storage Bucket `cattle-images` dengan sanitasi UUID acak dan fallback mock URL.
  - `app/services/pbh_calculator.py`: Logika kalkulasi Perkembangan Bobot Harian (ADG) beserta penentuan status pertumbuhan (`NORMAL` / `PERINGATAN_PENURUNAN`).
  - `app/services/ai_inference.py`: Abstraksi `CattleVisionService` dengan toggle `USE_MOCK_AI=True` yang menghasilkan estimasi bobot valid ($60.0 - 450.0\text{ kg}$) dan latensi simulasi $0.5 - 0.8\text{ detik}$.
- **API Routing & Dependency Injection:**
  - `app/api/deps.py`: Dependency `get_db` dan `get_current_user` penegak multi-tenancy.
  - `app/api/v1/auth.py`: Endpoint `/register`, `/login`, dan `/me`.
  - `app/api/v1/sapi.py`: Endpoint CRUD sapi pengguna dan daftar master ras sapi.
  - `app/api/v1/pengukuran.py`: Endpoint inferensi citra `/predict`, riwayat pengukuran `/sapi/{id_sapi}`, dan `/kalkulator-pbh`.
  - `app/main.py`: Entrypoint FastAPI, CORS middleware, OpenAPI docs `/docs` dan `/redoc`.
- **Automated Test Suite (Pytest):**
  - `tests/test_pbh.py`: Pengujian logika PBH dan guardrail selang hari.
  - `tests/test_security.py`: Pengujian hashing kata sandi dan JWT.
  - `tests/test_ai_inference.py`: Pengujian simulasi rentang bobot AI.
  - `tests/test_api_integration.py`: Pengujian integrasi alur kerja penuh secara end-to-end (12 tests passed).
- **Environment & Dokumentasi:**
  - `requirements.txt`: Daftar dependensi produksi.
  - `.env.example` & `.env`: Template dan konfigurasi runtime lokal.
  - `.gitignore`: Proteksi virtual environment, cache, dan secret.
  - `README.md`: Panduan quickstart operasional.
  - `DEV_STATE.md`: Memory log snapshot status arsitektur untuk sprint berikutnya.

### Fixed / Guardrails
- **Isolasi Multi-Tenancy Sapi:** Penerapan `UniqueConstraint("id_user", "ear_tag", name="uq_user_ear_tag")` pada tabel `sapi` sehingga ear tag bersifat unik per peternak, namun pengguna yang berbeda diperbolehkan menggunakan nomor telinga yang sama.
- **Validasi Berkas Citra Unggahan:** Validasi MIME type (`image/jpeg`, `image/png`, `image/webp`) dan ekstensi pada kedua citra (`foto_samping` dan `foto_belakang`) sebelum diproses oleh model atau diunggah ke storage.
- **Guardrail Pembagian Nol PBH:** Penolakan eksekusi kalkulasi jika $\Delta\text{Hari} \le 0$ dengan melempar `HTTP 400 Bad Request`.
- **Ketahanan Connection Pooling Supabase:** Penambahan parameter `pool_recycle=300` dan `pool_pre_ping=True` pada SQLAlchemy engine untuk mencegah *stale socket connection* pada Supabase Transaction Pooler.
- **Normalisasi Driver PostgreSQL:** Penanganan otomatis `postgresql://` $\rightarrow$ `postgresql+psycopg2://` pada runtime SQLAlchemy 2.0 untuk memastikan kompatibilitas `psycopg2-binary`.
- **Resiliensi Hashing Password:** Fallback native `bcrypt` disematkan jika `passlib` mendeteksi ketidakcocokan versi pada Python 3.13.

### Pending Dependencies
- **Model Weights Computer Vision (`ai_engine`):**
  - Integrasi berkas model riil (YOLOv5 bounding-box detector + CNN weight estimator dalam format `.onnx` atau `.pt`) dari tim AI Engine untuk menggantikan `USE_MOCK_AI=True`.
- **Antarmuka Pengambilan Citra (`frontend`):**
  - Integrasi kamera WebRTC / file upload multi-angle (samping dan belakang) dari antarmuka React frontend ke endpoint `POST /api/v1/pengukuran/predict`.
