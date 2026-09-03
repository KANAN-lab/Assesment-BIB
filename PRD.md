# Product Requirement Document (PRD)
## Employee Logistics Assessment System (BIB Mechanism & Dynamic Competency Matrix)

---

| Metadata | Detail |
| :--- | :--- |
| **Document Version** | 3.6.0 (Pustaka SOP Micro-Deck Interactive Academy, Multi-Slide Timeline Storyboard, 5-Point Enterprise Optimizations: Lazy-Loading, Offline-First SOP Sync, PDF Poster Cheatsheet, QR Badge SIO Scanner, Point Idempotency) |
| **Status** | Approved / Active Specification |
| **Author** | Antigravity AI & Engineering Team |
| **Target User** | Staff Logistik (Kurir, Driver, Worker Gudang, Supervisor/Pengawas, Ops Manager, System Administrator) |
| **Company** | PT. DAYA ANUGRAH MULYA |
| **Primary Goal** | Penilaian kinerja berimbang (BIB & Competency Matrix), **Pustaka SOP Micro-Deck & K3 Academy Interaktif (WMS Simulator, Hazard Hunt, Document Reader)**, **Multi-Slide Deck Builder & Timeline Storyboard**, **Offline-First SOP & Background Sync Engine**, **Ekspor Poster A4 SOP PDF**, **Quick QR Badge Scanner SIO MHE**, **Idempotency Locking Poin**, laporan insiden K3 + GDrive, kompresi foto HD, dan navigasi eksekutif multi-level. |

---

## 1. Architecture Strategy: OOP, DDD & Security-First

Aplikasi menggunakan **Object-Oriented Programming (OOP)** dan **Domain-Driven Design (DDD)** dengan prinsip **Security-First** di seluruh lapisan.

```
[ Domain Entities (OOP) ]
  ├── WorkerEntity           ── Tier, BIB score, streak calculation, points bonus
  ├── DivisionEntity         ── Dynamic divisions (WFG, WRM, Timbangan, GA, Expedisi, WSP, dll)
  ├── RoleEntity             ── Dynamic roles + resolveSystemRole() RBAC enforcement (Worker vs Supervisor/Pengawas vs Admin)
  ├── RewardEntity           ── OOP validation (RewardEntity.validate), stock mutation (restock, setStock), price affordability (canBeRedeemedBy), redemption code generator
  └── CompetencyMatrixEngine ── 54+ items, max score bounds, grade calculation, dynamic matrix extraction for AI prompts

[ Data & Interface Layer ]
  ├── CustomDataTable        ── Reusable data table engine (real-time search, multi-column sorting, custom pagination 10/25/50/100, CSV export, dark glassmorphism)
  ├── ImageCompressorEngine  ── High-quality Web Worker image compression library (browser-image-compression, 90% HD quality, max 2560px)
  ├── GDriveTargetSyncBridge ── Direct sync bridge & upload target for GDrive Folder ID: 16p6cnEb7o6zOF2jFcPm3z7Md-Utntrkr
  └── ExecutivePDFReportGen  ── Official corporate PDF report exporter with signature verification block & summary metrics

[ Infrastructure & Performance Layer ]
  ├── RedisCacheAdapter      ── High-performance in-memory Redis cache (TTL, LRU eviction, keyspace invalidation)
  ├── LoadBalancerEngine     ── Multi-node Round-Robin & Least-Connections load balancer + Token Bucket Rate Limiter & Circuit Breaker
  └── AtomicTransactionMgr   ── ACID atomic points deduction & reward inventory stock decrement (Supabase RPC rpc_redeem_reward)

[ Security & Service Layer ]
  ├── signUpWorker()              ── Strict unique NIK+Email check (NO overwrite) & Supervisor approval status gate
  ├── signInWithNikOrEmail()      ── Status gate + Supabase Auth + DB fallback
  ├── sendPasswordResetEmail()    ── OTP via signInWithOtp (tidak trigger signup email)
  ├── verifyOtpAndResetPassword() ── OTP verification + DB password update
  ├── updateWorkerStatus()        ── Admin-only Approve/Reject supervisor
  ├── fetchAllRedemptionHistory() ── Audit log riwayat penukaran staf untuk Admin
  └── generateDailyQuiz()         ── 100% Pure Dynamic AI & Supabase Quiz Engine (Zero Hardcoding)
```

---

## 2. Email Policy (v3.1)

> [!IMPORTANT]
> **Kebijakan Email Pekerja — Bebas Domain (Personal Email)**:
> - Setiap pekerja dapat menggunakan email pribadi dari domain apapun: **Gmail, Outlook/Hotmail, Yahoo, iCloud, corporate email, dll.**
> - **Tidak ada pembatasan domain email** bagi pekerja.
> - Validasi yang berlaku: format email meadung `@` dan `.`
> - Email yang belum terdaftar (kolom `workers.email = NULL`) menyebabkan fitur Reset Password tidak tersedia sampai pekerja menautkan email melalui First-Time Setup.

