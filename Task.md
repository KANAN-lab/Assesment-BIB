# Task Tracker — BIB Logistics Assessment Platform

> Last updated: 2026-09-03
> Status legend: `[ ]` Todo · `[/]` In Progress · `[x]` Done · `[!]` Blocked

---

## Phase 1: Infrastructure & Database

- [x] Setup Supabase project (`sekmjwrbohjmlxpgydqx`)
- [x] Buat `.env.local` dengan VITE_SUPABASE_URL dan VITE_SUPABASE_ANON_KEY
- [x] Install `@supabase/supabase-js`
- [x] Buat `src/lib/supabaseClient.ts`
- [x] Buat `src/lib/supabaseService.ts` — semua DB operations
- [x] Buat `supabase_setup.sql` — schema, RPC functions, seed data, RLS policies
- [x] **[ACTION REQUIRED]** Jalankan `supabase_setup.sql` di Supabase SQL Editor
- [x] Verifikasi tabel `workers`, `reward_catalog`, `redemption_history`, `quiz_questions` muncul di Supabase
- [x] Verifikasi RPC functions terdaftar: `increment_worker_points`, `increment_worker_streak_and_points`, `deduct_worker_points`, `decrement_reward_stock`

---

## Phase 2: Core App Refactor (No More Dummy Data)

- [x] Hapus dependency pada `INITIAL_CURRENT_WORKER`, `INITIAL_LEADERBOARD` dari `mockData.ts`
- [x] Refactor `App.tsx` — load data dari Supabase on mount
- [x] Implementasi optimistic update + rollback di semua handlers
- [x] Loading state (spinner) saat initial load
- [x] Error state dengan tombol retry
- [x] Error toast untuk operasi yang gagal
- [x] Implementasi Supabase Auth & Session listener (`onAuthStateChange`, `getSession`)
- [x] Buat komponen `LoginModal.tsx` (Demo Quick Picker, Email/Password Login, Signup Baru)
- [x] Tambah tombol Logout & User session indicator di `Navbar.tsx`
- [x] Map profil worker secara dinamis sesuai user session terotentikasi
- [x] Test end-to-end: kuis → poin terupdate di DB
- [x] Test end-to-end: checklist → streak + poin terupdate di DB
- [x] Test end-to-end: redeem reward → stock berkurang + history tersimpan di DB
- [x] Test end-to-end: supervisor audit → skor terupdate di DB + leaderboard refresh

---

## Phase 3: Fitur Utama

- [x] **Daily Quiz Reset** — reset otomatis tanggal aktivitas harian
- [x] **Tier Calculation Otomatis** — `WorkerEntity.calculateTier` auto-update tier berdasarkan total poin
- [x] **Streak Multiplier** — bonus poin streak 7/14/30 hari di `WorkerEntity` & Supabase service
- [x] **Notifikasi real-time** — Supabase Realtime subscriptions aktif untuk synchronization antar tab/user
- [x] **PWA / Offline support** — `vite-plugin-pwa` terpasang dan dikonfigurasi di `vite.config.ts`
- [x] **Gappy AI Daily Safety Quest** — Kuis K3 dihasilkan Gappy AI (Gemini) per divisi/role
- [x] **Supabase Quiz Bank** — bank soal disimpan di `quiz_questions`, Supabase-first (0 token AI jika soal ada)

---

## Phase 4: Security Architecture Total Upgrade (v3.0)

### 4.1 Login & Status Gate
- [x] STATUS GATE: blokir login jika status = `pending_approval`
- [x] STATUS GATE: blokir login jika status = `rejected`
- [x] Fallback verifikasi password dari kolom `workers.password` jika belum di Supabase Auth
- [x] Resolusi otomatis `status NULL` di `rowToWorkerProfile` berbasis role + user_id

### 4.2 Pendaftaran Akun Baru (Strict Uniqueness)
- [x] Query eksak NIK (`employee_id`) sebelum INSERT — REJECT jika sudah ada
- [x] Query eksak Email (lowercase) sebelum INSERT — REJECT jika sudah ada
- [x] DILARANG mode UPSERT/UPDATE pada `signUpWorker`
- [x] Supervisor baru otomatis `status = 'pending_approval'` saat daftar
- [x] Worker biasa otomatis `status = 'active'` saat daftar

### 4.3 Approval Supervisor
- [x] Admin Console tab Approval menampilkan antrean `pending_approval`
- [x] Tombol Approve → `updateWorkerStatus(id, 'active')` → supervisor bisa login
- [x] Tombol Reject → `updateWorkerStatus(id, 'rejected')` → ditolak permanen
- [x] Tombol "Uji Simulasi Permohonan" di tab Approval untuk pengujian cepat
- [x] Supervisor `pending_approval` tidak bisa login sebelum disetujui

### 4.4 Reset Password / Lupa Password
- [x] Cek pekerja via `findWorkerByIdentifier` — REJECT jika tidak ditemukan
- [x] BLOCK jika email pekerja null atau berakhiran `@komar.id`
- [x] Kirim OTP via `supabase.auth.signInWithOtp()` (BUKAN `signUp`)
- [x] Verifikasi OTP via `supabase.auth.verifyOtp()` type `recovery` + fallback `email`
- [x] Update `workers.password` + `must_change_password = false` setelah OTP berhasil

### 4.5 First-Time Password Setup
- [x] Modal mengunci layar (tidak ada close/skip) saat `mustChangePassword === true`
- [x] Validasi password min 6 karakter
- [x] Validasi email wajib non-`@komar.id` dan format valid
- [x] Update DB: `password`, `email`, `must_change_password = false`

### 4.6 Session & Logout
- [x] Session persist via localStorage (`komar_active_worker_id`) + Supabase Auth
- [x] Logout: `supabase.auth.signOut()` + `localStorage.removeItem`
- [x] RBAC ketat: Worker tidak bisa akses Supervisor/Admin console

---

## Phase 5: Quality & Hardening

- [x] Tambah TypeScript strict mode check (`npx tsc --noEmit` 0 error)
- [x] `npm run build` → bundle produksi Vite sukses
- [x] Review RLS policy & `.env.local` security (terlindungi di `.gitignore`)
- [x] Error boundary React (`ErrorBoundary.tsx`) untuk crash isolation
- [x] PRD v3.0 diperbarui total dengan Security Architecture

---

## Phase 6: PRD §9 Feature Backlog Execution (v3.1)

- [x] **Database Schema**: Tabel `announcements`, `badges`, `worker_badges`, `incident_reports`, `login_attempts`, `activity_log` di `supabase_setup.sql`
- [x] **Papan Pengumuman Admin**: Komponen `AnnouncementBanner.tsx` + CRUD pengumuman di `AdminConsole.tsx`
- [x] **Lencana & Achievement**: Komponen `BadgeShowcase.tsx` + auto-award logic di `supabaseService.ts`
- [x] **Pelaporan Insiden K3**: Komponen `IncidentReportModal.tsx` + status tracking di `AdminConsole.tsx`
- [x] **Dashboard Analitik Admin**: Komponen `AdminAnalytics.tsx` dengan Recharts (bar chart BIB divisi, pie chart tier, top 5 worker)
- [x] **Log Aktivitas Real-time**: Komponen `ActivityLogPanel.tsx` + logging otomatis login/logout/kuis/checklist/insiden
- [x] **Export Data CSV**: Ekspor data pekerja utuh dari `AdminConsole.tsx` ke file `.csv`
- [x] **Rate Limiting Login**: Blokir login 5x percobaan gagal dalam 15 menit
- [x] **Session Expiry**: Auto logout setelah 8 jam tidak aktif

