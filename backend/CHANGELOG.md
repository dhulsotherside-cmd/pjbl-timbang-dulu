# Changelog — TimbangDulu Backend Service

Semua perubahan pada proyek backend TimbangDulu didokumentasikan di berkas ini.
Format pencatatan berpedoman pada [Keep a Changelog](https://keepachangelog.com/id/1.0.0/) dan menganut penomoran versi [Semantic Versioning (SemVer)](https://semver.org/).

---

## [0.4.0] - 2026-11-23 — Cattle CRUD Management & Initial Weight Tracking

Implementasi penuh manajemen CRUD data sapi terisolasi multi-tenancy (`/api/v1/sapi`), pencatatan transaksi atomik bobot awal manual ke tabel `pengukuran`, migrasi kolom foto nullable pada Neon PostgreSQL, penyambungan antarmuka React (`CattlePage.jsx` & `CattleDetailPage.jsx`), serta endpoint pengarsipan (*soft delete* via `tanggal_keluar`).

### Added
- **Database DDL Migration & Model Nullable Columns (`app/models/pengukuran.py`):**
  - Migrasi DDL `ALTER TABLE pengukuran ALTER COLUMN path_foto_samping DROP NOT NULL;` dan `ALTER TABLE pengukuran ALTER COLUMN path_foto_belakang DROP NOT NULL;` pada database cloud Neon PostgreSQL.
  - Penyesuaian model SQLAlchemy `Pengukuran` agar field `path_foto_samping` dan `path_foto_belakang` bersifat nullable (`Optional[str]`), memungkinkan pencatatan bobot awal manual tanpa foto.
- **Atomic Creation & Manual Initial Weight (`app/schemas/sapi.py` & `app/api/v1/sapi.py`):**
  - Implementasi schema `SapiCreate` dengan validasi `bobot_awal > 0` dan `tanggal_masuk` bertipe required dengan default `date.today()`.
  - Dukungan fleksibel alias field frontend: `tag` $\rightarrow$ `ear_tag`, `gender` $\rightarrow$ `jenis_kelamin`, `ageMonths` $\rightarrow$ `umur_bulan`, `bobotAwal`/`weight` $\rightarrow$ `bobot_awal`, dan `tanggalMasuk` $\rightarrow$ `tanggal_masuk`.
  - Endpoint `POST /api/v1/sapi/` menyimpan data sapi dan sekaligus membuat baris pengukuran pertama pada tabel `pengukuran` dalam satu transaksi atomik SQLAlchemy, sehingga bobot awal langsung tampil sebagai `latestWeight` dan titik awal kalkulasi PBH.
  - Resolusi cerdas nama `breed` ke foreign key `id_jenis` master ras sapi.
- **Complete Cattle Management Endpoints (`/api/v1/sapi`):**
  - `GET /api/v1/sapi/`: Filter status sapi (`active`, `archived`, `all`), pencarian ear tag, dan pagination.
  - `GET /api/v1/sapi/{id_sapi}`: Detail profil sapi dilengkapi bobot terakhir dan total pengukuran.
  - `PUT /api/v1/sapi/{id_sapi}`: Pembaruan profil sapi (jenis sapi, jenis kelamin, umur, ear tag).
  - `PATCH /api/v1/sapi/{id_sapi}/archive`: Pengarsipan sapi (*soft delete*) dengan mencatat `tanggal_keluar = date.today()` tanpa menghilangkan riwayat pengukuran.
  - `PATCH /api/v1/sapi/{id_sapi}/unarchive`: Pengaktifan kembali sapi dari status arsip.
  - `DELETE /api/v1/sapi/{id_sapi}`: Penghapusan data sapi permanen beserta cascade pengukuran.
- **Frontend Integration (`cattleService.js`, `CattlePage.jsx`, `CattleDetailPage.jsx`):**
  - Pembuatan service adapter [cattleService.js](file:///C:/Users/THINKPAD/Documents/Banu/IPB/proyek/TimbangDulu/frontend/src/services/cattleService.js) yang memetakan response backend ke format state klien.
  - Penambahan satu kolom input *"Bobot Awal (kg)"* pada form modal Tambah Sapi di `CattlePage.jsx` dengan pre-filled tanggal masuk hari ini.
  - Penyambungan live data sapi aktif, diarsipkan, counter tab, dan filter ras/gender.
  - Penyambungan `CattleDetailPage.jsx` ke live detail backend, grafik pertumbuhan Recharts, kalkulator PBH interaktif, modal edit profil, dan modal konfirmasi arsip.
- **Comprehensive Automated & Live Test Suite:**
  - Pembuatan test suite terdedikasi `tests/test_sapi_crud.py` (5 skenario uji: pembuatan sapi + bobot awal atomik, constraint unik ear tag per user, multi-tenancy beda peternak, update profil, pengarsipan dan filter status).
  - Skrip pengujian live cloud [verify_neon_sapi_crud.py](file:///C:/Users/THINKPAD/Documents/Banu/IPB/proyek/TimbangDulu/backend/tests/verify_neon_sapi_crud.py) (sukses 100% pada Neon PostgreSQL).
  - Total test suite pytest kini mencapai 22/22 passed.

---

## [0.3.0] - 2026-11-22 — User Registration Flow & Neon PostgreSQL Persistence

Implementasi penuh fungsionalitas registrasi pengguna baru (*user registration*) pada backend FastAPI + SQLAlchemy dengan persistensi data ke tabel `users` PostgreSQL Neon, enkripsi password via `bcrypt`, pencegahan duplikasi username, integrasi ke antarmuka formulir registrasi React tanpa mengubah styling visual, dan kompatibilitas login instan.

### Added
- **Pydantic Validation & DTO Enhancement (`app/schemas/user.py`):**
  - Implementasi schema `UserCreate` yang dilengkapi `field_validator` untuk pembersihan whitespace (*trim*) pada field `username`, `nama_user`, `nama_peternakan`, serta panjang password minimal 6 karakter.
  - Implementasi `model_validator` fleksibel yang mendukung input `email` dari form frontend sebagai fallback nilai `username` tanpa menghasilkan error validasi 422.
  - Pembaruan schema `UserRegisterData` dan `RegisterResponse` yang mengembalikan rincian akun baru (`id_user`, `username`, `nama_user`, `nama_peternakan`, `alamat`, `no_telp`, `created_at`) dengan jaminan 100% tidak pernah menyertakan `password_hash` atau kredensial sensitif.
- **Robust Database Registration Endpoint (`app/api/v1/auth.py`):**
  - Penyempurnaan endpoint `POST /api/v1/auth/register` dengan status `201 Created`.
  - Pengecekan duplikasi `username` sebelum proses persistensi yang mengembalikan `400 Bad Request` informatif jika username telah digunakan.
  - Enkripsi password plain-text menggunakan utilitas `get_password_hash` (`bcrypt`) yang identik dengan proses verifikasi login.
  - Penanganan transaksi database yang kokoh dengan blok `try ... except IntegrityError ... except SQLAlchemyError` disertai `db.rollback()` otomatis guna mencegah deadlock atau kegagalan session pooling Neon.
- **Frontend Form Wiring & Seamless Redirect (`frontend/src/pages/RegisterPage.jsx` & `LoginPage.jsx`):**
  - Mengganti input field email pada form registrasi dengan input `username` (label "Username", icon `AtSign`, placeholder "Contoh: peternak_makmur", validasi minimal 3 karakter).
  - Penyambungan form submit registrasi ke API backend `POST /api/v1/auth/register` via Axios service `api.js` tanpa mengubah komponen visual, tata letak, maupun berkas CSS.
  - Penanganan state pengiriman (`isSubmitting`), proteksi dobel submit, dan visual alert error ramah pengguna (`styles.feedbackError` dan `styles.feedback`).
  - Auto-redirect ke `/login` setelah registrasi sukses dengan menyertakan state navigasi username dan pesan sukses untuk pre-filling form login.
- **End-to-End Automated & Live Verification Suite:**
  - Pembuatan modul test terdedikasi `tests/test_registration.py` (5 skenario pengujian: registrasi sukses, hash check, duplikasi username, fallback email, dan validasi password panjang minimal).
  - Skrip pengujian langsung terhadap database Neon PostgreSQL aktif (`tests/verify_neon_registration.py`) yang memvalidasi siklus penuh registrasi -> inspeksi hash di Neon -> uji duplikasi 400 -> login dengan JWT -> verifikasi `/auth/me` -> pembersihan data uji.
  - Pembuatan konfigurasi `tests/conftest.py` untuk isolasi SQLite in-memory test suite yang kini mencapai total 17/17 tests passed.

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