---

## 3. Fitur Utama & Modul Antarmuka

### 3.1. Worker Dashboard (Pekerja Operasional)
- **Bar Aksi Atas Ringkas & Bebas Redundansi**: Tombol **"🚨 Laporan Insiden K3"** diposisikan sejajar di bar aksi atas tepat di sebelah tombol **Pre-Shift Checklist**. Tombol floating `Dokumen SOP K3` di bawah dieliminasi penuh karena pustaka SOP telah aktif di Navbar atas (`📖 SOP K3`).
- **Upload Bukti Foto Insiden K3 + Library Compression & GDrive Sync**:
  - Menggunakan library resmi `browser-image-compression` untuk mengompresi foto bukti K3 di Web Worker secara real-time (maxSizeMB: 1.5MB, maxWidthOrHeight: 2560px, initialQuality: 0.90) **tanpa mengurangi kualitas/ketajaman foto tajam 90% HD**.
  - Penautan otomatis target Google Drive Folder ID: `16p6cnEb7o6zOF2jFcPm3z7Md-Utntrkr` dengan 1-klik tombol **"Folder Google Drive Target"**.
- **Dynamic Competency Radar Chart**: Radar chart menampilkan sumbu kompetensi aktif sesuai role pekerja (sumbu N/A otomatis dieliminasi).
- **Gappy AI Daily Safety Quest (100% Dynamic & Zero Hardcode)**: Kuis K3 & SOP logistik yang di-generate oleh **Gappy AI (Gemini API)** dengan menginjeksi modul acuan **Matriks Kompetensi Resmi (`matrixData.json`)** sesuai peran pekerja. Bank soal di-cache & di-populate di Supabase `quiz_questions` (Supabase-first → 0 token AI jika soal role tersedia).
- **Role-Specific Pre-Shift Inspection Checklist (8 Items)**: Inspeksi 8 poin keselamatan harian yang dihasilkan secara dinamis berdasarkan `role` & `division` pekerja (`getPreShiftChecklistForRole`), menguji kelengkapan APD, kondisi peralatan/sistem, dan dokumen SOP legal spesifik peran.
- **30-Day BIB Score Trend Chart**: Grafik area Recharts menampilkan tren historis skor BIB 30 hari terakhir.
- **Tier Upgrade Toast & Confetti**: Selebrasi visual saat poin pekerja mencapai ambang tier baru (Novice → Pro → Elite → Champion).
- **Profile Picture Upload**: Unggah foto avatar ke Supabase Storage bucket `avatars`.
- **Employee-Only Leaderboard**: Peringkat kompetitif antar **sesama pekerja operasional biasa**. Akun System Administrator dan Supervisor/Pengawas secara otomatis difilter keluar dari Leaderboard pekerja.
- **Reward Marketplace**: Penukaran poin dengan reward katalog (merchandise, voucher, dll) dengan verifikasi stok real-time & pembuatan kode voucher digital.

### 3.2. Supervisor Console (Pengawas Lapangan & Reporting Suite)
- **Visual Radar Kompetensi Matrix (Recharts)**: Grafik jaring radar interaktif yang menampilkan sebaran ketercapaian kompetensi pekerja per kategori aktif (`General`, `EHS`, `WRH`, `LOG`, `QC`, `PRD`, `Administrasi`, `Mutu`) dengan tooltip detail per perbandingan poin audit vs poin maksimal target.
- **Modular Competency Matrix Grid**: Rincian ketercapaian modul kompetensi per kategori (General, EHS, Warehouse, Quality, Logistics, dll.) dengan skor ter-audit vs target max score, persentase ketercapaian, progress bar berwarna, dan indikator status kompetensi (*Kompeten*, *Pengawasan*, *Perlu Training*).
- **3-Tile Operational Compliance & Performance Summary**: Grid 3 indikator visual serasi:
  1. *Total Poin Reward*: Akumulasi poin pekerja & status penukaran katalog.
  2. *Inspeksi Pre-Shift K3 Harian*: Status verifikasi keselamatan harian (`✓ Terverifikasi Aman` / `Belum Diisi`).
  3. *Status Kuis Harian & Safety Streak*: Progress evaluasi mandiri harian & jumlah hari streak.
- **Perfect Grid Architecture**: Tata letak 2 kolom simetris (`lg:col-span-4` dan `lg:col-span-8`) yang presisi tanpa celah hitam (*dead space*) dan tanpa tombol duplikat.
- **Competency Matrix Audit Modal**: Form evaluasi 54 item kompetensi dengan acuan Rules Kisaran 1–5 (Pembelajaran, Pelaksanaan, Pengontrolan, Evaluasi & Antisipasi, Penciptaan). Penegakan batasan input skor dibatasi ketat oleh MaxScore role pekerja.
- **Automated Audit PDF Exporter**: Ekspor laporan audit komprehensif seluruh personel tim operasional ke format PDF terstruktur menggunakan `jspdf` & `jspdf-autotable`.

