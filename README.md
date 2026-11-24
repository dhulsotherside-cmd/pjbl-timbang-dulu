# TimbangDulu — Platform Digital Estimasi Bobot Sapi & Pemantauan PBH

<div align="center">

![TimbangDulu Logo](frontend/src/assets/images/logo-timbangdulu.png)

**Solusi Modern Manajemen Peternakan Sapi Berbasis Computer Vision & Analisis Pertumbuhan Harian**

[![FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688?style=flat&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/Frontend-React_19_%2B_Vite-61DAFB?style=flat&logo=react&logoColor=black)](https://react.dev)
[![PostgreSQL](https://img.shields.io/badge/Database-PostgreSQL_(Neon)-4169E1?style=flat&logo=postgresql&logoColor=white)](https://neon.tech)
[![Python](https://img.shields.io/badge/Python-3.10%2B-3776AB?style=flat&logo=python&logoColor=white)](https://python.org)
[![License](https://img.shields.io/badge/License-Private%20%2F%20Academic-green)]()

</div>

---

## 📖 Tentang TimbangDulu

**TimbangDulu** adalah platform fullstack yang dirancang untuk membantu peternak sapi dalam memantau pertumbuhan ternak secara efisien tanpa memerlukan timbangan mekanis/digital konvensional berukuran besar. 

Dengan memanfaatkan citra ternak (tampak samping dan belakang), sistem melakukan estimasi bobot melalui pipeline Computer Vision serta menghitung **Perkembangan Bobot Harian (PBH / *Average Daily Gain*)** secara otomatis untuk mendeteksi anomali nutrisi atau kesehatan lebih dini.

---

## 🏗️ Arsitektur Sistem & Integrasi

Proyek ini dibangun dengan pendekatan decoupled monorepo:

```text
TimbangDulu/
├── frontend/        # Single Page Application (SPA) - React 19, Vite, Recharts, Three.js
├── backend/         # REST API Service - FastAPI, SQLAlchemy 2.0, Pydantic, Neon PostgreSQL
└── ai_engine/       # Modul Computer Vision & Bobot Model AI (YOLO + CNN Regression)
```

```mermaid
graph TD
    User([Peternak / Pengguna]) -->|HTTP / SPA| FE[Frontend React 19 + Vite]
    FE -->|REST API + JWT Bearer| BE[Backend FastAPI]
    
    subgraph Data & Storage Layer
        BE -->|SQLAlchemy 2.0 + PgBouncer Pool| DB[(Neon Serverless PostgreSQL)]
        BE -->|Upload Citra Sapi UUID| Storage[(Neon Object Storage S3-Compatible)]
    end
    
    subgraph Intelligence Layer
        BE -->|Pipeline Inferensi| AI[CattleVisionService / ONNX Runtime]
        BE -->|Analisis ADG| PBH[Kalkulator PBH]
    end
```

### 1. Database Relasional: Neon Serverless PostgreSQL
- Menggunakan **Neon PostgreSQL** dengan fitur *Connection Pooling* (`-pooler`).
- Dikonfigurasi secara resilient terhadap *cold start / auto-suspend* Neon (`connect_timeout=15s`, `pool_pre_ping=True`, `pool_recycle=300s`).
- Mengimplementasikan isolasi **Multi-Tenancy**: setiap peternak hanya dapat mengelola data sapi miliknya, dengan *unique constraint* `(id_user, ear_tag)`.

### 2. Penyimpanan Berkas Citra (Neon Object Storage)
> [!TIP]
> **Arsitektur Terpadu Neon:** TimbangDulu memanfaatkan **Neon Object Storage Buckets** yang didefinisikan langsung pada berkas [neon.ts](file:///C:/Users/THINKPAD/Documents/Banu/IPB/proyek/TimbangDulu/neon.ts) (bucket `cattle-images`).
> 
> Keuntungan utama arsitektur ini adalah **Branching terpadu**: saat database Neon di-branch untuk preview atau pengujian, bucket dan berkas citra ikut ter-branch secara instan dengan semantik *copy-on-write*. Backend mengintegrasikan adapter S3-compatible via `app/services/neon_storage.py` (`boto3`) untuk mengunggah berkas gambar foto samping dan belakang sapi berpenamaan acak `uuid4.ext`. Jika kredensial belum diisi, sistem otomatis menggunakan mock storage adapter sehingga aplikasi tetap dapat diuji secara lokal tanpa hambatan.

### 3. Pipeline Inferensi Bobot & Analitik PBH
- **AI Inference Engine:** Dilengkapi kelas `CattleVisionService` dengan switch `USE_MOCK_AI=True`. Menghasilkan estimasi bobot realistis (rentang 60–450 kg) dengan latensi simulasi 0.5–0.8 detik, siap diganti runtime model ONNX saat berkas bobot model diserahkan.
- **Kalkulator PBH:** Menghitung laju pertumbuhan:
  $$\text{PBH} = \frac{\Delta\text{Bobot}}{\Delta\text{Hari}} = \frac{\text{Bobot Akhir} - \text{Bobot Awal}}{\text{Jumlah Hari}}$$
  Dilengkapi peringatan dini (`PERINGATAN_PENURUNAN`) jika bobot ternak menyusut.

---

## 🚦 Status Integrasi Komponen (Development Snapshot)

| Modul | Sub-Komponen | Status | Keterangan |
| :--- | :--- | :---: | :--- |
| **Backend Auth** | JWT + Bcrypt Hashing | ✅ Selesai | Registrasi, Login, Route Guards, Multi-tenancy |
| **Backend Sapi** | CRUD Sapi & Jenis Sapi | ✅ Selesai | Transaksi atomik bobot awal manual, Soft-delete archive/unarchive |
| **Backend PBH** | ADG Engine & Validator | ✅ Selesai | Kalkulator mandiri + kalkulator historis antar pengukuran |
| **Backend Storage**| Neon Object Storage Adapter | ✅ Selesai | S3-compatible adapter (`boto3`), validasi MIME, UUID sanitizer, lazy init & mock fallback |
| **Backend Testing**| Pytest Suite (22 Unit Tests) | ✅ Selesai | Verifikasi registrasi, security, isolasi data, dan live Neon scripts |
| **Frontend Auth** | Login & Register Pages | ✅ Selesai | Terhubung ke `/api/v1/auth`, JWT storage di localStorage, auto-redirect |
| **Frontend Cattle**| Manajemen & Detail Sapi | ✅ Selesai | Terhubung ke `/api/v1/sapi`, modal tambah sapi, tab aktif/arsip, grafik Recharts |
| **Frontend Ukur** | Halaman Pengukuran Citra | 🟡 Tahap Lanjutan | Antarmuka kamera & upload selesai; sedang proses wiring ke `/api/v1/pengukuran/predict` |
| **Frontend Dash** | Dashboard Statistik | 🟡 Tahap Lanjutan | Tampilan UI selesai; perlu penyambungan ke endpoint agregasi analitik |
| **AI Model** | Model Bobot Riil (ONNX) | ⏳ Menunggu Artifak | Mock inference aktif; menunggu ekspor model dari `ai_engine/` |

---

## 💻 Panduan Menjalankan Proyek (Local Setup)

### 1. Prasyarat
- **Node.js** v18+ dan **npm**
- **Python** 3.10+ (disarankan 3.10–3.12)
- Akun / Database URL **Neon PostgreSQL** (atau PostgreSQL lokal)
- (Opsional) Kredensial **Neon Object Storage** untuk Bucket `cattle-images` (bisa ditarik via `neon env pull`)

---

### 2. Setup Backend (FastAPI)

1. Masuk ke direktori backend:
   ```bash
   cd backend
   ```

2. Buat dan aktifkan Python Virtual Environment:
   ```bash
   # Windows PowerShell
   python -m venv .venv
   .\.venv\Scripts\Activate.ps1

   # Linux / macOS
   python3 -m venv .venv
   source .venv/bin/activate
   ```

3. Pasang dependensi backend:
   ```bash
   pip install -r requirements.txt
   ```

4. Konfigurasi variabel lingkungan:
   Salin `.env.example` ke `.env` lalu sesuaikan isinya:
   ```bash
   cp .env.example .env
   ```
   *Contoh isi `.env` minimal:*
   ```env
   PROJECT_NAME="TimbangDulu API"
   VERSION="1.0.0"
   API_V1_STR="/api/v1"

   # Neon PostgreSQL Connection Pooling
   DATABASE_URL="postgresql://<user>:<password>@<ep-pooler-host>.us-east-2.aws.neon.tech/<dbname>?sslmode=require"

   # Neon Object Storage S3-Compatible (Opsional saat mode mock)
   AWS_ENDPOINT_URL_S3="https://<project-id>.storage.<region>.neon.tech"
   AWS_ACCESS_KEY_ID="<your-neon-storage-access-key-id>"
   AWS_SECRET_ACCESS_KEY="<your-neon-storage-secret-access-key>"
   AWS_REGION="us-east-2"
   NEON_STORAGE_BUCKET_NAME="cattle-images"

   # Keamanan JWT
   SECRET_KEY="buat-kunci-rahasia-acak-minimal-32-karakter"
   ALGORITHM="HS256"
   ACCESS_TOKEN_EXPIRE_MINUTES=1440

   # Mock AI Switch
   USE_MOCK_AI=True
   ```

5. Inisialisasi skema tabel & data master:
   ```bash
   python -m app.db.init_db
   ```

6. Jalankan server backend:
   ```bash
   python main.py
   ```
   API aktif di `http://127.0.0.1:8000`.
   - Dokumentasi Swagger UI: `http://127.0.0.1:8000/docs`
   - Dokumentasi ReDoc: `http://127.0.0.1:8000/redoc`

---

### 3. Setup Frontend (React 19 + Vite)

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
   Aplikasi frontend aktif di `http://localhost:5173`.

---

## 🧪 Pengujian Otomatis (Automated Testing)

Jalankan rangkaian pengujian unit dan integrasi backend:
```bash
cd backend
pytest -v
```

Untuk menguji koneksi langsung (*live*) ke database Neon PostgreSQL aktif:
```bash
python tests/verify_neon_registration.py
python tests/verify_neon_sapi_crud.py
```

---

## 🗺️ Roadmap & Prioritas Selanjutnya

- [ ] **Wiring Pengukuran Frontend:** Menghubungkan form upload foto di `MeasurementPage.jsx` ke endpoint `POST /api/v1/pengukuran/predict`.
- [ ] **Endpoint Analitik Dashboard:** Mengimplementasikan endpoint agregasi statistik untuk menggantikan mock data di `DashboardPage.jsx`.
- [ ] **Integrasi Model AI Riil:** Mengintegrasikan ONNX Runtime atau TorchScript di `CattleVisionService` menggantikan mode mock ketika model bounding box dan estimasi bobot telah diekspor.
- [x] **Penyimpanan Terpadu Neon:** Migrasi 100% ke Neon Object Storage (S3-compatible) terdefinisi deklaratif di `neon.ts`. Supabase bucket sepenuhnya dihilangkan dari arsitektur.

---

## 👥 Tim & Kontribusi

Proyek ini dikembangkan untuk digitalisasi pemantauan peternakan sapi presisi.
Lisensi dan hak cipta dilindungi untuk keperluan riset dan pengembangan proyek TimbangDulu.
