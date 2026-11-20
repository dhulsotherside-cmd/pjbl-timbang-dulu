# Changelog — TimbangDulu Backend Service

Semua perubahan pada proyek backend TimbangDulu didokumentasikan di berkas ini.
Format pencatatan berpedoman pada [Keep a Changelog](https://keepachangelog.com/id/1.0.0/) dan menganut penomoran versi [Semantic Versioning (SemVer)](https://semver.org/).

---

## [0.2.2] - 2026-11-20 — Route Guard (ProtectedRoute) & Reverse Guard Implementation

Peningkatan keamanan navigasi pada Frontend React dengan menerapkan mekanisme pembatasan rute internal (*route guards*) dan pencegahan akses guest tanpa token.

### Added
- **Route Guard Protection (`ProtectedRoute.jsx`):**
  - Implementasi komponen guard [ProtectedRoute.jsx](file:///C:/Users/THINKPAD/Documents/Banu/IPB/proyek/TimbangDulu/frontend/src/components/auth/ProtectedRoute.jsx) yang memeriksa token JWT dan state autentikasi pada `AuthContext`.
  - Mencegah akses langsung ke rute internal (`/dashboard`, `/app`, `/app/sapi`, `/app/ukur`, `/app/akun`) oleh pengguna tanpa sesi aktif, dengan auto-redirect ke `/login` menggunakan `<Navigate to="/login" replace state={{ from: location }} />`.
  - Penanganan state pemuatan (`isLoading`) untuk menghindari kedipan (*flash*) layar atau pengalihan palsu saat token diverifikasi.
- **Reverse Route Guard (`GuestRoute.jsx`):**
  - Mencegah pengguna yang telah memiliki token aktif untuk mengakses kembali form `/login` atau `/register`, secara otomatis mengalihkannya ke dashboard `/app`.
- **Global 401 Unauthorized Response Interceptor:**
  - Penambahan Axios response interceptor pada [api.js](file:///C:/Users/THINKPAD/Documents/Banu/IPB/proyek/TimbangDulu/frontend/src/services/api.js) untuk membersihkan token kedaluwarsa dari `localStorage` dan meredirect pengguna kembali ke `/login` saat token habis masa berlakunya.

---

## [0.2.1] - 2026-11-20 — Backend Runner Simplification & Account Logout Flow

Penyederhanaan alur eksekusi backend FastAPI dan integrasi alur keluar akun (logout) pada antarmuka frontend React.

### Added
- **Simplified Backend CLI Runner (`backend/main.py`):**
  - Pembuatan skrip runner `main.py` di root direktori backend sehingga pengembang dapat menjalankan server cukup dengan perintah `python main.py`.
  - Mengonfigurasi otomatis `uvicorn.run("app.main:app", host="127.0.0.1", port=8000, reload=True)` dengan injeksi `sys.path` dinamis untuk menjamin deteksi modul `app` di semua virtual environment (Windows/Linux/macOS).
  - Pembaruan panduan eksekusi pada `backend/README.md`.
- **Interactive Logout Flow & Confirmation Dialog (`frontend/src/pages/AccountPage.jsx`):**
  - Implementasi modal dialog konfirmasi interaktif (*"Apakah Anda yakin ingin keluar dari akun TimbangDulu?"*) dengan proteksi klik tidak sengaja di lapangan serta dukungan penutupan dialog via tombol Escape.
  - Integrasi fungsi `handleConfirmLogout` dengan `AuthContext.logout()`, pembersihan `timbangdulu_token` dari `localStorage`, dan reset state autentikasi klien.
  - Navigasi otomatis kembali ke halaman login `/login` menggunakan opsi `{ replace: true }` untuk mencegah pengguna kembali ke sesi akun melalui riwayat navigasi (*browser back button*).
  - Penambahan gaya visual modal dialog dan tombol aksi pada `frontend/src/pages/AccountPage.module.css`.

---

## [0.2.0] - 2026-11-20 — Neon Database Connection Pooling & Frontend Auth Integration

Tahap integrasi database PostgreSQL Neon (serverless pooled connection), eksekusi skema relasional, seeding akun pengujian, dan penyambungan autentikasi formulir login frontend React ke backend FastAPI.

### Added
- **Neon PostgreSQL Support & Resilient Connection Pooling:**
  - `backend/.env` & `backend/.env.example`: Penyesuaian format koneksi Neon menggunakan mode pooling (`-pooler`) dan parameter `sslmode=require`.
  - `app/db/session.py`: Penambahan `connect_timeout=15` detik serta pengaktifan `pool_pre_ping=True` dan `pool_recycle=300` detik untuk menangani perilaku *scale-to-zero / auto-suspend* bawaan Neon.
  - `app/core/config.py`: Resolusi direktori berkas `.env` absolut (`ENV_PATH`) untuk memastikan konfigurasi database terbaca akurat terlepas dari direktori kerja eksekusi.
- **Relational Schema Enhancement & Verification Script:**
  - `app/models/pengukuran.py`: Penambahan composite index time-series `idx_pengukuran_sapi_tanggal` pada kolom `(id_sapi, tanggal_ukur)` untuk mengoptimasi query histori pengukuran dan kalkulasi PBH.
  - `app/db/init_db.py`: Modul inisialisasi skema mandiri yang mendukung diagnosis tipe host, pembuatan tabel, seeding 8 jenis sapi master, seeding akun peternak dummy uji coba (`peternak_demo` / `Password123!`), dan inspeksi verifikasi skema tabel (PK, FK, Unique constraints, Indexes).
- **Frontend Authentication & State Integration:**
  - `frontend/src/services/api.js`: Penambahan Axios request interceptor yang secara otomatis menyematkan header `Authorization: Bearer <token>` dari `localStorage` jika token tersedia.
  - `frontend/src/pages/LoginPage.jsx`: Penyambungan form login ke `AuthContext.login()`, penanganan validasi input, disable tombol saat proses berlangsung, tampilan notifikasi error kredensial salah (401 Unauthorized) atau gangguan jaringan, dan redirect ke rute dashboard.
  - `frontend/src/components/auth/AuthLayout.module.css`: Penambahan class visual `.feedbackError` dengan styling kontras merah ramah pengguna untuk menampilkan alert kegagalan autentikasi.
  - `frontend/src/App.jsx`: Penambahan rute alias `/dashboard` yang me-redirect pengguna secara mulus ke `/app` (tata letak antarmuka utama).

### Changed
- `LoginPage.jsx`: Mengubah input email menjadi input fleksibel "Username atau Email" (`type="text"`) agar mendukung login dengan username peternak maupun email tanpa terblokir validasi HTML5.

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
