# Task Tracker — BIB Logistics Assessment Platform

> Last updated: 2026-08-27
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
  - Implementasi method resmi `ExecutivePDFReportGenerator.exportOfficialBapIncidentPDF` format standar BAP kecelakaan kerja PT DAM Indonesia.
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