### 3.3. Administrator Console & CustomDataTable Engine
- **Categorized Executive Tab Navigation Suite**: Redesain navigasi admin menjadi 4 kelompok modul terstruktur:
  1. *👥 SDM & AKSES PEKERJA*: Staf Operasional, Approval Supervisor, Log Aktivitas Sistem.
  2. *🎁 PERFORMANSI & REWARD*: Katalog Reward, Executive Analytics, Laporan Insiden K3.
  3. *⚙️ MASTER SETUP DATA*: Master Divisi, Master Role, Matriks Kompetensi.
  4. *⚡ AI ENGINE & INFORMASI*: Gappy AI Engine, Pengumuman Tim.
- **CustomDataTable Component (`CustomDataTable.tsx`)**: Mesin tabel data reusable dilengkapi pencarian real-time, pengurutan kolom ascending/descending, paginasi kustom (10/25/50/100 baris), ekspor CSV otomatis, dan tema Dark Glassmorphism.
- **Manajemen Divisi & Role**: CRUD divisi operasional & role per divisi dengan binding MaxScore otomatis.
- **Manajemen Pekerja & Import Data Staf**: CRUD data pekerja + modal import massal dari format text/TSV.
- **Approval Supervisor**: Antrian permohonan akses supervisor baru — Approve / Reject dengan indikator pulse alert.
- **Dedicated Tab `🎁 Reward` (Manajemen Stok & Audit Log)**: Metrik stok utama, modal CRUD & Quick Restock (berbasis `RewardEntity`), dan audit log riwayat penukaran voucher staf real-time.

---

## 4. SECURITY SPECIFICATION — Authentication & Session Management

> [!CAUTION]
> Seluruh spesifikasi di seksi ini adalah **CRITICAL & NON-NEGOTIABLE**.

---

### 4.1. Alur Lengkap Login (signInWithNikOrEmail)

```
USER INPUT (NIK / NIP / Email pribadi)
  │
  ▼
[1] findWorkerByIdentifier()
  ├── Query eksak: employee_id = input
  ├── Query eksak: email = input (lowercase)
  ├── Query eksak: id = input
  └── Fallback: digit matching NIK numerik
  │   ⚠ DILARANG: fuzzy/prefix/substring matching email
  │
  ▼
[2] STATUS GATE (WAJIB sebelum verifikasi password)
  ├── status = 'pending_approval' → BLOCK LOGIN
  ├── status = 'rejected' → BLOCK LOGIN
  └── status = 'active' (atau NULL dengan resolve logis) → LANJUT
  │
  ▼
[3A] Coba Supabase Auth (email nyata + password) — hanya jika email ada
  ├── Berhasil → simpan user_id ke workers jika belum ada → return session
  └── Gagal → LANJUT ke [3B]
  │
  ▼
[3B] Verifikasi password dari kolom workers.password
  ├── SYS-ADMIN: password === hardcoded admin password || savedPassword
  ├── Worker (must_change_password = false): password === savedPassword
  └── Worker baru (must_change_password = true): password === '123' → OK (wajib ganti)
  │
  ▼
[4] Return { user, worker: WorkerProfile }
```

---

### 4.2. Status Model Akun Pekerja

| Status | Deskripsi | Bisa Login? | Tampil di Approval? |
| :--- | :--- | :---: | :---: |
| `active` | Akun aktif dan disetujui | ✅ | ❌ |
| `pending_approval` | Menunggu persetujuan admin | ❌ | ✅ |
| `rejected` | Permohonan ditolak admin | ❌ | ❌ |
| `NULL` | Data lama (resolve otomatis) | Resolve* | — |

**\*Resolusi NULL** (`rowToWorkerProfile`):
- Role `Supervisor / Pengawas` + `user_id` tidak null + bukan NIK seed → `pending_approval`
- Semua kasus lain → `active`

---

### 4.3. Alur Pendaftaran Akun Baru

```
FORM INPUT → Strict Uniqueness Check (NIK eksak + Email eksak lowercase)
  │
  ▼
INSERT workers (MURNI INSERT — TANPA UPSERT/UPDATE)
  ├── Tipe 'worker'     → status = 'active'     → role sesuai pilihan → langsung bisa login
  └── Tipe 'supervisor' → status = 'pending_approval' → role = 'Supervisor Logistik' → tunggu approval admin
```

> [!IMPORTANT]
> **Anti-Overwrite Rule**: `signUpWorker` dilarang keras mode UPSERT/UPDATE. NIK atau Email duplikat → REJECT dengan error eksplisit.

---

### 4.4. Alur Approval Supervisor

```
Admin Console → Tab "Approval Supervisor"
  → Filter: allWorkers.filter(w => w.status === 'pending_approval')
  → Approve → updateWorkerStatus(id, 'active')
  → Reject  → updateWorkerStatus(id, 'rejected')
```

---

### 4.5. Alur Reset Password (OTP Aman)

