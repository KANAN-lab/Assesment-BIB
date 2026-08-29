# BIB Logistics Assessment Platform (Komar)

> **Platform Penilaian Kinerja, K3, dan Gamifikasi Logistik Terintegrasi**  
> *Versi 3.1 — Production-Ready dengan Security Architecture & Gappy AI Engine*

---

## 🚀 Fitur Utama (Feature Overview)

### 👷 Worker Dashboard (Staf Logistik)
- **⚡ Kuis Safety Harian (+50 Poin)**: Kuis K3 dinamis yang dihasilkan oleh **Gappy AI (Gemini Engine)** disesuaikan dengan divisi & role pekerja. Dilengkapi bank soal Supabase fallback (0 token AI jika soal sudah ada).
- **🛡️ Pre-Shift Checklist (+30 Poin)**: Verifikasi kelayakan peralatan & APD harian untuk keselamatan kerja.
- **📊 Radar BIB & Trend 30 Hari**: Visualisasi skor 3 pilar kuis/kinerja (*Behavior 40%*, *Integrity 40%*, *Benchmark 20%*) dan grafik tren performa.
- **🏆 Tier & Streak Multiplier**: Kenaikan tier otomatis (*Novice Operational* → *Pro Specialist* → *Elite Logistician* → *Legendary Champion*) serta bonus multiplier streak 7, 14, dan 30 hari.
- **🎁 Reward Marketplace**: Penukaran poin terintegrasi dengan persediaan katalog hadiah real-time.
- **🥇 Klasemen Individu & Tim Divisi**: Peringkat performa pekerja dan persaingan tim antar divisi.
- **📢 Papan Pengumuman Admin**: Banner pengumuman penting dari manajemen dengan prioritas visual (`urgent`, `normal`, `info`).
- **🚨 Pelaporan Insiden K3**: Form pelaporan langsung insiden / kondisi tidak aman ke Supervisor.
- **📚 Perpustakaan SOP K3**: Repositori dokumen panduan keselamatan kerja dan poin kunci kepatuhan (*Compliance Points*).
- **✨ Interactive Onboarding Tour**: Panduan interaktif 4 langkah bagi pekerja baru.

### 👔 Supervisor Console (Pengawas)
- **📋 Audit Kompetensi Matriks**: Form penilaian langsung 3 pilar BIB pekerja bawahan.
- **👥 Monitoring Tim**: Pantau keaktifan kuis, checklist, dan status performa anggota divisi.

### ⚙️ Administrator Console (System Admin)
- **📊 Analytics Dashboard**: Grafik Recharts distribusi tier pekerja, rata-rata BIB per divisi, completion rate kuis, dan top 5 pekerja.
- **👥 Approval Supervisor**: Antrean permohonan akses supervisor baru (`pending_approval`) dengan opsi Approve/Reject.
- **📢 Manajemen Pengumuman**: CRUD pengumuman perusahaan dengan batas kadaluarsa.
- **🚨 Tracking Insiden K3**: Pelacakan status penanganan insiden (`open` → `investigating` → `resolved` → `closed`).
- **🕐 Activity Log & Rate Limit**: Catatan audit log aktivitas login/logout real-time & proteksi percobaan login gagal (5x dalam 15 mnt).
- **📥 Export Data CSV**: Fitur ekspor data pekerja utuh ke file `.csv` untuk keperluan HR.

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

- **Frontend**: React 18, TypeScript, TailwindCSS (Custom Dark Theme), Lucide Icons, Recharts, Canvas Confetti.
- **Build Tool**: Vite 6, Progressive Web App (PWA via `vite-plugin-pwa`).
- **Backend / Database**: Supabase (PostgreSQL, Supabase Auth, Realtime Subscriptions, RLS Policies).
- **AI Engine**: Gappy AI (Google Gemini 1.5/2.0 API via `@google/generative-ai`).

---

## 📦 Panduan Instalasi & Pengoperasian

### 1. Prasyarat Environment (`.env.local`)
Pastikan file `.env.local` berada di akar direktori dengan variabel berikut:
```env
VITE_SUPABASE_URL=https://sekmjwrbohjmlxpgydqx.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_GEMINI_API_KEY=your_gemini_api_key
```

### 2. Jalankan Database Setup (Supabase)
Jalankan file [supabase_setup.sql](file:///d:/Coding%20Session/Komar/supabase_setup.sql) di **Supabase Dashboard > SQL Editor** untuk menginisialisasi tabel, indeks, RPC functions, seed data lencana, dan RLS policies.

### 3. Install & Jalankan Lokal
```bash
# Install dependencies
npm install

# Jalankan server pengembangan
npm run dev

# Jalankan typecheck TypeScript
npx tsc --noEmit

# Build bundle produksi
npm run build
```

---

## 🛡️ Kebijakan Keamanan (Security Rules)

1. **Email Policy**: Bebas domain untuk pekerja (Gmail, Outlook, Yahoo, dll). Admin wajib `irnando.arkadiantika@pt-dam-id.com`.
2. **Pendaftaran Akun**: Dilarang mode `UPSERT/UPDATE`. Pendaftaran NIK/Email yang sudah terdaftar akan ditolak.
3. **Approval Supervisor**: Supervisor baru berada di status `pending_approval` dan dilarang login sebelum disetujui Admin.
4. **Rate Limiting**: Maksimal 5x percobaan login gagal dalam 15 menit.
5. **Session Expiry**: Logout otomatis setelah 8 jam tidak aktif.

---

© 2026 BIB Logistics Assessment Platform. All Rights Reserved.