---

## Phase 7: Robust Reward System Upgrade (v3.2)

- [x] **Database Schema & Columns**: Penambahan `min_tier` & `max_claims_per_month` di `reward_catalog` serta `status`, `expiry_date`, `fulfilled_at`, `fulfilled_by` di `redemption_history`
- [x] **Atomic FCFS RPC**: Peningkatan RPC `rpc_redeem_reward_fcfs` dengan `FOR UPDATE` lock, validasi minimal tier, dan kuota klaim bulanan dinamis
- [x] **Fulfillment RPC**: Penambahan RPC `rpc_fulfill_redemption` untuk pencatatan penyerahan voucher reward oleh Admin/Supervisor
- [x] **OOP Domain Entity**: Integrasi `minTier`, `maxClaimsPerMonth`, dan `isTierEligible` di `RewardEntity.ts`
- [x] **Atomic Transaction Manager**: Sinkronisasi penuh penukaran di `atomicService.ts` dan `App.tsx`
- [x] **Pure SVG QR Code**: Komponen `VoucherQRCode.tsx` untuk visualisasi QR Code digital instan tanpa library eksternal
- [x] **UI Marketplace & History**: Tampilan syarat tier, hitung mundur masa berlaku 30 hari, tombol fulfillment admin, dan ekspor CSV riwayat penukaran

---

## Phase 8: Interactive SOP Micro-Deck & Learning Academy (v3.5)

- [x] **Data Layer & Types (`src/types/sop.ts`)**: Definisi model `SopModule`, `SopSlide` (9 format slide dinamis), `WorkerSopProgress`, dan `SopComplianceOverview`
- [x] **Master Seed Catalog (`src/data/sopDeckData.json`)**: 6 modul SOP komprehensif (Forklift MHE, Stacking Palet, APAR PASS K3, Timbangan Inbound, 5S Loading Dock, Segel Kontainer Outbound)
- [x] **Database SQL Setup (`supabase_setup.sql`)**: Tabel `sop_modules`, `worker_sop_progress`, RLS policies, dan Stored Procedure `rpc_complete_sop_module`
- [x] **Service & Data Store (`src/lib/sopService.ts`)**: Integrasi fetch modul SOP, filter role/divisi, local caching fallback, dan atomic completion RPC
- [x] **Slideshow Reader Engine (`src/components/SopSlideshowModal.tsx`)**:
  - [x] Story progress bar segmented header
  - [x] Render 9 tipe format slide (Step, DOs/DONTs, Safety Alert, Interactive Hotspot, Decision Tree, Video/GIF, FAQ Accordion, Glossary, Quiz Checkpoint)
  - [x] Web Speech API Text-to-Speech (TTS) narasi suara Bahasa Indonesia
  - [x] Anti-Speedrun timer (3 detik)
  - [x] In-Slide Gappy AI Assistant popup
  - [x] Multi-device keyboard & touch navigation
  - [x] Modal isolation `createPortal(..., document.body)` full-bleed
- [x] **SOP Gallery & Library Modal (`src/components/SopLibraryModal.tsx`)**:
  - [x] Katalog kartu modul SOP dengan filter kategori & search bar
  - [x] Indikator badge status (`Belum Dibaca`, `✓ Selesai (+50 PTS)`)
  - [x] Ringkasan statistik kepatuhan membaca staf
- [x] **Integrasi Navigasi & App Integration (`App.tsx` & `Navbar.tsx`)**:
  - [x] Tombol akses tunggal `📖 SOP Micro-Deck` di Worker Dashboard (membersihkan tombol duplikat di Navbar)
  - [x] Handler auto-award +50 PTS dan peningkatan nilai BIB Benchmark secara atomik
