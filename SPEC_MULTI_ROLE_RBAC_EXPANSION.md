# SPESIFIKASI TEKNIS & BRAINSTORMING: EKSPANSI MULTI-ROLE & RBAC ENTERPRISE
**Platform:** Gappy Assessment & Logistics Operations Management System  
**Organisasi:** PT. DAYA ANUGRAH MULYA (DAM)  
**Dokumen:** Architectural Blueprint & Functional Specification  
**Versi:** 1.0 (Draft Brainstorming)  
**Tanggal:** 8 September 2026  

---

## 1. LATAR BELAKANG & PROBLEM STATEMENT

### 1.1 Kondisi Saat Ini (3 System Role Model)
Saat ini sistem membagi seluruh pengguna ke dalam 3 kategori sistem (`SystemRole`):
1. **Worker (Operasional)**: Operator Forklift, Operator Reach Truck, Checker WFG/WRM, PIC Area, Admin Operasional.
2. **Supervisor (Pengawas Lapangan)**: Pengawas divisi operasional gudang.
3. **Admin (System Administrator)**: Pengelola platform dan konfigurasi IT.

### 1.2 Masalah Tata Kelola (Governance & Segregation of Duties)
Dalam ekosistem pergudangan dan rantai pasok industri modern (termasuk kepatuhan standar ISO 45001 dan regulasi Kemnaker RI), model 3 role ini menimbulkan beberapa celah krusial:
1. **Beban Berlebih pada Supervisor Operasional**: Supervisor operasional harus memvalidasi insiden teknis K3, mengelola masa berlaku lisensi SIO, mendistribusikan APD, hingga melakukan audit 5S. Di lapangan, fokus utama supervisor adalah kelancaran *inbound/outbound throughput* barang, bukan kepatuhan hukum K3.
2. **Ketiadaan Akses Khusus untuk Fungsi Spesialis**:
   - **HSE / EHS (Health, Safety & Environment)**: Memerlukan kewenangan audit independen, investigasi akar masalah (*5-Why / Fishbone Analysis*), penutupan CAPA, dan verifikasi sertifikasi SIO tanpa harus diberikan hak `admin` yang dapat mengubah master data sistem.
   - **GA (General Affairs) / Fasilitas**: Bertanggung jawab atas ketersediaan fisik APD di gudang, pengadaan logistik sarana darurat (APAR/Hydrant), kebersihan zona 5S umum, dan persediaan fisik voucher sembako di reward marketplace.
   - **HR / Training & People Development**: Bertanggung jawab atas standarisasi kurikulum kuis K3 harian, audit kompetensi terpadu, pelatihan wajib bagi operator dengan skor rendah, serta mediasi sanksi disipliner (SP).
3. **Risiko Keamanan & Otorisasi**: Memberikan role `admin` kepada staf HSE atau GA agar mereka bisa mengelola modul APD/SIO sangat berisiko karena membuka akses ke konfigurasi sistem, audit point multiplier, dan data sensitif karyawan.

---

## 2. TAKSONOMI ROLE BARU YANG DIUSULKAN

Kami mengusulkan evolusi dari **3-Role Model** menjadi **6-Role Enterprise RBAC Model**:

```
                               ┌───────────────────────────────────┐
                               │       SYSTEM ADMINISTRATOR        │
                               │   (Platform, Master Config, IT)   │
                               └─────────────────┬─────────────────┘
                                                 │
            ┌───────────────────┬────────────────┼───────────────────┬───────────────────┐
            │                   │                │                   │                   │
  ┌─────────▼─────────┐ ┌───────▼───────┐ ┌──────▼──────┐ ┌──────────▼─────────┐ ┌───────▼────────┐
  │    OPERATIONAL    │ │   OPERATIONAL │ │     HSE /   │ │  GENERAL AFFAIRS │ │      HR /      │
  │      WORKER       │ │   SUPERVISOR  │ │  EHS OFFICER│ │    (FACILITY)    │ │   TRAINING     │
  │ (Field Execution) │ │  (Throughput) │ │  (Safety)   │ │  (Asset/Stock)   │ │  (Competency)  │
  └───────────────────┘ └───────────────┘ └─────────────┘ └──────────────────┘ └────────────────┘
```

### Profil Masing-Masing Role