```
"Lupa Password?" → Input NIK / Email
  → findWorkerByIdentifier()
  → Cek email ada & valid (bukan null/kosong)
  → Kirim OTP: supabase.auth.signInWithOtp({ email, shouldCreateUser: true })
      ⚠ DILARANG: supabase.auth.signUp() pada alur ini
  → User input OTP 6 digit
  → verifyOtp({ type: 'recovery' }) → fallback type: 'email'
  → Update workers.password + must_change_password = false
```

---

### 4.6. First-Time Password Setup

```
mustChangePassword === true → Modal mengunci (tidak ada close/skip)
  → Input: Password baru (min 6 karakter)
  → Input: Email pribadi (format valid, domain bebas — Gmail, Outlook, dll)
  → Update DB: password, email, must_change_password = false
```

---

### 4.7. Session Persistence & Logout

```
App Mount → initApp()
  [1] localStorage 'komar_active_worker_id' → fetchWorkerById()
  [2] supabase.auth.getSession() → fetchWorkerByUserId()
  [3] Tidak ada → tampilkan LoginModal

Logout → supabase.auth.signOut() + localStorage.removeItem() → setCurrentWorker(null)
```

---

### 4.8. RBAC (Role-Based Access Control) & System Role Resolution

```ts
// RoleEntity.resolveSystemRole(roleName)
if (r === 'system administrator' || r === 'administrator' || r === 'app administrator' || r === 'sysadmin') {
  return 'admin';
}
if (r.includes('supervisor') || r.includes('pengawas') || r.includes('head') || r === 'spv' || r.includes('supervisor logistik')) {
  return 'supervisor';
}
// Operational Staff (Operator Forklift, Checker, PIC Area, Admin WFG, Admin WRM, Admin Timbangan, Admin Ekspedisi, dll)
return 'worker';
```

| Role | System Role | Akses Konsol | Tampil di Leaderboard Pekerja? |
| :--- | :---: | :--- | :---: |
| Operator Forklift, Reachtruck, Checker, PIC Area, Admin WFG/WRM/Timbangan/Ekspedisi | `worker` | Worker Dashboard | ✅ |
| Supervisor Logistik, Pengawas, Head | `supervisor` | + Supervisor Console | ❌ (Filtered Out) |
| System Administrator, Administrator | `admin` | + Admin Console (full access) | ❌ (Filtered Out) |

> [!NOTE]
> `PIC Area` adalah peran operasional pekerja di area gudang (System Role: `worker`), sedangkan `Supervisor Logistik` / `Pengawas` adalah penanggung jawab audit & pengawasan (System Role: `supervisor`).

---

## 5. Anti-Cheat & Gappy AI Quest (100% Dynamic Engine)

### 5.1. Anti-Cheat Detection
1. `visibilitychange` → Kuis VOID (0 poin) saat tab berpindah.
2. `blur` → Kuis VOID saat jendela di-minimize / alt-tab.
3. `beforeunload` → Kesempatan kuis hangus saat close/reload paksa.
4. Pre-Quiz Agreement wajib sebelum kuis dimulai.

### 5.2. Countdown Timer
- 15 detik per soal. Color-coded: **Emerald** (≥8s) → **Amber** (5–7s) → **Rose** (≤4s).

### 5.3. Gappy AI Engine & Quiz Bank (Zero Hardcoding)
```
loadDailyQuiz(workerId, division, role)
  [1] localStorage cache (versi 'bib_quiz_v3_${workerId}_${role}_${division}_${today}') → HIT → gunakan (0 token)
  [2] Supabase quiz_questions (≥5 soal cocok role & division) → shuffle personal (0 token)
  [3] Gappy AI API → Ekstrak modul competencyMatrix untuk role dari matrixData.json → Inject ke QUIZ_PROMPT → Generate + saveQuizzesToSupabase
```

> [!IMPORTANT]
> **Strict Role Boundaries on Quiz Prompts**:
> - **Checker WFG**: Outbound loading dock, SKU packing list, WMS barcode scanner, Hold Area red tag, 3m MHE safety distance. *Bebas dari soal mengendarai forklift/timbangan/ekspedisi.*
> - **Admin WFG**: WMS/SAP Finished Goods, Lot/Batch reconciliation, Surat Jalan Outbound, 5S office. *Bebas dari soal armada ekspedisi/timbangan.*
> - **Admin Ekspedisi**: Transport Management System (TMS), Transport Manifest, container seal integrity, Proof of Delivery (POD), axle weight load limit (ODOL). *Bebas dari soal opname persediaan WFG internal.*
> - **Admin WRM / Admin Timbangan**: Weighbridge zero balance calibration, BAK tonase/damage form, Gross/Tare/Netto, moisture testing.
> - **Operator Forklift**: Pre-use inspection, Load Chart, garpu 15-20cm, reverse driving when view is blocked, max 3 pallet stacking.

---

## 6. Database Schema (Supabase)

