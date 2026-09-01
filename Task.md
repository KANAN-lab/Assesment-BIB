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

- [ ] Verifikasi OTP email benar-benar terkirim (perlu test di environment nyata)
- [ ] Verifikasi `findWorkerByIdentifier` tidak menghasilkan false positive email lagi
- [ ] Verifikasi Approval Console menampilkan antrean setelah signup supervisor baru
- [ ] Verifikasi supervisor tidak bisa login sebelum di-approve