| Role Code | Nama Role | Domain Utama | Fokus Pekerjaan |
| :--- | :--- | :--- | :--- |
| `worker` | **Operational Employee** | Lapangan (Shopfloor) | Eksekusi tugas harian, checklist pra-shift, kuis K3, lapor insiden/near-miss, penukaran poin reward. |
| `supervisor` | **Operational Supervisor** | Tim & Throughput Divisi | Evaluasi performa staf (BIB score), serah terima shift, pemantauan ritme kerja tim, usulan kaizen. |
| `hse` | **HSE / EHS Specialist** | Keselamatan & Lingkungan | Investigasi insiden & CAPA, inspeksi SIO MHE Kemnaker, audit kelayakan APD, Safety Patrol Gemba Walk, pelaporan audit eksekutif resmi K3. |
| `ga` | **General Affairs Officer** | Fasilitas, Aset & Logistik | Inventaris stok master APD, pengadaan & reorder level, audit fasilitas 5R/5S, serah-terima fisik reward sembako/voucher. |
| `hr` | **HR & Training Lead** | Insan & Kompetensi | Tata kelola kurikulum SOP & Bank Soal Kuis, analisis gap kompetensi pekerja, penanganan sanksi disipliner (SP) & mediasi banding. |
| `admin` | **System Administrator** | Platform & Tata Kelola IT | Pengaturan konfigurasi poin/penalti, manajemen akun pengguna, template nomor SK, reset sistem, dan database audit log. |

---

## 3. FITUR-FITUR BARU YANG DAPAT DITAMBAHKAN PER ROLE

### 3.1 Fitur Khusus Role: HSE / EHS Specialist (`hse`)
*Tujuan: Menjadikan platform pusat kepatuhan Zero Accident dan audit ISO 45001.*

1. **Investigasi Akar Masalah Insiden Tingkat Lanjut (Root Cause Engine)**:
   - Form investigasi insiden dengan metode **5-Why Analysis** terstruktur dan diagram **Fishbone (Man, Machine, Method, Material, Environment)**.
   - Hak veto persetujuan penutupan insiden (*Incident Closure Sign-off*). Insiden tidak dapat ditutup sebelum HSE memverifikasi bukti perbaikan di lapangan.
2. **Kepatuhan Lisensi SIO Kemenaker RI & Early Warning Dashboard**:
   - Filter kepatuhan legalitas: Operator Aktif Ber-SIO vs Tanpa SIO.
   - Automated Early Warning: Peringatan H-60, H-30, H-7 menjelang masa berlaku SIO habis.
   - Generator Surat Permohonan Perpanjangan SIO Otomatis (Format Kemnaker).
3. **Audit APD & Pelaporan Kerusakan Kritis**:
   - Review berkala masa pakai standar APD (Helm 3 tahun, Sepatu Safety 1 tahun, Rompi 6 bulan).
   - Validasi tiket penggantian APD rusak akibat insiden kerja.
4. **Pusat Komando Gemba Walk & Safety Patrol**:
   - Penjadwalan inspeksi patroli keselamatan harian/mingguan per zona gudang.
   - Penerbitan surat teguran keselamatan (*Safety Notice*) langsung ke divisi terkait.
5. **Penerbitan Resmi Dokumen K3**:
   - Menandatangani dan menerbitkan dokumen eksekutif: *Laporan K3 Zero Incident & CAPA* serta *Laporan Kepatuhan Lisensi SIO*.

---

### 3.2 Fitur Khusus Role: General Affairs Officer (`ga`)
*Tujuan: Optimalisasi sarana prasarana fisik, kontrol stok APD, dan operasional fasilitas gudang.*

1. **Sistem Inventaris Master APD & Reorder Point (ROP)**:
   - Indikator otomatis stok kritis (*Minimum Stock Alert*).
   - Pencatatan barang masuk (*Stock Inward*) dari vendor/supplier dan kalkulasi nilai aset APD.
   - Histori pengeluaran APD per ukuran (*size distribution analytics*).
2. **Audit & Standarisasi 5R / 5S Fasilitas Gudang**:
   - Modul inspeksi terpadu untuk area umum: Jalur Pejalan Kaki (Walkway), Area Parkir MHE, Tempat Pembuangan Sampah/Limbah B3, Toilet, dan Ruang Istirahat.
   - Penilaian skor 5R dengan dokumentasi foto *Before vs After*.
3. **Pusat Logistik Klaim Reward Fisik (Fulfillment Center)**:
   - Panel khusus penyerahan voucher belanja fisik, paket sembako, atau tumbler kepada karyawan.
   - Fitur konfirmasi serah-terima dengan tanda tangan digital atau input kode verifikasi OTP karyawan.
4. **Manajemen Pemeliharaan Fasilitas Darurat**:
   - Inspeksi bulanan APAR (Alat Pemadam Api Ringan), Hydrant, Kotak P3K, dan Lampu Darurat (*Emergency Exit Signs*).

---

