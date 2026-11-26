# Developer State & Architecture Snapshot — TimbangDulu Backend

**Berkas Dokumen:** `DEV_STATE.md`  
**Status Layanan:** Operational (MVP Setup + Neon Pooling + Route Guards + User Auth + Cattle CRUD + Full Neon Storage + Real AI Pipeline Active)  
**Versi Sistem:** SemVer `0.6.0`  
**Tanggal Snapshot Terakhir:** 26 November 2026  
**Spesialis Dokumentasi:** Senior Backend Engineer & Database Architect  
**Basis Rujukan:** [PRD.md](file:///C:/Users/THINKPAD/Documents/Banu/IPB/proyek/TimbangDulu/backend/PRD.md)

---

## 1. Status Snapshot Arsitektur & Komponen

| Komponen Arsitektur | Modul Implementasi | Status Operasional | Deskripsi Teknis |
| :--- | :--- | :--- | :--- |
| **Backend Service Runner** | `backend/main.py`<br>`backend/app/main.py` | **ACTIVE & VERIFIED** | Runner mandiri yang memungkinkan eksekusi server FastAPI cukup dengan `python main.py`. Membungkus Uvicorn programmatic runner (`127.0.0.1:8000`, `reload=True`) dengan resolusi aman `sys.path`. Pembersihan mount lokal `/uploads` telah selesai. |
| **Authentication & Multi-tenancy** | `app/core/security.py`<br>`app/api/deps.py`<br>`app/api/v1/auth.py` | **ACTIVE & VERIFIED** | Autentikasi berbasis JWT (`HS256`) dengan enkripsi kata sandi `bcrypt`. Endpoint registrasi `POST /api/v1/auth/register` terintegrasi tabel `users` Neon PostgreSQL dengan proteksi duplikasi username dan rollback otomatis. Dependency `get_current_user` menegakkan isolasi multi-tenancy. |
| **Manajemen Sapi (Cattle CRUD)** | `app/models/sapi.py`<br>`app/schemas/sapi.py`<br>`app/api/v1/sapi.py` | **ACTIVE & VERIFIED** | Manajemen sapi per peternak: `POST /api/v1/sapi/` mencatat sapi + bobot awal manual ke tabel `pengukuran` dalam satu transaksi atomik. Mendukung filter `status` (active/archived/all), pencarian ear tag, update profil, dan pengarsipan (*soft delete* via `PATCH /archive`). |
| **Database & ORM Layer** | `app/db/base.py`<br>`app/db/session.py`<br>`app/models/*`<br>`app/db/init_db.py` | **ACTIVE & VERIFIED** | Menggunakan **SQLAlchemy 2.0** DeclarativeBase dengan driver `psycopg2-binary` & `psycopg` (v3). Kolom `path_foto_samping` dan `path_foto_belakang` pada tabel `pengukuran` telah dimigrasi menjadi nullable untuk mendukung pencatatan bobot awal manual. Connection pooling dikonfigurasi (`pool_size=10`, `max_overflow=20`, `pool_recycle=300s`, `pool_pre_ping=True`, `connect_timeout=15s`) untuk resiliensi **PostgreSQL Neon**. |
| **Frontend Cattle & Auth Wiring** | `frontend/src/services/cattleService.js`<br>`frontend/src/pages/CattlePage.jsx`<br>`frontend/src/pages/CattleDetailPage.jsx`<br>`frontend/src/pages/RegisterPage.jsx`<br>`frontend/src/pages/LoginPage.jsx` | **ACTIVE & VERIFIED** | Seluruh antarmuka manajemen ternak tersambung ke API backend: modal tambah sapi dengan input bobot awal manual dan pre-filled tanggal masuk, tab sapi aktif & arsip, overview profil, grafik pertumbuhan Recharts, kalkulator PBH interaktif, dan modal konfirmasi arsip. |
| **Object Storage (Neon)** | `app/services/neon_storage.py` | **ACTIVE (FULL NEON - STRICT)** | Penyimpanan citra ternak **Full Neon Object Storage (Bucket: `cattle-images`)** berbasis S3 via `boto3`. Menerapkan validasi fail-fast (`RuntimeError` jika kredensial tidak lengkap), `signature_version="s3v4"`, dan path-style addressing. Format path terstruktur `sapi/<id_sapi>/<sudut>_<uuid>.<ext>`, menyediakan Public Read URL dan Presigned URL, serta rollback compensation via `delete_object`. Seluruh fallback disk lokal telah dieliminasi. |
| **Estimasi & Computer Vision Layer** | `app/services/ai_inference.py` | **ACTIVE & INTEGRATED** | Pipeline 3-tahap computer vision: (1) Classifier sapi biner (`sapibukan_cifor.keras`), (2) Segmentasi masker siluet (`best_seg_model.keras`), dan (3) Regresi estimasi bobot 4-kanal RGB+Masker (`best_reg_model.keras`). Mendukung penimbangan dengan 1 foto (samping atau belakang). |
| **Kalkulator PBH (ADG)** | `app/services/pbh_calculator.py` | **ACTIVE & VERIFIED** | Menghitung Perkembangan Bobot Harian $\text{PBH} = \frac{\Delta\text{Bobot}}{\Delta\text{Hari}}$. Memiliki guardrail $\Delta\text{Hari} > 0$ (`HTTP 400`), penentuan status pertumbuhan (`NORMAL` / `PERINGATAN_PENURUNAN`), serta saran evaluasi pakan jika PBH negatif. |
| **Dashboard Agregasi** | `app/api/v1/dashboard.py` | **ACTIVE & VERIFIED** | Endpoint `GET /api/v1/dashboard` menghitung populasi ternak aktif, rasio jantan/betina, total penimbangan, rata-rata bobot kandang, dan tren bulanan. |

---

## 2. Katalog Endpoint REST API Aktif & Teruji

Semua endpoint versi 1 diakses melalui prefix `/api/v1`. OpenAPI Swagger UI aktif di `/docs` dan ReDoc di `/redoc`.

### 2.1. System Health & Probes
| Method | Path | Auth | Request Body | Response Success | Catatan |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `GET` | `/` | Public | - | `200 OK` (JSON status, version, mock_ai flag) | Root status probe |
| `GET` | `/health` | Public | - | `200 OK` (`{"status": "healthy", "version": "1.0.0"}`) | Liveness & readiness probe |

### 2.2. Modul Autentikasi (`/api/v1/auth`)
| Method | Path | Auth | Request Body / Form | Response Success | Catatan |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/auth/register` | Public | JSON `UserCreate`: `username`, `password`, `nama_user`, `nama_peternakan`, `alamat`, `no_telp` | `201 Created` (`RegisterResponse`: `status`, `message`, `data`) | Mencegah duplikasi `username` (400 Bad Request) |
| `POST` | `/api/v1/auth/login` | Public | JSON / Form: `username`, `password` | `200 OK` (`LoginResponse`: `access_token`, `token_type`, `user`) | Kompatibel dengan Swagger Authorize modal |
| `GET` | `/api/v1/auth/me` | Bearer Token | - | `200 OK` (`UserResponse`) | Profil pengguna terautentikasi |

### 2.3. Modul Manajemen Sapi (`/api/v1/sapi`)
| Method | Path | Auth | Query / Request Body | Response Success | Catatan |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/sapi/jenis` | Public | - | `200 OK` (`List[JenisSapiResponse]`) | Master data ras sapi (Simental, Limousin, PO, dll) |
| `POST` | `/api/v1/sapi/` | Bearer Token | JSON `SapiCreate`: `ear_tag`/`tag`, `id_jenis`/`breed`, `jenis_kelamin`/`gender`, `umur_bulan`/`ageMonths`, `bobot_awal`/`bobotAwal`, `tanggal_masuk` | `201 Created` (`SapiResponse`) | Transaksi atomik simpan sapi + rekor bobot awal di tabel `pengukuran`. Constraint unik `(id_user, ear_tag)` ditegakkan |
| `GET` | `/api/v1/sapi/` | Bearer Token | Query: `skip=0`, `limit=100`, `search=...`, `status=active\|archived\|all` | `200 OK` (`List[SapiResponse]`) | Menampilkan sapi milik `current_user` dengan filter tab status dan data bobot terakhir |
| `GET` | `/api/v1/sapi/{id_sapi}` | Bearer Token | Path: `id_sapi` | `200 OK` (`SapiDetailResponse`) | Termasuk `bobot_terakhir`, `tanggal_ukur_terakhir`, `total_pengukuran` |
| `PUT` | `/api/v1/sapi/{id_sapi}` | Bearer Token | JSON `SapiUpdate` | `200 OK` (`SapiResponse`) | Validasi kepemilikan, keunikan tag, resolusi breed, & update status |
| `PATCH` | `/api/v1/sapi/{id_sapi}/archive` | Bearer Token | Path: `id_sapi` | `200 OK` (`SapiResponse`) | Pengarsipan sapi (*soft delete*) mencatat `tanggal_keluar = today` |
| `PATCH` | `/api/v1/sapi/{id_sapi}/unarchive` | Bearer Token | Path: `id_sapi` | `200 OK` (`SapiResponse`) | Mengaktifkan kembali sapi yang terarsip |
| `DELETE` | `/api/v1/sapi/{id_sapi}` | Bearer Token | Path: `id_sapi` | `200 OK` (`{"status": "success", "message": "..."}`) | Cascade delete relasi pengukuran (permanen) |

### 2.4. Modul Pengukuran & Kalkulator PBH (`/api/v1/pengukuran`)
| Method | Path | Auth | Form-Data / JSON | Response Success | Catatan |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/pengukuran/predict` | Bearer Token | `multipart/form-data`:<br>- `id_sapi` (int)<br>- `foto_samping` (UploadFile)<br>- `foto_belakang` (UploadFile) | `201 Created` (`PredictResponse`: `bobot_estimasi_kg`, `foto_samping_url`, `foto_belakang_url`, `pbh_info`) | Alur inferensi, upload storage, rekam ke DB & hitung PBH historis |
| `GET` | `/api/v1/pengukuran/sapi/{id_sapi}` | Bearer Token | Path: `id_sapi` | `200 OK` (`List[PengukuranResponse]`) | Riwayat terurut descending dilengkapi kalkulasi PBH antar-titik ukur |
| `POST` | `/api/v1/pengukuran/kalkulator-pbh` | Public | JSON `KalkulatorPBHRequest`: `bobot_awal`, `bobot_akhir`, `jumlah_hari` | `200 OK` (`KalkulatorPBHResponse`: `pbh_kg_hari`, `status`, `pesan`) | Utilitas mandiri tanpa mutasi database |

---

## 3. Konfigurasi Environment Aktif

Dikelola melalui berkas `.env` dan diakses melalui `app/core/config.py` (Pydantic BaseSettings):

| Variabel Lingkungan | Tipe Data | Nilai Bawaan / Format | Deskripsi Kegunaan |
| :--- | :--- | :--- | :--- |
| `PROJECT_NAME` | `str` | `"TimbangDulu API"` | Penamaan aplikasi pada OpenAPI metadata |
| `VERSION` | `str` | `"1.0.0"` | Nomor versi API |
| `API_V1_STR` | `str` | `"/api/v1"` | Prefix routing v1 |
| `DATABASE_URL` | `str` | `postgresql://...` | URI koneksi PostgreSQL (Neon connection pooling / lokal) |
| `AWS_ENDPOINT_URL_S3` | `str` | `https://*.neon.tech` | S3-compatible Endpoint URL Neon Object Storage |
| `AWS_ACCESS_KEY_ID` | `str` | `[ACCESS_KEY_ID]` | Access Key ID untuk Neon Object Storage |
| `AWS_SECRET_ACCESS_KEY` | `str` | `[SECRET_ACCESS_KEY]` | Secret Access Key untuk Neon Object Storage |
| `NEON_STORAGE_BUCKET_NAME` | `str` | `"cattle-images"` | Nama Storage Bucket berkas citra ternak |
| `SECRET_KEY` | `str` | `[SECRET MIN-32 CHARS]` | Kunci simetris enkripsi JWT |
| `ALGORITHM` | `str` | `"HS256"` | Algoritma penandatanganan JWT |
| `ACCESS_TOKEN_EXPIRE_MINUTES`| `int` | `1440` (24 jam) | Masa berlaku sesi token autentikasi |
| `CATTLE_CLASSIFIER_PATH` | `Path` | `model_prediksi/sapibukan_cifor.keras` | Path berkas model klasifikasi sapi biner |
| `CATTLE_SEGMENTATION_PATH` | `Path` | `model_prediksi/best_seg_model.keras` | Path berkas model segmentasi citra |
| `CATTLE_REGRESSION_PATH` | `Path` | `model_prediksi/best_reg_model.keras` | Path berkas model regresi estimasi bobot |

---

## 4. Status Pengujian Otomatis (Automated Test Suite)

- **Total Test Cases:** 34 passed, 2 skipped, 0 failed.
- **Lokasi Berkas Uji:** `tests/`
  - `tests/test_photo_storage.py`: Pengujian Full Neon Object Storage (mock S3 upload path-style `sapi/<id_sapi>/`, fail-fast `RuntimeError` saat kredensial kosong, presigned URL generator, validasi MIME, dan rollback cleanup via `delete_object`).
  - `tests/verify_neon_storage.py`: Skrip verifikasi live smoke test ke Neon Object Storage aktif (`put_object`, `head_object`, presigned & public GET URL, dan `delete_object` cleanup — sukses 100%).
  - `tests/test_sapi_crud.py`: Pengujian transaksi atomik simpan sapi + bobot awal, constraint unik ear tag per user, isolasi multi-tenancy beda peternak, update profil, pengarsipan (*status transition* active/archived), dan unarchive.
  - `tests/test_registration.py`: Pengujian siklus registrasi lengkap (status 201, verifikasi hash bcrypt di DB, penolakan duplikasi 400, fallback email frontend, validasi panjang password).
  - `tests/test_pbh.py`: Validasi rumus ADG, status alert penurunan, dan guardrail $\Delta\text{Hari} \le 0$.
  - `tests/test_security.py`: Pengujian hashing password bcrypt dan siklus JWT sign-decode.
  - `tests/test_ai_inference.py`: Pengujian alur 1-foto inferensi (klasifikasi, segmentasi, regresi) dan penolakan foto bukan sapi (HTTP 422).
  - `tests/test_dashboard.py`: Pengujian agregasi data dashboard per peternak.
  - `tests/test_api_integration.py`: Alur menyeluruh registrasi $\rightarrow$ login $\rightarrow$ isolasi multi-tenant $\rightarrow$ penambahan sapi dengan bobot awal $\rightarrow$ prediksi 1 foto $\rightarrow$ inspeksi riwayat & PBH.
  - `tests/verify_neon_sapi_crud.py`: Skrip verifikasi live end-to-end CRUD data sapi langsung ke database Neon PostgreSQL aktif.
  - `tests/verify_neon_registration.py`: Skrip verifikasi live end-to-end registrasi langsung ke database Neon PostgreSQL aktif.

---

## 5. Backlog & Next Steps (Prioritas Sprint Berikutnya)

Berikut adalah daftar periksa terstruktur untuk sesi prompt dan sprint pengembangan berikutnya:

- [x] **Database Seeding & Test Credentials (`init_db.py`):**
  - Implementasi inisialisasi skema tabel, 8 ras jenis sapi master, dan 1 akun peternak dummy pengujian (`peternak_demo` / `Password123!`).

- [x] **Frontend Authentication & State Integration:**
  - Koneksi form login React (`LoginPage.jsx`) ke endpoint `POST /api/v1/auth/login`.
  - Penyimpanan JWT token pada `localStorage`, Axios request interceptor otomatis, dan auto-redirect ke dashboard.

- [x] **User Registration Flow & Neon PostgreSQL Persistence:**
  - Endpoint `POST /api/v1/auth/register` dengan validasi Pydantic, proteksi duplikasi username, hashing bcrypt, transaksi rollback aman, dan response tanpa password hash.
  - Form registrasi frontend (`RegisterPage.jsx`) tersambung ke endpoint dengan input username, state loading, penanganan error, dan auto-redirect ke login.

- [x] **Cattle CRUD Management & Initial Weight Tracking (`/api/v1/sapi`):**
  - Endpoint CRUD sapi terisolasi multi-tenancy, transaksi atomik pencatatan bobot awal manual ke tabel `pengukuran`, migrasi kolom foto nullable di Neon PostgreSQL, endpoint arsip (`PATCH /archive`), dan penyambungan antarmuka frontend (`CattlePage.jsx` & `CattleDetailPage.jsx`).

- [ ] **Endpoint Tren Pertumbuhan & Analisis Grafik (`GET /api/v1/pengukuran/history/{id_sapi}`):**
  - Implementasikan endpoint agregasi analitik yang mengembalikan ringkasan statistik (bobot awal masuk, bobot saat ini, total gain, rata-rata ADG keseluruhan, target panen/jual).
  - Format output dioptimasi untuk konsumsi pustaka visualisasi grafik frontend (Chart.js / Recharts).

- [ ] **Data Seeding Lanjutan Multi-Sapi & Histori Pengukuran:**
  - Menambahkan variasi histori pengukuran bertahap (14-30 hari) pada akun peternak demo untuk uji coba visualisasi grafik bobot di dashboard frontend.

- [ ] **Ekspansi CI/CD & Automated Pipeline:**
  - Tambahkan konfigurasi GitHub Actions (`.github/workflows/backend-ci.yml`) untuk menjalankan linting (`ruff`/`flake8`) dan automated test (`pytest`) pada setiap pull request.

- [ ] **Adaptor ONNX Runtime / PyTorch di `app/services/ai_inference.py`:**
  - Siapkan antarmuka pemuatan model bobot `.onnx` (YOLOv5 bounding box cropping + CNN regression model) begitu artifak model diserahkan dari direktori `ai_engine/`.
  - Integrasikan pustaka `opencv-python-headless` dan `pillow` untuk pre-processing matriks citra input (resize $640\times 640$, normalisasi kanal RGB).