```sql
-- Workers Table
CREATE TABLE IF NOT EXISTS workers (
  id                      TEXT PRIMARY KEY,
  user_id                 UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  email                   TEXT UNIQUE,                              -- Email pribadi bebas domain
  name                    TEXT NOT NULL,
  employee_id             TEXT UNIQUE NOT NULL,
  password                TEXT,
  role                    TEXT NOT NULL,
  division                TEXT NOT NULL,
  avatar                  TEXT DEFAULT '',
  streak_days             INTEGER NOT NULL DEFAULT 0,
  total_points            INTEGER NOT NULL DEFAULT 0,
  tier                    TEXT NOT NULL DEFAULT 'Novice Operational',
  bib_behavior            NUMERIC(5,2) NOT NULL DEFAULT 0,
  bib_integrity           NUMERIC(5,2) NOT NULL DEFAULT 0,
  bib_benchmark           NUMERIC(5,2) NOT NULL DEFAULT 0,
  bib_total_score         NUMERIC(5,2) NOT NULL DEFAULT 0,
  daily_quiz_completed    BOOLEAN NOT NULL DEFAULT false,
  pre_shift_checklist_done BOOLEAN NOT NULL DEFAULT false,
  must_change_password    BOOLEAN NOT NULL DEFAULT true,
  last_activity_date      DATE,
  status                  TEXT NOT NULL DEFAULT 'active',
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Quiz Questions (Gappy AI Quiz Bank)
CREATE TABLE IF NOT EXISTS quiz_questions (
  id                  TEXT PRIMARY KEY,
  question            TEXT NOT NULL,
  options             JSONB NOT NULL,
  correct_answer_index INTEGER NOT NULL,
  explanation         TEXT,
  points_reward       INTEGER NOT NULL DEFAULT 50,
  category            TEXT NOT NULL DEFAULT 'Safety & APD',
  division            TEXT DEFAULT 'General',
  role                TEXT DEFAULT 'General',
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Score History
CREATE TABLE IF NOT EXISTS score_history (
  id           TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  worker_id    TEXT NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
  bib_score    NUMERIC(5,2) NOT NULL,
  total_points INTEGER NOT NULL,
  recorded_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Worker Competency Scores
CREATE TABLE IF NOT EXISTS worker_competency_scores (
  id             TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  worker_id      TEXT NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
  competency_id  TEXT NOT NULL,
  score          NUMERIC(5,2) NOT NULL DEFAULT 0,
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(worker_id, competency_id)
);

-- Reward Catalog Table
CREATE TABLE IF NOT EXISTS reward_catalog (
  id              TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  title           TEXT NOT NULL,
  description     TEXT,
  category        TEXT NOT NULL DEFAULT 'Merchandise',
  points_required INTEGER NOT NULL,
  available_stock INTEGER NOT NULL DEFAULT 0,
  image_url       TEXT,
  voucher_code    TEXT,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Redemption History Table
CREATE TABLE IF NOT EXISTS redemption_history (
  id              TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  worker_id       TEXT NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
  reward_id       TEXT NOT NULL REFERENCES reward_catalog(id) ON DELETE CASCADE,
  reward_title    TEXT NOT NULL,
  points_spent    INTEGER NOT NULL,
  redemption_code TEXT NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

---

## 7. System Administrator Credentials

| Field | Value |
| :--- | :--- |
| **NIK / Employee ID** | `SYS-ADMIN` |
| **Email** | `irnando.arkadiantika@pt-dam-id.com` |
| **Password Default** | `Aleale#@!123` |
| **Role** | `System Administrator` |
| **Status** | `active` (hardcoded, tidak perlu approval) |

---

## 8. Security Constraints & Prohibitions

> [!WARNING]

| # | DILARANG | Alasan |
| :---: | :--- | :--- |
| 1 | `signUpWorker` mode UPSERT/UPDATE | Merusak data pekerja existing |
| 2 | Fuzzy/prefix matching email di `findWorkerByIdentifier` | False positive email beda domain |
| 3 | `supabase.auth.signUp()` pada alur reset password | Memicu email konfirmasi default Supabase |
| 4 | Login akun `pending_approval` / `rejected` | Bypass approval sistem |
| 5 | Kolom `status` DEFAULT NULL tanpa resolusi | Supervisor bisa bypass approval |
| 6 | Filter/block berdasarkan domain email pekerja | Diskriminatif, pekerja berhak pakai email pribadi |
| 7 | Secret/API Key di source code | Risiko eksposur kredensial |
| 8 | RBAC bypass via URL manipulation | Pelanggaran keamanan akses konsol |
| 9 | Hardcode array kuis statis pada Gappy AI engine | Kuis harus 100% dinamis berbasis AI & Supabase bank |
| 10 | Menampilkan Admin/Supervisor di Leaderboard Pekerja | Mengacaukan kompetisi staf operasional biasa |

---

## 9. Definition of Done (DoD) v3.2.0

