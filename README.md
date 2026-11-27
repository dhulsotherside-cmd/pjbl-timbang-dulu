# TimbangDulu — Platform Digital Estimasi Bobot Sapi & Pemantauan PBH

<div align="center">

![TimbangDulu Logo](frontend/src/assets/images/logo-timbangdulu.png)

**Solusi Modern Manajemen Peternakan Sapi Berbasis Computer Vision & Analisis Pertumbuhan Harian**

[![FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688?style=flat&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/Frontend-React_19_%2B_Vite-61DAFB?style=flat&logo=react&logoColor=black)](https://react.dev)
[![PostgreSQL](https://img.shields.io/badge/Database-PostgreSQL_(Neon)-4169E1?style=flat&logo=postgresql&logoColor=white)](https://neon.tech)
[![Object Storage](https://img.shields.io/badge/Storage-Neon_Object_Storage_(S3)-00E599?style=flat&logo=amazon-s3&logoColor=black)](https://neon.tech)
[![TensorFlow / Keras](https://img.shields.io/badge/AI-Keras_3_%2F_TensorFlow-FF6F00?style=flat&logo=tensorflow&logoColor=white)](https://keras.io)
[![Python](https://img.shields.io/badge/Python-3.10%2B-3776AB?style=flat&logo=python&logoColor=white)](https://python.org)
[![License](https://img.shields.io/badge/License-Private%20%2F%20Academic-green)]()

</div>

---

## 📖 Tentang TimbangDulu

**TimbangDulu** adalah platform digital full-stack yang dirancang khusus untuk memodernisasi manajemen peternakan sapi melalui estimasi bobot non-invasif berbasis Computer Vision dan pemantauan **Perkembangan Bobot Harian (PBH)** secara presisi, tanpa memerlukan timbangan mekanis/digital konvensional berukuran besar.

Dengan mengunggah **satu foto sapi tampak samping penuh**, sistem menjalankan pipeline AI 3-tahap (verifikasi citra sapi, segmentasi siluet kontur tubuh, dan regresi bobot), menyediakan alur tinjau dua tahap (*Two-Step Commit*), mengompresi citra ke format `.webp`, serta mengunggahnya secara *cloud-native* ke **Neon Object Storage**.

---

## 🏗️ Arsitektur Sistem & Integrasi

Proyek ini dibangun menggunakan pendekatan *decoupled monorepo*:

```text
TimbangDulu/
├── frontend/        # Single Page Application (SPA) - React 19, Vite, Recharts, Lucide Icons
├── backend/         # REST API Service - FastAPI, SQLAlchemy 2.0, Pydantic, Neon PostgreSQL
│   ├── app/         # Source code utama (API router v1, models, schemas, services, db)
│   ├── scripts/     # Skrip database seeder & utilitas otomasi (seed_demo.py)
│   ├── tests/       # Rangkaian pengujian unit & integrasi (Pytest)
│   └── main.py      # Entrypoint eksekusi ASGI Uvicorn terprogram
├── model_prediksi/  # Model Keras AI (Classifier, Segmentation, Weight Regressor)
└── neon.ts          # Deklarasi infrastruktur Neon Object Storage (bucket: cattle-images)
```

```mermaid
graph TD
    User([Peternak / Pengguna]) -->|HTTP / SPA| FE[Frontend React 19 + Vite]
    FE -->|REST API + JWT Bearer| BE[Backend FastAPI]
    
    subgraph Data & Storage Layer (Neon Cloud)
        BE -->|SQLAlchemy 2.0 + PgBouncer Pool| DB[(Neon Serverless PostgreSQL)]
        BE -->|Koleksi Foto .webp via S3 API| Storage[(Neon Object Storage: cattle-images)]
    end
    
    subgraph Intelligence Layer (AI Computer Vision)
        BE -->|1. Verifikasi Sapi vs Bukan Sapi| CLF[Cattle Classifier: MobileNet]
        CLF -->|2. Ekstraksi Binary Mask Siluet| SEG[Segmentation Model: Attention U-Net]
        SEG -->|3. Estimasi Bobot 4-Kanal RGB+Mask| REG[Weight Regressor: ImprovedRegressor]
    end

    subgraph Analytics Engine
        BE -->|Kalkulasi ADG & Deteksi Penyusutan| PBH[Kalkulator PBH]
    end
```

---

## 🌟 Fitur Utama Aplikasi

### 1. Pipeline AI 3-Tahap (Keras 3 / TensorFlow)
- **Tahap 1 — Verifikasi Citra (*Cattle Classifier*):** Citra masukan diverifikasi menggunakan model klasifikasi (`sapibukan_cifor.keras`) untuk memastikan objek adalah sapi. Citra non-sapi langsung ditolak dengan status **HTTP 422 Unprocessable Entity**.
- **Tahap 2 — Segmentasi Kontur Tubuh (*Attention U-Net*):** Citra RGB dinormalisasi ke resolusi 224×224 dan diproses oleh model segmentasi (`best_seg_model.keras`) untuk menghasilkan *binary mask* siluet tubuh sapi.
- **Tahap 3 — Regresi Estimasi Bobot (*ImprovedWeightRegressor*):** Masker segmentasi digabungkan sebagai kanal keempat pada citra RGB membentuk input 4-kanal `(224, 224, 4)`, lalu diproses oleh model regresi (`best_reg_model.keras`) untuk menghasilkan estimasi bobot sapi dalam kilogram (kg) dengan pembulatan dua desimal.

### 2. Input 1 Foto & Panduan Visual Pengambilan Foto
- Mengeliminasi kebutuhan dropdown sudut pandang yang membingungkan. Sistem menggunakan kontrak **satu foto tunggal** dengan panduan visual pengambilan foto tampak samping penuh (*full side-profile* dari moncong kepala hingga paha belakang) dengan pencahayaan merata untuk akurasi inferensi terbaik.

### 3. Alur Penimbangan *Two-Step Commit* & *One-Step Onboarding*
- **Langkah 1: Estimasi / Preview (`POST /api/v1/pengukuran/predict`):** Foto mentah dianalisis oleh pipeline AI tanpa menulis ke PostgreSQL dan tanpa mengunggah ke object storage, menghasilkan preview bobot instan di antarmuka pengguna.
- **Langkah 2: Tinjau & Konfirmasi di UI:** Pengguna memiliki kendali penuh untuk meninjau hasil:
  - Tombol **"Ulangi Estimasi"**: Mengambil ulang foto tanpa mereset form identitas sapi.
  - Tombol **"Simpan Pengukuran"**: Mengeksekusi commit permanen.
- **Langkah 3: Simpan Permanen (`POST /api/v1/pengukuran/save`):** Citra dikompresi ke `.webp`, diunggah ke cloud storage, dan dicatat ke database dalam satu transaksi atomik. Mendukung *one-step onboarding* (mendaftarkan sapi baru sekaligus merekam pengukuran perdananya). Dilengkapi mekanisme kompensasi *rollback* (file di cloud storage langsung dihapus otomatis jika transaksi database gagal).

### 4. Kompresi Citra `.webp` & Full Neon Object Storage (Strict Mode)
- **Kompresi Otomatis:** Foto dikompresi menggunakan Pillow ke format modern `.webp` (maksimum resolusi 1280px, kualitas 80, EXIF-orientation safe), menghasilkan ukuran berkas hemat (turun 70–85%) tanpa mengorbankan ketajaman visual.
- **Full Cloud Storage:** Diunggah langsung ke bucket `cattle-images` di Neon Object Storage (S3-Compatible) dengan path unik berstruktur `sapi/{id_sapi}/{uuid}.webp`.
- **Presigned URL:** Riwayat foto disajikan secara aman melalui *Presigned URL* time-limited, tanpa menyimpan token atau kredensial rahasia di client.

### 5. Analitik Pertumbuhan & Pemantauan PBH
- **Kalkulator Pertambahan Bobot Harian (PBH):**
  $$\text{PBH} = \frac{\Delta\text{Bobot}}{\Delta\text{Hari}} = \frac{\text{Bobot Akhir} - \text{Bobot Awal}}{\text{Jumlah Hari}}$$
- **Deteksi Penyusutan Bobot:** Menandai indikator peringatan (`is_weight_loss: true` / $\text{PBH} < 0$) jika bobot sapi mengalami penurunan, membantu peternak mendeteksi gangguan kesehatan atau nutrisi ternak lebih dini.
- **Visualisasi Komprehensif:** Dashboard statistik live, grafik tren pertumbuhan berbasis Recharts, dan modal **Lightbox Preview Ukuran Penuh** (`createPortal`) untuk menginspeksi foto sapi beresolusi tinggi pada riwayat penimbangan.

### 6. Manajemen Data Sapi & Akun Terisolasi (Multi-Tenancy)
- **Partial Unique Index `ear_tag`:** Skema PostgreSQL menggunakan Partial Unique Index `uq_sapi_active_ear_tag_per_user` (`WHERE tanggal_keluar IS NULL`). Peternak diizinkan menggunakan kembali nomor *ear tag* yang sama jika sapi lama telah diarsipkan / dijual.
- **Live Sidebar Profile & Logout Full-Screen:** Kartu profil di sidebar tersinkronisasi langsung dengan `AuthContext`, dilengkapi tombol Logout sidebar dan modal konfirmasi logout *full-screen* (`fixed inset-0 z-50` via React Portal) yang menutupi seluruh layar termasuk Sidebar.
- **Edit Profil Peternak:** Formulir pengaturan akun untuk memperbarui `nama_user`, `nama_peternakan`, `alamat`, dan `no_telp` dengan field `username` terkunci (*read-only*).

---

## 🚦 Status Integrasi Komponen

| Modul | Sub-Komponen | Status | Keterangan |
| :--- | :--- | :---: | :--- |
| **Backend Auth** | JWT + Bcrypt Hashing | ✅ Selesai | Registrasi, Login, Edit Profil (`/me`), Multi-tenancy |
| **Backend Sapi** | CRUD Sapi & Jenis Sapi | ✅ Selesai | Partial unique index `ear_tag`, arsip/unarchive, transaksi atomik |
| **Backend Storage**| Neon Object Storage | ✅ Selesai | Mode strict S3-compatible, kompresi `.webp`, rollback compensation |
| **Backend AI** | Pipeline 3-Tahap Keras | ✅ Selesai | Classifier Sapi vs Bukan, Attention U-Net Mask, Regresi Bobot (kg) |
| **Backend PBH** | ADG Engine & Validator | ✅ Selesai | Kalkulator PBH antar-pengukuran, alert indikator penyusutan bobot |
| **Backend Testing**| Pytest Suite (41 Tests) | ✅ Selesai | 100% lulus (inferensi, analitik, CRUD sapi arsip, auth profil) |
| **Frontend Auth** | Login & Akun Peternak | ✅ Selesai | Token auth context, live sync storage, edit profil, logout full-screen modal |
| **Frontend Cattle**| Data Sapi & Detail | ✅ Selesai | Tab aktif/arsip, grafik tren Recharts, lightbox foto `.webp` full-screen |
| **Frontend Ukur** | Alur Two-Step Commit | ✅ Selesai | Preview bobot AI -> konfirmasi simpan, grid seleksi kartu sapi rapi |
| **Frontend Brand** | Favicon & Styling UI | ✅ Selesai | Favicon logo TimbangDulu resmi, tombol kembali seragam berdesain rounded |

---

## 🔌 Ringkasan Endpoint API Utama (`/api/v1`)

Dokumentasi interaktif Swagger UI tersedia di `http://127.0.0.1:8000/docs`.

### 1. Autentikasi & Profil Pengguna (`/auth` & `/users`)
| Method | Endpoint | Deskripsi | Akses |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/auth/register` | Mendaftarkan akun peternak baru | Publik |
| `POST` | `/api/v1/auth/login` | Login akun & penerbitan token JWT Bearer | Publik |
| `GET` | `/api/v1/auth/me` *(alias: `/users/me`)* | Mendapatkan data profil peternak sedang login | Terautentikasi |
| `PUT` | `/api/v1/auth/me` *(alias: `/users/me`)* | Memperbarui profil (`nama_user`, `nama_peternakan`, dll) | Terautentikasi |

### 2. Dashboard Peternakan (`/dashboard`)
| Method | Endpoint | Deskripsi | Akses |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/dashboard/` | Ringkasan statistik ternak, bobot rata-rata, dan tren bulanan | Terautentikasi |

### 3. Manajemen Sapi (`/sapi`)
| Method | Endpoint | Deskripsi | Akses |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/sapi/jenis` | Mengambil daftar master jenis/ras sapi | Terautentikasi |
| `GET` | `/api/v1/sapi/` | Daftar sapi milik peternak (`?status=active|archived|all&search=`) | Terautentikasi |
| `POST` | `/api/v1/sapi/` | Menambah sapi baru beserta pencatatan bobot awal manual | Terautentikasi |
| `GET` | `/api/v1/sapi/{id_sapi}` | Mengambil detail profil sapi dan bobot terakhir | Terautentikasi |
| `PUT` | `/api/v1/sapi/{id_sapi}` | Memperbarui atribut profil sapi | Terautentikasi |
| `PATCH`| `/api/v1/sapi/{id_sapi}/archive` | Mengarsipkan sapi (memindahkan ke status non-aktif) | Terautentikasi |
| `PATCH`| `/api/v1/sapi/{id_sapi}/unarchive` | Mengaktifkan kembali sapi yang telah diarsipkan | Terautentikasi |
| `DELETE`| `/api/v1/sapi/{id_sapi}` | Menghapus permanen data sapi dan riwayatnya | Terautentikasi |

### 4. Pengukuran Bobot & Analitik PBH (`/pengukuran`)
| Method | Endpoint | Deskripsi | Akses |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/pengukuran/predict` | **Tahap 1 Two-Step Commit:** Estimasi bobot citra sapi via AI (tanpa simpan DB/storage) | Terautentikasi |
| `POST` | `/api/v1/pengukuran/save` | **Tahap 2 Two-Step Commit:** Kompresi WebP, upload Neon Storage, dan simpan transaksi DB | Terautentikasi |
| `GET` | `/api/v1/pengukuran/history/{id_sapi}` | Ringkasan analitik PBH, time-series bobot, dan Presigned URL foto | Terautentikasi |
| `POST` | `/api/v1/pengukuran/pbh/kalkulator` | Utilitas kalkulator mandiri PBH antara 2 nilai bobot | Terautentikasi |

---

## ⚙️ Konfigurasi Environment (`backend/.env`)

Salin berkas `backend/.env.example` menjadi `backend/.env` dan lengkapi parameternya:

```bash
cd backend
cp .env.example .env
```

Contoh konfigurasi aktif pada `backend/.env`:

```env
# App Configuration
PROJECT_NAME="TimbangDulu API"
VERSION="1.0.0"
API_V1_STR="/api/v1"

# Database Configuration (Neon PostgreSQL - Connection Pooling)
# Catatan: Wajib menggunakan host pooler (-pooler) dan parameter sslmode=require
DATABASE_URL="postgresql://<user>:<password>@ep-rapid-sea-123456-pooler.c-3.ap-southeast-1.aws.neon.tech/neondb?sslmode=require"

# Neon Object Storage (S3-Compatible) Configuration
# Bucket dikelola deklaratif via neon.ts (bucket: cattle-images, access: public_read)
AWS_ENDPOINT_URL_S3="https://<project-id>.storage.<region>.neon.tech"
AWS_ACCESS_KEY_ID="<your-neon-storage-access-key-id>"
AWS_SECRET_ACCESS_KEY="<your-neon-storage-secret-access-key>"
AWS_REGION="ap-southeast-1"
NEON_STORAGE_BUCKET_NAME="cattle-images"

# Keamanan & Autentikasi JWT
SECRET_KEY="buat-kunci-rahasia-acak-minimal-32-karakter-yang-sangat-aman"
ALGORITHM="HS256"
ACCESS_TOKEN_EXPIRE_MINUTES=1440

# AI Model Inference Configuration
# USE_MOCK_AI=False: Menjalankan model Keras asli | True: Mock inferensi cepat untuk testing
USE_MOCK_AI=False

# Path berkas model AI (relatif dihitung dari folder backend/)
CATTLE_CLASSIFIER_PATH=../model_prediksi/sapibukan_cifor.keras
CATTLE_SEGMENTATION_PATH=../model_prediksi/best_seg_model.keras
CATTLE_REGRESSION_PATH=../model_prediksi/best_reg_model.keras
```

> [!TIP]
> **Menyiapkan Bucket & Kredensial Neon Object Storage:**
> 1. Pastikan berkas [neon.ts](neon.ts) di root proyek telah mendeklarasikan bucket `cattle-images`.
> 2. Kredensial S3 dapat dibuat langsung melalui **Neon Console** (Menu *Object Storage* -> *Create Access Key*) atau ditarik secara otomatis menggunakan Neon CLI:
>    ```bash
>    neon env pull
>    ```

---

## 💻 Panduan Menjalankan Aplikasi (Local Setup)

### 1. Prasyarat Sistem
- **Python** 3.10+ (disarankan Python 3.12 atau 3.13)
- **Node.js** 20.x atau 22.x dan **npm**
- Akun dan database **PostgreSQL di Neon.tech**

---

### 2. Menjalankan Backend (FastAPI)

1. Masuk ke direktori backend:
   ```bash
   cd backend
   ```

2. Buat dan aktifkan Python Virtual Environment:
   ```bash
   # Windows PowerShell:
   python -m venv .venv
   .\.venv\Scripts\Activate.ps1

   # Linux / macOS:
   python3 -m venv .venv
   source .venv/bin/activate
   ```

3. Pasang seluruh dependensi backend:
   ```bash
   pip install -r requirements.txt
   ```

4. Sinkronisasi skema tabel database (termasuk partial unique index):
   ```bash
   python -m app.db.init_db
   ```

5. Jalankan server backend:
   ```bash
   python main.py
   ```
   > [!IMPORTANT]
   > **Penting:** Selalu jalankan `python main.py` dari dalam folder `backend/` agar path relatif model AI `../model_prediksi/` dapat terbaca secara presisi oleh aplikasi.

   Layanan backend aktif di:
   - **Base API:** `http://127.0.0.1:8000`
   - **Swagger UI:** `http://127.0.0.1:8000/docs`
   - **ReDoc:** `http://127.0.0.1:8000/redoc`

---

### 3. Data Seeder untuk Demo & Pengujian (`backend/scripts/seed_demo.py`)

Untuk keperluan pengujian antarmuka, presentasi, dan demo fitur tanpa harus melakukan penimbangan manual satu per satu, tersedia skrip seeder realistis:

```bash
# Pastikan terminal berada di folder backend/ dengan venv aktif:
cd backend

# 1. Seeding ke akun demo default (username: demo_peternak / password: demo1234):
python scripts/seed_demo.py

# 2. Seeding ke akun pengguna tertentu yang sudah terdaftar:
python scripts/seed_demo.py --username nama_peternak_anda

# 3. Membersihkan data demo lama lalu melakukan seeding ulang secara bersih:
python scripts/seed_demo.py --clean
```

**Dataset realistis yang di-generate oleh seeder (9 ekor sapi & 32 rekor pengukuran):**
1. **5 Ekor Sapi Aktif (PBH Positif):**
   - `DEMO-001` (Simental, Jantan): 5 pengukuran 4 bulan terakhir (310 kg → 420 kg).
   - `DEMO-002` (Limousin, Jantan): 5 pengukuran 4 bulan terakhir (340 kg → 445 kg).
   - `DEMO-003` (Brahman, Betina): 4 pengukuran 3 bulan terakhir (260 kg → 326 kg).
   - `DEMO-004` (Bali, Betina): 4 pengukuran 3 bulan terakhir (195 kg → 245 kg).
   - `DEMO-005` (Peranakan Ongole, Jantan): 4 pengukuran 3 bulan terakhir (240 kg → 308 kg).
2. **1 Ekor Sapi Aktif PBH Negatif (Demo Alert Penyusutan Bobot):**
   - `DEMO-006` (Simental, Betina): 4 pengukuran (290 kg → 325 kg → 315 kg, turun 10 kg untuk menguji peringatan dini $\text{PBH} < 0$).
3. **1 Ekor Sapi Baru Masuk (Demo Edge Case PBH Null):**
   - `DEMO-007` (Bali, Jantan): 1 pengukuran hari ini (210 kg, tanpa PBH).
4. **2 Ekor Sapi Berstatus Arsip:**
   - `DEMO-ARSIP-01` (Limousin, Jantan): Keluar 2 minggu lalu dengan riwayat 3 pengukuran.
   - `DEMO-ARSIP-02` (Brahman, Betina): Keluar 1 bulan lalu dengan riwayat 2 pengukuran.

---

### 4. Menjalankan Frontend (React 19 + Vite)

1. Buka terminal baru dan masuk ke direktori frontend:
   ```bash
   cd frontend
   ```

2. Pasang dependensi frontend:
   ```bash
   npm install
   ```

3. Jalankan development server:
   ```bash
   npm run dev
   ```
   Aplikasi frontend dapat diakses melalui browser di `http://localhost:5173`.

4. Untuk memvalidasi build produksi frontend:
   ```bash
   npm run build
   ```

---

## 🧪 Pengujian Otomatis (Automated Testing)

Jalankan seluruh test suite otomatis backend menggunakan Pytest:

```bash
cd backend
pytest -v
```

Untuk memverifikasi koneksi live langsung ke database Neon PostgreSQL aktif:
```bash
python tests/verify_neon_registration.py
python tests/verify_neon_sapi_crud.py
```

---

## 🗺️ Roadmap Proyek

- [x] Pipeline AI 3-tahap (Klasifikasi, Segmentasi, dan Regresi Bobot).
- [x] Alur penimbangan Two-Step Commit (`/predict` -> Preview -> `/save`).
- [x] Kompresi WebP & penyimpanan penuh ke Neon Object Storage S3-compatible.
- [x] Skema Partial Unique Index `ear_tag` untuk pemanfaatan ulang tag sapi arsip.
- [x] Presigned URL dan Lightbox modal preview foto resolusi penuh.
- [x] Edit profil pengguna & live synchronization ke sidebar profile card.
- [x] Skrip database seeder realistis untuk demo dan showcase aplikasi (`seed_demo.py`).
- [x] 100% lulus 41 skenario pengujian unit & integrasi backend.

---

## 👥 Tim & Kontribusi

Proyek **TimbangDulu** dikembangkan untuk mendorong digitalisasi dan otomasi pemantauan peternakan sapi presisi di Indonesia.
Lisensi dan hak cipta dilindungi untuk keperluan riset, akademik, dan pengembangan proyek TimbangDulu.
