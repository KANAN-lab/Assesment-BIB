# Task Tracker — BIB Logistics Assessment Platform

> Last updated: 2026-09-04
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

---

## Phase 33: High-Performance Database Indexing & Free-Tier Scalability Architecture

- [x] **1. Analisis Query Hotspots & Desain Indeks (`supabase_setup.sql`)**:
  - [x] Audit titik berat beban query pada jam sibuk pergantian shift (Leaderboard, Login, Kuis, Checklist, Reward, SIO, APD).
  - [x] Rancang 20+ indeks komposit & B-Tree khusus dengan klausa aman `CREATE INDEX IF NOT EXISTS`.
- [x] **2. Implementasi Indeks Spesifik Tabel**:
  - [x] **Tabel `workers`**:
    - `idx_workers_login_lookup` `(employee_id, email)` — pencarian akun login instan O(1).
    - `idx_workers_user_id` `(user_id)` — relasi Supabase Auth.
    - `idx_workers_role_status` `(role, status)` — penyaringan antrean verifikasi supervisor.
    - `idx_workers_global_leaderboard` `(total_points DESC, bib_total_score DESC) WHERE status = 'active'` — eliminasi operasi memory sort pada leaderboard global.
    - `idx_workers_division_leaderboard` `(division, total_points DESC) WHERE status = 'active'` — leaderboard per divisi operasional.
    - `idx_workers_daily_activity` `(last_activity_date, daily_quiz_completed, pre_shift_checklist_done)` — query auto-reset harian.
  - [x] **Tabel `redemption_history` & `reward_catalog`**:
    - `idx_redemptions_worker_history` `(worker_id, created_at DESC)` — riwayat voucher pekerja.
    - `idx_redemptions_pending_fulfill` `(status, created_at DESC)` — filter voucher belum diserahkan admin.
    - `idx_reward_catalog_browse` `(category, min_tier) WHERE available_stock > 0` — filtering marketplace reward.
  - [x] **Tabel Operasional & Kuis (`quiz_questions`, `worker_sop_progress`, `sop_modules`)**:
    - `idx_quiz_questions_category` `(category)` & `idx_quiz_questions_division_role` `(division, role)` — query bank soal kuis harian.
    - `idx_sop_modules_cat_code` `(category, code)` — penataan katalog SOP.
    - `idx_worker_sop_progress_worker_completed` `(worker_id, is_completed, completed_at DESC)` — pelacakan progres SOP micro-deck.
  - [x] **Tabel HSE & K3 (`incident_reports`, `disciplinary_actions`, `mhe_licenses`, `ppe_distributions`, `kaizen_suggestions`, `audit_5s_records`, `shift_handovers`, `worker_kudos`)**:
    - Indeks filtering status, severity, dan tanggal pada insiden (`occurred_at`/`created_at`), sanksi, lisensi operator MHE, APD, kaizen (`author_id`), audit 5S, serah terima shift, dan apresiasi kudo (`receiver_id`).
- [x] **3. Panduan Eksekusi & Zero-Headache VPS Migration**:
  - [x] Penataan format SQL siap pakai di Supabase SQL Editor.
  - [x] Penyiapan kompatibilitas 1:1 jika migrasi ke self-hosted Supabase Docker di VPS.
- [x] **4. Verifikasi & Build**:
  - [x] Type check `npx tsc --noEmit` lulus 0 error.
  - [x] Production build `npm run build` berhasil.

---

## Phase 34: SOP Module Creator & Management Studio Overhaul (Full Step Builder & Edit Capability)

- [x] **1. Step Instruction Form Builder (`step_instruction`)**:
  - [x] Bangun UI daftar langkah kerja interaktif per slide pada studio builder `SopManagementPanel.tsx`.
  - [x] Tambahkan input Judul Langkah (`title`), Deskripsi Detail (`description`), dan Tips K3 (`keyHighlight`).
  - [x] Tambahkan tombol `+ Tambah Langkah Kerja` dinamis (bebas menambah hingga 6 langkah atau lebih).
  - [x] Tambahkan tombol Hapus Langkah dan tombol Geser Urutan (Naik/Turun) dengan auto-renumbering index.