- [x] **Admin SOP Management Panel (`src/components/SopManagementPanel.tsx` & `AdminConsole.tsx`)**:
  - [x] Tab khusus "Modul SOP Micro-Deck" di Administrator Console
  - [x] Form modal pembuatan modul SOP baru lengkap dengan 3-slide builder (Instruksi Langkah, DOs & DON'Ts, Kuis Checkpoint)
  - [x] Fitur Preview Deck, Filter Kategori, Hapus Modul, dan Ekspor CSV Katalog SOP

---

## Open Issues (Perlu Verifikasi Runtime)

- [x] Verifikasi OTP email benar-benar terkirim (perlu test di environment nyata)
- [x] Verifikasi `findWorkerByIdentifier` tidak menghasilkan false positive email lagi
- [x] Verifikasi Approval Console menampilkan antrean setelah signup supervisor baru
- [x] Verifikasi supervisor tidak bisa login sebelum di-approve

---

## Phase 9: Peer-to-Peer Recognition (Sistem "Kudos")

- [x] **Data Layer & Types (`src/types/kudos.ts`)**: Definisikan tipe model `KudoEntity`, `KudoCategory` (Kerja Keras, Inisiatif, Teamwork, Safety First).
- [x] **Database SQL Setup (`supabase_setup.sql`)**: Buat tabel `worker_kudos` (id, sender_id, receiver_id, category, message, points_awarded, created_at) beserta RLS policies.
- [x] **Atomic RPC (`rpc_send_kudo`)**: Stored Procedure atomik untuk mencatat kudo, menambahkan poin (+10 PTS) ke penerima, dan mencatat ke `activity_log`.
- [x] **Service Layer (`src/lib/kudoService.ts`)**: Class `KudoService` dengan method enkapsulasi `sendKudo()`, `getRecentKudos()`, dan mapping join data worker.
- [x] **UI Component (`src/components/KudoModal.tsx`)**: Form interaktif apresiasi dengan dropdown pilihan worker dan pemilihan kategori animasi badge.
- [x] **UI Component (`src/components/KudoWall.tsx`)**: Tembok Apresiasi feed real-time di bagian bawah dashboard worker.

---

## Phase 10: Shift Handover (Log Serah Terima Shift & Papan Kanban)

- [x] **Data Layer & Types (`src/types/handover.ts`)**: Model `ShiftHandoverEntity`, enum `HandoverCategory` (MHE, Operasional, 5R, Dokumen, Infrastruktur, K3, Lainnya), `ConditionStatus`, dan `HandoverStatus`.
- [x] **Database SQL Setup (`supabase_setup.sql`)**: Tabel `shift_handovers` (id, shift_date, shift_type, author_id, next_supervisor_id, handover_category, condition_status, status, notes, acknowledged_at, acknowledged_by).
- [x] **Service Layer (`src/lib/handoverService.ts`)**: Class `HandoverManager` untuk pencatatan log, pembaruan status Kanban (`updateHandoverStatus`), riwayat handover, dan verifikasi acknowledgement.
- [x] **Notifikasi Wajib Baca (`src/components/AcknowledgeHandoverModal.tsx`)**: Modal blocking saat login untuk mewajibkan penerima membaca dan mengonfirmasi catatan serah terima yang ditujukan padanya.
- [x] **UI Form Input (`src/components/ShiftHandoverModal.tsx`)**: Form input serah terima multi-kategori (MHE, Operasional, 5R, dll) dan pemilihan skala kondisi.
- [x] **Kanban Board Mobile-First (`src/components/HandoverKanbanBoard.tsx`)**: Papan visual 3 kolom (Tertunda, Proses, Selesai) dengan dukungan Desktop Drag & Drop, Mobile Tab Switcher, Touch Action Buttons, dan Auto-Archive 24 jam untuk semua user di beranda utama.

---

## Phase 11: "Kaizen" / Suggestion Box (Kotak Saran Inovasi)

- [x] **Data Layer & Types (`src/types/kaizen.ts`)**: Model `KaizenSuggestionEntity`, enum `KaizenCategory` (Safety / K3, Efisiensi, 5R, Biaya, Layanan, Lainnya), dan enum `KaizenStatus` (Submitted, Under Review, Approved, Implemented, Rejected).
- [x] **Database SQL Setup (`supabase_setup.sql`)**: Tabel `kaizen_suggestions` dengan RLS dan Stored Procedure atomik `rpc_approve_kaizen` untuk pencairan poin reward dan logging audit.
- [x] **Service Layer (`src/lib/kaizenService.ts`)**: Class OOP `KaizenService` yang menangani pengajuan ide (`submitSuggestion`), penarikan data, review berhadiah poin (`reviewSuggestion`), dan riwayat worker.
- [x] **UI Form Pengajuan (`src/components/KaizenSubmissionModal.tsx`)**: Form interaktif pekerja dengan pemilihan kategori visual, deskripsi masalah (sebelum), usulan solusi (sesudah), estimasi dampak, dan konfirmasi sukses.
- [x] **UI Riwayat Pekerja (`src/components/WorkerKaizenHistoryModal.tsx`)**: Modal riwayat bagi pekerja untuk memantau status persetujuan, catatan feedback reviewer, dan total poin reward yang telah dikumpulkan.
- [x] **Papan Kanban Manajemen (`src/components/KaizenKanbanBoard.tsx`)**: Papan Kanban 5 kolom bagi Admin/Supervisor dengan Drag & Drop, pencarian/filter kategori, modal review reward (+50, +100, +250, +500 PTS), dan navigasi ramah sentuhan (Mobile Tabs & Action Buttons).
- [x] **Integrasi Aplikasi (`src/App.tsx`, `AdminConsole.tsx`, `SupervisorConsole.tsx`)**: Tombol akses `Kaizen Inovasi` & `Riwayat & Arsip` di menu aksi harian, Tab `Inovasi Kaizen` di Administrator Console, serta Tab khusus `Approval Kaizen` di Supervisor Console lengkap dengan counter badge usulan pending.

---

## Phase 12: Pelacak SIO & Lisensi Alat Berat (MHE License & Certification Tracker)

- [x] **Data Layer & Types (`src/types/license.ts`)**: Model `MheLicenseEntity`, `LicenseType` (SIO Forklift, SIO Reach Truck, SIM B2 Umum, K3 Kemenaker, First Aid), `LicenseStatus` (Active, Expiring Soon, Expired).
- [x] **Service Layer (`src/lib/licenseService.ts`)**: Service manajemen lisensi, kalkulasi sisa hari aktif, filter operator, dan ekspor data CSV.
- [x] **Admin UI Component (`src/components/MheLicensePanel.tsx`)**: Tab kontrol SIO, indikator kedaluwarsa H-30 hari, modal pendaftaran/pembaruan SIO, dan status kepatuhan legalitas alat berat.

---

## Phase 13: Inventaris & Distribusi APD (PPE Lifecycle & Safety Gear Management)

- [x] **Data Layer & Types (`src/types/ppe.ts`)**: Model `PpeItemEntity`, `PpeDistributionEntity`, `PpeDamageReportEntity`, `PpeCategory` (Safety Shoes, Helm K3, Rompi Reflektif, Sarung Tangan, Masker/Respirator, Body Harness).
- [x] **Service Layer (`src/lib/ppeService.ts`)**: Manajemen stok APD, log serah terima, deteksi interval penggantian berkala (H-14 hari), skema penggantian APD rusak/hilang, notifikasi otomatis, dan ekspor data CSV.
- [x] **Admin & Supervisor UI Component (`src/components/PpeManagementPanel.tsx`)**: Monitoring serah terima APD pekerja, manajemen katalog stok gudang, meja tiket verifikasi & penerbitan pengganti APD rusak/hilang.

---

## Phase 14: Generator Laporan Audit Eksekutif (Executive Compliance & Safety Report Generator)

- [x] **Service Layer (`src/lib/pdfReportService.ts`)**: Generator dokumen eksekutif resmi (Matriks Kompetensi BIB, K3 Zero Incident & CAPA, Legalitas SIO MHE, Inventaris APD, Anggaran Reward) dengan penomoran unik, kop surat resmi, penandatangan multi-level, dan ekspor CSV.
- [x] **Admin & Supervisor UI Component (`src/components/ExecutiveReportPanel.tsx`)**: Meja generator laporan eksekutif lengkap dengan filter periode/divisi, penandatangan resmi, pratinjau lembar langsung (live preview), KPI summary, dan tombol cetak PDF / download CSV.

---

## Phase 15: Konseling & Sanksi K3 (Safety Coaching & Disciplinary Matrix)

- [x] **Data Layer & Types (`src/types/disciplinary.ts`)**: Model `DisciplinaryActionEntity`, `ViolationLevel` (Pembinaan Lisan, SP 1, SP 2, SP 3, Skorsing, Remedial), `SanctionStatus` (Active, In Retraining, Resolved, Appealed), `DisciplinaryStats`.
- [x] **Service Layer (`src/lib/disciplinaryService.ts`)**: Pencatatan pelanggaran K3, penomoran SK resmi otomatis, penalti pengurangan poin dinamis, penugasan mandatory retraining SOP, notifikasi otomatis, cetak PDF Surat Peringatan, dan ekspor CSV.
- [x] **Admin & Supervisor UI Component (`src/components/DisciplinaryPanel.tsx`)**: Meja kontrol pembinaan K3, form penerbitan sanksi terstandarisasi, verifikasi modal kelulusan retraining, dan panduan matriks eskalasi sanksi K3.

---

## Phase 16: Audit Standar 5R / 5S Wilayah Gudang (5S Warehouse Audit Zone)

- [x] **Data Layer & Types (`src/types/audit5s.ts`)**: Model `WarehouseZone5s`, `Audit5sRecord`, `Audit5sPillars` (Ringkas, Rapi, Resik, Rawat, Rajin: 0-100%), `ZoneType`, `Rating5s` (Gold, Silver, Bronze, Perlu Perbaikan), `Audit5sStats`.
- [x] **Service Layer (`src/lib/audit5sService.ts`)**: Scoring engine 5R, kalkulasi predikat rating, alokasi reward poin insentif PIC zona, notifikasi otomatis, cetak Berita Acara PDF, dan ekspor CSV.
- [x] **Admin & Supervisor UI Component (`src/components/Audit5sPanel.tsx`)**: Papan klasemen kebersihan zona gudang, formulir audit 5 pilar interaktif dengan slider 0-100%, riwayat sesi audit, dan form manajemen master zona gudang.

---

## Phase 17: Dynamic System Points Management Configuration (No Hardcoded Points)

- [x] **Domain Service (`src/domain/SystemConfigService.ts`)**: Model konfigurasi poin dinamis lengkap (Kuis Harian, Bonus 100%, Pre-Shift, SOP, Insiden, Near-Miss, Kaizen Submission/Approval/Implementation, Kudo Kirim/Terima, 5S Gold/Silver/Bronze, SIO Registrasi/Pembaruan, dan Penalti Sanksi Disiplin K3).
- [x] **Admin UI Integration (`src/components/SystemConfigPanel.tsx` & `src/components/AdminConsole.tsx`)**: Meja kontrol konfigurasi poin dinamis lengkap di tab "Aturan & Config System" dengan live save, broadcast custom event, tombol Reset ke Default, dan feedback visual.

---

## Phase 18: Pustaka SOP Micro-Deck & K3 Interactive Academy (5 Formats)

- [x] **Data Layer & Types (`src/types/sop.ts`)**: Model `SopPresentationFormat` (`micro_deck`, `interactive_simulator`, `spot_the_mistake`, `visual_hotspot`, `document_reader`), `SopSimulatorStep`, `SopSpotMistakeConfig`, `SopDocumentConfig`.
- [x] **Service Layer (`src/lib/sopService.ts`)**: Modul simulasi interaktif `SOP-SIM-01` (WMS Handheld Putaway) & `SOP-SPOT-01` (Hazard Hunt Anomali Palet Miring).
- [x] **Worker Player Interaktif (`src/components/SopSlideshowModal.tsx`)**: Click coordinate detector, hitung mundur timer bahaya K3, shake animation on error, confetti celebration, dan TTS voiceover.

---

## Phase 19: Dynamic Multi-Slide Deck Builder & Timeline Storyboard

- [x] **Studio Storyboard Editor (`src/components/SopManagementPanel.tsx`)**: Dynamic `editingSlides: SopSlide[]` state dengan Filmstrip Timeline Bar.
- [x] **Multi-Slide Management Toolbar**: Quick actions (+Tambah Slide, Duplikasi Slide, Geser Urutan Naik/Turun, Hapus Slide).
- [x] **Interactive Hitbox & Anomaly Picker**: Alat visual pemilihan koordinat kotak klik WMS simulator dan titik bahaya K3 langsung pada preview gambar.
- [x] **Segmented Story Progress Bar (`src/components/SopSlideshowModal.tsx`)**: Progress bar dinamis menyesuaikan total slide modul dan navigasi cepat review slide selesai.

---

## Phase 20: 5-Point Enterprise System Optimization Roadmap

- [x] **⚡ Performa Konsol (Granular Lazy-Loading)**: `AdminConsole.tsx` & `SupervisorConsole.tsx` sub-panel di-lazy load per tab (`React.lazy()` + `SkeletonLoader`), memangkas bundle awal >50% (202 kB $\to$ 102 kB) dan membuka tab dalam <100ms.
- [x] **📴 Ketahanan Offline (Offline-First SOP & Background Sync)**: Service `src/lib/offlineSopService.ts` untuk caching modul SOP di local storage/IndexedDB dan background sync otomatis saat online via listener di `App.tsx`.
- [x] **📄 Tooling Supervisor (Export SOP Poster A4 PDF)**: Service `src/lib/sopPdfExporter.ts` dan tombol "A4 PDF" pada kartu SOP untuk mencetak poster resmi siap tempel di area gudang.
- [x] **🪪 Operasional Lapangan (Quick QR Badge Scanner SIO MHE)**: Komponen `src/components/QrBadgeScannerModal.tsx` dengan live camera HUD scanner dan shortcut verifikasi lisensi forklift/reach truck di `SupervisorConsole.tsx`.
- [x] **🔒 Integritas Data (Idempotency Key & Optimistic Point Claiming)**: Token unik `workerId_sopId_dateKey` dan optimistic locking di `sopService.ts` & `SopSlideshowModal.tsx` untuk mencegah duplikasi saldo poin pekerja.

---

## Phase 21: Enterprise System Enhancements & Operational Protocol (v3.7)

- [x] **🪪 Kartu ID Digital & QR Badge Lisensi SIO Mandiri (`src/components/WorkerDigitalIdModal.tsx`)**:
  - Generator QR Code SVG 21x21 deterministik berbasis NIP/EmployeeId yang kompatibel dengan pemindai QR kamera.
  - Verifikasi legalitas lisensi SIO MHE terintegrasi (`LicenseService.getLicenseByWorkerId`), status verifikasi pre-shift checklist K3 hari ini, level Tier BIB & Poin reward.
  - Tombol akses *"Kartu ID & SIO Digital"* di bar profil worker `src/App.tsx` dan fitur cetak ID Card (`window.print()`).
- [x] **⚡ Otomatisasi Penugasan Re-Training K3 dari Gap Analysis (`src/domain/TrainingAssignmentService.ts` & `src/components/CompetencyGapAnalysisModal.tsx`)**:
  - Deteksi gap kompetensi $\ge 25\%$ memicu tombol operasional *"Tugaskan Re-Training"*.
  - Modal konfirmasi penugasan ke seluruh personel divisi terdampak dengan batas waktu penyelesaian 7 hari.
  - Pengiriman notifikasi penugasan kepatuhan prioritas tinggi via `NotificationEngine` dan pencatatan audit trail ke `activity_log`.
- [x] **📄 Ekspor Berita Acara Insiden K3 Resmi / Formulir BAP PDF (`src/lib/pdfReportService.ts`)**:
  - Implementasi method resmi `ExecutivePDFReportGenerator.exportOfficialBapIncidentPDF` format standar BAP kecelakaan kerja PT. DAYA ANUGRAH MULYA.
  - Struktur dokumen A4 komprehensif: Kop HSE resmi, nomor registrasi BAP unik, Bagian I (Identitas Pelapor & Rincian Insiden), Bagian II (Kronologi & Analisis 5-Why Root Cause), Bagian III (Matriks CAPA, PIC & Due Date), serta Bagian IV (Lembar Tanda Tangan 3 Pihak: Pelapor, Saksi Lapangan, dan Supervisor HSE).
  - Terhubung langsung ke tombol *"Cetak BAP Resmi K3 (PDF)"* di `src/components/SupervisorIncidentValidationModal.tsx`.
- [x] **🔄 Protokol Mutasi Role dengan Isolasi Nilai Audit Clean Slate (`src/domain/RoleMutationManager.ts` & `src/components/AdminConsole.tsx`)**:
  - Kolom `archived_competency_scores JSONB` pada tabel `worker_role_mutations` di `supabase_setup.sql`.
  - Eksekusi mutasi role secara atomic: snapshot seluruh 54-item nilai audit aktif, update role/divisi, dan reset bersih (*Clean Slate*) skor aktif di `worker_competency_scores` agar batasan MaxScore role lama tidak mencemari penilaian role baru.
  - Notifikasi transisi role otomatis ke dashboard worker dan pencatatan audit ke `activity_log`.
- [x] **🎯 Aksi Langsung Hasil Scan QR Scanner ke Audit Supervisor (`src/components/SupervisorConsole.tsx` & `src/components/QrBadgeScannerModal.tsx`)**:
  - Penambahan tombol aksi *"Pilih Pekerja"* (memilih profil staf di tab tim) dan *"Mulai Audit Matriks"* (langsung beralih ke tab tim dan meluncurkan modal `CompetencyAuditModal` 54 item untuk pekerja hasil scan).
  - Eliminasi kebutuhan pencarian manual di dropdown supervisor.
- [x] **📶 Indikator Status Jaringan Visual Online/Offline Mode (`src/components/NetworkStatusBadge.tsx` & `src/components/Navbar.tsx`)**:
  - Real-time network detector mendeteksi event `online` dan `offline`.
  - Status pill interaktif di Navbar (`🟢 Online` / `🟠 Offline Cache` + jumlah antrean sinkronisasi background SOP).
  - Pemicu auto-sync otomatis (`flushOfflineSopCompletions`) saat perangkat staf kembali terhubung ke jaringan internet.

---

## Phase 22: UI/UX Redesign & Anti-Redundancy Layout Overhaul (v3.8)

- [x] **🧹 Eliminasi Teks Repetitif & Redundansi (`src/components/Navbar.tsx` & `src/App.tsx`)**:
  - [x] Navbar: Hilangkan duplikasi teks nama & role ganda (misal `System Administrator` atas-bawah dialihkan ke format NIP · Divisi jika nama sama dengan role).
  - [x] Profil Banner: Cegah pengulangan nama pada NIP/Role subtext jika nama pengguna sama dengan role (`NIP: {employeeId} · Divisi: {division}`).
- [x] **📐 Redesain Layout Kartu Profil & KPI Metrik (`src/App.tsx`)**:
  - [x] Desktop: Pisahkan baris atas menjadi dua zona harmonis: Identitas Pekerja di kiri & Strip Metrik Vital (Streak, Poin, Skor BIB) horizontal yang lega di kanan.
  - [x] Mobile: Desain compact card yang menghemat ruang vertikal hingga 40% agar konten operasional di bawahnya langsung terlihat *above the fold*.
- [x] **🎛️ Restrukturisasi & Hirarki 8 Tombol Aksi Lapangan (`src/App.tsx`)**:
  - [x] Hilangkan efek "pelangi warna-warni kontras tinggi" menjadi gaya enterprise modern berbasis zinc & semantic accents.
  - [x] Symmetrical clean 8-button command hub (Kuis, Pre-Shift, SOP, Insiden, Kudo, Serah Terima, Kaizen, Riwayat) dengan visual status completion badges.
- [x] **🔍 Penyisiran & Perbaikan Layout Menu-Menu Lain**:
  - [x] Papan Serah Terima Shift & Kanban Board (`src/components/HandoverKanbanBoard.tsx`): responsif dengan mobile tab switcher & desktop 3-kolom.
  - [x] Navigasi dan panel Supervisor Console (`src/components/SupervisorConsole.tsx`): 3-kolom grup tab di desktop dan horizontal pill tab bar di mobile.
  - [x] Navigasi dan panel Admin Console (`src/components/AdminConsole.tsx`): 4-kolom suite bar di desktop dan horizontal scrollable tab bar di mobile.

---

## Phase 23: Eliminasi Hardcoded Values & Integrasi Dynamic Points (v3.9)

- [x] **⚡ Dynamic Pre-Shift Checklist Points**: Hubungkan `src/App.tsx` (`handleCompleteChecklist` basePoints & tombol hero banner) ke `SystemConfigService.getConfig().preShiftRewardPoints`.
- [x] **🎯 Dynamic Daily Safety Quiz Points**: Jadikan label tombol kuis dan fallback points pada AI generator dinamis menggunakan `config.dailyQuizRewardPoints`.
- [x] **🚨 Dynamic Incident & Near-Miss Points**: Hubungkan validasi insiden di `src/lib/supabaseService.ts` dan `SupervisorIncidentValidationModal.tsx` ke `config.incidentValidRewardPoints` (50 PTS) dan `config.nearMissRewardPoints` (75 PTS).
- [x] **🤝 Dynamic Kudo Appreciation Points**: Operkan parameter `p_points: config.kudoReceivedPoints` pada `KudoService.sendKudo` di `src/lib/kudoService.ts`.
- [x] **📈 Dynamic Weekly Target Formula**: Hitung target mingguan `PerformanceSummaryCard.tsx` secara otomatis via `(config.dailyQuizRewardPoints + config.preShiftRewardPoints) * 7`.
- [x] **💡 Dynamic Kaizen Reward Tier Options**: Hubungkan pilihan reward poin review pada `KaizenKanbanBoard.tsx` ke nilai konfigurasi `SystemConfigService`.
- [x] **⚖️ Dynamic Disciplinary Penalty Points**: Sinkronkan penalti sanksi SP1/SP2/SP3/Skorsing di `src/lib/disciplinaryService.ts` dengan nilai konfigurasi dinamis.
- [x] **🏆 Dynamic 5S / 5R Rating Rewards**: Hubungkan alokasi poin predikat Gold/Silver/Bronze di `src/lib/audit5sService.ts` ke `SystemConfigService`.
- [x] **🚜 Eksekusi Reward Poin SIO MHE**: Tambahkan penambahan saldo poin pekerja otomatis saat registrasi SIO (+100 PTS) dan perpanjangan SIO (+150 PTS) di `src/lib/licenseService.ts`.

---

## Phase 24: Enterprise OOP Domain Architecture Refactoring (DDD & State Machine) (v4.0)

- [x] **🛡️ `IncidentManager` & `IncidentEntity` (`src/domain/IncidentManager.ts` & `src/domain/IncidentEntity.ts`)**:
  - Enkapsulasi status machine siklus hidup insiden (`open` $\to$ `investigating` $\to$ `resolved` $\to$ `closed`).
  - Enkapsulasi kalkulasi reward pelapor (Near-Miss vs Regular Incident) dan validasi kelengkapan CAPA.
- [x] **🚜 `MheLicenseEntity` (`src/domain/MheLicenseEntity.ts`)**:
  - Enkapsulasi method `isEligibleToOperate()`, `getDaysRemaining()`, dan `getStatus()`.
  - Sentralisasi aturan kedaluwarsa H-30 hari dan hak operasional alat berat.
- [x] **🔄 `ShiftHandoverManager` (`src/domain/ShiftHandoverManager.ts`)**:
  - Enkapsulasi state machine serah terima shift (`Tertunda` $\leftrightarrow$ `Proses` $\leftrightarrow$ `Selesai`).
  - Enkapsulasi aturan auto-archive 24 jam dan validasi acknowledgement.
- [x] **⚖️ `DisciplinaryMatrixEngine` (`src/domain/DisciplinaryMatrixEngine.ts`)**:
  - Enkapsulasi matriks eskalasi progresif sanksi K3 (Pembinaan Lisan $\to$ SP1 $\to$ SP2 $\to$ SP3 $\to$ Skorsing) berdasarkan riwayat aktif 6 bulan.
- [x] **🧹 `Audit5sEngine` (`src/domain/Audit5sEngine.ts`)**:
  - Enkapsulasi perhitungan skor 5 pilar (Ringkas, Rapi, Resik, Rawat, Rajin) dan penentuan predikat mutu Gold/Silver/Bronze.

---

## Phase 25: Standardisasi Nama Perusahaan Resmi — PT. DAYA ANUGRAH MULYA

- [x] **Audit & Refactor Form & Panel UI**:
  - [x] `src/components/ExecutiveReportPanel.tsx`: Update default header nama perusahaan, badge kop, dan label manajemen menjadi `PT. DAYA ANUGRAH MULYA`.
  - [x] `src/components/WorkerDigitalIdModal.tsx`: Update kartu tanda pengenal digital ID card & footer lisensi SIO menjadi `PT. DAYA ANUGRAH MULYA`.
  - [x] `src/components/DisciplinaryPanel.tsx`: Update kop panduan matriks sanksi & eskalasi K3 menjadi `PT. DAYA ANUGRAH MULYA`.
  - [x] `src/components/SopManagementPanel.tsx`: Update deskripsi placeholder SOP default menjadi `PT. DAYA ANUGRAH MULYA`.
- [x] **Standardisasi Engine Dokumen PDF & Berita Acara**:
  - [x] `src/lib/pdfReportService.ts`: Standardisasi seluruh header kop surat, watermark, judul resmi, dan catatan kaki PDF eksekutif (BIB Matrix, K3 Insiden, BAP Kecelakaan Kerja, Lisensi SIO, APD, Reward) ke `PT. DAYA ANUGRAH MULYA`.
  - [x] `src/lib/audit5sService.ts`: Update kop dokumen dan footer berita acara audit 5R wilayah gudang.
  - [x] `src/lib/disciplinaryService.ts`: Update kop surat resmi dan footer Surat Peringatan (SP) disiplin K3.
- [x] **Data Seed & Spesifikasi Dokumen Proyek**:
  - [x] `src/data/sopDeckData.json`: Update author SOP (`Tim HSE PT. DAYA ANUGRAH MULYA`) dan deskripsi titik kumpul evakuasi.
  - [x] `PRD.md`, `README.md`, `SOP_MODULE_SPEC.md`: Standardisasi nama badan usaha resmi di seluruh dokumentasi proyek.

---

## Phase 26: Drawer Status Antrean Offline (IndexedDB / LocalStorage Sync Visualizer)

- [x] **Data Layer & Types (`src/types/offlineQueue.ts`)**:
  - [x] Definisikan model antrean `OfflineQueueItem`: `id`, `type` (`sop_completion`, `pre_shift_checklist`, `daily_quiz`, `incident_report`, `kudo`), `payload`, `timestamp`, `status` (`pending`, `syncing`, `failed`), `retryCount`, `lastError`.
  - [x] Interface metrik antrean `QueueSyncSummary`: total tertunda, total gagal, status konektivitas, estimasi ukuran payload.
- [x] **Offline Queue Manager Engine (`src/lib/offlineQueueManager.ts`)**:
  - [x] Service terpusat pengelola antrean transaksi offline multi-modul (ekspansi dari `offlineSopService.ts`).
  - [x] Method `enqueueItem()`, `getPendingItems()`, `retrySingleItem()`, `forceSyncAll()`, `clearFailedItems()`.
  - [x] Event emitter listener untuk update reaktif ke UI saat item berhasil/gagal sinkronisasi.
- [x] **UI Component: Offline Queue Drawer (`src/components/OfflineQueueDrawer.tsx`)**:
  - [x] Slide-over drawer interaktif menampilkan list item transaksi yang tertahan saat bekerja di blind spot gudang.
  - [x] Badging status per item, detail payload ringkas, waktu antre, dan tombol aksi "Sinkronkan Sekarang" (Force Sync) manual.
  - [x] Tombol batch action: "Sync Semua", "Hapus Antrean Kedaluwarsa", dan indikator latensi koneksi.
- [x] **Integrasi Antarmuka (`src/components/NetworkStatusBadge.tsx` & `src/components/Navbar.tsx`)**:
  - [x] Jadikan pill `NetworkStatusBadge` di Navbar dapat diklik untuk membuka `OfflineQueueDrawer`.
  - [x] Notifikasi pulse indicator bila terdapat antrean offline yang tertahan >10 menit.

---

## Phase 27: Refaktorisasi Monolith AdminConsole.tsx (Domain-Driven Modular Sub-Panels)

- [x] **Dekomposisi Sub-Panel Tab SDM & Akses Pekerja**:
  - [x] Ekstrak manajemen staf operasional, filter divisi/role, dan import TSV massal ke `src/components/admin/AdminStaffPanel.tsx`.
  - [x] Ekstrak antrean verifikasi permohonan akses supervisor ke `src/components/admin/AdminSupervisorApprovalPanel.tsx`.
  - [x] Ekstrak protokol pemindahan divisi & role pekerja (Clean Slate Reset) terintegrasi di `src/components/admin/AdminStaffPanel.tsx`.
- [x] **Dekomposisi Sub-Panel Tab Master Setup Data**:
  - [x] Ekstrak CRUD master divisi dan master role operasional ke `src/components/admin/AdminMasterDataPanel.tsx`.
  - [x] Ekstrak konfigurasi matriks kompetensi 54-item dan binding MaxScore ke `src/components/admin/AdminCompetencyMatrixPanel.tsx`.
- [x] **Dekomposisi Sub-Panel Tab Performa & Reward**:
  - [x] Ekstrak CRUD katalog reward, quick restock, dan modal voucher ke `src/components/admin/AdminRewardCatalogPanel.tsx`.
  - [x] Ekstrak audit log riwayat penukaran staf FCFS terintegrasi di `src/components/admin/AdminRewardCatalogPanel.tsx`.
- [x] **Dekomposisi Modul Ekstra**:
  - [x] Ekstrak modul laporan insiden, formulir CAPA, dan lightbox foto HD ke `src/components/admin/AdminIncidentPanel.tsx`.
  - [x] Ekstrak modul pengumuman tim dan kontrol banner ke `src/components/admin/AdminAnnouncementPanel.tsx`.
  - [x] Ekstrak sensor Gappy AI, monitoring cache, dan konfigurasi API key ke `src/components/admin/AdminAiQuizPanel.tsx`.
- [x] **Container Koordinator Ramping (`src/components/AdminConsole.tsx`)**:
  - [x] Reduksi drastis ukuran file `AdminConsole.tsx` dari 149 KB (3.073 baris) menjadi 387 baris arsitektur bersih koordinator.
  - [x] Dynamic code-splitting & lazy-loading per sub-panel tab via `React.lazy` dengan skeleton fallbacks yang terisolasi.

---

## Phase 28: Supervisor Gemba Walk & Quick Safety Patrol Suite

- [x] **Data Layer & Schema Database**:
  - [x] Tabel `safety_patrol_logs` di `supabase_setup.sql` (`id`, `supervisor_id`, `patrol_date`, `zone_id`, `finding_type` [Unsafe Act / Unsafe Condition / Good Practice], `severity` [Low / Medium / High / Critical], `description`, `photo_url`, `assigned_pic_id`, `status` [Open / In Progress / Resolved], `due_date`, `resolution_notes`, `resolved_at`).
  - [x] Model TypeScript `src/types/safetyPatrol.ts` dan status state machine.
- [x] **Domain Service (`src/domain/SafetyPatrolService.ts`)**:
  - [x] Service pencatatan inspeksi keliling cepat lapangan (Gemba Walk 5-menit).
  - [x] Integrasi offline fallback `localStorage` dan antrean sinkronisasi `OfflineQueueManager`.
  - [x] Auto-assignment PIC zona dan alokasi poin integritas (+25 PTS) bagi penyelesaian temuan sebelum batas waktu (Due Date).
- [x] **UI Component: Rapid Gemba Patrol Modal (`src/components/SafetyPatrolModal.tsx`)**:
  - [x] Formulir inspeksi lapangan ramah sentuhan (Quick Hazard Form): pilih zona gudang, jepret/unggah foto, tag jenis bahaya, dan tentukan PIC tindak lanjut.
- [x] **UI Component: Safety Patrol Kanban Board (`src/components/SafetyPatrolKanban.tsx`)**:
  - [x] Papan visual 3-kolom status temuan patroli (Open $\leftrightarrow$ Tindak Lanjut $\leftrightarrow$ Selesai).
  - [x] Filter cepat berdasarkan tingkat keparahan, zona gudang, dan filter temuan kritis mendekati batas waktu (<24 jam).
- [x] **Integrasi Supervisor Console & Generator Laporan**:
  - [x] Integrasi tab baru *"Safety Patrol (Gemba)"* di `src/components/SupervisorConsole.tsx`.
  - [x] Generator ekspor rekap temuan patroli K3 ke format PDF Berita Acara Temuan Lapangan resmi PT. DAYA ANUGRAH MULYA.

---

## Phase 29: Enterprise Cloud Storage Architecture (Google Drive Gateway with User-Bound Structure)

- [x] **Core Service & Types (`src/lib/googleDriveService.ts`)**:
  - [x] Perluas parameter upload dengan `workerId`, `workerName`, `moduleCategory`, dan `rootFolderId`.
  - [x] Implementasi kompresi HD client-side otomatis sebelum konversi Base64 untuk efisiensi jaringan gudang.
  - [x] Ekstrak direct image URL (`https://lh3.googleusercontent.com/d/{fileId}`) untuk rendering tag `<img>` instan di UI.
  - [x] Hubungkan ke `SystemConfigService` agar URL Webhook dan Root Folder ID dapat dimaintain secara dinamis oleh Admin.
- [x] **Konfigurasi Gateway Dinamis (`src/domain/SystemConfigService.ts` & `src/components/SystemConfigPanel.tsx`)**:
  - [x] Tambahkan key `gdriveTargetFolderId` dan `gdriveWebhookUrl` pada schema `SystemConfig`.
  - [x] Tambahkan field pengaturan Google Drive Bucket di Admin Console tab "Aturan & Config System".
- [x] **Integrasi Modul Terpusat (User-Bound Folder Binding)**:
  - [x] **Modul 1: Laporan Insiden K3 (`src/components/IncidentReportModal.tsx`)** ➔ Simpan ke subfolder `/[ID] Nama/Laporan_Insiden/`.
  - [x] **Modul 2: Safety Patrol K3 (`src/components/SafetyPatrolModal.tsx`)** ➔ Simpan ke subfolder `/[ID] Nama/Safety_Patrol/`.
  - [x] **Modul 3: Foto Profil Pekerja (`src/components/ProfilePictureModal.tsx`)** ➔ Simpan ke subfolder `/[ID] Nama/Foto_Profil/` dan bind ke `workers.avatar`.
  - [x] **Modul 4: Sertifikasi SIO MHE (`src/components/MheLicensePanel.tsx`)** ➔ Simpan ke subfolder `/[ID] Nama/SIO_MHE/`.
  - [x] **Modul 5: Kaizen Inovasi (`src/components/KaizenSubmissionModal.tsx`)** ➔ Simpan ke subfolder `/[ID] Nama/Kaizen_Inovasi/`.
  - [x] **Modul 6: Manajemen Dokumen SOP (`src/components/SopManagementPanel.tsx`)** ➔ Simpan ke subfolder `/[ID] Nama/Dokumen_SOP/`.
- [x] **Verifikasi & Build**:
  - [x] Type check `npx tsc --noEmit` lulus 0 error.
  - [x] Production build `npm run build` berhasil.

---

## Phase 30: Dynamic Tier Engine & Configurable Progression System

- [x] **1. Domain & Model Refactor (Logika Ambang Batas / Threshold)**:
  - [x] Ubah struktur model tier di `src/domain/SystemConfigService.ts` dari sekadar `string[]` menjadi struktur objek kaya konfigurasi (`TierConfig`: `id`, `name`, `minPoints`, `level`, `badgeColor`, `badgeBg`, `icon`).
  - [x] Refactor `WorkerEntity.calculateTier(totalPoints)` di `src/domain/WorkerEntity.ts` agar membaca konfigurasi tier dinamis dari `SystemConfigService` (menggantikan hardcode 3000, 1500, 500).
  - [x] Refactor `RewardEntity.isTierEligible(userTier)` dan `TIER_LEVEL_MAP` di `src/domain/RewardEntity.ts` agar membaca hierarki level secara dinamis dari config.
  - [x] Perluas `TierType` di `src/types/assessment.ts` agar mendukung fleksibilitas string dinamis atau tier kustom (`DefaultTierType | (string & {})`).

- [x] **2. Database & RPC Function Update (`supabase_setup.sql`)**:
  - [x] Longgarkan / drop `CHECK constraint` statis pada kolom `workers.tier` dan `reward_catalog.min_tier` agar tidak mengunci 4 nama statis saja.
  - [x] Update fungsi helper `get_tier_level(p_tier TEXT)` di PostgreSQL agar case-insensitive dan memiliki fallback baseline level aman.
  - [x] Sediakan blok migrasi SQL khusus Phase 30 di `supabase_setup.sql` yang siap dieksekusi.

- [x] **3. Antarmuka Manajemen Tier Admin (`SystemConfigPanel.tsx`)**:
  - [x] Tambahkan section / form editor "10.4 Master Tier Pekerja & Ambang Batas Poin" di `src/components/SystemConfigPanel.tsx`.
  - [x] Beri Admin wewenang mengubah nama tier, ambang batas minimum poin (min points), urutan level, warna badge, serta icon.
  - [x] Fitur penambahan tier baru, hapus tier, dan tombol reset ke 4 default tier.

- [x] **4. Refactor Presentasi UI & Styling Dinamis**:
  - [x] Dinamisasi mapping warna chart di `src/components/AdminAnalytics.tsx` (`SystemConfigService.getTierByName`).
  - [x] Dinamisasi notifikasi naik level di `src/components/TierUpToast.tsx` (`SystemConfigService.getTierByName`).
  - [x] Dinamisasi filter & styling badge reward di `src/components/RewardMarketplace.tsx` dan `src/components/admin/AdminRewardCatalogPanel.tsx`.
  - [x] Implementasi helper styling terpusat `SystemConfigService.getTierBadgeStyle` untuk header worker (`App.tsx`) dan tabel karyawan admin (`AdminStaffPanel.tsx`).
- [x] **5. Verifikasi & Build**:
  - [x] Type check `npx tsc --noEmit` lulus 0 error.
  - [x] Production build `npm run build` berhasil.

---

## Phase 31: Resilient Team Announcement Engine & Live Cross-Component Sync

- [x] **1. Resilient Offline Storage & Event Dispatch (`src/lib/supabaseService.ts`)**:
  - [x] Implementasi local cache (`komar_announcements_cache`) dengan auto-fallback jika jaringan database lambat/offline atau tabel remote belum ada.
  - [x] Penanganan foreign key aman pada `created_by` (auto-fallback ke `null` jika ID admin non-standar/UUID tidak terdaftar) agar insert pengumuman tidak pernah gagal constraint violation.
  - [x] Emit event realtime `gappy_announcement_updated` pada aksi `create`, `toggle`, dan `delete` pengumuman.
- [x] **2. Realtime Listener & Global Broadcast Presentation (`src/App.tsx`)**:
  - [x] Pasang listener `gappy_announcement_updated` & `storage` di root `App.tsx` agar state banner langsung ter-update seketika tanpa perlu reload/re-login.
  - [x] Pindahkan rendering `<AnnouncementBanner />` ke container utama `<main>` agar banner pengumuman aktif terlihat di semua view (Pekerja, Supervisor, dan Admin Console).
- [x] **3. Live Preview & Admin Console UX (`src/components/admin/AdminAnnouncementPanel.tsx` & `AdminConsole.tsx`)**:
  - [x] Tambahkan seksi **Pratinjau Siaran Langsung (Live Preview)** di atas form Admin Announcement agar admin dapat melihat tampilan banner visual secara langsung sebelum dan sesudah disiarkan.
  - [x] Rancang ulang form dengan kontrol jadwal tayang yang user-friendly: opsi Waktu Mulai (*Langsung Tayang* vs *Jadwalkan*) & Waktu Selesai (*Seterusnya* vs *Batas Berakhir*).
  - [x] Tampilkan indikator status tayang komprehensif pada tabel arsip (*Sedang Tayang*, *Terjadwal*, *Kedaluwarsa*, *Nonaktif*).
  - [x] Hubungkan prop `workers={workers}` ke `<AdminNotificationPanel />` di `AdminConsole.tsx` agar fitur kirim notifikasi pekerja khusus berfungsi maksimal.
- [x] **4. Defensive UI Rendering & Start Window Support (`src/components/AnnouncementBanner.tsx` & `src/types/assessment.ts`)**:
  - [x] Perluas interface `Announcement` dengan `startsAt?: string;` dan filter aktif yang mempertimbangkan waktu mulai & batas berakhir.
  - [x] Tambahkan fallback safe check pada prioritas pengumuman agar terhindar dari runtime crash jika nilai priority undefined.
  - [x] Tambahkan blok migrasi SQL kolom `starts_at` di `supabase_setup.sql`.
- [x] **5. Verifikasi & Build**:
  - [x] Type check `npx tsc --noEmit` lulus 0 error.
  - [x] Production build `npm run build` berhasil.

---

## Phase 32: Enterprise OOP Confirmation System (SwalService) & Persistent Modal Backdrop Architecture

- [x] **1. Arsitektur Dialog Konfirmasi OOP Terpusat (`src/domain/SwalService.ts`)**:
  - [x] Installasi package `sweetalert2` (v11.26.25).
  - [x] Rancang class OOP `SwalService` berbasis metode statis (`SwalService.confirm()`, `SwalService.alert()`, `SwalService.success()`, `SwalService.warning()`, `SwalService.error()`).
  - [x] Terapkan styling visual Dark Mode terintegrasi (zinc-950 `#09090b`, border zinc-800, text zinc-100, custom button rose-600 & amber-600) selaras dengan tema sistem Gappy.
  - [x] Konfigurasi proteksi modal SweetAlert2: `allowOutsideClick: false` untuk menjamin dialog konfirmasi tidak tertutup secara tidak sengaja.
- [x] **2. Migrasi 100% Dialog Browser Native (`confirm` & `alert`) ke `SwalService`**:
  - [x] Migrasi `AdminNotificationPanel.tsx` (Validasi penerima & konfirmasi hapus seluruh notifikasi).
  - [x] Migrasi `Audit5sPanel.tsx` (Validasi input form audit/zona, idempotensi, & konfirmasi hapus zona gudang).
  - [x] Migrasi `BadgeManagementPanel.tsx` (Konfirmasi hapus badge worker).
  - [x] Migrasi `AdminRewardCatalogPanel.tsx` (Konfirmasi serah terima voucher & konfirmasi hapus item reward).
  - [x] Migrasi `DisciplinaryPanel.tsx` (Validasi input sanksi, proteksi idempotensi, & konfirmasi hapus arsip sanksi).
  - [x] Migrasi `MheLicensePanel.tsx` (Validasi input form SIO & konfirmasi hapus catatan SIO).
  - [x] Migrasi `OfflineQueueDrawer.tsx` (Konfirmasi pengosongan antrean sinkronisasi offline).
  - [x] Migrasi `PpeManagementPanel.tsx` (Validasi serah terima APD, master APD, tiket kerusakan, & konfirmasi hapus master APD).
  - [x] Migrasi `QuizManagementPanel.tsx` (Konfirmasi hapus soal kuis).
  - [x] Migrasi `RewardMarketplace.tsx` (Konfirmasi reset kuota bulanan, serah terima voucher, ekspor CSV, & hapus reward).
  - [x] Migrasi `SopManagementPanel.tsx` (Konfirmasi hapus modul SOP).
  - [x] Migrasi `SystemConfigPanel.tsx` (Konfirmasi reset konfigurasi tier & reset konfigurasi default sistem).
  - [x] Migrasi `CompetencyGapAnalysisModal.tsx` (Handling error penugasan training gap).
- [x] **3. Persistent Modal Backdrop (Anti-Outside Click Closure)**:
  - [x] Audit komprehensif seluruh modal di codebase untuk mematikan penutupan saat area backdrop diklik (backdrop statis).
  - [x] Hapus `onClick={onClose}` / `onClick={() => setOpen(false)}` dari elemen backdrop pada 16 modal dialog utama:
    1. `IncidentReportModal.tsx`
    2. `KaizenSubmissionModal.tsx`
    3. `CompetencyGapAnalysisModal.tsx`
    4. `OnboardingModal.tsx`
    5. `CompetencyAuditModal.tsx`
    6. `ChecklistDetailModal.tsx`
    7. `PreShiftChecklistModal.tsx`
    8. `ProfilePictureModal.tsx`
    9. `QrBadgeScannerModal.tsx`
    10. `SafetyPatrolModal.tsx`
    11. `SupervisorIncidentValidationModal.tsx`
    12. `WorkerCompetencyModal.tsx`
    13. `WorkerDigitalIdModal.tsx`
    14. `WorkerHistoryCenterModal.tsx`
    15. `WorkerIncidentHistory.tsx`
    16. `WorkerKaizenHistoryModal.tsx`
  - [x] Hapus juga penutupan backdrop luar pada modal form tambahan:
    - `BadgeManagementPanel.tsx` (Modal form tambah/edit badge)
    - `DisciplinaryPanel.tsx` (Modal verifikasi retraining SOP)
    - `MheLicensePanel.tsx` (Modal tambah/perpanjang SIO MHE)
    - `OfflineQueueDrawer.tsx` (Backdrop drawer sinkronisasi offline)
    - `PpeManagementPanel.tsx` (Modal 1: Serah Terima, Modal 2: Master APD, Modal 3: Lapor Rusak, Modal 4: Review Penggantian)
    - `QuizManagementPanel.tsx` (Modal form tambah/edit soal kuis)
    - `RewardMarketplace.tsx` (Modal 1: Klaim Reward, Modal 2: Tambah/Edit Item, Modal 3: Tambah Stok Reward)
- [x] **4. Verifikasi & Build**:
  - [x] Type check `npx tsc --noEmit` lulus 0 error.
  - [x] Production build `npm run build` berhasil.