### Auth & Security ✅
- [x] Login memblokir `pending_approval` dan `rejected` sebelum verifikasi password.
- [x] Pendaftaran: query eksak NIK & Email, strict insert, no overwrite.
- [x] Reset password menggunakan OTP `signInWithOtp` (bukan `signUp`).
- [x] Email pekerja bebas domain — tidak ada pembatasan `@` domain.
- [x] Kolom `status NULL` di-resolve otomatis di `rowToWorkerProfile`.
- [x] First-time setup modal mengunci layar (tidak bisa close/skip).
- [x] Session persist (F5 safe) via localStorage + Supabase Auth.
- [x] Logout bersih: `signOut()` + `localStorage.removeItem`.
- [x] RBAC strict: Worker/Supervisor tidak bisa akses console di atas hak akses.

### Approval & Role Resolution ✅
- [x] Pendaftaran akun supervisor baru → `status = 'pending_approval'` & role = `'Supervisor Logistik'`.
- [x] Admin Console tab Approval menampilkan antrean supervisor menunggu.
- [x] Approve → `active`; Reject → `rejected`.
- [x] Supervisor `pending_approval` diblokir login.
- [x] `RoleEntity.resolveSystemRole`: `PIC Area` = `worker`, `Supervisor Logistik / Pengawas` = `supervisor`.

### Gappy AI & Pre-Shift Checklist ✅
- [x] 100% Dynamic AI Quiz Engine (Zero Hardcode) menginjeksi modul acuan `matrixData.json` resmi.
- [x] Supabase quiz bank sebagai prioritas pertama (0 token AI).
- [x] Role-specific strict boundaries (Checker, Admin WFG, Admin Ekspedisi, Admin Timbangan, Operator Forklift).
- [x] Dynamic Pre-Shift Checklist 8-point spesifik peran (`getPreShiftChecklistForRole`).
- [x] Anti-Cheat: tab switch, window blur, beforeunload → kuis VOID 0 poin.
- [x] Countdown timer 15s + color-coded progress bar.

### Admin Rewards Management & Leaderboard ✅
- [x] Tab **`🎁 Reward`** khusus di Admin Console (Stok Metrik, Warning ≤5, Modal CRUD/Restock OOP `RewardEntity`).
- [x] Audit Penukaran Staf (Log tabel riwayat transaksi penukaran seluruh pekerja real-time).
- [x] Leaderboard Pekerja memfilter keluar akun System Administrator & Supervisor (Employee-Only).

### Quality ✅
- [x] `npx tsc --noEmit` → 0 error.
- [x] `npm run build` → bundle sukses.
- [x] Email placeholder di UI menampilkan contoh email pribadi (bukan `@komar.id`).

---

## 10. Modul Pelaporan Eksekutif & Infrastruktur Supervisor (v3.3.0 Roadmap)

### 10.1 Multi-Format Executive Report Exporter (PDF & Excel/TSV)
- **Visual PDF Report Generator**: Menghasilkan Laporan Audit Kinerja & Matriks Kompetensi Pekerja yang siap dicetak untuk Manajemen Ops/HSE:
  - Header Resmi Perusahaan (PT. DAYA ANUGRAH MULYA).
  - Ringkasan Metrik Tim Operasional (Skor Rata-Rata, Safety Streak, Rasio Evaluasi).
  - Tabel Audit Pekerja Lengkap (NIK, Nama, Role, Divisi, Skor Behavior/Integrity/Benchmark, Skor Total BIB, Status Kepatuhan).
  - Kolom Tanda Tangan Verifikasi Supervisor & Manager Ops.

### 10.2 Operational Competency Gap Analysis Visualizer
- **Visualisasi Matriks Kesenjangan Kompetensi (Gap Analysis)**:
  - Grafik perbandingan *Target Level (Required)* vs *Audited Level (Actual)* per divisi operasional.
  - Membantu Supervisor dan Tim HR/Training mengidentifikasi secara tepat modul mana yang membutuhkan pelatihan/re-sertifikasi K3.

### 10.3 Infrastruktur Caching, Load Balancing & Transaksi Atomic
- **Redis Cache Layer (`redisCacheService.ts`)**:
  - Adapter in-memory Redis dengan TTL & LRU eviction policy.
  - Query leaderboard, matriks, dan kuis diproses dalam waktu <1ms.
- **Load Balancer Engine (`loadBalancerService.ts`)**:
  - Round-Robin & Least-Connections load balancer untuk request Gappy AI & database node.
  - Fitur Circuit Breaker (failover otomatis jika error 3x) dan Rate Limiter (Token Bucket RPM/TPM).
- **Atomic Transaction Manager (`atomicService.ts` & SQL RPC `rpc_redeem_reward`)**:
  - Menjamin eksekusi transaksi pemotongan poin pekerja dan pengurangan stok reward secara **Atomic (ACID)** di Supabase tanpa risiko *race condition*.

---

## 11. Modul Pengembangan Masa Depan & Protokol Mutasi (v3.4.0 Roadmap)

> [!IMPORTANT]
> Seluruh modul di bawah ini dirancang sebagai peta jalan pengembangan tingkat lanjut (*Future Enterprise Enhancements*) untuk mendukung dinamika mutasi staf operasional dan ekspansi infrastruktur logistik PT. DAYA ANUGRAH MULYA.