### 3.3 Fitur Khusus Role: HR & Training Lead (`hr`)
*Tujuan: Pembinaan kompetensi SDM, budaya apresiasi, dan ketertiban kerja.*

1. **Bank Soal & Manajemen Kurikulum K3 Academy**:
   - Pembuatan paket soal kuis harian berbasis kompetensi divisi.
   - Penjadwalan materi kuis berkala (misal: "Bulan Keselamatan Ergonomi Gudang").
   - Monitoring tingkat pemahaman staf per topik SOP.
2. **Analisis Kesenjangan Kompetensi (Gap Analysis Dashboard)**:
   - Peta distribusi staf berdasarkan kuadran kompetensi (High Performer vs Needs Training).
   - Rekomendasi otomatis: Staf dengan skor Benchmark < 70 otomatis masuk daftar pelatihan wajib.
3. **Tata Kelola Sanksi Disipliner & Mediasi Banding**:
   - Penerbitan Surat Peringatan resmi (SP 1, SP 2, SP 3, Surat Teguran Lisan).
   - Panel mediasi banding sanksi: Menerima penjelasan pembelaan karyawan dan menentukan apakah sanksi dibatalkan atau direvisi.
4. **Budaya Apresiasi & Kudo Wall Monitoring**:
   - Pemantauan interaksi positif karyawan di Kudo Wall.
   - Penganugerahan lencana khusus bulanan (*Employee of the Month / Safety Champion*).

---

## 4. MATRIKS OTORISASI (RBAC MATRIX)

Keterangan Hak Akses:
- **C**: Create (Membuat data baru)
- **R**: Read / View (Melihat data)
- **U**: Update / Edit (Mengubah data)
- **D**: Delete (Menghapus data)
- **A**: Approve / Validate (Memvalidasi / Memberi persetujuan resmi)
- **-**: Tidak memiliki akses

| Modul & Fitur | Worker | Supervisor | HSE Specialist | GA Officer | HR / Training | System Admin |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **Profil & Dashboard Pribadi** | CRUD | CRUD | CRUD | CRUD | CRUD | CRUD |
| **Checklist Pre-Shift & Kuis** | CR | R | R | R | R (Analytics) | CRUD |
| **SOP Library (Micro-Deck)** | R | R | R | R | CRUD | CRUD |
| **Evaluasi Skor BIB Tim** | R (Diri) | CRU | R | - | CRU (Review) | CRUD |
| **Insiden K3 (Pelaporan)** | CR | CR | CR | CR | CR | CRUD |
| **Insiden K3 (Investigasi & CAPA)** | - | RU | CRUA | R | R | CRUD |
| **Safety Patrol (Gemba Walk)** | R | CR | CRUA | R | R | CRUD |
| **Lisensi SIO Alat Berat (MHE)** | CR (Upload) | R | CRUA | R | R | CRUD |
| **Distribusi APD (Pengajuan)** | CR (Rusak) | R | R | CRUD | R | CRUD |
| **Master Stok & Logistik APD** | - | - | R (Standar) | CRUA | - | CRUD |
| **Audit 5R / 5S Wilayah** | R | CRU | CRU | CRUA | R | CRUD |
| **Inovasi Kaizen** | CR | RUA | RUA | RUA | RUA | CRUD |
| **Tindakan Disipliner (SP)** | R (Diri) | CR | CRU (Review) | - | CRUA | CRUD |
| **Reward Marketplace (Belanja)** | CR (Tukar) | CR (Tukar) | CR (Tukar) | CR (Tukar) | CR (Tukar) | CRUD |
| **Reward Fulfillment (Serah Fisik)** | - | - | - | CRUA | R | CRUD |
| **Laporan Audit Eksekutif (PDF)** | - | R | CRUA (K3/SIO) | CRUA (5S/APD) | CRUA (BIB/HR) | CRUA (Semua) |
| **Konfigurasi Master & Sistem** | - | - | - | - | - | CRUD |

---

## 5. ARSITEKTUR TEKNIS IMPLEMENTASI

### 5.1 Definisi Tipe Sistem Role (`types/assessment.ts`)
```typescript
export type SystemRole = 
  | 'worker'      // Operator, Checker, PIC Area
  | 'supervisor'  // Pengawas Operasional Gudang
  | 'hse'         // HSE / EHS Specialist
  | 'ga'          // General Affairs & Facility
  | 'hr'          // HR & Training Specialist
  | 'admin';      // System Administrator
```

