# Developer State & Architecture Snapshot — TimbangDulu Backend

**Berkas Dokumen:** `DEV_STATE.md`  
**Status Layanan:** Operational (MVP Initial Setup - Ready for Feature Expansion)  
**Versi Sistem:** SemVer `0.1.0`  
**Tanggal Snapshot Terakhir:** 11 November 2026  
**Spesialis Dokumentasi:** Senior Software Engineer & Technical Documentation Specialist  
**Basis Rujukan:** [PRD.md](file:///C:/Users/THINKPAD/Documents/Banu/IPB/proyek/TimbangDulu/backend/PRD.md)

---

## 1. Status Snapshot Arsitektur & Komponen

| Komponen Arsitektur | Modul Implementasi | Status Operasional | Deskripsi Teknis |
| :--- | :--- | :--- | :--- |
| **Authentication & Multi-tenancy** | `app/core/security.py`<br>`app/api/deps.py`<br>`app/api/v1/auth.py` | **ACTIVE & VERIFIED** | Autentikasi berbasis JWT (`HS256`) dengan enkripsi kata sandi `bcrypt`. Dependency `get_current_user` menegakkan isolasi data multi-tenancy di mana seluruh query dibatasi pada `id_user` pengguna yang sedang login. |
| **Database & ORM Layer** | `app/db/base.py`<br>`app/db/session.py`<br>`app/models/*`<br>`app/db/init_db.py` | **ACTIVE & VERIFIED** | Menggunakan **SQLAlchemy 2.0** DeclarativeBase dengan driver `psycopg2` & `psycopg` (v3). Connection pooling dikonfigurasi (`pool_size=10`, `max_overflow=20`, `pool_recycle=300s`, `pool_pre_ping=True`) untuk resiliensi Supabase Free Tier. Model mencakup `users`, `jenis_sapi`, `sapi`, dan `pengukuran`. |
| **Object Storage (Supabase)** | `app/services/supabase_storage.py` | **ACTIVE & VERIFIED** | Mengelola upload berkas citra sapi ke Supabase Storage Bucket `cattle-images`. Dilengkapi validasi format MIME type (`image/jpeg`, `image/png`, `image/webp`), sanitasi nama acak berbasis `uuid4().ext`, dan fallback adapter saat mode mock/lokal aktif. |
| **Estimasi & Computer Vision Layer** | `app/services/ai_inference.py` | **ACTIVE (MOCK MODE)** | Kelas `CattleVisionService` terpasang dengan toggle `USE_MOCK_AI=True`. Menghasilkan estimasi bobot realistis ($60.0 - 450.0\text{ kg}$) berdasarkan usia bulan dan jenis kelamin ternak dengan latensi simulasi $0.5 - 0.8\text{ detik}$. Siap diganti modul ONNX Runtime saat bobot model diserahkan. |
| **Kalkulator PBH (ADG)** | `app/services/pbh_calculator.py` | **ACTIVE & VERIFIED** | Menghitung Perkembangan Bobot Harian $\text{PBH} = \frac{\Delta\text{Bobot}}{\Delta\text{Hari}}$. Memiliki guardrail $\Delta\text{Hari} > 0$ (`HTTP 400`), penentuan status pertumbuhan (`NORMAL` / `PERINGATAN_PENURUNAN`), serta saran evaluasi pakan jika PBH negatif. |

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
| `POST` | `/api/v1/sapi/` | Bearer Token | JSON `SapiCreate`: `ear_tag`, `id_jenis`, `jenis_kelamin`, `umur_bulan`, `tanggal_masuk`, `tanggal_keluar` | `201 Created` (`SapiResponse`) | Constraint unik `(id_user, ear_tag)` ditegakkan |
| `GET` | `/api/v1/sapi/` | Bearer Token | Query: `skip=0`, `limit=50`, `search=...` | `200 OK` (`List[SapiResponse]`) | Menampilkan hanya sapi milik `current_user` |
| `GET` | `/api/v1/sapi/{id_sapi}` | Bearer Token | Path: `id_sapi` | `200 OK` (`SapiDetailResponse`) | Termasuk `bobot_terakhir`, `tanggal_ukur_terakhir`, `total_pengukuran` |
| `PUT` | `/api/v1/sapi/{id_sapi}` | Bearer Token | JSON `SapiUpdate` | `200 OK` (`SapiResponse`) | Validasi kepemilikan & keunikan ear tag baru |
| `DELETE` | `/api/v1/sapi/{id_sapi}` | Bearer Token | Path: `id_sapi` | `200 OK` (`{"status": "success", "message": "..."}`) | Cascade delete relasi pengukuran |

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
| `DATABASE_URL` | `str` | `postgresql://...` | URI koneksi PostgreSQL (Supabase / lokal) |
| `SUPABASE_URL` | `str` | `https://*.supabase.co` | Endpoint REST Supabase Project |
| `SUPABASE_KEY` | `str` | `ey...` | Service Role / Anon API Key Supabase |
| `SUPABASE_BUCKET_NAME` | `str` | `"cattle-images"` | Nama Storage Bucket berkas citra ternak |
| `SECRET_KEY` | `str` | `[SECRET MIN-32 CHARS]` | Kunci simetris enkripsi JWT |
| `ALGORITHM` | `str` | `"HS256"` | Algoritma penandatanganan JWT |
| `ACCESS_TOKEN_EXPIRE_MINUTES`| `int` | `1440` (24 jam) | Masa berlaku sesi token autentikasi |
| `USE_MOCK_AI` | `bool` | `True` | Toggle sakelar mode simulasi inferensi AI |

---

## 4. Status Pengujian Otomatis (Automated Test Suite)

- **Total Test Cases:** 12 passed, 0 failed.
- **Lokasi Berkas Uji:** `tests/`
  - `tests/test_pbh.py`: Validasi rumus ADG, status alert penurunan, dan guardrail $\Delta\text{Hari} \le 0$.
  - `tests/test_security.py`: Pengujian hashing password bcrypt dan siklus JWT sign-decode.
  - `tests/test_ai_inference.py`: Pengujian latensi simulasi dan rentang bobot $60 - 450\text{ kg}$.
  - `tests/test_api_integration.py`: Alur menyeluruh registrasi $\rightarrow$ login $\rightarrow$ isolasi multi-tenant $\rightarrow$ penambahan sapi $\rightarrow$ prediksi 2 titik $\rightarrow$ inspeksi riwayat & PBH.

---

## 5. Backlog & Next Steps (Prioritas Sprint Berikutnya)

Berikut adalah daftar periksa terstruktur untuk sesi prompt dan sprint pengembangan berikutnya:

- [ ] **Data Seeding & Mock Scenarios (`seed_data.py`):**
  - Buat skrip seed mandiri yang menginstansiasi 2 akun peternak dummy (misal: `peternak_makmur` dan `peternak_berkah`), masing-masing dengan 3-5 ekor sapi dan data historis pengukuran bertahap (rentang 14 - 30 hari).
  - Berguna agar tim frontend dapat langsung melakukan styling dashboard tanpa memulai dari formulir kosong.

- [ ] **Endpoint Tren Pertumbuhan & Analisis Grafik (`GET /api/v1/pengukuran/history/{id_sapi}`):**
  - Implementasikan endpoint agregasi analitik yang mengembalikan ringkasan statistik (bobot awal masuk, bobot saat ini, total gain, rata-rata ADG keseluruhan, target panen/jual).
  - Format output dioptimasi untuk konsumsi pustaka visualisasi grafik frontend (Chart.js / Recharts).

- [ ] **Ekspansi CI/CD & Automated Pipeline:**
  - Tambahkan konfigurasi GitHub Actions (`.github/workflows/backend-ci.yml`) untuk menjalankan linting (`ruff`/`flake8`) dan automated test (`pytest`) pada setiap pull request.

- [ ] **Adaptor ONNX Runtime / PyTorch di `app/services/ai_inference.py`:**
  - Siapkan antarmuka pemuatan model bobot `.onnx` (YOLOv5 bounding box cropping + CNN regression model) begitu artifak model diserahkan dari direktori `ai_engine/`.
  - Integrasikan pustaka `opencv-python-headless` dan `pillow` untuk pre-processing matriks citra input (resize $640\times 640$, normalisasi kanal RGB).
