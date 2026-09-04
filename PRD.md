# Product Requirement Document (PRD)
## Employee Logistics Assessment System (BIB Mechanism & Dynamic Competency Matrix)

---

| Metadata | Detail |
| :--- | :--- |
| **Document Version** | 4.5.0 (Full Enterprise Logistics & HSE Suite — 38 Implementation Phases) |
| **Status** | Production Ready / Active Enterprise Specification |
| **Author** | Antigravity AI & Engineering Team |
| **Target User** | Staff Logistik (Operator Forklift, Reach Truck, Checker, PIC Area, Driver, Supervisor/Pengawas, Ops Manager, HSE Officer, System Administrator) |
| **Company** | PT. DAYA ANUGRAH MULYA |
| **Primary Goal** | Platform holistik penilaian kinerja berimbang (BIB & 54-Item Competency Matrix), **Pustaka SOP Micro-Deck & K3 Interactive Academy (Step Builder, DOs/DON'Ts, Safety Alert, TTS Voiceover Engine, WMS Simulator, Hazard Hunt)**, **Pelacak SIO & Lisensi Alat Berat MHE dengan Supabase Realtime & Fast Gemini Vision AI**, **Inventaris & Distribusi APD**, **Generator Laporan Audit Eksekutif & Formulir BAP Insiden K3 Resmi**, **Papan Kanban Serah Terima Shift & Kaizen Inovasi**, **Safety Patrol Gemba Walk**, **Google Drive Gateway User-Bound**, **Sistem Poin Dinamis & Dynamic Tier Engine**, **Offline Queue Drawer**, **Dialog Konfirmasi OOP SwalService**, dan **High-Performance Database Indexing**. |

---

## 1. Architecture Strategy: OOP, DDD & Security-First

Aplikasi dibangun menggunakan **Object-Oriented Programming (OOP)** dan **Domain-Driven Design (DDD)** dengan prinsip **Security-First** di seluruh lapisan.

```
[ Domain Entities & State Machines (OOP / DDD) ]
  ├── WorkerEntity             ── Tier progression, BIB score, streak calculation, dynamic tier thresholds
  ├── DivisionEntity           ── Dynamic divisions (WFG, WRM, Timbangan, GA, Expedisi, WSP, dll)
  ├── RoleEntity               ── Dynamic roles + resolveSystemRole() RBAC enforcement (Worker vs Supervisor vs Admin)
  ├── RewardEntity             ── OOP validation, stock mutation, dynamic tier eligibility, FCFS claim lock
  ├── CompetencyMatrixEngine   ── 54 items, max score bounds, grade calculation, dynamic AI matrix extraction
  ├── IncidentManager / Entity ── Incident lifecycle state machine (Open -> Investigating -> Resolved -> Closed), CAPA validation, reporter reward
  ├── MheLicenseEntity         ── SIO legal eligibility, H-30 expiration alert engine, days remaining calculation
  ├── ShiftHandoverManager     ── Shift handover state machine (Tertunda <-> Proses <-> Selesai), auto-archive 24h, mandatory acknowledgement
  ├── DisciplinaryMatrixEngine ── Progressive safety sanctions (Lisan -> SP1 -> SP2 -> SP3 -> Skorsing), 6-month recurrence tracking
  ├── Audit5sEngine            ── 5S pillar scoring (Ringkas, Rapi, Resik, Rawat, Rajin), Gold/Silver/Bronze predicate engine
  ├── TrainingAssignmentService── Automated re-training assignment triggered by competency gap >= 25%
  ├── RoleMutationManager      ── Clean Slate mutation protocol with archived audit snapshots
  ├── SystemConfigService      ── Centralized dynamic points, rewards, penalties, and custom tier definitions
  ├── SafetyPatrolService      ── 5-minute Gemba walk patrol logging, unsafe act/condition tagging, auto-assigned PIC
  ├── OfflineQueueManager      ── Multi-module transaction queue for offline blind spots with background re-sync
  ├── SwalService              ── Centralized SweetAlert2 dark-mode OOP confirmation and alert modal wrapper
  └── SioAiService             ── Ultra-fast Gemini Multimodal Vision SIO OCR with client-side HD compression and model caching

[ Cloud & Storage Layer ]
  ├── Supabase Database & Realtime ── PostgreSQL RLS, stored procedures (RPC), atomic locks, realtime table channels
  ├── GoogleDriveGatewayService    ── User-bound directory folder provisioning (/[ID] Nama/[Modul]/) via Apps Script webhook
  └── ImageCompressorEngine        ── Web Worker HD compression (browser-image-compression, max 1400-1600px, 95% bandwidth savings)

[ Data & Interface Layer ]
  ├── CustomDataTable          ── Reusable data table engine (real-time search, multi-column sorting, custom pagination, CSV export)
  ├── ExecutivePDFReportGen    ── Official corporate PDF report exporter with signature verification block & summary metrics
  ├── SopSlideshowModal        ── Interactive multi-format reader with Web Speech TTS, safety alerts, and checkpoint quiz
  └── OfflineQueueDrawer       ── Slide-over drawer visualizer for pending/syncing/failed offline transactions

[ Security & Service Layer ]
  ├── signUpWorker()           ── Strict unique NIK+Email check (NO overwrite) & Supervisor approval status gate
  ├── signInWithNikOrEmail()   ── Status gate + Supabase Auth + DB fallback
  ├── sendPasswordResetEmail() ── OTP via signInWithOtp (tidak trigger signup email)
  ├── verifyOtpAndResetPassword() ── OTP verification + DB password update
  ├── updateWorkerStatus()     ── Admin-only Approve/Reject supervisor
  ├── fetchAllRedemptionHistory() ── Audit log riwayat penukaran staf untuk Admin
  └── generateDailyQuiz()      ── 100% Pure Dynamic AI & Supabase Quiz Engine (Zero Hardcoding)
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
- **Hub 8 Tombol Aksi Lapangan Simetris (Zinc Enterprise UI)**:
  1. *🎯 Kuis K3 Harian*: Kuis keselamatan kerja harian berbasis AI dengan timer 15 detik & anti-cheat.
  2. *🛡️ Pre-Shift Checklist*: Inspeksi keselamatan kerja pra-shift 8-item spesifik role & divisi.
  3. *📖 SOP Micro-Deck*: Pembaca modul SOP interaktif, simulator WMS, deteksi bahaya, dan audio narasi TTS.
  4. *🚨 Lapor Insiden K3*: Pelaporan insiden kecelakaan / Near-Miss dengan bukti foto HD & auto GDrive gateway.
  5. *🤝 Kirim Kudo*: Apresiasi rekan kerja antar pekerja operasional (+10 PTS ke penerima).
  6. *🔄 Serah Terima Shift*: Pencatatan log serah terima dan pemantauan papan Kanban status pergantian shift.
  7. *💡 Kaizen Inovasi*: Pengajuan ide perbaikan alur kerja dengan reward poin (+50 hingga +500 PTS).
  8. *📋 Riwayat & Arsip*: Pusat arsip komprehensif riwayat kuis, checklist, insiden, kudo, kaizen, dan sanksi K3.
- **Kartu Tanda Pengenal & Lisensi SIO Digital (`WorkerDigitalIdModal`)**:
  - Kartu ID digital ber-QR Code SVG deterministik berbasis Employee ID.
  - Verifikasi langsung status kepatuhan pre-shift hari ini, skor BIB, poin reward, dan legalitas SIO MHE terdaftar.
  - Fitur cetak kartu tanda pengenal fisik (`window.print()`).
- **Dynamic Competency Radar Chart**: Radar chart menampilkan sumbu kompetensi aktif sesuai role pekerja (sumbu N/A otomatis dieliminasi).
- **Gappy AI Daily Safety Quest (100% Dynamic & Zero Hardcode)**: Kuis K3 di-generate oleh Gemini API dengan modul acuan Matriks Kompetensi Resmi (`matrixData.json`). Supabase-first caching (0 token AI jika soal tersedia).
- **Papan Kanban Serah Terima Shift & Tembok Apresiasi Kudo**: Feed publik apresiasi antar-pekerja dan papan Kanban responsif 3-kolom status pekerjaan lapangan.
- **Drawer Status Antrean Offline (`OfflineQueueDrawer`)**: Indikator status jaringan (Online / Offline) di Navbar yang dapat diklik untuk membuka drawer antrean sinkronisasi transaksi lokal.

### 3.2. Supervisor Console (Pengawas Lapangan & Reporting Suite)
- **Safety Patrol / Gemba Walk Suite (`SafetyPatrolModal` & `SafetyPatrolKanban`)**:
  - Pencatatan inspeksi keliling cepat lapangan 5-menit (Unsafe Act, Unsafe Condition, Good Practice).
  - Papan Kanban 3-kolom temuan patroli dengan filter tingkat keparahan (Critical, High, Medium, Low) dan auto-assignment PIC.
- **Verifikasi Laporan Insiden K3 & Generator Formulir BAP Resmi**:
  - Investigasi kronologi insiden, evaluasi akar masalah 5-Why, validasi matriks CAPA.
  - Ekspor Formulir Berita Acara Pemeriksaan (BAP) Kecelakaan Kerja resmi standar PT. DAYA ANUGRAH MULYA lengkap dengan lembar tanda tangan 3-pihak (Pelapor, Saksi, Supervisor).
- **Visual Radar Kompetensi Matrix & Audit 54-Item**:
  - Grafik jaring radar ketercapaian per kategori aktif.
  - Form audit matriks kompetensi 54-item dengan batasan ketat MaxScore.
  - Penugasan otomatis modul re-training K3 (`TrainingAssignmentService`) jika ditemukan competency gap $\ge 25\%$.
- **Quick QR Scanner Handoff (`QrBadgeScannerModal`)**:
  - Pemindai kamera QR ID pekerja langsung meluncurkan audit matriks atau memilih profil staf tanpa pencarian manual.
- **Meja Kontrol Sanksi & Pembinaan K3 (`DisciplinaryPanel`)**:
  - Penerbitan Surat Peringatan (SP 1, SP 2, SP 3, Skorsing, Remedial) dengan penomoran SK resmi dan verifikasi ujian retraining SOP.

### 3.3. Administrator Console (Domain-Driven Modular Sub-Panels)
- **Arsitektur Modular Sub-Panel (Code-Splitting via React.lazy)**:
  1. *👥 SDM & AKSES*: `AdminStaffPanel` (CRUD Staf, Protokol Mutasi Bersih Clean Slate, Import TSV), `AdminSupervisorApprovalPanel`, `ActivityLogPanel`.
  2. *🎁 REWARD & ANALITIK*: `AdminRewardCatalogPanel` (CRUD Stok, FCFS Claim Lock, Riwayat Penukaran), `AdminAnalytics`.
  3. *⚙️ MASTER SETUP*: `AdminMasterDataPanel` (Divisi & Role), `AdminCompetencyMatrixPanel` (54 Modul & MaxScore).
  4. *⚡ AI & KOMUNIKASI*: `AdminAiQuizPanel` (Monitoring Cache Soal, Reset Bank Soal), `AdminAnnouncementPanel` (Siaran Live, Schedule Window, Live Preview).
  5. *🛡️ OPERASIONAL & HSE*: `SopManagementPanel` (SOP Studio Multi-Slide Builder & TTS Generator), `MheLicensePanel` (Pelacak SIO MHE, Fast Gemini Vision OCR, Realtime Sync Supabase), `PpeManagementPanel` (Katalog & Distribusi APD, Meja Tiket Kerusakan), `Audit5sPanel` (Audit Standar 5R/5S Zona Gudang), `DisciplinaryPanel` (Matriks Sanksi K3), `SystemConfigPanel` (Aturan Poin Dinamis & Editor Tier).
- **CustomDataTable Component**: Mesin tabel data reusable dengan pencarian real-time, sorting multi-kolom, custom pagination (10/25/50/100), dan ekspor CSV.
- **SweetAlert2 Dark Mode OOP System (`SwalService`)**: Seluruh dialog konfirmasi dan notifikasi menggunakan dialog OOP terstandarisasi dengan proteksi backdrop persisten (anti-outside click closure).

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

---

## 12. Pustaka SOP Micro-Deck & K3 Interactive Academy (v4.0)

Modul pembelajaran interaktif multi-format (*Gamified Micro-Learning*) untuk mempercepat pemahaman prosedur operasional pergudangan dan kaidah K3.

### 12.1 Format Pembelajaran Interaktif (5 Presentation Formats)
1. **`micro_deck`**: Ringkasan visual ringkas (Langkah Kerja 1-2-3, Matriks DOs & DON'Ts, Golden Rules K3, dan Kuis Evaluasi Berhadiah Poin).
2. **`interactive_simulator`**: Simulasi klik aplikasi WMS / Handheld Scanner langkah-demi-langkah dengan deteksi target hitbox persentase (`X%`, `Y%`, `Width%`, `Height%`), efek getar saat salah klik, dan animasi selebrasi saat tepat.
3. **`spot_the_mistake` (Hazard Hunt)**: Tantangan interaktif menemukan pelanggaran K3 atau anomali susunan barang pada foto gudang dengan timer hitung mundur dan deteksi radius klik (`toleranceRadiusPercent`).
4. **`visual_hotspot`**: Infografis teknis mesin/alat berat dengan pin interaktif yang memunculkan kartu detail saat diklik.
5. **`document_reader`**: Mode baca dokumen PDF/kebijakan resmi dengan pembacaan teks otomatis (*Text-to-Speech / TTS*).

### 12.2 Dynamic Multi-Slide Deck Builder & Timeline Storyboard (`SopManagementPanel.tsx`)
- **Filmstrip Timeline Bar**: Deretan kartu thumbnail slide interaktif di bagian atas editor yang memungkinkan navigasi cepat antar slide.
- **Form Builder Lengkap Per Format Slide**:
  - *Step Instruction Builder*: Penambahan langkah kerja dinamis tanpa batas (Judul, Deskripsi, Tips K3), hapus langkah, dan reorder urutan naik/turun.
  - *DOs & DON'Ts Builder*: Komparasi aturan benar vs larangan keras dengan tips visual.
  - *Safety Alert Builder*: Peringatan bahaya K3 dengan selector keparahan (`critical`, `warning`, `info`).
  - *Quiz Checkpoint Builder*: Kuis pemahaman slide dengan opsi jawaban ganda dan penjelasan.
- **Mode Edit Modul Existing**: Dukungan penuh untuk memperbarui modul SOP yang telah terdaftar di database Supabase.
- **Generator & Uji Narasi Suara (TTS)**: Tombol *Generate dari Materi* untuk menyusun naskah suara otomatis dan tombol *Uji Suara* langsung di editor.

### 12.3 Audio Narasi Voiceover (TTS) Stabilization Engine (`SopSlideshowModal.tsx`)
- **Chromium Web Speech API Heartbeat**: Interval 10 detik untuk mencegah freeze synthesizer Chrome pada narasi panjang (>15 detik).
- **Deteksi Voice Pack Bahasa Indonesia (`id-ID`)**: Prioritisasi otomatis paket suara lokal berkualitas tinggi.
- **Persistent Auto-Narration Mode**: Narasi berlanjut secara otomatis saat berganti slide tanpa klik manual berulang.

---

## 13. Peer-to-Peer Recognition & Kudo Wall (Sistem Apresiasi Rekan Kerja)

- **Data Model & Schema**: Tabel `worker_kudos` (id, sender_id, receiver_id, category, message, points_awarded, created_at).
- **Kategori Apresiasi**: *Kerja Keras*, *Inisiatif*, *Teamwork*, *Safety First*.
- **Atomic Reward Engine (`rpc_send_kudo`)**:
  - Pengirim memberikan apresiasi ke rekan kerja; penerima secara otomatis memperoleh **+10 PTS** (dinamis via `SystemConfigService`).
  - Pencatatan transaksi real-time ke tabel `activity_log`.
- **Tembok Apresiasi Publik (`KudoWall.tsx`)**: Feed real-time di beranda pekerja yang merayakan kontribusi tim secara positif.

---

## 14. Shift Handover System & Mobile Kanban Board (Log Serah Terima Shift)

- **Model & Siklus Hidup**: `ShiftHandoverEntity` dengan state machine (*Tertunda* $\leftrightarrow$ *Proses* $\leftrightarrow$ *Selesai*).
- **Kategori Handover**: *MHE*, *Operasional*, *5R*, *Dokumen*, *Infrastruktur*, *K3*, *Lainnya*.
- **Papan Kanban Responsif (`HandoverKanbanBoard.tsx`)**:
  - Desktop: Drag & Drop visual 3 kolom.
  - Mobile: Tab switcher 3-kolom simetris (`grid-cols-3`) anti-overflow dengan tombol aksi cepat sentuh.
  - Auto-Archive 24 Jam untuk menjaga papan tetap bersih dan fokus pada shift aktif.
- **Notifikasi Wajib Konfirmasi (`AcknowledgeHandoverModal.tsx`)**:
  - Modal interaktif saat login mewajibkan supervisor/staf penerima membaca dan mengonfirmasi serah terima yang dialamatkan padanya.

---

## 15. Kaizen Innovation Suggestion Box (Kotak Saran Inovasi Pekerja)

- **Model & Skema**: Tabel `kaizen_suggestions` dengan status machine: *Submitted* $\to$ *Under Review* $\to$ *Approved* $\to$ *Implemented* / *Rejected*.
- **Kategori Inovasi**: *Safety / K3*, *Efisiensi*, *5R*, *Biaya*, *Layanan*, *Lainnya*.
- **Formulir Pengajuan Terstruktur (`KaizenSubmissionModal.tsx`)**:
  - Dokumentasi kondisi Sebelum (Problem) vs Usulan Solusi (Improvement) + estimasi dampak perbaikan.
- **Meja Review & Reward Atomik (`KaizenKanbanBoard.tsx` & `rpc_approve_kaizen`)**:
  - Supervisor/Admin meninjau ide inovasi dan dapat memberikan insentif poin dinamis: +50, +100, +250, atau +500 PTS langsung ke saldo pekerja.
  - Modal riwayat pengajuan pekerja (`WorkerKaizenHistoryModal.tsx`) untuk memantau status persetujuan.

---

## 16. Pelacak SIO & Lisensi Alat Berat (MHE License Tracker & Fast AI Vision)

- **Model & Domain**: `MheLicenseEntity` mengelola jenis lisensi: *SIO Forklift (Kelas II)*, *SIO Reach Truck (Kelas I)*, *SIM B2 Umum*, *Ahli K3 Kemenaker*, *First Aid*.
- **Deteksi Kedaluwarsa Dini (H-30 Alert)**: Indikator kedaluwarsa otomatis menghitung sisa hari aktif dan memicu notifikasi peringatan operasional.
- **Supabase Cloud Database & Realtime Sync (`LicenseService.ts` & `MheLicensePanel.tsx`)**:
  - Arsitektur Hybrid Stale-While-Revalidate: bacaan instan 0ms dari local cache + pembaruan cloud tabel `mhe_licenses`.
  - Langganan Supabase Realtime channel `realtime_mhe_licenses_tracker` untuk sinkronisasi multi-device otomatis.
  - Tombol manual *Sinkron Cloud* pada header panel.
- **Ultra-Fast AI Vision SIO OCR (`SioAiService.ts`)**:
  - Kompresi gambar client-side otomatis via `browser-image-compression` ke maks 1400px (~350 KB, hemat bandwidth 95%).
  - Dukungan dokumen **Multi-format Gambar (JPEG/PNG/WebP) & Dokumen PDF Resmi Kemnaker RI**.
  - Parser normalisasi tanggal ISO multiformat (`normalizeToIsoDate`) menangani variasi teks tanggal Indonesia menjadi ISO `YYYY-MM-DD`.
  - Mode output JSON terstruktur bawaan model (`responseMimeType: 'application/json'`).
  - Waktu ekstraksi terpangkas drastis dari **15–25 detik menjadi ~1.5–3 detik**.
- **Peningkatan Kepatuhan & Audit Fisik (`MheLicensePanel.tsx`)**:
  - Validasi kronologi tanggal terbit vs kedaluwarsa untuk integritas data sertifikasi.
  - Akses langsung berkas bukti dokumen SIO via tombol `ExternalLink` di tabel lisensi.
  - Safeguard anti-NaN pada kalkulasi sisa hari dan status kedaluwarsa.
  - Banner panduan pencocokan akun pekerja manual saat nama di SIO tidak cocok 100% otomatis dengan database.

---

## 17. Inventaris & Distribusi APD (PPE Lifecycle Management)

- **Model & Skema**: Tabel `ppe_items`, `ppe_distributions`, `ppe_damage_reports`.
- **Kategori APD**: *Safety Shoes*, *Helm K3*, *Rompi Reflektif*, *Sarung Tangan*, *Masker/Respirator*, *Body Harness*.
- **Interval Penggantian Berkala**: Peringatan otomatis H-14 hari sebelum batas usia pakai APD berakhir.
- **Meja Tiket Kerusakan & Penggantian APD (`PpeManagementPanel.tsx`)**:
  - Alur pelaporan APD rusak/hilang oleh pekerja, inspeksi supervisor, dan persetujuan penerbitan pengganti APD baru.

---

## 18. Generator Laporan Audit Eksekutif & BAP Kecelakaan Kerja Resmi

- **Executive PDF Report Generator (`pdfReportService.ts`)**:
  - Dokumen resmi standar PT. DAYA ANUGRAH MULYA dengan kop HSE resmi, penomoran unik, watermark, dan lembar tanda tangan berjenjang.
  - Jenis Laporan: Matriks Kompetensi BIB, Status Zero Incident K3, Legalitas SIO MHE, Inventaris APD, dan Anggaran Reward.
- **Formulir Berita Acara Pemeriksaan (BAP) Kecelakaan Kerja**:
  - Format standar investigasi insiden: Identitas Pelapor, Kronologi & Analisis 5-Why, Matriks Tindakan Korektif CAPA, dan Lembar Tanda Tangan 3 Pihak (Pelapor, Saksi, Supervisor).
  - Ekspor langsung via tombol di `SupervisorIncidentValidationModal.tsx`.

---

## 19. Konseling & Sanksi K3 (Safety Coaching & Disciplinary Matrix)

- **Domain Engine (`DisciplinaryMatrixEngine.ts`)**:
  - Matriks eskalasi progresif pelanggaran K3: *Pembinaan Lisan* $\to$ *SP 1* $\to$ *SP 2* $\to$ *SP 3* $\to$ *Skorsing* berbasis riwayat aktif 6 bulan.
  - Penalti pengurangan poin reward dinamis dan penugasan mandatory retraining SOP.
- **Penerbitan Surat Keputusan Resmi (`DisciplinaryPanel.tsx`)**:
  - Generator SK resmi otomatis, cetak PDF Surat Peringatan, dan verifikasi kelulusan ujian remedial retraining SOP.

---

## 20. Audit Standar 5R / 5S Wilayah Gudang (5S Warehouse Zone Audit)

- **Scoring Engine 5 Pilar (`Audit5sEngine.ts`)**:
  - Penilaian pilar *Ringkas*, *Rapi*, *Resik*, *Rawat*, dan *Rajin* (0–100%).
  - Predikat mutu otomatis: *Gold (≥90%)*, *Silver (80–89%)*, *Bronze (70–79%)*, *Perlu Perbaikan (<70%)*.
- **Reward Poin Insentif PIC Zona**: Alokasi poin insentif otomatis ke PIC zona gudang yang meraih predikat Gold/Silver/Bronze.
- **Cetak Berita Acara Audit 5S (PDF)**: Dokumen evaluasi kebersihan dan ketertiban area gudang lengkap dengan grafik radar pilar.

---

## 21. Dynamic System Points Management & Configurable Tier Engine

- **Pusat Konfigurasi Poin Dinamis (`SystemConfigService.ts`)**:
  - Eliminasi seluruh hardcode nilai poin. Nilai reward kuis harian, pre-shift checklist, insiden, near-miss, kudo, kaizen, 5S, dan SIO dapat dikonfigurasi langsung oleh Admin di tab *Aturan & Config System*.
- **Dynamic Tier Engine (`TierConfig`)**:
  - Struktur tier konfigurabel (`id`, `name`, `minPoints`, `level`, `badgeColor`, `badgeBg`, `icon`).
  - Admin bebas mengubah nama tingkatan tier, ambang batas minimum poin, warna badge, serta menambah tier kustom.
  - Perhitungan tier di `WorkerEntity.calculateTier` dan kelayakan reward di `RewardEntity.isTierEligible` berjalan secara dinamis mengikuti konfigurasi aktif.

---

## 22. Protokol Mutasi Staf Clean Slate & Otomatisasi Training Gap Analysis

- **Protokol Mutasi Clean Slate (`RoleMutationManager.ts`)**:
  - Snapshot otomatis seluruh nilai audit kompetensi aktif pekerja ke kolom `archived_competency_scores JSONB` pada tabel `worker_role_mutations`.
  - Reset bersih (*Clean Slate*) skor aktif di tabel `worker_competency_scores` agar MaxScore role terdahulu tidak mencemari role baru.
- **Otomatisasi Penugasan Re-Training (`TrainingAssignmentService.ts`)**:
  - Deteksi kesenjangan kompetensi $\ge 25\%$ pada Gap Analysis memicu tombol aksi penugasan training dengan deadline 7 hari.

---

## 23. Offline Queue Manager & Realtime Sync Drawer (`OfflineQueueDrawer.tsx`)

- **Multi-Module Offline Queue**:
  - Pengelolaan antrean transaksi offline saat berada di area blind spot gudang (*cold storage*, basemen) untuk modul SOP, kuis, checklist, insiden, dan kudo.
  - Slide-over drawer interaktif dengan status per item, detail payload, tombol *Force Sync*, dan pembersihan item kedaluwarsa.
- **Indikator Navbar Reaktif (`NetworkStatusBadge.tsx`)**:
  - Menampilkan status jaringan live (`🟢 Online` / `🟠 Offline Cache` + jumlah antrean tertahan).

---

## 24. Supervisor Gemba Walk & Quick Safety Patrol Suite (`SafetyPatrolService.ts`)

- **Pencatatan Cepat 5-Menit**:
  - Inspeksi keliling lapangan oleh supervisor untuk mencatat *Unsafe Act*, *Unsafe Condition*, dan *Good Practice*.
  - Pemilihan zona gudang, jepret foto bukti HD, dan penugasan PIC tindak lanjut.
- **Papan Kanban & Rekap Temuan**:
  - Papan visual 3 kolom (Open, Tindak Lanjut, Selesai) dengan peringatan temuan kritis (<24 jam).

---

## 25. Arsitektur Cloud Storage Google Drive Gateway Terstruktur

- **User-Bound Directory Provisioning**:
  - Pengunggahan berkas terprogram ke Google Drive menggunakan Google Apps Script Webhook.
  - Penataan otomatis folder berbasis identitas pekerja dan kategori modul:
    - `/[ID] Nama/Laporan_Insiden/`
    - `/[ID] Nama/Safety_Patrol/`
    - `/[ID] Nama/Foto_Profil/`
    - `/[ID] Nama/SIO_MHE/`
    - `/[ID] Nama/Kaizen_Inovasi/`
    - `/[ID] Nama/Dokumen_SOP/`

---

## 26. Papan Pengumuman Tim Realtime & Schedule Window

- **Resilient Announcement Engine (`AnnouncementBanner.tsx`)**:
  - Penjadwalan tayang fleksibel: Waktu Mulai (*startsAt*) dan Batas Berakhir (*expiresAt*).
  - Sinkronisasi realtime lintas tab dan jendela via event `gappy_announcement_updated` dan Supabase Realtime.
  - Live preview di Admin Console sebelum siaran diterbitkan.

---

## 27. Arsitektur Dialog Konfirmasi OOP (`SwalService`) & Modal Backdrop Persisten

- **Centralized Dark-Mode SweetAlert2 Wrapper**:
  - Standarisasi seluruh dialog browser native (`confirm` & `alert`) menjadi dialog OOP bertema dark zinc dengan button semantic.
- **Proteksi Backdrop Statis**:
  - Seluruh modal dialog operasional dilindungi dari penutupan tidak sengaja akibat klik di area backdrop luar (`allowOutsideClick: false` / penghapusan trigger onClick pada backdrop).

---

## 28. Arsitektur Database Indexing Skala Enterprise (`supabase_setup.sql`)

- **20+ Indeks Komposit & B-Tree**:
  - Indeks login instan O(1): `idx_workers_login_lookup` `(employee_id, email)`.
  - Indeks Leaderboard bebas memory sort: `idx_workers_global_leaderboard` `(total_points DESC, bib_total_score DESC) WHERE status = 'active'`.
  - Indeks auto-reset harian: `idx_workers_daily_activity`.
  - Indeks pencarian soal kuis, katalog reward, SIO, APD, handover, kaizen, insiden, dan audit 5S.

---

## 29. Dynamic Gemini Candidate Models Multi-Selection & Live API Loader

- **Eliminasi Model Hardcoding Menyeluruh**:
  - Menghapus ketergantungan hardcoded model array pada seluruh layanan yang berinteraksi dengan Google Generative AI (`geminiService.ts` dan `sioAiService.ts`).
  - Mencegah error runtime (seperti HTTP 404 Model Not Found) saat Google menghentikan atau memperbarui versi model.
- **Live Google Generative Language API Loader (`fetchAvailableGeminiModels`)**:
  - Terintegrasi langsung dengan endpoint `ModelService.ListModels` (`v1beta/models?key=${apiKey}`) untuk memuat katalog model resmi yang aktif dan mendukung metode `generateContent`.
- **Manajemen Multi-Selection & Urutan Prioritas Fallback (`AdminAiQuizPanel.tsx`)**:
  - Antarmuka visual Administrator Console untuk memilih model via multi-selection card.
  - Pengaturan urutan prioritas eksekusi fallback `#1 Utama`, `#2 Fallback 1`, `#3 Fallback 2`, dst. menggunakan kontrol *Up / Down / Remove*.
  - Tombol *Reset Rekomendasi* untuk mengembalikan konfigurasi ke daftar model stabil teruji.
- **Penyimpanan Terpusat & Caching Cepat**:
  - Disimpan ke database Supabase tabel `system_settings` (`key: 'gemini_candidate_models'`).
  - Dilengkapi cache lokal berkecepatan 0ms (`localStorage: 'komar_gemini_candidate_models'`) dengan sinkronisasi event real-time `gappy_gemini_models_updated`.

---

## 30. Self-Service MHE SIO License Upload & Realtime Digital ID Compliance

- **Eliminasi Kesalahan Label Validitas SIO**:
  - Memperbaiki bug logika pada `WorkerDigitalIdModal.tsx` yang sebelumnya memberi label `VALID` secara palsu kepada setiap pekerja yang belum memiliki data SIO terdaftar.
  - Operator alat berat (Forklift, Reach Truck, MHE) yang belum memiliki lisensi kini secara akurat berstatus `TIDAK VALID` / `Belum Memiliki SIO Terdaftar`.
- **Portal Unggah SIO Mandiri Pekerja (`WorkerSioUploadModal.tsx`)**:
  - Operator dapat mengunggah foto kartu SIO atau dokumen PDF mandiri langsung dari smartphone / browser mereka.
  - Ekstraksi otomatis instan (1.5–3 detik) menggunakan Gappy Vision AI dengan preview dokumen dan validasi formulir terstruktur.
  - Insentif reward instan: Pendaftaran SIO mandiri secara otomatis mencairkan reward +100 PTS ke akun pekerja via Supabase RPC `increment_worker_points`.
- **Integrasi Pintasan Aksi di Beranda & Kartu ID**:
  - Tombol aksi cepat `Unggah SIO Mandiri (AI Scan) +100 PTS` langsung tersedia di dalam Kartu ID Digital dan di samping NIP beranda pekerja.
  - Begitu SIO tersimpan, Kartu ID & SIO Digital otomatis ter-refresh menjadi `VALID` secara realtime tanpa reload halaman via event `gappy_licenses_updated`.

---

## 31. Role-Based Notification Routing Policy & Personal Targeting Isolation

- **Isolasi Privasi & Eliminasi Kebocoran Notifikasi Pribadi**:
  - Memperbaiki logika perutean penerima pada `NotificationEngine.ts`: Notifikasi personal (seperti pendaftaran lisensi SIO, pencairan reward individual, tiket APD, dan pembinaan sanksi) kini **terisolasi 100% dan hanya tampil pada akun pekerja yang bersangkutan** (`recipientId === worker.id || recipientId === worker.employeeId`).
  - Menghapus kesalahan penafsiran tag `recipientRole: 'worker'` yang sebelumnya menganggap seluruh notifikasi ber-tag worker sebagai siaran massal ke seluruh operator di gudang.
- **Pusat Kontrol Visibilitas & Routing Notifikasi Administrator (`AdminNotificationPanel.tsx`)**:
  - Tab khusus di Administrator Console: **Pengaturan Visibilitas & Routing (Maintenance)**.
  - **Matriks Konfigurasi 6 Kategori Master**:
    1. *Lisensi SIO & MHE* (`license`): Pendaftaran mandiri, perpanjangan, dan kedaluwarsa lisensi K3.
    2. *Insiden K3 & Safety Alert* (`incident`): Laporan bahaya, investigasi kecelakaan, dan tanggap darurat.
    3. *Kuis K3 & Edukasi SOP* (`quiz`): Checkpoint kuis harian dan modul SOP.
    4. *Reward Poin & Kudo* (`reward`): Poin kepatuhan, klaim sembako/katalog, dan kiriman kudo.
    5. *Audit 5R/5S & Safety Patrol* (`audit`): Hasil audit zona 5S dan inspeksi Safety Patrol gemba walk.
    6. *Pengumuman Sistem & Siaran* (`system`): Siaran manajemen dan pengumuman operasional.
  - **Hak Akses Audiens Per Kategori**: Administrator dapat memilih secara granular peran mana yang berhak menerima notifikasi per kategori (`Operational Pekerja`, `Supervisor`, `Administrator`) atau menonaktifkannya secara sistem (Switch ON/OFF).
  - **Mode Pengawasan Administrator (Master Override)**: Toggle `adminMonitorAll` yang memungkinkan Administrator memantau seluruh log notifikasi operasional lintas peran untuk tujuan pemeliharaan dan audit kepatuhan K3.
  - **Fitur Reset & Simpan Aman**: Dilengkapi dialog konfirmasi OOP SweetAlert2 bertema gelap dan sinkronisasi real-time lintas tab via `BroadcastChannel` dan event `gappy_notification_updated`.
- **Penyempurnaan Lonceng Notifikasi Header (`NotificationBell.tsx`)**:
  - Menambahkan tab filter `Lisensi SIO` di popover lonceng notifikasi pekerja dan supervisor untuk pemisahan informasi legalitas yang cepat dan teratur.