### 5.2 Resolusi Role Otomatis (`RoleEntity.ts`)
Fungsi `resolveSystemRole(roleName: string): SystemRole` diperluas dengan mengenali kata kunci jabatan:
- **`admin`**: "system administrator", "sysadmin", "it admin".
- **`hse`**: mengandung "hse", "ehs", "k3", "safety officer", "safety inspector".
- **`ga`**: mengandung "general affairs", "ga officer", "fasilitas", "facility", "maintenance lead".
- **`hr`**: mengandung "hr", "human resources", "people development", "trainer", "training".
- **`supervisor`**: mengandung "supervisor", "pengawas", "head", "spv", "section manager".
- **`worker`**: operator, checker, admin wfg/wrm/timbangan, pic area, dan staf operasional lainnya.

### 5.3 Komposisi Antarmuka (Composable Navigation & Consoles)
Alih-alih membuat konsol monolitik baru yang terpisah, sistem akan menggunakan arsitektur **Composable Sub-Panels with Permission Guard**:

1. **`RoleGuard.tsx`**: Komponen pembungkus otorisasi berbasis hak akses:
   ```tsx
   <RoleGuard allowedRoles={['hse', 'admin']} userRole={currentRole} fallback={<AccessDenied />}>
     <SupervisorIncidentKanban />
   </RoleGuard>
   ```

2. **Peran di Dropdown Navigasi (`Navbar.tsx`)**:
   Pengguna dengan hak lebih tinggi dapat berpindah tampilan sesuai fungsi yang dibutuhkan:
   - Admin dapat memilih semua tampilan (`worker`, `supervisor`, `hse`, `ga`, `hr`, `admin`).
   - HSE dapat memilih `worker` dan `hse`.
   - GA dapat memilih `worker` dan `ga`.
   - HR dapat memilih `worker` dan `hr`.
   - Supervisor dapat memilih `worker` dan `supervisor`.
   - Worker hanya berada di tampilan `worker`.

3. **Struktur Tab Menu Konsol Baru**:
   - **HSE Console**: Tab Insiden K3 & CAPA, Gemba Walk, SIO MHE, APD Kepatuhan, Laporan Eksekutif K3.
   - **GA Console**: Tab Master Stok APD, Audit 5R/5S Fasilitas, Pemeliharaan Darurat, Logistik Klaim Reward.
   - **HR Console**: Tab Matriks BIB Tim, SOP & Kurikulum Kuis, Sanksi Disipliner SP, Analisis Gap Pelatihan.

---

## 6. TAHAPAN EKSEKUSI (PHASED ROADMAP)

### Fase 1: Fondasi RBAC & Role Taxonomy (Prioritas 1)
- [ ] Perluas `SystemRole` di `types/assessment.ts` (`hse`, `ga`, `hr`).
- [ ] Perbarui `RoleEntity.resolveSystemRole()` dan daftarkan master role di `RoleEntity.createDefaultRoles()`.
- [ ] Update `Navbar.tsx` untuk menampilkan badge dan navigasi switcher untuk role baru.
- [ ] Buat hook otorisasi `usePermission(requiredPermission)` untuk pengecekan hak aksi.

### Fase 2: Pembangunan Konsol Khusus (HSE, GA, HR) (Prioritas 2)
- [ ] Buat `HseConsole.tsx`: Agregasi modul Insiden, Safety Patrol, SIO MHE, APD, dan Laporan K3.
- [ ] Buat `GaConsole.tsx`: Agregasi modul Inventaris APD, Audit 5S Gudang, dan Fulfillment Reward.
- [ ] Buat `HrConsole.tsx`: Agregasi modul Evaluasi Kompetensi, Kurikulum SOP, dan Disipliner SP.
- [ ] Hubungkan routing view di `App.tsx`.

### Fase 3: Fitur Spesialis Lanjutan (Prioritas 3)
- [ ] Form Investigasi 5-Why & Fishbone pada modul Insiden (eksklusif HSE).
- [ ] Sistem Reorder Point (ROP) & Minimum Stock Alert pada modul APD (eksklusif GA).
- [ ] Modul Kurikulum & Bank Soal Kuis Dinamis (eksklusif HR).
- [ ] Digital Signature & Verifikasi OTP saat serah-terima fisik Reward (GA & Worker).

---

## 7. KESIMPULAN & REKOMENDASI

Pemisahan role ke dalam 6 kategori spesifik (`worker`, `supervisor`, `hse`, `ga`, `hr`, `admin`):
1. Menyelaraskan platform dengan struktur organisasi nyata PT. DAYA ANUGRAH MULYA.
2. Memastikan pemenuhan standar audit ISO 45001 & regulasi Kemnaker RI tanpa kompromi keamanan data.
3. Memberikan pengalaman pengguna yang bersih dan relevan bagi masing-masing departemen tanpa tumpang tindih fungsi.