### 11.1 Protokol Pemindahan Role Pekerja (Proper Role Transfer Protocol)
- **Isolasi Nilai Audit Role Lama (Archived Audit Snapshot)**:
  - Saat seorang staf operasional dipindahkan ke role baru (contoh: *Checker WFG* → *Operator Forklift*), seluruh skor audit kompetensi pada role lama secara otomatis di-snapshot dan disimpan ke tabel historis `worker_competency_history`.
  - **Prinsip Clean Slate Baseline**: Skor audit matriks pada role baru **dimulai murni dari angka 0 (Clean Slate Reset)**. Batas *MaxScore* dan penilaian dari role terdahulu **dilarang keras memengaruhi atau mencemari** kalkulasi skor BIB/matriks pada role baru.
  - Tab riwayat audit historis disediakan agar Supervisor dan HR dapat meninjau rekam jejak kompetensi pekerja pada role-role terdahulu.

### 11.2 Protokol Pemindahan Divisi Pekerja (Division Mutation Protocol)
- **Penyesuaian Prosedur & Sistem Otomatis**:
  - Saat pekerja dipindahkan antar divisi (contoh: *WRM* → *WFG* / *EXP*), sistem secara otomatis mengupdate binding divisi pekerja.
  - Opsi SOP K3, Pre-Shift Checklist 8-poin spesifik divisi, dan bank soal Kuis Gappy AI otomatis beralih mengikuti acuan divisi yang baru tanpa perlu registrasi ulang akun.

### 11.3 Peta Jalan Modul Inovasi Masa Depan (Usulan Pengembangan Lanjutan)
1. **Fitur A: Integrasi Presensi Absensi & Roster Shift Staf Logistik**
   - Penautan data absensi harian dan jadwal roster shift (Shift 1, 2, Night Shift) dengan status verifikasi Pre-Shift Inspection K3.
2. **Fitur B: Penugasan Otomatis Modul Pelatihan K3 & E-Learning (Auto-Training Assignment)**
   - Sistem secara otomatis mengirimkan rekomendasi modul e-learning dan jadwal re-sertifikasi K3 kepada pekerja yang memiliki *Competency Gap ≥ 25%* berdasarkan hasil audit Supervisor.
3. **Fitur C: QR Code Digital ID Card & Lisensi Mengemudi MHE (Forklift/Reachtruck/Timbangan)**
   - Penerbitan kartu ID digital ber-QR Code untuk setiap operator MHE (Material Handling Equipment) yang dapat di-scan oleh Supervisor untuk memverifikasi keabsahan lisensi K3 dan status skor BIB aktif.
4. **Fitur D: Modul Kontrol & Follow-Up Laporan Insiden K3 (Incident Management & CAPA Suite)**
   - **Direct UI Photo Viewer & Lightbox Modal** (✅ *Terimplementasi v3.5.0*): Pratinjau foto bukti insiden HD langsung di antarmuka web tanpa keluar aplikasi ke Google Drive.
   - **Sistem Tindakan Korektif CAPA (Corrective & Preventive Action)**: Form input tindakan pencegahan, penetapan PIC penanggung jawab, dan tanggal batas penyelesaian (*Due Date*).
   - **Incident Lifecycle Timeline**: Log riwayat pergerakan status insiden (*Open* → *Investigating* → *Resolved* → *Closed*) lengkap dengan timestamp dan nama Supervisor yang memproses.
   - **Multi-Filter & Multi-Column Sorting Panel**: Filter cepat insiden berdasarkan tingkat keparahan (*Critical, High, Medium, Low*), status, lokasi, dan tanggal kejadian.
   - **Ekspor Berita Acara Insiden K3 Resmi (PDF Exporter)**: Cetak otomatis PDF resmi berita acara kecelakaan kerja terlampir foto bukti dan tanda tangan elektronik.
5. **Fitur E: Engine Kalkulasi Otomatis Konversi Insentif Poin ke Bonus Bulanan**
   - Rule engine otomatis yang mengonversi perolehan Poin Reward & Safety Streak pekerja menjadi rekomendasi bonus insentif bulanan yang terintegrasi dengan laporan penggajian (*payroll*).

---

### 11.4 Automatic Database Trigger & Idempotent Schema Migration (v3.5.1)
- **PostgreSQL Automatic Trigger Engine (`trg_fn_award_incident_points`)**:
  - Penambahan **+50 PTS** pada saat validasi insiden K3 dialihkan 100% ke level **Server Database PostgreSQL** melalui Stored Trigger Procedure.
  - Setiap perubahan status laporan dari `open` menjadi `investigating`, `resolved`, atau `closed`, trigger database secara otomatis menambahkan +50 PTS ke tabel `workers` berbasis `id` maupun NIP (`employee_id`) secara **100% Atomic & Self-Healing (ACID)**.