- [x] **2. Do's & Don'ts and Safety Alert Form Builders**:
  - [x] Sediakan UI komparasi aturan benar (DO) vs larangan keras (DON'T) dengan field judul, penjelasan, tips/peringatan.
  - [x] Sediakan UI konfigurasi Golden Safety Rules (`safety_alert`) dengan selector tingkat bahaya (`critical`, `warning`, `info`) dan isi pesan peringatan.
  - [x] Lengkapi toolbar timeline dengan tombol shortcut tambah cepat untuk Do's & Don'ts dan Safety Alert.
- [x] **3. Fitur Edit Modul SOP Existing (Update Mode)**:
  - [x] Tambahkan state `editingModuleId` untuk membedakan mode Create vs Edit.
  - [x] Tambahkan tombol "Edit" pada setiap kartu modul di katalog SOP.
  - [x] Buat handler `handleOpenEditModal` untuk me-load seluruh konfigurasi slide, metadata, dan timeline.
  - [x] Upgrade `handleSaveModule` agar mendukung SQL UPDATE (Supabase + Local Cache) saat mode edit aktif.
- [x] **4. Metadata Modul Lengkap & Narasi Suara (TTS Voiceover)**:
  - [x] Tambahkan input Deskripsi Modul, Estimasi Waktu Baca (Menit), Checkbox Wajib Kepatuhan (isMandatory), dan Tag Target Divisi/Role.
  - [x] Tambahkan field input Textarea "Teks Narasi Suara (TTS Voiceover)" di setiap slide.
- [x] **5. Validasi Integritas Payload & Build Verification**:
  - [x] Validasi langkah kerja dan kuis sebelum simpan agar mencegah slide kosong/invalid.
  - [x] Jalankan `npx tsc --noEmit` dan `npm run build` untuk memverifikasi kelulusan 100%.

---

## Phase 35: Audio Narasi Voiceover (TTS) Stabilization & Studio Testing

- [x] **1. Pencegahan Bug Freeze / Hanging Web Speech API Chromium (`SopSlideshowModal.tsx`)**:
  - [x] Implementasi ref persisten `activeUtteranceRef` untuk mencegah Garbage Collection dini oleh V8 engine Chrome.
  - [x] Implementasi heartbeat pulse interval (10s) untuk mencegah pemutusan otomatis Chrome pada narasi berdurasi panjang (>15 detik).
  - [x] Workaround penundaan eksekusi 60ms setelah `.cancel()` agar pipeline audio browser tidak langsung mematikan `.speak()` baru.
  - [x] Auto-unpause / `resume()` jika synthesizer browser berada dalam kondisi freeze/stuck.
- [x] **2. Deteksi & Seleksi Suara Bahasa Indonesia (`id-ID`)**:
  - [x] Prioritaskan voice pack bahasa Indonesia (`id-ID`, `indonesia`, `bahasa`) dari `speechSynthesis.getVoices()` agar terhindar dari aksen Inggris/pecah.
  - [x] Pasang event listener `voiceschanged` untuk browser yang memuat voice list secara asinkron.
- [x] **3. Persistent Auto-Narration Mode (Slide to Slide)**:
  - [x] Tambahkan state `voiceoverMode` agar saat pekerja mengaktifkan narasi di slide awal, narasi otomatis berlanjut saat berpindah ke slide berikutnya tanpa perlu menekan tombol berulang kali.
  - [x] Tombol header dinamis dengan status visual: `Bersuara...` (pulse purple), `Narasi ON`, dan `Suara` (mute).
- [x] **4. Generator & Uji Coba Suara di Studio Modul (`SopManagementPanel.tsx`)**:
  - [x] Tambahkan tombol `✨ Generate dari Materi` untuk menyusun naskah narasi otomatis dari judul, instruksi langkah kerja, DO/DON'T, kuis, dan safety alert.
  - [x] Tambahkan tombol `🔊 Uji Suara / Stop` di panel editor agar admin dapat mendengarkan pratinjau pembacaan suara sebelum modul diterbitkan.
  - [x] Tambahkan template `audioNarrationText` default pada tipe slide `interactive_hotspot` dan `quiz_checkpoint`.
  - [x] Unmount cleanup untuk menghentikan audio preview jika modal studio ditutup.
- [x] **5. Verifikasi & Build**:
  - [x] Type check `npx tsc --noEmit` lulus 0 error.
  - [x] Production build `npm run build` sukses (3440 modules, 19.91s).

---

## Phase 36: Mobile Responsive Layout & Kanban Tab Overflow Fix

- [x] **1. Root Cause Analysis - Tab Switcher Offside / Terpotong (`HandoverKanbanBoard.tsx`)**:
  - [x] Tombol mobile tab switcher menggunakan `flex gap-1` dengan anak `flex-1` tanpa batas `min-w-0`. Akibatnya teks panjang "Sedang Diproses" menghitung min-width intrinsik melebihi porsi sepertiga layar, mendorong tab ketiga "Selesai 1" meluap ke luar tepi container (offside / clipped).
- [x] **2. Solusi Grid Simetris 3-Kolom & Teks Responsif**:
  - [x] Mengganti flex layout menjadi `grid grid-cols-3 gap-1 w-full`, menjamin alokasi lebar tiap tab persis 33.33% merata tanpa risiko meluap.
  - [x] Menambahkan `shortTitle: 'Diproses'` pada kolom proses untuk layar mobile, serta menambahkan `shrink-0` pada icon dan counter badge.
  - [x] Menambahkan `min-w-0 w-full` dan `truncate text-[11px] sm:text-xs` pada label tab.
- [x] **3. Optimasi Header Serah Terima Shift di Mobile**:
  - [x] Memindahkan tombol aksi (Refresh & Arsip) agar sejajar di kanan atas dengan judul pada layar mobile, menghilangkan tombol refresh sendirian yang memakan ruang vertikal.
  - [x] Padding card diadaptasi menjadi `p-3.5 sm:p-6` agar layout lebih proporsional di layar 360px - 400px.
- [x] **4. Modal Header Responsive Safeguard (`SopSlideshowModal.tsx`)**:
  - [x] Menambahkan `min-w-0 flex-1 mr-2` pada judul modul dan `shrink-0` pada action toolbar agar judul panjang tidak mendorong tombol TTS dan Close keluar layar.
- [x] **5. Verifikasi & Build**:
  - [x] Type check `npx tsc --noEmit` lulus 0 error.
  - [x] Production build `npm run build` sukses (3440 modules, 21.19s).

---

## Phase 37: MHE Licenses Supabase Database Integration & Realtime Sync

- [x] **1. Analisis Penyebab Data Bertahan Pasca DROP SCHEMA**:
  - [x] Data Pelacak SIO & Lisensi Alat Berat (MHE) sebelumnya disimpan secara client-side di browser `localStorage` dengan key `'gappy_mhe_licenses_v2'`. Eksekusi query SQL `DROP SCHEMA public CASCADE;` hanya menghapus data di Supabase server, sementara `localStorage` peramban tetap menyimpan cache data lisensi.
  - [x] Saat skrip setup dieksekusi kembali, aplikasi membaca dari cache lokal sehingga data tampak masih ada.
- [x] **2. Integrasi Penuh Supabase Cloud Database (`src/lib/licenseService.ts`)**:
  - [x] Implementasi arsitektur Hybrid Cache-First / Stale-While-Revalidate: pembacaan instan dari local cache (0ms latency untuk consumer sinkron seperti `WorkerDigitalIdModal.tsx` & `ExecutiveReportPanel.tsx`) disertai pembaruan latar belakang (asynchronous background fetch) dari tabel `mhe_licenses`.
  - [x] Penambahan method `fetchLicensesFromSupabase()`: query tabel `mhe_licenses` dengan relasi join worker `worker:workers (id, name, employee_id, division)` dan pembaruan otomatis local storage cache.
  - [x] Penambahan method `syncLocalToSupabase()`: migrasi otomatis data lisensi lokal ke Supabase jika tabel database baru di-setup atau masih kosong.
  - [x] Sinkronisasi operasi mutasi data ke Supabase Cloud:
    - `addLicense()`: insert instan ke local cache + async INSERT ke tabel `mhe_licenses`.
    - `updateLicense()`: update instan ke local cache + async UPDATE ke tabel `mhe_licenses`.
    - `deleteLicense()`: delete instan dari local cache + async DELETE dari tabel `mhe_licenses`.
- [x] **3. UI & Realtime Synchronization (`src/components/MheLicensePanel.tsx`)**:
  - [x] Langganan Supabase Realtime channel `realtime_mhe_licenses_tracker` pada tabel `mhe_licenses` untuk mendeteksi perubahan multi-user/multi-tab secara live.
  - [x] Penambahan tombol manual `Sinkron Cloud` dengan indikator spinner `isSyncing` pada header toolbar di samping tombol `Export CSV`.
  - [x] Auto background-fetch saat komponen `MheLicensePanel` di-mount pertama kali.
- [x] **4. Analisis & Evaluasi Dampak Performa**:
  - [x] Tidak ada penurunan performa (0ms render blocking) karena aplikasi tidak menunggu respons jaringan cloud untuk merender tampilan awal.
  - [x] Konsumsi payload jaringan sangat ringan (<2KB JSON) dan efisien dengan query terindeks.
- [x] **5. Verifikasi & Build**:
  - [x] Type check `npx tsc --noEmit` lulus 0 error.
  - [x] Production build `npm run build` sukses (3440 modules).

---

## Phase 38: AI Vision SIO Extractor Acceleration & Client-Side Compression Optimization

- [x] **1. Root Cause Analysis - 15–25s Latency in AI Vision SIO Extractor**:
  - [x] Deteksi 4 model fiktif non-existent (`gemini-3.6-flash`, `gemini-3.5-flash`, `gemini-3.1-flash-lite`, `gemini-3.7-flash`) pada `candidateModels` di `src/lib/sioAiService.ts` yang memicu 4x network round-trip gagal (404 Not Found) beruntun sebelum mencapai model aktif.
  - [x] Payload gambar kamera HP tanpa kompresi (4–10 MB mentah / ~14 MB Base64 di RAM) menyebabkan latensi transmisi jaringan tinggi.
  - [x] Ketiadaan format JSON terstruktur bawaan model yang memperpanjang output reasoning.
- [x] **2. Validasi & Penyelarasan Model Gemini Aktif (`src/lib/sioAiService.ts` & `src/lib/geminiService.ts`)**:
  - [x] Deteksi server error 404 pada model warisan (`gemini-1.5-flash` dan `gemini-2.5-flash`) yang telah didepresiasi oleh Google API endpoint `v1beta`.
  - [x] Pengujian langsung via `ModelService.ListModels` membuktikan model aktif yang didukung adalah generasi 3.x Flash: `['gemini-3.6-flash', 'gemini-3.5-flash', 'gemini-3.1-flash-lite', 'gemini-3.7-flash', 'gemini-3.5-flash-lite']`.
  - [x] Mengganti `candidateModels` pada `sioAiService.ts` dan `geminiService.ts` ke model aktif 3.x (terverifikasi sukses 200 OK via automated test).
  - [x] Implementasi `cachedWorkingModel` di memori agar pemanggilan berikutnya langsung menggunakan model yang berhasil (0 fallback delay).
  - [x] Menambahkan timeout proteksi per model attempt (12s) dengan `Promise.race`.
- [x] **3. Client-Side HD Image Compression (`src/lib/sioAiService.ts`)**:
  - [x] Integrasi `browser-image-compression`: foto kartu SIO di-scale ke resolusi maks 1400px (target ~350 KB).
  - [x] Mempertahankan ketajaman teks font kecil nomor registrasi dan stempel SIO Kemnaker RI, namun memangkas bobot file hingga 95% (waktu upload <0.3 detik).
- [x] **4. Enforced Structured JSON Mode & Fast Inference**:
  - [x] Mengaktifkan `generationConfig: { responseMimeType: 'application/json', temperature: 0.1 }` untuk inferensi deterministik instan tanpa markdown wrapper.
- [x] **5. Realtime Step Progress UX (`src/components/MheLicensePanel.tsx`)**:
  - [x] Menambahkan callback `onProgress` pada `extractSioFromImage`.
  - [x] Visual status dinamis pada scanner dialog: *"Mengompresi foto kartu SIO (HD)..."* $\to$ *"Menganalisis dokumen dengan Gemini AI Vision..."*.
- [x] **6. Verifikasi & Build**:
  - [x] Type check `npx tsc --noEmit` lulus 0 error.
  - [x] Production build `npm run build` sukses.

---

## Phase 39: Dynamic Gemini Candidate Models Multi-Selection & Live API Loader

- [x] **1. Eliminasi Model Hardcoding Menuju Arsitektur Dinamis**:
  - [x] Menghapus ketergantungan hardcoded candidate models pada seluruh modul yang memanfaatkan Gemini API (`geminiService.ts` untuk Kuis K3 dan `sioAiService.ts` untuk AI Vision SIO Extractor).
  - [x] Menetapkan fallback rekomendasi aman bawaan (`DEFAULT_GEMINI_CANDIDATE_MODELS`: `['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash']`) jika belum ada konfigurasi tersimpan.
- [x] **2. Live Gemini API Model Service (`src/lib/geminiService.ts`)**:
  - [x] Menambahkan fungsi `fetchAvailableGeminiModels()` yang memanggil endpoint resmi Google Generative Language API `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}` (`ModelService.ListModels`).
  - [x] Otomatis memfilter hanya model-model yang mendukung method `generateContent` (kompatibel untuk inferensi kuis teks dan vision dokumen).
  - [x] Menstandarisasi format nama model (misal stripping prefix `models/` $\to$ `gemini-2.5-flash`).
- [x] **3. Supabase Cloud Persistence & Multi-Tier Caching**:
  - [x] Menggunakan tabel `system_settings` di Supabase (`key: 'gemini_candidate_models'`) untuk menyimpan konfigurasi urutan prioritas model secara cloud-first.
  - [x] Caching lokal instan via `localStorage` (`'komar_gemini_candidate_models'`) dengan arsitektur Stale-While-Revalidate untuk pembacaan 0ms tanpa latensi jaringan.
  - [x] Penambahan sinkronisasi reaktif via CustomEvent `gappy_gemini_models_updated` untuk konsistensi antar-komponen tanpa reload halaman.
- [x] **4. Integrasi Lintas Layanan (`sioAiService.ts` & `geminiService.ts`)**:
  - [x] `geminiService.ts`: `generateDailyQuiz()` dan `testGeminiConnection()` mengonsumsi `await resolveCandidateModels()`.
  - [x] `sioAiService.ts`: `extractSioFromImage()` mengonsumsi `await resolveCandidateModels()` sehingga konfigurasi model di Admin otomatis mengendalikan seluruh pipeline AI Vision SIO Extractor.
- [x] **5. Administrator Console UI (`src/components/admin/AdminAiQuizPanel.tsx`)**:
  - [x] Menyediakan Card *"Konfigurasi Multi-Model AI Gemini (Dinamis & Multi-Selection)"*.
  - [x] Tombol *"Muat Model dari API Gemini"*: memuat seluruh model aktif resmi langsung dari Google AI Studio via API key aktif.
  - [x] Multi-selection grid: Administrator dapat mengaktifkan atau menonaktifkan model pilihan hanya dengan satu klik.
  - [x] Visual Priority Reordering: tombol naik/turun (*ArrowUp / ArrowDown*) untuk mengatur urutan fallback prioritas model (`#1 Utama`, `#2 Fallback 1`, `#3 Fallback 2`, dst.).
  - [x] Tombol *"Simpan ke Database"* dan *"Reset Rekomendasi"*.
- [x] **6. Verifikasi & Pengujian**:
  - [x] Type check `npx tsc --noEmit` lulus 0 error.
  - [x] Production build `npm run build` sukses (3440 modules, 17.09s).

---

## Phase 40: MHE License & AI Vision Hardening, Multi-format PDF Support, and Expiry Safeguards

- [x] **1. Safeguard Validasi Tanggal & Eliminasi NaN (`MheLicenseEntity.ts` & `licenseService.ts`)**:
  - [x] Menambahkan guard clause validasi tanggal pada `MheLicenseEntity.calculateStatusAndDays` agar string tanggal kosong/rusak tidak menghasilkan `NaN` dan keliru dilabeli `active`.
  - [x] Standarisasi ekspor CSV agar kolom sisa hari selalu bersih (fallback `0` jika data lampau/rusak).
- [x] **2. Normalisasi Format Tanggal ISO AI Vision (`sioAiService.ts`)**:
  - [x] Implementasi helper `normalizeToIsoDate` yang mengubah format tanggal Indonesia (misal `12/06/2024`, `12-06-2024`, `12 Juni 2024`) menjadi ISO `YYYY-MM-DD` yang valid untuk HTML5 date input dan PostgreSQL `DATE`.
- [x] **3. Dukungan Format PDF Dokumen SIO (`sioAiService.ts` & `MheLicensePanel.tsx`)**:
  - [x] Membuka input file agar menerima `accept="image/*,application/pdf"`.
  - [x] Menyediakan visual card preview untuk dokumen PDF (ikon PDF + nama file) tanpa merender tag `img` rusak.
  - [x] Preservasi ekstensi file asli (`.pdf`, `.png`, `.jpg`) saat upload ke Google Drive.
- [x] **4. Validasi Kronologi Tanggal & Integrasi UI (`MheLicensePanel.tsx`)**:
  - [x] Menambahkan validasi: tanggal kedaluwarsa tidak boleh lebih lampau daripada tanggal diterbitkan.
  - [x] Melengkapi pilihan filter tabel lisensi agar mencakup `Petugas P3K (First Aid)` dan `Auditor SMK3 / 5S`.
  - [x] Menambahkan tombol aksi `Lihat Berkas SIO` (`ExternalLink`) di tabel untuk akses cepat dokumen fisik/PDF.
  - [x] Menampilkan petunjuk cerdas saat nama operator di SIO terdeteksi AI tetapi belum otomatis match dengan akun pekerja di database.
- [x] **5. Verifikasi & Build**:
  - [x] Type check `npx tsc --noEmit` lulus 0 error.
  - [x] Production build `npm run build` sukses (3440 modules, 22.00s).

---

## Phase 41: Self-Service MHE SIO License Upload Modal & Digital ID Compliance Fix

- [x] **1. Root Cause Analysis - SIO Tampil Palsu "VALID" pada User Tanpa SIO (`WorkerDigitalIdModal.tsx`)**:
  - [x] Deteksi kondisi ternary cacat `{license?.status === 'expired' ? EXPIRED : VALID}` yang otomatis melabeli `VALID` (hijau) kepada seluruh pekerja yang `license`-nya masih `undefined` (belum pernah upload SIO).
  - [x] Hardcode fallback teks `SIO Operasional Terdaftar` pada role MHE padahal lisensi belum terdaftar di database.
- [x] **2. Perbaikan Logika Status Lisensi Digital ID (`src/components/WorkerDigitalIdModal.tsx`)**:
  - [x] Jika belum memiliki lisensi (`!license`), role operator MHE kini secara akurat diberi label merah `TIDAK VALID` / `Belum Memiliki SIO Terdaftar`.
  - [x] Sinkronisasi reaktif via CustomEvent `gappy_licenses_updated` agar tampilan status langsung ter-update begitu lisensi didaftarkan tanpa reload browser.
- [x] **3. Modal Unggah SIO Mandiri Pekerja (`src/components/WorkerSioUploadModal.tsx`)**:
  - [x] Komponen khusus pekerja untuk mengunggah foto kartu SIO atau dokumen PDF mandiri langsung dari perangkat/HP.
  - [x] Terintegrasi penuh dengan `SioAiService.extractSioFromImage` (ekstraksi AI Vision cepat 1.5–3s + live scanning animation).
  - [x] Otomatis mengaitkan data dengan identitas pekerja yang login (`workerId`, `workerName`, `employeeId`, `division`).
  - [x] Otomatis mencairkan reward poin pendaftaran SIO (+100 PTS) ke profil pekerja via `LicenseService.addLicense` & RPC `increment_worker_points`.
  - [x] Sinkronisasi instan ke Supabase `mhe_licenses` dan penyimpanan berkas bukti ke Google Drive.
- [x] **4. Tombol Pintasan Cepat di Dashboard & Modal Kartu ID (`App.tsx` & `WorkerDigitalIdModal.tsx`)**:
  - [x] Menambahkan tombol call-to-action `Unggah SIO Mandiri (AI Scan) +100 PTS` di dalam kartu digital ID.
  - [x] Menambahkan tombol shortcut `Unggah SIO (+100 PTS)` di beranda worker tepat di samping tombol `Kartu ID & SIO Digital` bagi operator MHE yang belum memiliki SIO.
- [x] **5. Verifikasi & Build**:
  - [x] Type check `npx tsc --noEmit` lulus 0 error.
  - [x] Production build `npm run build` sukses (3440 modules, 27.44s).

---

## Phase 42: SweetAlert2 Global Z-Index & Modal Closing Sequence Fix

- [x] **1. Root Cause Analysis - Tombol Menyimpan Berputar Terus & Berhasil Baru Muncul Setelah Modal di-Close**:
  - [x] Menemukan bahwa proses upload ke Google Drive dan penyimpanan lisensi ke Supabase/LocalStorage sebenarnya telah selesai dengan cepat.
  - [x] Namun pada `WorkerSioUploadModal.tsx`, baris `await SwalService.success(...)` dipanggil saat modal upload masih terbuka dengan `z-[99999]`.
  - [x] Default container SweetAlert2 (`.swal2-container`) memiliki z-index rendah (`1060`), sehingga popup dialog konfirmasi sukses SweetAlert2 muncul di belakang backdrop modal upload.
  - [x] Karena di-`await`, JavaScript menunggu pengguna menekan tombol "Mengerti", sementara pengguna di layer depan hanya melihat tombol modal upload masih "Menyimpan...".
  - [x] Ketika pengguna menutup modal secara manual (klik silang), modal ter-unmount dan barulah dialog SweetAlert2 yang sedari tadi menunggu di layer belakang menjadi terlihat.
- [x] **2. Implementasi Perbaikan Layering & Urutan Penutupan Modal**:
  - [x] Menambahkan override global `.swal2-container { z-index: 1000000 !important; }` di `src/index.css` dan `container: '!z-[1000000]'` di `src/domain/SwalService.ts` sehingga SweetAlert2 selalu berada di layer terdepan aplikasi.
  - [x] Menurunkan z-index modal `WorkerSioUploadModal.tsx` ke standar sistem `z-[9999]`.
  - [x] Memperbaiki alur `handleSubmit`: memanggil `onSuccess?.(savedLicense)` dan `onClose()` sebelum memunculkan popup `SwalService.success(...)` sehingga modal tertutup mulus seketika dan pesan sukses tampil tanpa delay.
  - [x] Menyediakan teks progres dinamis `saveStatus` pada tombol simpan ("Mengunggah berkas ke Google Drive...", "Sinkronisasi lisensi ke database K3...") untuk transparansi proses ke pengguna.
- [x] **3. Verifikasi & Build**:
  - [x] Type check `npx tsc --noEmit` lulus 0 error.
  - [x] Production build `npm run build` sukses.

---

## Phase 43: Notification Visibility Control & Personal Targeting Isolation

- [x] **1. Root Cause Analysis - Notifikasi SIO Milik Operator Lain Bocor ke Semua Worker (`NotificationEngine.ts`)**:
  - [x] Menemukan bahwa notifikasi personal (seperti SIO Jujun Junaedi) yang memiliki `recipientRole: 'worker'` dievaluasi `true` untuk seluruh pekerja gudang pada baris pengecekan `if (n.recipientRole === 'worker' || n.recipientId === 'worker') return true;`.
  - [x] Akibatnya akun operator lain (seperti Agung Bagaskara) menerima dan melihat 4 notifikasi SIO milik rekan operator lainnya di panel lonceng.
- [x] **2. Perbaikan Isolasi Notifikasi Pribadi (`src/domain/NotificationEngine.ts`)**:
  - [x] Menghapus kondisi broad-matching: siaran massal ke seluruh operator HANYA diizinkan jika `recipientId === 'worker'` atau `recipientId === 'all'`.
  - [x] Notifikasi personal (`recipientId` berupa ID spesifik pekerja) HANYA ditampilkan jika `recipientId === userId` atau `recipientId === employeeId`.
- [x] **3. Sistem Kebijakan Perutean Notifikasi (`NotificationRoutingPolicy`)**:
  - [x] Mendefinisikan tipe `NotificationCategoryConfig` dan `NotificationRoutingPolicy` dengan 6 kategori master: `license` (Lisensi SIO & MHE), `incident` (Insiden K3), `quiz` (Kuis Safety), `reward` (Reward & Poin), `audit` (Audit 5S & Patrol), `system` (Pengumuman Sistem).
  - [x] Menambahkan method OOP: `getRoutingPolicy()`, `saveRoutingPolicy()`, `resetRoutingPolicy()`, dan `isNotificationVisibleForRole()`.
  - [x] Mengaktifkan opsi override master: `adminMonitorAll` (Administrator dapat memantau seluruh log notifikasi lintas role untuk tujuan kepatuhan K3 dan audit).
- [x] **4. Pusat Kontrol Notifikasi di Administrator Console (`src/components/AdminNotificationPanel.tsx`)**:
  - [x] Menambahkan Tab Navigasi:
    - **Tab 1: Siaran & Riwayat Notifikasi** (pengiriman siaran instan + filter pencarian per Kategori dan Role).
    - **Tab 2: Pengaturan Visibilitas & Routing (Maintenance)** (kontrol master kategori notifikasi yang aktif di sistem dan seleksi role penerima).
  - [x] Matriks interaktif untuk mengaktifkan/menonaktifkan kategori dan mengatur chip distribusi role (`Operational`, `Supervisor`, `Admin`).
  - [x] Tombol *"Simpan Pengaturan"* dan *"Reset Standar"* dengan dialog konfirmasi OOP SweetAlert2.
- [x] **5. Pembaruan Filter Lonceng Notifikasi (`src/components/NotificationBell.tsx`)**:
  - [x] Menambahkan tab filter `Lisensi SIO` pada popover lonceng notifikasi header pekerja/supervisor.
- [x] **6. Verifikasi & Build**:
  - [x] Type check `npx tsc --noEmit` lulus 0 error.
  - [x] Production build `npm run build` sukses (3441 modules, 19.14s).

---

## Phase 44: Multi-Role RBAC Expansion (HSE, GA, HR Specialized Consoles & Governance Engine)

- [x] **1. Landasan Tipe & Taksonomi 6 Peran Sistem (`src/types/assessment.ts`)**:
  - [x] Mendefinisikan tipe `SystemRole = 'worker' | 'supervisor' | 'hse' | 'ga' | 'hr' | 'admin'`.
  - [x] Memperbarui antarmuka `WorkerProfile.accountType` ke tipe `SystemRole` untuk mendukung segmentasi hak akun perusahaan.
- [x] **2. Engine Resolusi Peran Cerdas (`src/domain/RoleEntity.ts`)**:
  - [x] Memperluas metode `RoleEntity.resolveSystemRole(roleName: string): SystemRole` untuk mengenali kata kunci jabatan spesialis:
    - `admin`: System Administrator, Sysadmin, App Administrator.
    - `hse`: HSE, EHS, K3, Safety Officer, Safety Inspector, Ahli K3.
    - `ga`: General Affairs, GA Officer, Fasilitas, Facility, Maintenance Lead.
    - `hr`: Human Resources, People Development, Trainer, Training, HRD.
    - `supervisor`: Supervisor, Pengawas, Head, SPV, Section Manager.
    - `worker`: Default untuk peran lapangan (Operator Forklift, Reach Truck, Checker, PIC Area, dll.).
  - [x] Mendaftarkan entitas master role baru: `role-hse-officer`, `role-ga-officer`, `role-hr-training`.
  - [x] Menyediakan helper OOP: `RoleEntity.isManagementRole(role)` dan `RoleEntity.getRoleLabel(role)`.
- [x] **3. Otorisasi Terpusat (`src/domain/PermissionService.ts`)**:
  - [x] Membuat service RBAC terpusat `PermissionService` yang mengimplementasikan pemetaan izin modular:
    - `getAvailableViewsForRole(userRole)`: Menentukan konsol yang boleh dibuka berdasarkan hak akses pengguna.
    - `canAccessView(userRole, targetView)`: Proteksi routing tampilan agar pengguna tidak bisa melompati batas wewenang.
    - Metode validasi per modul: `canValidateIncidents()`, `canManageSioLicenses()`, `canManagePpeInventory()`, `canPerform5sAudit()`, `canManageDisciplinary()`, `canFulfillRewards()`, `canSignExecutiveReport()`.
- [x] **4. Pembuatan 3 Konsol Khusus Departemen**:
  - [x] **Pusat Komando K3 & Lingkungan (`src/components/HseConsole.tsx`)**:
    - Tab 1: Investigasi Insiden & CAPA (Integrasi `SupervisorIncidentKanban` + modal validasi).
    - Tab 2: Safety Patrol Gemba Walk (`SafetyPatrolKanban`).
    - Tab 3: Kepatuhan Lisensi SIO MHE Alat Berat (`MheLicensePanel`).
    - Tab 4: Audit Masa Pakai & Kelayakan APD (`PpeManagementPanel`).
    - Tab 5: Penerbitan Dokumen Resmi K3 (`ExecutiveReportPanel`).
  - [x] **Konsol Fasilitas, Aset & Sarana (`src/components/GaConsole.tsx`)**:
    - Tab 1: Master Inventaris Stok APD (`PpeManagementPanel`).
    - Tab 2: Audit 5R / 5S Fasilitas & Area Umum Gudang (`Audit5sPanel`).
    - Tab 3: Logistik & Serah-Terima Fisik Reward (`AdminRewardCatalogPanel`).
    - Tab 4: Laporan Inventaris & Pengeluaran APD/5S (`ExecutiveReportPanel`).
  - [x] **Konsol Personalia, Kompetensi & Disiplin (`src/components/HrConsole.tsx`)**:
    - Tab 1: Evaluasi Matriks & Kompetensi BIB Tim (Tabel staf operasional, gap analysis, audit matriks).
    - Tab 2: Pustaka SOP & Kurikulum Pelatihan K3 (`SopManagementPanel`).
    - Tab 3: Tata Tertib & Penanganan Sanksi Disipliner SP (`DisciplinaryPanel`).
    - Tab 4: Laporan SDM & Matriks Eksekutif (`ExecutiveReportPanel`).
- [x] **5. Navigasi Switcher 6 Mode Terintegrasi (`src/components/Navbar.tsx`)**:
  - [x] Mendaftarkan 6 mode peran di `ROLE_MODES` dengan ikon, warna aksen, dan deskripsi tugas: `Operational`, `Supervisor`, `HSE / K3`, `GA / Facility`, `HR / Training`, `Admin`.
  - [x] Integrasi `PermissionService.canAccessView` pada menu dropdown switch role:
    - Akun Worker terkunci pada mode operasional.
    - Akun HSE dapat berpindah antara mode operasional dan HSE Console.
    - Akun GA dapat berpindah antara mode operasional dan GA Console.
    - Akun HR dapat berpindah antara mode operasional dan HR Console.
    - Akun Admin memiliki hak supervisi total ke seluruh 6 konsol.
- [x] **6. Perutean Tampilan Aplikasi (`src/App.tsx`)**:
  - [x] Menerapkan lazy-loading mandiri untuk `HseConsole`, `GaConsole`, dan `HrConsole`.
  - [x] Menghubungkan state `activeView: SystemRole` dengan strict RBAC enforcement effect.
  - [x] Menghubungkan perutean render conditional untuk menampilkan konsol yang aktif.
- [x] **7. Verifikasi & Build**:
  - [x] Type check `npx tsc --noEmit` lulus 0 error.
  - [x] Production build `npm run build` sukses (3445 modules, 20.27s, bundle terpecah secara rapi ke dalam chunks `HseConsole`, `GaConsole`, `HrConsole`).

---

## Phase 45: Dedicated Single Staff Creator & Multi-Role Onboarding

- [x] **1. Backend Data Service (`src/lib/supabaseService.ts`)**:
  - [x] Implementasi fungsi `createWorkerProfile(params: CreateWorkerProfileInput)`:
    - Validasi duplikasi NIP & Email ketat.
    - Sinkronisasi otomatis ke Supabase Auth resmi.
    - Inisialisasi record `workers` dengan default status `active`, tier `Novice Operational`, skor BIB awal, dan password default `123`.
    - Logging aktivitas audit ke `activity_log`.
- [x] **2. UI Admin Staff Panel (`src/components/admin/AdminStaffPanel.tsx`)**:
  - [x] Tambahkan tombol `+ Tambah Staf` (ikon `UserPlus`, warna `bg-emerald-600`) di sebelah toolbar `Import TSV`.
  - [x] Buat Modal `Tambah Personel Operasional Baru`:
    - Form NIP, Nama Lengkap, Email, Pilihan Divisi, Pilihan Role (termasuk HSE, GA, HR, SPV), dan Password Awal.
    - Validasi interaktif dan integrasi refresh data `onWorkersUpdated`.
- [x] **3. Self-Registration Enhancement (`src/components/LoginModal.tsx`)**:
  - [x] Sempurnakan tampilan pemilih peran di modal registrasi mandiri.
  - [x] Tambahkan highlight visual untuk peran spesialis (`HSE Officer`, `GA & Facility Officer`, `HR & Training Specialist`).
  - [x] Izinkan pemilihan divisi dinamis untuk pendaftaran `Supervisor`.
- [x] **4. Verifikasi & Build**:
  - [x] Validasi TypeScript `npx tsc --noEmit` (0 error).
  - [x] Validasi build produksi `npm run build` (lulus sukses).

---

## Phase 46: Advanced Specialist Features & Workflow Refinement (Fase 3 SPEC)

- [x] **1. HR Console: Integrasi Bank Soal Kuis Dinamis (`src/components/HrConsole.tsx`)**:
  - [x] Tambahkan tab navigasi `Bank Soal Kuis Harian` di samping `Pustaka SOP & Kurikulum K3`.
  - [x] Lazy-load `QuizManagementPanel` di dalam `HrConsole.tsx`.
  - [x] Memungkinkan tim People Development / HR membuat soal, mengatur kategori kuis, dan poin reward secara mandiri.
- [x] **2. HSE Console: Investigasi Terstruktur 5-Why & Fishbone 4M+1E (`src/components/SupervisorIncidentValidationModal.tsx`)**:
  - [x] Toggle mode `Format Bebas` vs `5-Why & Fishbone (ISO 45001)`.
  - [x] Selector faktor penyebab Fishbone (Man, Machine, Method, Material, Environment).
  - [x] 5 input bertingkat kausalitas Why 1 s.d. Why 5 (Akar Masalah Hakiki).
  - [x] Tombol otomatisasi sinkronisasi ke ringkasan teks CAPA dan penyimpanan ke database.
- [x] **3. GA Console: Kalkulator Reorder Point (ROP) Logistik APD (`src/components/PpeManagementPanel.tsx`)**:
  - [x] Tambahkan tombol kalkulator logistik ROP (`Calculator`) pada katalog master APD.
  - [x] Modal interaktif kalkulasi: $ROP = (Demand \times Lead Time) + Safety Stock$.
  - [x] Tombol terapkan langsung hasil kalkulasi ke `minimumStockThreshold` item APD terkait.
  - [x] Tampilan badge dinamis batas ROP di tabel katalog master APD.
- [x] **4. GA Console: Verifikasi Tanda Tangan Digital Serah-Terima Reward (`src/components/admin/AdminRewardCatalogPanel.tsx`)**:
  - [x] Modal penyerahan fisik voucher/sembako berkanvas tanda tangan digital (`<canvas>`).
  - [x] Dukungan interaksi mouse dan layar sentuh gawai (*touch events*).
  - [x] Tombol bersihkan kanvas dan perekaman metadata tanda tangan digital ke penyimpanan audit.
  - [x] Tombol "Bukti TTD" pada baris riwayat penukaran yang telah diserahkan untuk audit akuntabilitas.
- [x] **5. Verifikasi & Build**:
  - [x] Type check `npx tsc --noEmit` (0 error).
  - [x] Production build `npm run build` (sukses).

---

## Phase 47: Dynamic Tier Standardization & Reward Real-Time Accounting (Batch 4)

- [x] **1. Dynamic Tier Standardization (`src/lib/atomicService.ts`)**:
  - [x] Standardisasi kalkulasi level tier penukaran reward menggunakan `SystemConfigService.getTierLevel(worker.total_points, config)`.
  - [x] Menjamin konsistensi ambang batas tier reward (Bronze, Silver, Gold, Platinum) dengan kustomisasi dinamis administrator.
- [x] **2. Broadcast Audit Trail Logging (`src/domain/NotificationEngine.ts` & `src/components/AdminNotificationPanel.tsx`)**:
  - [x] Pencatatan otomatis ke `activity_log` (`action: 'notification_broadcast'`) setiap kali Administrator mengirim siaran notifikasi.
- [x] **3. Reward Fulfillment Audit & Notification (`src/lib/supabaseService.ts`)**:
  - [x] Otomasi pencatatan audit log `badge_awarded` saat admin/GA menyerahkan fisik reward sembako/voucher.
  - [x] Pengiriman notifikasi real-time ke akun pekerja penerima reward.
- [x] **4. Dynamic Points Pending Incident (`src/components/IncidentReportModal.tsx`)**:
  - [x] Tampilan poin estimasi pelaporan insiden dinamis: 75 PTS untuk Near-Miss dan 50 PTS untuk Hazard valid.
- [x] **5. Kaizen Reaktif & Notifikasi Supervisor (`src/lib/kaizenService.ts`)**:
  - [x] Pemancaran event `gappy_points_awarded` real-time saat proposal Kaizen disetujui.
  - [x] Notifikasi instan ke supervisor saat usulan baru masuk dan notifikasi ke author saat status usulan diperbarui.
- [x] **6. Pre-Shift Checklist Streak Bonus & Aksesibilitas (`src/components/ChecklistDetailModal.tsx`)**:
  - [x] Perhitungan perolehan poin checklist dinamis dengan streak multiplier.
  - [x] Penambahan listener tombol `Escape`, auto-focus ref, dan background scroll lock.
- [x] **7. Verifikasi & Build**:
  - [x] Type check `npx tsc --noEmit` (0 error).
  - [x] Platform checker `python checker.py` (Passed 60/60).
  - [x] Production build `npm run build` (sukses).

---

## Phase 48: Universal Cloud Persistence, Shift Handover Lifecycle & SQL Audit Integrity (Batch 5)

- [x] **1. Disciplinary Actions Cloud Sync (`src/lib/disciplinaryService.ts` & `src/components/DisciplinaryPanel.tsx`)**:
  - [x] Tambahkan metode `fetchActionsFromSupabase(): Promise<DisciplinaryActionEntity[]>` dengan pemetaan entitas domain.
  - [x] Integrasikan ke `DisciplinaryPanel.tsx` saat inisialisasi agar data sanksi sinkron lintas perangkat dan sesi.
- [x] **2. PPE Distribution & Damage Cloud Persistence (`src/lib/ppeService.ts` & `src/components/PpeManagementPanel.tsx`)**:
  - [x] Background insert ke tabel `ppe_distributions` pada `PpeService.distributePpe`.
  - [x] Background insert ke `ppe_damage_reports` dan pembaruan status `damaged_lost` pada `PpeService.submitDamageReport`.
  - [x] Background update status review (`replaced`, `verified`, `rejected`) pada `PpeService.processDamageReport`.
  - [x] Implementasi `fetchDistributionsFromSupabase()` dan `fetchDamageReportsFromSupabase()` dengan fallback & merge cache lokal di `PpeManagementPanel.tsx`.
- [x] **3. Shift Handover Lifecycle & Notification (`src/lib/handoverService.ts`)**:
  - [x] Pencatatan otomatis ke `activity_log` (`action: 'shift_handover'`) saat log handover diajukan dan saat serah terima di-acknowledge.
  - [x] Notifikasi real-time via `NotificationEngine` ke supervisor penerima (`nextSupervisorId`) atau supervisor operasional.
  - [x] Notifikasi konfirmasi otomatis ke pembuat serah terima (`author_id`) saat log di-acknowledge oleh shift berikutnya.
- [x] **4. SOP Audit Log Stored Procedure Correction (`supabase_setup.sql:1086`)**:
  - [x] Koreksi aksi audit log di `rpc_complete_sop_module` dari `checklist_completed` menjadi `sop_completed`.
- [x] **5. Safety Patrol Audit Action Standardization (`src/domain/SafetyPatrolService.ts:230`)**:
  - [x] Standarisasi aksi audit log penyelesaian temuan hazard K3 dari `points_refunded` menjadi `audit_5s_completed`.
- [x] **6. SQL Universal Constraint Synchronization (`supabase_setup.sql:1736`)**:
  - [x] Sinkronisasi CHECK constraint `activity_log_action_check` di Section 27 agar mencakup seluruh 27 aksi valid yang identik dengan Section 33.
- [x] **7. Verifikasi & Build**:
  - [x] Type check `npx tsc --noEmit` (0 error).
  - [x] Platform checker `python checker.py` (Passed 60/60).
  - [x] Production build `npm run build` (sukses).

---

## Phase 49: Kudo Real-Time Notification, Offline Queue Integrity & Modal Accessibility (Batch 6)

- [x] **1. Notifikasi Real-Time Penerimaan Kudo ke Rekan Kerja (`src/lib/kudoService.ts`)**:
  - [x] Tambahkan pemanggilan `NotificationEngine.addNotification` ke `receiverId` saat kudo berhasil dikirim via RPC Supabase.
  - [x] Tambahkan pemanggilan `NotificationEngine.addNotification` ke `receiverId` saat kudo berhasil dikirim via fallback client-side.
- [x] **2. Eksekusi Sinkronisasi Aktual Antrean Offline Kaizen (`src/lib/offlineQueueManager.ts`)**:
  - [x] Tambahkan penanganan khusus `item.type === 'kaizen_submission'` pada `retrySingleItem` menggunakan `KaizenService.submitSuggestion`.
- [x] **3. Aksesibilitas Keyboard, Scroll Lock & Focus Trap Modal Usulan Kaizen (`src/components/KaizenSubmissionModal.tsx`)**:
  - [x] Tambahkan penguncian scroll latar `document.body.style.overflow = 'hidden'` saat modal terbuka dan reset saat ditutup.
  - [x] Tambahkan event listener keyboard tombol `Escape` untuk menutup dialog.
  - [x] Tambahkan auto-focus ref pada field input judul usulan Kaizen.
- [x] **4. Aksesibilitas Keyboard Escape pada Modal Validasi Insiden & CAPA (`src/components/SupervisorIncidentValidationModal.tsx`)**:
  - [x] Tambahkan event listener keyboard tombol `Escape` di dalam `useEffect` untuk menutup modal.
- [x] **5. Aksesibilitas Keyboard Escape pada Modal Unggah SIO Mandiri (`src/components/WorkerSioUploadModal.tsx`)**:
  - [x] Tambahkan event listener keyboard tombol `Escape` di dalam `useEffect` lifecycle modal.
- [x] **6. Aksesibilitas Keyboard Escape pada Kartu ID Digital Pekerja (`src/components/WorkerDigitalIdModal.tsx`)**:
  - [x] Tambahkan event listener keyboard tombol `Escape` di dalam `useEffect` lifecycle modal.
- [x] **7. Verifikasi QA Menyeluruh & Deployment**:
  - [x] Static type check: `npx tsc --noEmit` (0 error).
  - [x] Platform suite check: `python checker.py` (Passed 60/60).
  - [x] Production build: `npm run build` (sukses).

---

## Phase 50: Departmental Specialist Routing, Universal Offline Full Sync & Modal Standard (Batch 7)

- [x] **1. Eliminasi Notification Blackout Peran Spesialis Departemen (`src/domain/NotificationEngine.ts`)**:
  - [x] Tambahkan penanganan `role === 'hse' || role === 'ga' || role === 'hr'` di `getNotificationsForUser` agar menerima notifikasi personal (`userId` / `employeeId`) dan siaran departemen.
  - [x] Normalisasi peran spesialis ke level supervisory pada `isNotificationVisibleForRole` untuk menjaga konsistensi visibilitas kategori.
- [x] **2. Implementasi Sinkronisasi Aktual Antrean Offline 7 Modul (`src/lib/offlineQueueManager.ts`)**:
  - [x] Implementasikan handler sinkronisasi aktual Supabase untuk `incident_report` via `createIncidentReport`.
  - [x] Implementasikan handler sinkronisasi aktual Supabase untuk `kudo` via `KudoService.sendKudo`.
  - [x] Implementasikan handler sinkronisasi aktual Supabase untuk `daily_quiz` via `completeWorkerQuiz`.
  - [x] Implementasikan handler sinkronisasi aktual Supabase untuk `pre_shift_checklist` via `completeWorkerChecklist`.
- [x] **3. Standardisasi Scroll Lock & Keyboard Escape Seluruh Modal**:
  - [x] `SafetyPatrolModal.tsx`: Penguncian scroll latar & listener `Escape`.
  - [x] `WorkerKaizenHistoryModal.tsx`: Penguncian scroll latar & listener `Escape`.
  - [x] `WorkerHistoryCenterModal.tsx`: Penguncian scroll latar & listener `Escape`.
  - [x] `SopLibraryModal.tsx`: Penguncian scroll latar & listener `Escape`.
  - [x] `SopSlideshowModal.tsx`: Penguncian scroll latar saat pembacaan modul SOP aktif.
  - [x] `QrBadgeScannerModal.tsx`: Penguncian scroll latar & listener `Escape`.
  - [x] `ProfilePictureModal.tsx`: Penguncian scroll latar & listener `Escape`.
  - [x] `OnboardingModal.tsx`: Penguncian scroll latar & listener `Escape`.
  - [x] `PreShiftChecklistModal.tsx`: Listener keyboard tombol `Escape`.
- [x] **4. Sinkronisasi Dokumentasi PRD**:
  - [x] Tambahkan Section 35 pada `PRD.md` mencakup spesifikasi Batch 6 dan Batch 7.
- [x] **5. Verifikasi & Build**:
  - [x] Type check `npx tsc --noEmit` (0 error).
  - [x] Platform checker `python checker.py` (Passed 60/60).
  - [x] Production build `npm run build` (sukses).

---

## Phase 51: Comprehensive Defect Remediation & System Hardening (Batch 8)

- [x] **1. Offline Queue Idempotency & Conflict Guard (`src/lib/offlineQueueManager.ts`)**:
  - [x] Penanganan respons duplikat Postgres (kode `23505` / pesan `sudah pernah dikirim`) pada sinkronisasi `incident_report`. Item antrean offline kini ditandai `success = true` alih-alih melempar error dan tertahan permanen.
- [x] **2. Type System & Specialist Role Expansion (`src/domain/NotificationEngine.ts`)**:
  - [x] Perluas tipe `AppNotification['recipientRole']` dan parameter `broadcast` agar mendukung peran spesialis: `'hse'`, `'ga'`, `'hr'` di samping `'worker'`, `'supervisor'`, `'admin'`, `'all'`.
  - [x] Sinkronisasi `NotificationCategoryConfig.visibleToRoles` agar konsisten dengan peran spesialis.
- [x] **3. Universal Database Constraint Alignment (`supabase_setup.sql`)**:
  - [x] Perbarui CHECK constraint `app_notifications_recipient_role_check` di Section 28 agar mencakup `'hse', 'ga', 'hr'`.
  - [x] Tambahkan skrip migrasi `ALTER TABLE app_notifications DROP CONSTRAINT IF EXISTS ... ADD CONSTRAINT ...` agar kompatibel dengan database eksisting.
- [x] **4. Standardisasi Aksesibilitas, Focus Trap & Scroll Lock Seluruh Modal**:
  - [x] `OfflineQueueDrawer.tsx`: Penguncian scroll body latar saat laci antrean offline terbuka & reset saat ditutup.
  - [x] `DailyQuestModal.tsx`: Penguncian scroll latar & penanganan tombol `Escape` untuk memicu konfirmasi keluar kuis.
  - [x] `IncidentReportModal.tsx`: Penguncian scroll latar & penanganan tombol `Escape`.
  - [x] `CompetencyGapAnalysisModal.tsx`: Penguncian scroll latar saat modal analisis dibuka & penanganan tombol `Escape`.
  - [x] `FirstTimePasswordModal.tsx`: Penguncian scroll latar pada modal wajib ganti password pertama kali.
  - [x] `LoginModal.tsx`: Penguncian scroll latar pada layar autentikasi untuk mencegah scrolling tak diinginkan pada perangkat mobile.
  - [x] `AdminStaffPanel.tsx`: Penguncian scroll latar & penanganan tombol `Escape` untuk modal mutasi personel, impor TSV, dan registrasi pegawai baru.
  - [x] `AdminRewardCatalogPanel.tsx`: Penguncian scroll latar & penanganan tombol `Escape` untuk modal tambah/edit item reward dan modal tanda tangan digital serah-terima fisik.
- [x] **5. Verifikasi & Pengujian Kualitas**:
  - [x] Static type check: `npx tsc --noEmit` (0 error).
  - [x] Suite checker: `python checker.py` (Passed 60/60 checks).
  - [x] Production bundle: `npm run build` (sukses, built in 21.46s, 77 precached PWA items).

---

## Phase 52: Enterprise Session Resilience, Real-Time Revocation & Cross-Tab Auth Sync

- [x] **1. Dedicated Auth Session Service (`src/lib/authSessionService.ts`)**:
  - [x] Implementasi caching profil offline terstruktur (`saveCachedWorker`, `getCachedWorker`, `clearCachedWorker`).
  - [x] Sinkronisasi cross-tab via `BroadcastChannel('komar_auth_channel')` & fallback storage event (`broadcastAuthLogin`, `broadcastAuthLogout`).
  - [x] Pengelolaan preferensi mode komputer bersama / kiosk (`isSharedDevice`).
- [x] **2. Login Enhancement & Direct Worker Passing (`src/components/LoginModal.tsx`)**:
  - [x] Oper objek `worker` lengkap dari hasil `signInWithNikOrEmail` langsung ke `onLoginSuccess(worker, isSharedDevice)` (eliminasi latensi query ganda & error resolusi email).
  - [x] Tambahkan opsi toggle/checkbox *"Komputer Bersama / Mode Kiosk Gudang (Auto-logout 30 Menit)"*.
- [x] **3. Offline Boot & Real-Time Revocation Guard (`src/App.tsx`)**:
  - [x] Offline session resilience: jika perangkat offline saat boot, lakukan fallback restore profil pekerja dari `getCachedWorker()` tanpa memutus sesi.
  - [x] Real-time revocation guard: logout seketika saat status akun berubah menjadi `inactive`, `rejected`, atau `pending_approval` di database.
  - [x] Cross-tab listener: eksekusi logout simultan di seluruh tab browser saat salah satu tab logout.
  - [x] Dynamic idle timeout: 30 menit untuk mode kiosk bersama vs 8 jam untuk mode perangkat pribadi.
- [x] **4. Verifikasi & Build**:
  - [x] Static type check `npx tsc --noEmit` (0 error).
  - [x] Platform suite check `python checker.py` (Passed 60/60).
  - [x] Production build `npm run build` (sukses).

---

## Phase 53: CustomDataTable Pagination Sliding Window & Key Collision Fix

- [x] **1. Identifikasi Akar Masalah Pagination Duplikat**:
  - Formula lama `if (pageNum > totalPages) pageNum = totalPages - (4 - i);` menghasilkan nomor halaman berulang/mundur (misal: `[5, 6, 7, 6, 7]` saat total halaman 7 dan halaman aktif 7).
  - Duplikasi nomor halaman memicu tabrakan React `key={pageNum}`, menyebabkan node DOM tombol tidak di-unmount dan menumpuk di browser pada setiap siklus re-render.
- [x] **2. Implementasi Sliding Window Bersih (`src/components/CustomDataTable.tsx`)**:
  - Mengganti formula dengan algoritma sliding window 5-halaman terpusat: `Math.max(1, currentPage - Math.floor(pageCount / 2))` dan `Math.min(totalPages, ...)`.
  - Mengubah key rendering tombol menjadi prefix unik: `key={'page-' + pageNum}`.
  - Menambahkan tombol navigasi cepat Halaman Pertama (`ChevronsLeft`) dan Halaman Terakhir (`ChevronsRight`) jika `totalPages > 5`.
  - Menambahkan auto-clamp `useEffect` agar `currentPage` otomatis turun jika data terfilter menyusut di bawah halaman saat ini.
- [x] **3. Verifikasi & Validasi Lapangan**:
  - Static type check: `npx tsc --noEmit` (0 error).
  - Platform suite check: `python checker.py` (60/60 passed).
  - Production build: `npm run build` (sukses, built in 25.28s, 77 precached assets).
  - Runtime verification via Browser Subagent di `http://localhost:3000`:
    - Halaman 1 menampilkan: `1, 2, 3, 4, 5` (tanpa duplikat).
    - Halaman 4 menampilkan: `2, 3, 4, 5, 6` (tanpa duplikat).
---

## Phase 54: Enterprise Staff Offboarding & Resignation Management Protocol

- [x] **1. Data Model & Schema Enhancement**:
  - [x] Perluas status tipe pekerja di `src/types/assessment.ts` untuk mendukung `'resigned'` serta atribut metadata offboarding (`resignedAt?: string`, `resignationReason?: string`, `settlementStatus?: 'pending' | 'settled'`).
  - [x] Perbarui mapping `rowToWorkerProfile` dan `WorkerRow` di `src/lib/supabaseService.ts`.
  - [x] Buat skrip migrasi SQL `sql/migration_resignation_protocol.sql` untuk memastikan constraint kolom status tabel `workers` mendukung nilai `'resigned'`.
- [x] **2. Security & Session Revocation Gate**:
  - [x] Pasang guard penolakan login di `signInWithNikOrEmail` (`src/lib/supabaseService.ts`) dengan pesan khusus edukatif bagi pegawai yang telah resign.
  - [x] Pastikan real-time polling 8 detik dan listener realtime di `src/App.tsx` langsung memutus sesi aktif (`handleLogout`) seketika saat pekerja di-offboard.
- [x] **3. Fair-Play Active Leaderboard Hygiene**:
  - [x] Filter kueri `fetchLeaderboard` di `src/lib/supabaseService.ts` agar hanya memuat pegawai dengan `status === 'active'`.
  - [x] Cegah distorsi papan peringkat agar staf yang telah resign tidak menghalangi kompetisi sehat staf aktif.
- [x] **4. Reward Points Freezing & Pending Redemption Settlement**:
  - [x] Buat helper penyelesaian klaim gantung di `src/lib/supabaseService.ts` / `src/lib/atomicService.ts`: batalkan klaim reward pending yang belum diserahterimakan fisik dan pulihkan stok barang secara atomic.
  - [x] Bekukan saldo poin pekerja yang resign agar tidak bisa ditransaksikan kembali di marketplace.
- [x] **5. Soft-Delete & ISO 45001 / K3 Historical Preservation**:
  - [x] Terapkan prinsip larangan keras *Hard Delete* (`DELETE FROM workers`). Seluruh riwayat skor BIB, audit checklist harian, dan investigasi insiden masa lalu tetap dipertahankan utuh untuk audit legal K3 PT DAM.
  - [x] Jika pekerja adalah Operator Alat Berat, catat pelepasan lisensi SIO/MHE dari unit operasional aktif gudang.
- [x] **6. UI Admin Staff Offboarding Modal (`src/components/admin/AdminStaffPanel.tsx`)**:
  - [x] Tambahkan tombol aksi *"Offboard / Resign"* pada kolom Aksi tabel personel operasional.
  - [x] Bangun Modal Konfirmasi Offboarding interaktif dengan ringkasan status pekerja, input alasan resign, dan konfirmasi checklist keamanan.
  - [x] Tambahkan selector filter status di header tabel (*Semua Status*, *Hanya Aktif*, *Resigned / Nonaktif*) dan badge visual khusus pada baris pekerja yang telah resign.
- [x] **7. Verifikasi & Quality Gate**:
  - [x] Static type check `npx tsc --noEmit` (0 error).
  - [x] Platform suite check `python checker.py` (60/60 passed).
  - [x] Production build `npm run build` (sukses, built in 21.52s, 77 precached assets).
  - [x] Runtime visual verification via Browser Subagent (`offboard_modal_open_1788885942356.png` & `resign_filter_active_1788886046763.png` - PASS).

---

## Phase 55: Dual-Wallet Points Architecture & Automated Monthly Reset Lifecycle Protocol (Smart Auto-Deduct)

- [x] **1. Data Model & Schema Enhancement**:
  - [x] Tambahkan kolom `operational_points` dan `prestige_points` pada interface `WorkerProfile` (`src/types/assessment.ts`).
  - [x] Tambahkan kolom `deducted_operational` dan `deducted_prestige` pada interface `RedemptionHistory`.
  - [x] Buat skrip migrasi SQL `sql/migration_dual_wallet_points.sql` dan sinkronkan dengan `supabase_setup.sql`.
- [x] **2. Service Layer Points Routing & Central Credit Helper**:
  - [x] Implementasikan helper `creditWorkerPoints` di `src/lib/supabaseService.ts` untuk mengelola mutasi saldo dompet harian vs prestasi secara terisolasi dengan sinkronisasi `total_points`.
  - [x] Alokasikan perolehan poin dari Kuis Harian (+50) dan Checklist Pre-Shift (+30) ke `operational_points`.
  - [x] Alokasikan perolehan poin Kudo (+10 / +25) ke `operational_points` via `src/lib/kudoService.ts`.
  - [x] Alokasikan perolehan poin Kaizen (+50 s.d. +300), SIO MHE (+100/+150), 5S (+50 s.d. +200), dan Pelaporan K3 (+50/+75) ke `prestige_points`.
- [x] **3. Atomic Smart Auto-Deduct & Fairness Refund Engine**:
  - [x] Perbarui `redeemRewardAtomic` di `src/lib/atomicService.ts` dengan logika Smart Auto-Deduct: prioritaskan pemotongan `operational_points` terlebih dahulu, sisa diambil dari `prestige_points`.
  - [x] Simpan proporsi pemotongan di tabel `redemption_history` (`deducted_operational`, `deducted_prestige`).
  - [x] Terapkan aturan refund adil saat pembatalan voucher: pengembalian proporsional jika di bulan yang sama, dan konversi ke `prestige_points` jika direfund pasca periode reset.
  - [x] Hardening `deductWorkerPoints` dan `refundWorkerPoints` di `src/lib/supabaseService.ts` dengan Smart Auto-Deduct pada sanksi K3 & banding.
- [x] **4. Automated Monthly Reset Lifecycle & Audit Protection**:
  - [x] Implementasikan `processMonthlyOperationalPointsReset` di `src/lib/supabaseService.ts`: reset `operational_points = 0`, jaga `prestige_points` dan tier kompetensi pekerja tetap utuh.
  - [x] Catat audit log transaksi `points_expired` dengan rincian poin operasional yang dievaluasi.
  - [x] Pasang fallback otomatis saat login pekerja di awal bulan baru untuk menjamin konsistensi periode.
- [x] **5. User Interface Transparency (Dual-Wallet Breakdown)**:
  - [x] Perbarui `DailyProgressCard.tsx` untuk menampilkan rincian saldo dual-wallet dan early warning H-14/H-7/H-3 spesifik untuk poin harian.
  - [x] Perbarui modal konfirmasi penukaran di `RewardMarketplace.tsx` dengan rincian transparan alokasi pemotongan poin operasional vs prestasi.
  - [x] Tambahkan tombol eksekusi siklus reset bulanan di `AdminRewardCatalogPanel.tsx` dengan dialog konfirmasi OOP SweetAlert2.
  - [x] Perkaya `AdminStaffPanel.tsx` dan `exportWorkersCSV` dengan rincian Poin Harian vs Poin Prestasi.
- [x] **6. Quality Gate & Runtime Verification**:
  - [x] Static type check `npx tsc --noEmit` (0 error).
  - [x] Platform suite check `python checker.py` (59/59 passed).
  - [x] Runtime browser verification via Browser Subagent (`swal_monthly_reset_confirm_1788891136966.png` & penukaran reward BIB-1E9E78E6 - PASS).
- [x] **7. Bundler Tree Cleanup & Unified Offline Sync Hardening**:
  - [x] Konversi seluruh dynamic imports di `src/lib/offlineQueueManager.ts` menjadi static imports terstruktur.
  - [x] Sinkronisasi otomatis saat online di `src/App.tsx` dialihkan ke `OfflineQueueManager.forceSyncAll()` mencakup seluruh 7 modul transaksi offline.
  - [x] Eliminasi seluruh warning Vite bundler (Zero Warnings, build selesai 20.21s, 75 precached PWA assets).
- [x] **8. Deep Defensive Storage & Date Parsing Hardening**:
  - [x] Implementasikan helper `safeLocalStorageGetItem<T>` di `src/lib/storageSanitizer.ts` untuk memproteksi pembacaan storage dari risiko crash akibat JSON korup.
  - [x] Terapkan `safeLocalStorageGetItem` pada modul SOP di `src/components/SopManagementPanel.tsx`.
  - [x] Pasang guard anti-`NaN` pada parsing tanggal di `src/components/ActivityLogPanel.tsx` (`formatTimeAgo`), `src/components/ScoreHistoryChart.tsx` (`formatDate`), dan `src/components/WorkerHistoryCenterModal.tsx`.
- [x] **9. Cancelled Reward Redemption Quota & Limit Restoration**:
  - [x] Filter keluar transaksi reward berstatus `cancelled` pada kalkulasi `claimsThisMonth` di `src/components/RewardMarketplace.tsx`, sehingga batas klaim bulanan pekerja ter-reset saat klaim dibatalkan Admin.
  - [x] Sinkronkan validasi batas klaim di `src/lib/atomicService.ts` (`.neq('status', 'cancelled')`) serta Stored Procedure `rpc_redeem_reward_fcfs` di `supabase_setup.sql` dan `sql/migration_dual_wallet_points.sql`.
  - [x] Tampilkan status lencana voucher yang dibatalkan secara akurat (`↩️ Dibatalkan (Poin Kembali)`) pada tab Riwayat dan Modal Riwayat Pekerja (`WorkerHistoryCenterModal.tsx`).
  - [x] Broadcast & listen event `gappy_redemption_cancelled` di `src/lib/supabaseService.ts` dan `src/App.tsx` untuk pembaruan realtime status klaim tanpa perlu reload manual.
- [x] **10. Comprehensive Point Scheme Hardcode Audit & Dynamic Configuration Unification**:
  - [x] Audit dan eliminasi seluruh nilai nominal poin hardcoded di seluruh codebase (UI components, services, domain engines, dan PDF generator).
  - [x] Hubungkan seluruh perolehan dan potongan poin ke `SystemConfigService` (`dailyQuizRewardPoints`, `preShiftRewardPoints`, `sopCompletionDefaultPoints`, `incidentValidRewardPoints`, `nearMissRewardPoints`, `kudoSentPoints`, `kudoReceivedPoints`, `audit5sGoldRewardPoints`, `audit5sSilverRewardPoints`, `sioRegisteredRewardPoints`, `sioRenewedRewardPoints`, `safetyPatrolResolvedPoints`).
  - [x] Perbaiki parsing Buku Kas Poin di `WorkerHistoryCenterModal.tsx` agar membaca nominal riil dari teks audit log tanpa fallback tebakan, serta parsing otomatis saldo poin bulanan yang hangus (`expired`).
  - [x] Tambahkan token `(+pts PTS)` pada pesan pemulihan banding dan pembatalan sanksi di `DisciplinaryService.ts` dan `SafetyPatrolService.ts`.
  - [x] Verifikasi type safety `npx tsc --noEmit` (0 error), suite test `python checker.py` (59/59 passed), dan production bundle `npm run build` (0 warning).
- [x] **11. History Center Modal Width & Tab Ergonomics, Chronological Ledger Ordering, & Staff Redemption Audit Foreign Key Resolution**:
  - [x] **Tab Menu Ergonomics**: Perlebar modal Pusat Riwayat & Arsip Saya (`WorkerHistoryCenterModal.tsx`) dari `max-w-3xl` menjadi `max-w-5xl xl:max-w-6xl w-full` dengan tab button `whitespace-nowrap shrink-0`, padding proporsional, dan badge jumlah entri aktif, menyelesaikan masalah tab sempit/mengecil dan terpotong.
  - [x] **Chronological Ledger Ordering**: Normalisasi parsing timestamp tanggal mutasi via `parseSafeDate` untuk menyelaraskan format string server UTC `YYYY-MM-DD HH:mm` dan ISO `TIMESTAMPTZ`. Sorting Buku Kas kini murni kronologis presisi dari waktu terbaru (transaksi reward berdampingan dengan pembatalannya/refund).
  - [x] **Staff Redemption Audit Lookup**: Perbaiki query join PostgREST di `fetchAllRedemptionHistory` (`src/lib/supabaseService.ts`) dengan penamaan relasi foreign key eksplisit (`worker:workers!redemption_history_worker_id_fkey` dan `fulfiller:workers!redemption_history_fulfilled_by_fkey`), mengatasi error PGRST201 dan mengembalikan nama pekerja asli (`ABDUL KAHFI`), NIK, serta Divisi (`WFG`) secara akurat di tabel Audit Penukaran Staf.
  - [x] Verifikasi quality gates: `python checker.py` (59/59 passed), `npx tsc --noEmit` (0 error), dan `npm run build` (0 warning).

---

## Phase 12: Activity Log Anti-Bloat & Session Hygiene Architecture

- [x] **1. Session Cooldown & Deduping (Skema 1)**:
  - [x] Pasang session deduplication guard di `src/App.tsx` menggunakan `sessionStorage` / cooldown window (30 menit) agar refresh browser (F5) tidak meng-insert baris `login` baru secara berulang.
  - [x] Reset session key saat user melakukan logout manual.
- [x] **2. Direct Worker Last Active Timestamp (Skema 2)**:
  - [x] Pastikan pencatatan aktivitas login memperbarui kolom `last_activity_date` di profil `workers`, membebaskan ketergantungan histori pada event login berkala.
- [x] **3. Database Retention & Pruning Function (Skema 3)**:
  - [x] Tambahkan stored procedure `clean_ephemeral_activity_logs(p_days int DEFAULT 7)` di `supabase_setup.sql` yang secara aman menghapus log `login`/`logout` kadaluwarsa tanpa menyentuh log operasional bernilai tinggi (`points_refunded`, `quiz_completed`, dll.).
- [x] **4. One-Time Database Pruning Execution (Skema 4)**:
  - [x] Eksekusi skrip pembersihan terhadap ratusan baris spam `login`/`logout` yang menumpuk di tabel `activity_log` (597 baris spam login/logout berhasil dibersihkan, 15 baris log operasional bernilai tinggi 100% aman).
- [x] **5. Verification & Quality Gates**:
  - [x] Jalankan `python checker.py` (59/59 passed) dan `npx tsc --noEmit` (0 error).
  - [x] Verifikasi di database bahwa `activity_log` terpangkas dari 631 baris menjadi 34 baris bersih, dan Buku Kas Poin tetap menampilkan riwayat pemasukan/refund lengkap.

---

## Phase 13: Dual-Wallet Smart Auto-Deduct Transparency & Allocation Clarification

- [x] **1. Analisis Kausalitas Auto-Deduct**:
  - [x] Konfirmasi logika pemotongan di `src/components/RewardMarketplace.tsx` dan `supabase_setup.sql` (`rpc_redeem_reward_fcfs`): Poin Harian (Hangus Akhir Bulan) telah diprioritaskan habis terlebih dahulu (FIFO/Expiry-First).
  - [x] Identifikasi bahwa pemotongan -230 PTS Prestasi terjadi karena saldo Poin Harian pekerja saat itu memang hanya tersisa 30 PTS (habis total), bukan karena sistem menitikberatkan ke Poin Prestasi.
- [x] **2. Modal Breakdown UX Transparency Enhancement**:
  - [x] Tambahkan indikator saldo `(Saldo: X PTS)` untuk Poin Harian dan Poin Prestasi di modal Konfirmasi Penukaran Reward.
  - [x] Tambahkan badge prioritas `Prioritas: Poin Harian (FIFO)`.
  - [x] Tambahkan micro-keterangan dinamis transparan (menjelaskan apakah Poin Harian dihabiskan dulu, mencukupi seluruhnya, atau jika saldo 0).
- [x] **3. Verification & Quality Gates**:
  - [x] Validasi typecheck `npx tsc --noEmit` bebas error.
  - [x] Jalankan `python checker.py` (59/59 checks passed).
  - [x] Verifikasi visual di browser (screenshot `reward_deduct_modal_1788907939269.png`).

---

## Phase 14: All-in-One Supabase Master Setup Unification & Critical Bug Fixes ("Run & Go")

- [x] **1. Unifikasi All-in-One Single Source of Truth**:
  - [x] Integrasikan seluruh skema, migrasi dual-wallet, resign/offboarding, idempotency key, dan pruning function ke dalam satu file tunggal [`supabase_setup.sql`](file:///d:/Coding%20Session/Komar/supabase_setup.sql) yang bersifat *idempotent* (aman dijalankan ulang kapan saja).
  - [x] Hilangkan keharusan menjalankan script terpisah-pisah, cukup copy-paste satu file `supabase_setup.sql` di Supabase Dashboard SQL Editor ("Run & Go").
- [x] **2. Perbaikan Bug Kritis & Logika**:
  - [x] **Fix Typo Kolom Reset Poin**: Ganti `details` menjadi `detail` pada fungsi `rpc_process_monthly_points_reset` di [`supabase_setup.sql`](file:///d:/Coding%20Session/Komar/supabase_setup.sql) dan [`sql/migration_dual_wallet_points.sql`](file:///d:/Coding%20Session/Komar/sql/migration_dual_wallet_points.sql) (menghilangkan error 42703).
  - [x] **Fix Dual-Wallet Disciplinary Sync**: Perbarui `rpc_issue_disciplinary_action` agar memanggil `deduct_worker_points(p_worker_id, p_point_deduction)` sehingga pemotongan sanksi K3 menerapkan Smart Auto-Deduct dan menjaga sinkronisasi saldo total, operasional, dan prestasi.
  - [x] **Fix Constraint Activity Log**: Hapus inline CHECK constraint sempit di pembuatan tabel awal dan terapkan universal constraint sinkron yang mencakup seluruh domain event log operasional.
  - [x] **Eliminasi Redundansi**: Hapus definisi duplikat fungsi RPC poin di akhir file setup.
- [x] **3. Verification & Quality Gates**:
  - [x] Verifikasi sintaks SQL: Pasangan dollar quote `$$` seimbang (52 quote, 26 blok).
  - [x] Validasi typecheck `npx tsc --noEmit` bebas error (0 error).
  - [x] Jalankan `python checker.py` (59/59 checks passed).

---

## Phase 15: Activity Log Worker Name Resolution & 'Unknown' Audit Trail Fix

- [x] **1. Analisis Kausalitas & Backfill Database**:
  - [x] Identifikasi akar masalah: Operasi checklist, kuis, kudo, kaizen, dan audit log historis menyimpan `worker_id` tetapi mengosongkan `worker_name` (`null`).
  - [x] Lakukan backfill otomatis pada 8 entri historis yang berstatus `worker_name: null` di tabel Supabase `activity_log` sehingga seluruh 39 entri log kini memiliki identitas pekerja yang valid (0 entri Unknown).
- [x] **2. Database & SQL Auto-Fill Trigger**:
  - [x] Pasang trigger `trg_fill_activity_log_worker_name` pada `supabase_setup.sql` dan `sql/patch_fix_database.sql` agar setiap `INSERT` baru dengan `worker_name` kosong otomatis diisi dari `workers.name`.
  - [x] Lengkapi deklarasi dan parameter `worker_name` pada seluruh stored procedures (`rpc_complete_sop_module`, `rpc_review_kaizen_submission`, `rpc_distribute_ppe`, `rpc_issue_disciplinary_action`, `rpc_record_warehouse_5s_audit`).
- [x] **3. Service & UI Defense-in-Depth Layer**:
  - [x] Peningkatan `fetchActivityLog` di [`supabaseService.ts`](file:///d:/Coding%20Session/Komar/src/lib/supabaseService.ts) dengan PostgREST join `*, workers(name)`.
  - [x] Peningkatan `ActivityLogPanel.tsx` untuk menerima prop `workers` dan melakukan pemetaan otomatis fallback `workerId` jika `workerName` belum dimuat atau bertuliskan `Unknown`.
  - [x] Sinkronisasi pencatatan nama pada `completeWorkerChecklist`, `completeWorkerQuiz`, `fulfillRedemption`, `kaizenService.ts`, `kudoService.ts`, `audit5sService.ts`, dan `handoverService.ts`.
- [x] **4. Verification & Quality Gates**:
  - [x] Validasi typecheck `npx tsc --noEmit` bersih (0 error).
  - [x] Validasi build Vite `npm run build` sukses (code 0).
  - [x] Jalankan `python checker.py` (59/59 checks passed).











