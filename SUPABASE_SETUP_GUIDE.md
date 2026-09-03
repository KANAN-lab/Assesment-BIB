# Panduan Setup Supabase dari Awal (Fresh Setup Guide)
## Platform Logistik & Asesmen K3 — PT. DAYA ANUGRAH MULYA

Dokumen ini berisi panduan komprehensif langkah demi langkah untuk menginisialisasi database backend **Supabase** dari nol hingga siap digunakan oleh aplikasi frontend.

---

## 📋 Daftar Isi
1. [Prasyarat](#1-prasyarat)
2. [Langkah 1: Pembuatan Project Baru di Supabase](#langkah-1-pembuatan-project-baru-di-supabase)
3. [Langkah 2: Eksekusi Master Schema SQL](#langkah-2-eksekusi-master-schema-sql)
4. [Langkah 3: Konfigurasi File Environment (.env.local)](#langkah-3-konfigurasi-file-environment-envlocal)
5. [Langkah 4: Verifikasi Koneksi & Integritas Data](#langkah-4-verifikasi-koneksi--integritas-data)
6. [Tabel Kredensial Akun Default](#tabel-kredensial-akun-default)
7. [Fitur Database yang Disediakan](#fitur-database-yang-disediakan)
8. [Troubleshooting & Solusi Masalah Umum](#troubleshooting--solusi-masalah-umum)

---

## 1. Prasyarat

Sebelum memulai, pastikan Anda telah memiliki:
* Akun aktif di [Supabase](https://supabase.com).
* Node.js v18+ dan Python 3.9+ terinstal di perangkat lokal.
* Akses ke repository ini dengan file [supabase_setup.sql](./supabase_setup.sql).

---

## Langkah 1: Pembuatan Project Baru di Supabase

1. Buka [database dashboard Supabase](https://supabase.com/dashboard).
2. Klik tombol **New Project**.
3. Pilih **Organization** Anda.
4. Isi formulir konfigurasi project:
   * **Name**: `BIB Logistics Assessment` (atau nama pilihan Anda).
   * **Database Password**: Buat password kuat dan **simpan di tempat aman**.
   * **Region**: Pilih region terdekat dengan pengguna, contoh: `Singapore (ap-southeast-1)`.
   * **Pricing Plan**: `Free Tier` sudah cukup untuk operasional dan evaluasi.
5. Klik **Create new project**.
6. Tunggu proses provisioning selesai (biasanya memerlukan waktu 1–2 menit hingga status berubah menjadi **Active**).

---

## Langkah 2: Eksekusi Master Schema SQL

Database project ini menggunakan satu file master SQL yang mencakup seluruh skema tabel, fungsi RPC atomic, proteksi idempotensi (anti-duplikasi), trigger timestamp, policy RLS, dan seed data awal.

1. Di menu sidebar kiri Supabase Dashboard, klik ikon **SQL Editor** (ikon terminal/query `>_`).
2. Klik tombol **+ New Query**.
3. Buka file [`supabase_setup.sql`](./supabase_setup.sql) yang berada di root folder proyek ini.
4. Salin seluruh isi file tersebut (`Ctrl + A` lalu `Ctrl + C`).
5. Tempel (`Ctrl + V`) ke dalam editor SQL di dashboard Supabase.
6. Klik tombol **Run** berwarna hijau di pojok kanan bawah (atau tekan pintasan `Ctrl + Enter`).
7. Tunggu hingga query selesai dieksekusi dengan status:  
   `Success. No rows returned`.

> **Catatan Teknis**: 
> * File `supabase_setup.sql` bersifat *idempotent* (`CREATE TABLE IF NOT EXISTS`, `DROP TRIGGER IF EXISTS`, dll.) sehingga aman dijalankan berulang kali tanpa merusak data lama.
> * **Apakah perlu menjalankan `sql/migration_idempotency.sql` lagi?**  
>   **TIDAK PERLU** jika Anda sudah menjalankan `supabase_setup.sql`, karena seluruh skrip idempotensi sudah disatukan ke dalamnya. File `migration_idempotency.sql` hanya digunakan jika Anda memiliki database lama (existing) dan ingin menambah fitur anti-duplikasi tanpa menjalankan ulang master script.

---

## Langkah 3: Konfigurasi File Environment (.env.local)

Setelah database berhasil dibuat, hubungkan frontend Vite ke project Supabase Anda:

1. Di Supabase Dashboard, klik menu **Project Settings** (ikon roda gigi di kiri bawah) > **API**.
2. Dapatkan nilai kredensial berikut:
   * **Project URL**: URL API database Anda (format: `https://[project-ref].supabase.co`).
   * **Project API Keys**: Salin key bertipe `anon` `public` (string panjang yang diawali dengan `eyJ...`).
3. Buka file `.env.local` di root folder proyek (buat baru jika belum ada):
4. Masukkan konfigurasi berikut:

```env
# URL Instance Supabase
VITE_SUPABASE_URL=https://[project-ref].supabase.co

# Public Anonymous Key (Aman untuk frontend)
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Google Gemini AI Key (Untuk generate kuis adaptif dinamis)
VITE_GEMINI_API_KEY=AQ.Ab8RN6J1...

# Webhook Google Apps Script (Untuk backup otomatis berkas foto ke Google Drive)
VITE_GDRIVE_UPLOAD_WEBHOOK=https://script.google.com/macros/s/[SCRIPT_ID]/exec
```

> ⚠️ **Penting**: Jangan pernah memasukkan `service_role` key ke dalam file `.env.local` atau kode frontend, karena key tersebut memiliki akses bypass keamanan penuh.

---

## Langkah 4: Verifikasi Koneksi & Integritas Data

Lakukan audit kesehatan sistem untuk memastikan seluruh skema dan variabel environment sudah sinkron:

1. Buka terminal PowerShell di folder proyek dan jalankan tool checker:
   ```bash
   python checker.py
   ```
2. Pastikan hasil pemeriksaan menampilkan status **PASS**:
   ```text
   ============================================================
     BIB Platform – Checker Report
   ============================================================
     Total: 60 checks
     [ERROR] Errors  : 0
     [WARN]  Warnings: 0
     [OK]    Passed  : 59
     [PASS] Semua checks passed.
   ```
3. Jalankan server pengembangan lokal:
   ```bash
   npm run dev
   ```
4. Buka browser pada alamat `http://localhost:3000` (atau port yang aktif), kemudian uji coba login menggunakan salah satu kredensial akun di bawah ini.

---

## Tabel Kredensial Akun Default

Setelah menjalankan `supabase_setup.sql`, akun-akun awal berikut otomatis tersedia di database:

| Peran (Role) | NIK / Employee ID | Password Default | Akses Menu |
| :--- | :--- | :--- | :--- |
| **System Administrator** | `SYS-ADMIN` | `Aleale#@!123` | Admin Console, Master Data Pekerja, Dynamic Point Governance, Audit Log, Approval Supervisor |
| **Supervisor HSEQ** | `SUP-LOG-01` | `123` | Supervisor Console, Audit Kompetensi BIB, Gemba Walk Safety Patrol, Sanksi SP K3, Validasi Insiden |
| **Worker (Operator MHE)** | `WRK-001` | `123` | Dashboard Pekerja, Kuis K3 Harian, Pre-Shift Checklist, Klaim Reward, Lapor Insiden |
| **Worker (Inbound/Picking)**| `WRK-002` s/d `WRK-012`| `123` | Dashboard Pekerja, Papan Kaizen, Papan Kudos, Log Serah Terima Shift Handover |

*(Catatan: Pekerja dengan password awal `123` akan diminta mengganti password pada login pertama kali).*

---

## Fitur Database yang Disediakan

Skrip `supabase_setup.sql` mengonfigurasi total **27 tabel relational & engine pendukung**:

1. **Struktur Pekerja & Peran**: `workers`, `worker_competency_scores`, `worker_role_mutations`, `login_attempts`.
2. **Gamifikasi & Reward**: `reward_catalog` (kuota FCFS bulanan), `redemption_history`, `badges`, `worker_badges`, `score_history`.
3. **K3 & Keselamatan Operasional**: `incident_reports` (dengan CAPA), `safety_patrol_logs` (Gemba Walk), `audit_5s_zones`, `audit_5s_records`.
4. **Alat Kerja & Kepatuhan**: `mhe_licenses` (SIO Forklift/Reach Truck), `ppe_items`, `ppe_distributions`, `ppe_damage_reports`.
5. **Pembinaan & Disiplin**: `disciplinary_actions` (Coaching, SP1, SP2, SP3, Skorsing, retraining SOP wajib).
6. **SOP & Knowledge Base**: `sop_modules`, `worker_sop_progress`, `quiz_questions` (AI Question Bank).
7. **Kolaborasi & Operasional Shift**: `shift_handovers` (serah terima antar shift), `kaizen_suggestions` (kotak ide inovasi), `worker_kudos` (pemberian apresiasi rekan).
8. **Tata Kelola Sistem**: `system_point_configs` (konfigurasi poin terpusat), `app_notifications` (pusat siaran notifikasi), `activity_log`.
9. **Idempotency & Anti-Duplikasi**: Kolom `idempotency_key` dan *partial unique indexes* pada `incident_reports`, `kaizen_suggestions`, `safety_patrol_logs`, dan `shift_handovers`.
10. **Fungsi Atomic RPC (PostgreSQL Stored Procedures)**:
    * `rpc_redeem_reward_fcfs` (Penukaran reward adil berbasis locking baris & kuota)
    * `rpc_send_kudo` (Pengiriman apresiasi peer-to-peer)
    * `rpc_complete_sop_module` (Penyelesaian SOP & pemberian poin instan)
    * `reset_monthly_reward_quota` (Reset otomatis kuota per awal bulan)

---

## Troubleshooting & Solusi Masalah Umum

### 1. Error: `permission denied for schema public` saat fetch data
**Penyebab**: Role anonim (`anon`) PostgREST belum diberikan hak akses pada skema database.  
**Solusi**: Jalankan perintah berikut di SQL Editor Supabase:
```sql
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO anon, authenticated, service_role;
```

### 2. Error: `duplicate key value violates unique constraint "idx_..._idempotency_key"`
**Penyebab**: IdempotencyEngine berhasil memblokir pengiriman formulir ganda (double-click atau submit ulang data identik dalam waktu 60 detik).  
**Solusi**: Ini adalah perilaku proteksi yang diharapkan (*working as intended*). Pengguna cukup menunggu beberapa saat atau memeriksa riwayat dokumen sebelum mengirim data baru.

### 3. Error 401: `Invalid API key`
**Penyebab**: Nilai `VITE_SUPABASE_ANON_KEY` di file `.env.local` tidak cocok dengan API key di dashboard Supabase.  
**Solusi**: Salin ulang key `anon` `public` dari menu **Project Settings > API** di Supabase Dashboard dan restart Vite dev server (`Ctrl + C`, lalu `npm run dev`).
