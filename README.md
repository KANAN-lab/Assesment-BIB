# Gappy Assessment — Platform Logistik & K3 Enterprise (PT. DAYA ANUGRAH MULYA)

> **Platform Penilaian Kinerja Berimbang, K3, dan Gamifikasi Operasional Logistik Terintegrasi**  
> *Versi 4.0 — Enterprise Edition dengan Categorized Executive Navigation, Dynamic System Point Governance, Audit 5R Gudang, Pelacak SIO & APD, Pembinaan SP K3, & Atomic Chunk Splitting (Low Latency)*

---

## 🚀 Ringkasan Sistem & Fitur Utama

### 👷 Worker Dashboard (Staf Operasional Logistik)
- **⚡ Kuis Safety Harian (+50 Poin)**: Kuis K3 dinamis yang dihasilkan oleh **Gappy AI (Gemini Engine)** disesuaikan dengan divisi & role pekerja. Dilengkapi bank soal Supabase fallback (0 token AI jika soal sudah ada di database).
- **🛡️ Pre-Shift Checklist (+30 Poin)**: Verifikasi kelayakan peralatan operasional & APD harian untuk keselamatan kerja.
- **📊 Radar BIB & Trend 30 Hari**: Visualisasi skor 3 pilar kuis/kinerja (*Behavior 40%*, *Integrity 40%*, *Benchmark 20%*) dan grafik tren performa.
- **🏆 Tier & Streak Multiplier**: Kenaikan tier otomatis (*Novice Operational* → *Pro Specialist* → *Elite Logistician* → *Legendary Champion*) serta bonus multiplier streak 7, 14, dan 30 hari.
- **🎁 Reward Marketplace (Fair-Play FCFS)**: Penukaran poin terintegrasi dengan kuota bulanan (*First-Come, First-Served*), reset otomatis tanggal 1, dan batas klaim 1x/item/bulan per pekerja.
- **📂 Pusat Riwayat & Arsip Saya**: Dashboard arsip personal pekerja untuk memantau riwayat audit, transaksi voucher, pengajuan Kaizen, serta **Catatan SP & Sanksi K3** lengkap dengan status *retraining* SOP dan cetak PDF Berita Acara resmi.
- **🏆 Hall of Fame & Feed Real-Time**: Feed aktivitas penukaran reward real-time dari seluruh rekan kerja operasional.
- **🥇 Klasemen Individu & Tim Divisi**: Peringkat performa pekerja dan persaingan tim antar divisi.
- **📢 Papan Pengumuman Admin**: Banner pengumuman penting dari manajemen dengan prioritas visual (`urgent`, `normal`, `info`).
- **🚨 Pelaporan Insiden K3**: Form pelaporan langsung insiden / kondisi tidak aman ke Supervisor dengan kompresi foto bukti HD & unggah ke Google Drive.
- **📚 Perpustakaan SOP K3**: Repositori dokumen panduan keselamatan kerja dan poin kunci kepatuhan (*Compliance Points*).
- **✨ Interactive Onboarding Tour**: Panduan interaktif 4 langkah bagi pekerja baru.

### 👔 Supervisor Console (Pengawas Operasional & HSEQ)
- **🗂️ Executive Categorized Navigation Suite**: Antarmuka navigasi modular terstruktur (Kategori Utama: *SOP & Operasional*, *Keselamatan & K3*, *SDM & Penilaian*) dengan tampilan Grid 3-Kolom pada Desktop dan Horizontal Scroll Strip pada Mobile.
- **📋 Audit Kompetensi Matriks**: Form penilaian langsung 3 pilar BIB pekerja bawahan.
- **🚜 Pelacak SIO & Lisensi Alat Berat (MHE)**: Modul pemantauan masa berlaku SIO Operator Forklift/Reach Truck/VNA lengkap dengan pemindaian OCR/AI dokumen dan notifikasi otomatis.
- **🦺 Inventaris & Siklus Pakai APD (PPE Management)**: Pelacak distribusi APD, perhitungan estimasi tanggal penggantian, serta verifikasi klaim kerusakan APD.
- **🧹 Audit Standar 5R / 5S Wilayah Gudang**: Penilaian berkala kelayakan wilayah kerja gudang (Ringkas, Rapi, Resik, Rawat, Rajin), unggah foto bukti audit, serta pemberian reward poin otomatis untuk PIC zona.
- **📜 Pembinaan, Sanksi & SP K3**: Penerbitan Surat Peringatan (Coaching Verbal, SP 1/2/3, Skorsing), pemotongan poin pelanggaran, integrasi *retraining SOP wajib*, dan cetak PDF resmi.
- **🚨 Kanban Lifecycle Insiden & Form CAPA**: Penanganan insiden K3 (Root Cause 5-Why, Action Plan, PIC, Target Selesai, & Penutupan Kasus).
- **📄 Executive PDF Report Generator**: Cetak Berita Acara Insiden K3 resmi dan Rekapitulasi Laporan Insiden Massal dalam format PDF corporate PT. DAYA ANUGRAH MULYA.