- **Idempotent SQL Policies & Schema Setup**:
  - Pustaka skrip `supabase_setup.sql` dilengkapi sintaks `DROP POLICY IF EXISTS` pada seluruh tabel (termasuk `system_settings`), menggaransi file setup dapat dieksekusi berulang kali (*100% Re-runnable*) tanpa risiko `ERROR: 42710`.

---

## 12. Pustaka SOP Micro-Deck & K3 Interactive Academy (v3.6.0)

Modul pembelajaran interaktif multi-format (*Gamified Micro-Learning*) untuk mempercepat pemahaman prosedur operasional pergudangan dan kaidah K3.

### 12.1 Format Pembelajaran Interaktif (5 Presentation Formats)
1. **`micro_deck`**: Ringkasan visual ringkas (Langkah Kerja 1-2-3, Matriks DOs & DON'Ts, Golden Rules K3, dan Kuis Evaluasi Berhadiah Poin).
2. **`interactive_simulator`**: Simulasi klik aplikasi WMS / Handheld Scanner langkah-demi-langkah dengan deteksi target hitbox persentase (`X%`, `Y%`, `Width%`, `Height%`), efek getar saat salah klik, dan animasi selebrasi saat tepat.
3. **`spot_the_mistake` (Hazard Hunt)**: Tantangan interaktif menemukan pelanggaran K3 atau anomali susunan barang pada foto gudang dengan timer hitung mundur dan deteksi radius klik (`toleranceRadiusPercent`).
4. **`visual_hotspot`**: Infografis teknis mesin/alat berat dengan pin interaktif yang memunculkan kartu detail saat diklik.
5. **`document_reader`**: Mode baca dokumen PDF/kebijakan resmi dengan pembacaan teks otomatis (*Text-to-Speech / TTS*).

### 12.2 Dynamic Multi-Slide Deck Builder & Timeline Storyboard
- **Supervisor Studio (`SopManagementPanel.tsx`)**:
  - **Filmstrip Timeline Bar**: Deretan kartu thumbnail slide interaktif di bagian atas editor yang memungkinkan navigasi cepat antar slide.
  - **Unlimited Slide Sequence**: Supervisor bebas menambah format slide berbeda dalam satu modul (misal: Slide 1 Simulator $\to$ Slide 2 Simulator Step 2 $\to$ Slide 3 Hazard Hunt $\to$ Slide 4 Kuis).
  - **Manajemen Slide Cepat**: Tombol *Duplikasi Slide*, *Naikkan/Turunkan Urutan*, dan *Hapus Slide*.
  - **Visual Hitbox & Anomaly Coordinate Picker**: Tool visual real-time untuk menentukan kotak sasaran klik simulator dan pusat bahaya K3 langsung pada preview gambar.

---

## 13. 5-Point Enterprise System Optimization Roadmap (v3.6.0)

Paket optimasi menyeluruh untuk menjamin kecepatan, ketahanan di area blind spot gudang, dan efisiensi operasional harian.

### 13.1 Granular Lazy-Loading Sub-Panels (Performa Konsol)
- Seluruh sub-panel berat pada `AdminConsole.tsx` dan `SupervisorConsole.tsx` di-lazy load per tab menggunakan `React.lazy()` dan `Suspense`.
- Ukuran awal bundle `AdminConsole.js` berkurang **>50%** (dari 202 kB menjadi **102 kB**), dengan waktu perpindahan tab < 100ms.

### 13.2 Offline-First SOP Caching & Background Sync (`OfflineSopService`)
- Modul SOP dan data slide tersimpan otomatis di cache lokal (`IndexedDB` / Storage).
- Pekerja di area tanpa sinyal (*cold storage*, basemen) tetap dapat memutar simulator WMS dan menjawab kuis evaluasi 100% offline.
- Hasil evaluasi disimpan di antrean `bib_offline_sop_sync_queue` dan otomatis dikirimkan ke database saat perangkat kembali online (*Event Listener `online`*).

### 13.3 Generator Export SOP One-Pager / Poster A4 PDF (`SopPdfExporter`)
- Tombol **"A4 PDF"** di setiap kartu modul SOP menghasilkan poster resmi siap cetak (Kop Dokumen PT. DAYA ANUGRAH MULYA, Ringkasan Langkah Kerja, Matriks DOs & DON'Ts, serta Golden Rules K3).

### 13.4 Quick QR Badge Scanner untuk SIO MHE & Inspeksi Lapangan (`QrBadgeScannerModal`)
- Modal pemindai kamera QR code ID Card pekerja (dengan fallback pencarian cepat NIP).
- Supervisor dapat memverifikasi status legalitas lisensi SIO Forklift/Reach Truck, kepatuhan inspeksi pre-shift hari ini, dan skor BIB dalam waktu < 2 detik.

### 13.5 Idempotency Protection & Anti-Duplicate Point Claiming
- Penerapan token idempotensi `workerId_sopId_dateKey` dan kunci optimistik untuk menjamin saldo poin tidak terduplikasi saat terjadi gangguan jaringan.