### ⚙️ Administrator Console (System Administrator)
- **🎯 Dynamic System Point Governance**: Konfigurasi seluruh parameter poin reward & penalti di seluruh modul tanpa *hardcode*, tersinkronisasi otomatis ke cloud Supabase.
- **📊 Analytics Dashboard**: Grafik Recharts distribusi tier pekerja, rata-rata BIB per divisi, completion rate kuis, dan top 5 pekerja.
- **👥 Approval Supervisor**: Antrean permohonan akses supervisor baru (`pending_approval`) dengan opsi Approve/Reject.
- **📢 Manajemen Pengumuman**: CRUD pengumuman perusahaan dengan batas kadaluarsa.
- **🔑 Safe Gemini AI Key Configuration**: Input dan simpan Gemini API Key secara aman terenkripsi di tabel database Supabase (`system_settings`) tanpa mengekspos rahasia di kode JavaScript publik.
- **🔄 Reset Kuota Bulanan Tgl 1**: Tombol eksekusi manual/otomatis reset kuota katalog reward bulanan.
- **🕐 Activity Log & Rate Limit**: Catatan audit log aktivitas login/logout real-time & proteksi percobaan login gagal (5x dalam 15 mnt).
- **📥 Export Data CSV**: Fitur ekspor data pekerja utuh dan data insiden K3 ke file `.csv` untuk HR & HSE.

---

## ⚡ Performa & Optimasi Atomic Bundle (Low Latency)

Aplikasi dibangun menggunakan **Atomic Chunk Splitting & On-Demand Micro-Loading**:
- **Main Bundle Size (`index.js`)**: Dipotong **86%** dari `1.62 MB` menjadi **`226 kB`** (`57 kB Gzip`).
- **On-Demand Micro-Chunks**: 39 micro-chunks mandiri (3 kB – 26 kB) yang hanya diunduh saat modal/fitur spesifik dibuka.
- **Dynamic Imports**: Modul berbobot (`canvas-confetti`, `browser-image-compression`, `recharts`, `jspdf`) diisolasi penuh dari entry point utama.

---

## 🔐 Kredensial Administrator Default

| Parameter | Nilai |
| :--- | :--- |
| **NIK / Employee ID** | `SYS-ADMIN` |
| **Email Admin** | `irnando.arkadiantika@pt-dam-id.com` |
| **Password Default** | `Aleale#@!123` |
| **Role** | `System Administrator` |
| **Status** | `active` (Bypass Approval) |

---

## 🛠️ Teknologi & Stack

- **Frontend**: React 18, TypeScript, Vanilla CSS & TailwindCSS (Custom Sleek Dark Theme), Lucide Icons, Recharts, Canvas Confetti.
- **Build Tool**: Vite 6, Progressive Web App (PWA via `vite-plugin-pwa`).
- **Backend / Database**: Supabase (PostgreSQL, Supabase Auth, Realtime Subscriptions, RLS Policies, Stored Procedures / RPC).
- **PDF Engine**: jsPDF & jsPDF-AutoTable.
- **AI Engine**: Gappy AI (Google Gemini 1.5/2.0 API via `@google/generative-ai` dengan fallback Supabase Question Bank).

---

## 📦 Panduan Instalasi & Pengoperasian Lokal

### 1. Prasyarat Environment (`.env.local`)
Buat file `.env.local` pada folder root proyek:
```env
VITE_SUPABASE_URL=https://sekmjwrbohjmlxpgydqx.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_GDRIVE_UPLOAD_WEBHOOK=https://script.google.com/macros/s/your_gas_script_id/exec
```

### 2. Inisialisasi Database (Supabase)
Jalankan file [supabase_setup.sql](file:///d:/Coding%20Session/Komar/supabase_setup.sql) di **Supabase Dashboard > SQL Editor** untuk menginisialisasi tabel, RLS Policies, Stored Procedure Atomic (`rpc_redeem_reward_fcfs`, `reset_monthly_reward_quota`, `rpc_issue_disciplinary_action`, `rpc_submit_5s_audit`, `rpc_distribute_ppe`), dan seed data awal.

### 3. Perintah Pengembangan & Build Lokal
```bash
# 1. Install dependencies
npm install

# 2. Jalankan server pengembangan lokal (http://localhost:3000)
npm run dev

# 3. Jalankan typecheck TypeScript
npx tsc --noEmit

# 4. Build bundle produksi
npm run build

# 5. Pratinjau build produksi
npm run preview
```

---

## 🛡️ Kebijakan Keamanan & System Rules

1. **Email Policy**: Pendaftaran pekerja mendukung semua domain email valid. Akses Admin khusus `irnando.arkadiantika@pt-dam-id.com`.
2. **Pendaftaran Akun Unique**: NIK / Employee ID dan Email terikat unik di database Supabase.
3. **Approval Supervisor**: Akun Supervisor baru berada di status `pending_approval` dan wajib disetujui Admin sebelum dapat mengakses fitur pengawas.
4. **Rate Limiting**: Maksimal 5x percobaan login gagal dalam 15 menit.
5. **Session Expiry**: Logout otomatis setelah 8 jam tidak aktif.

---

© 2026 Gappy Assessment Platform — PT. DAYA ANUGRAH MULYA. All Rights Reserved.
