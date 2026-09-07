# Dokumentasi Peran, Hak Akses, dan Fitur Sistem BIB
*(Behavior, Integrity, Benchmark — Multi-Role RBAC Enterprise Matrix)*

Dokumen ini menjelaskan arsitektur **Role-Based Access Control (RBAC)** pada aplikasi **BIB Warehouse Assessment System**, memetakan 6 peran sistem (*system roles*), tujuan bisnis masing-masing, hak akses (*authorization matrix*), fitur-fitur yang didapatkan, konsol yang diakses, serta mekanisme pendaftaran dan mutasi akun.

---

## 1. Arsitektur & Prinsip Pemisahan Tugas (Separation of Duties)

Sistem BIB menerapkan prinsip **Separation of Duties (SoD)** dan standar industri pergudangan modern (mengacu pada **ISO 45001:2018 K3**, **ISO 9001:2015 Mutu**, serta **Permenaker RI No. 8/2020** tentang Keselamatan & Kesehatan Kerja Pesawat Angkat & Pesawat Angkut).

Sistem membedakan antara **Jabatan Lapangan (*Operational Title*)** dan **Peran Otorisasi Sistem (*System Role*)**:
- **Jabatan Lapangan** adalah titel kerja fungsional pegawai (contoh: *Operator Forklift*, *Checker WSP*, *HSE Officer*, *Admin GA*, dll).
- **Peran Otorisasi Sistem** adalah level keamanan teknis yang menentukan konsol mana yang dapat dibuka dan aksi apa saja yang boleh dieksekusi di database. Pemetaan dilakukan otomatis secara deterministik melalui [`RoleEntity.resolveSystemRole()`](file:///d:/Coding%20Session/Komar/src/domain/RoleEntity.ts#L49-L114).

```
                      ┌────────────────────────────────────────┐
                      │          SYSTEM ADMINISTRATOR          │
                      │  Supervisi Total 6 Konsol & Konfigurasi│
                      └───────────────────┬────────────────────┘
                                          │
        ┌───────────────────┬─────────────┴───────┬───────────────────┐
        ▼                   ▼                     ▼                   ▼
┌───────────────┐   ┌───────────────┐     ┌───────────────┐   ┌───────────────┐
│  SUPERVISOR   │   │ HSE / EHS     │     │ GENERAL       │   │ HR & TRAINING │
│  Pengawas     │   │ K3 & Insiden, │     │ AFFAIRS (GA)  │   │ Kompetensi,   │
│  Operasional, │   │ Lisensi SIO   │     │ Sarana, 5R/5S,│   │ SOP & Disiplin│
│  Audit Tim BIB│   │ Kemnaker      │     │ Stok APD      │   │ SP Karyawan   │
└───────┬───────┘   └───────┬───────┘     └───────┬───────┘   └───────┬───────┘
        │                   │                     │                   │
        └───────────────────┼─────────────────────┴───────────────────┘
                            ▼
              ┌───────────────────────────┐
              │    OPERATIONAL WORKER     │
              │  Shopfloor, Forklift/MHE, │
              │  Checker, Quiz, Kudo,     │
              │  Insiden & Marketplace    │
              └───────────────────────────┘
```

---

## 2. Rincian 6 Peran Sistem (*System Roles*)

### 2.1. Operational Worker (`worker`)

*Peran garda terdepan di lantai gudang yang menjalankan aktivitas operasional harian.*

- **Jabatan Lapangan Terkait**:
  - `Operator Forklift` (WFG / WRM / WSP)
  - `Operator Reachtruck` (WFG)
  - `Checker WFG` (Warehouse Finished Goods)
  - `Checker WRM` (Warehouse Raw Material)
  - `Checker WSP` (Warehouse Sparepart)
  - `PIC Area` (Gudang & Loading Dock)
  - `Admin WFG`, `Admin WRM`, `Admin WSP`, `Admin Timbangan`, `Admin Ekspedisi`
- **Tujuan & Kegunaan**:
  - Menjalankan rutinitas keselamatan sebelum bekerja (*pre-shift checklist*).
  - Meningkatkan pemahaman K3 & SOP melalui kuis gamifikasi harian.
  - Melaporkan kejadian darurat atau *near-miss* secara instan dari lapangan.
  - Memperoleh poin BIB dan mengklaim reward apresiasi atas kepatuhan kerja.
- **Konsol Utama**: **Worker Dashboard / Shopfloor Portal**
- **Fitur Lengkap yang Didapatkan**:
  1. **Daily Pre-Shift Checklist**: Inspeksi visual harian kondisi alat berat (forklift/reachtruck) atau area kerja sebelum shift dimulai dengan bukti digital.
  2. **Daily Quiz Gamifikasi**: Kuis harian (3-5 soal) seputar K3, SOP gudang, dan 5R untuk memperoleh Poin BIB dan menjaga *Quiz Streak*.
  3. **Pelaporan Insiden & Near-Miss**: Formulir cepat pelaporan bahaya, kecelakaan kerja, atau kejadian hampir celaka (*near-miss*) langsung dari gawai lapangan.
  4. **BIB Reward Marketplace**: Katalog penukaran Poin BIB dengan reward nyata (Voucher Belanja, Sembako, Merchandise, Saldo E-Wallet, Pulsa).
  5. **BIB Radar Chart & Skor Pribadi**: Visualisasi skor 3 pilar: *Behavior* (perilaku K3), *Integrity* (kejujuran & absensi), dan *Benchmark* (akurasi & produktivitas kerja).
  6. **Digital ID Card & QR Badge**: Kartu identitas digital pekerja ber-QR Code untuk pemindaian absensi, audit mendadak, atau verifikasi lisensi.
  7. **Upload & Status Lisensi SIO MHE**: Mengunggah foto/dokumen SIO (Surat Izin Operator) Kemnaker RI dan memantau masa berlakunya.
  8. **Pelaporan Kerusakan & Permohonan APD**: Mengajukan penggantian alat pelindung diri (helm, rompi, sepatu *safety*, sarung tangan) yang rusak atau aus.
  9. **Pengajuan Usulan Kaizen**: Mengirimkan ide inovasi perbaikan tata letak, alur kerja, atau keselamatan kerja di area masing-masing.
  10. **Shift Handover Digital**: Mencatat serah terima tugas, muatan tertunda, dan kendala alat antar giliran kerja (*shift*).
  11. **Kudo Wall (Peer Recognition)**: Saling memberikan kartu ucapan terima kasih (*Kudo*) antar rekan kerja untuk membangun budaya suportif.
  12. **SOP Slideshow & Digital Library**: Membaca panduan operasional standar dan materi K3 resmi kapan saja.
  13. **PWA Offline Mode**: Aplikasi tetap dapat digunakan mencatat checklist atau laporan saat koneksi sinyal gudang terputus (*offline queue sync*).

---

### 2.2. Operational Supervisor (`supervisor`)

*Pengawas operasional lapangan yang mengendalikan ritme kerja tim, produktivitas, serta penegakan standar disiplin dan keselamatan.*

- **Jabatan Lapangan Terkait**:
  - `Supervisor Logistik`
  - `Supervisor WFG`
  - `Supervisor WRM`
  - `Supervisor WSP` (Warehouse Sparepart)
  - `Section Head / Pengawas Lapangan`
- **Tujuan & Kegunaan**:
  - Memastikan seluruh anggota regu kerja mematuhi standar operasional dan keselamatan.
  - Melakukan audit berkala matriks kompetensi 54-item pada masing-masing anggota regu.
  - Menindaklanjuti dan memvalidasi insiden kerja tingkat seksi sebelum dieskalasi.
  - Menyetujui usulan perbaikan (*Kaizen*) anggota tim untuk diimplementasikan.
- **Konsol Utama**: **Supervisor Console** (dapat beralih ke *Shopfloor Portal* melalui Navbar Switcher)
- **Fitur Lengkap yang Didapatkan**:
  1. **Monitoring & Evaluasi Tim**: Dashboard matriks performa regu, grafik radar kolektif, perolehan poin, dan status tier anggota.
  2. **Audit 54-Item Matriks Kompetensi BIB**: Melakukan penilaian audit berkala pada 54 indikator perilaku, integritas, dan tolok ukur teknis dengan kalkulasi skor otomatis.
  3. **Competency Gap Analysis Modal**: Diagnosa mendalam selisih nilai riil pekerja vs target standar divisi untuk rekomendasi pelatihan.
  4. **QR Badge Scanner**: Memindai ID Card digital karyawan menggunakan kamera ponsel/tablet saat patroli untuk langsung membuka profil audit.
  5. **Supervisor Incident Kanban**: Memvalidasi laporan insiden regu, menentukan tingkat keparahan (*severity*), dan menetapkan tindakan perbaikan langsung (CAPA).
  6. **Safety Patrol (Gemba Walk)**: Melakukan inspeksi keliling area gudang dengan checklist temuan bahaya dan dokumentasi foto.
  7. **Kaizen Review Board**: Memeriksa, memberi masukan, menyetujui, atau menolak usulan inovasi kerja dari pekerja lapangan.
  8. **Pemantauan Kepatuhan Lisensi SIO Tim**: Memantau daftar masa berlaku SIO operator forklift/reachtruck di bawah supervisinya agar tidak ada operator berlisensi kadaluwarsa yang beroperasi.
  9. **Permohonan & Rekomendasi APD Tim**: Memverifikasi kebutuhan alat pelindung diri staf regu sebelum diserahkan ke General Affairs.
  10. **Pemberian Sanksi Disiplin Regu**: Menerbitkan usulan konseling, teguran lisan, atau eskalasi Surat Peringatan (SP) ke bagian HR.
  11. **Audit 5R/5S Wilayah**: Memeriksa kebersihan dan kerapian zona kerja seksi masing-masing.
  12. **Ekspor Laporan PDF Kinerja Tim**: Mencetak laporan evaluasi tim resmi berformat PDF berstandar eksekutif.

---

### 2.3. HSE / EHS Specialist (`hse`)

*Spesialis Keselamatan, Kesehatan Kerja, dan Lingkungan Hidup (K3L) yang bertanggung jawab atas kepatuhan regulasi pemerintah, investigasi insiden, dan target Zero Accident.*

- **Jabatan Lapangan Terkait**:
  - `HSE Officer`
  - `EHS Specialist`
  - `Ahli K3 Umum / Spesialis K3 Pesawat Angkat Angkut`
  - `Safety Inspector / Safety Officer`
- **Tujuan & Kegunaan**:
  - Memimpin investigasi menyeluruh atas seluruh kecelakaan, insiden, dan potensi bahaya (*near-miss*).
  - Melakukan validasi legalitas Surat Izin Operator (SIO) Pesawat Angkat & Angkut Kemnaker RI.
  - Melaksanakan audit kepatuhan APD dan inspeksi keselamatan lapangan (*Safety Patrol*).
  - Menyusun dan menandatangani Laporan Resmi K3 untuk audit ISO 45001 dan instansi pengawas ketenagakerjaan.
- **Konsol Utama**: **HSE Console** (dapat beralih ke *Shopfloor Portal*)
- **Fitur Lengkap yang Didapatkan**:
  1. **Pusat Komando Investigasi Insiden**: Papan kendali insiden terpadu untuk menganalisis akar masalah (*Root Cause Analysis* menggunakan metode 5-Why atau Fishbone).
  2. **Validasi CAPA & Pengesahan Tindakan Korektif**: Menyusun, menugaskan, dan menandatangani *Corrective and Preventive Actions* (CAPA) yang mengikat operasional.
  3. **Verifikasi Lisensi SIO Operator MHE Kemnaker**:
     - Memeriksa keaslian dokumen SIO (Kelas I, Kelas II) yang diunggah operator.
     - Mengubah status lisensi (*Valid*, *Under Review*, *Expired*, *Revoked*).
     - Notifikasi peringatan masa kadaluwarsa (H-60, H-30 hari) untuk penjadwalan perpanjangan (*recertification*).
  4. **Audit Kelayakan & Kepatuhan APD Wajib**: Memastikan standar spesifikasi teknis APD (standar SNI/ANSI) yang beredar di gudang memenuhi kriteria bahaya kerja.
  5. **Safety Patrol & Gemba Walk Kanban**: Melakukan patroli K3 terjadwal dengan pelacakan status penanganan temuan bahaya (*Open*, *Investigating*, *Mitigated*, *Closed*).
  6. **Penandatanganan Laporan Eksekutif K3**: Menerbitkan dan menandatangani dokumen PDF resmi:
     - *K3 Incident & Near-Miss Official Investigation Report*.
     - *MHE Operator SIO Compliance Audit Report*.
  7. **Rekomendasi Disiplin Pelanggaran K3**: Mengajukan sanksi disiplin tegas terhadap pelanggaran fatal K3 (seperti mengoperasikan forklift tanpa SIO atau tidak memakai safety belt).

---

### 2.4. General Affairs & Facility Officer (`ga`)

*Penanggung jawab sarana prasarana fisik pergudangan, logistik perlengkapan kerja (APD), standarisasi 5R/5S lingkungan, dan pemenuhan hadiah karyawan.*

- **Jabatan Lapangan Terkait**:
  - `GA & Facility Officer`
  - `Admin GA`
  - `Facility Maintenance Lead`
  - `General Affairs Supervisor`
- **Tujuan & Kegunaan**:
  - Mengelola ketersediaan, stok gudang, batas pemesanan ulang (*reorder level*), dan distribusi APD.
  - Memimpin audit kebersihan, kerapian, dan keteraturan tata letak fasilitas gudang (standar 5R/5S Jepang).
  - Menjamin kelancaran penyerahan fisik hadiah yang ditukarkan karyawan dari BIB Reward Marketplace.
  - Memelihara fasilitas umum gudang (loading dock, penerangan, jalur pedestrian, marka lantai).
- **Konsol Utama**: **GA Console** (dapat beralih ke *Shopfloor Portal*)
- **Fitur Lengkap yang Didapatkan**:
  1. **Master Manajemen Stok & Inventaris APD**:
     - Mencatat kuantitas fisik APD (Helm, Rompi Reflektif, Sepatu Baja, Sarung Tangan, Masker).
     - Menetapkan ambang batas *minimum reorder level* untuk mencegah kehabisan stok perlengkapan wajib.
     - Menyetujui dan mencatat distribusi penggantian APD rusak kepada pekerja.
  2. **Audit Komprehensif 5R / 5S Fasilitas Gudang**:
     - Melakukan penilaian berkala 5 pilar: *Ringkas* (Seiri), *Rapi* (Seiton), *Resik* (Seiso), *Rawat* (Seiketsu), dan *Rajin* (Shitsuke).
     - Menilai per zona area (Gudang WFG, Gudang WRM, Gudang Sparepart WSP, Area Staging, Loading Dock, Jalur Forklift).
     - Mengunggah foto bukti ketidaksesuaian (*non-compliance*) dan menetapkan target waktu penyelesaian.
  3. **Manajemen Katalog & Pemenuhan Fisik Reward (Fulfillment)**:
     - Mengelola stok barang hadiah BIB Reward Marketplace (sembako, tumbler, jaket, voucher belanja).
     - Memverifikasi voucher QR Code yang dibawa karyawan dan menandai status transaksi menjadi *Fulfilled* (Sudah Diserahkan).
     - Mengontrol anggaran fisik program apresiasi karyawan.
  4. **Penandatanganan Laporan Eksekutif GA**:
     - *PPE Master Stock & Consumption Audit Report*.
     - *BIB Reward Budget & Fulfillment Reconciliation Report*.
     - *Warehouse 5R/5S Facility Cleanliness Scorecard*.

---

### 2.5. HR & Training Specialist (`hr`)

*Spesialis pengembangan sumber daya manusia yang mengelola kurikulum kompetensi, pelatihan K3 Academy, serta penegakan disiplin dan regulasi ketenagakerjaan.*

- **Jabatan Lapangan Terkait**:
  - `HR & Training Specialist`
  - `People Development Lead`
  - `HR Officer / HRD`
  - `Technical Trainer Pergudangan`
- **Tujuan & Kegunaan**:
  - Menganalisis kesenjangan keterampilan (*skill gap*) seluruh staf pergudangan berbasis data riil matriks BIB.
  - Menyusun kurikulum modul SOP digital dan bank materi kuis harian.
  - Menerbitkan dan mengelola sanksi disipliner formal (Surat Peringatan 1, 2, 3, Skorsing, atau Konseling).
  - Mengelola data profil kepegawaian dan riwayat pengembangan karir karyawan.
- **Konsol Utama**: **HR Console** (dapat beralih ke *Shopfloor Portal*)
- **Fitur Lengkap yang Didapatkan**:
  1. **Matriks Kompetensi Pegawai & Analisis Kesenjangan (Gap Analysis)**:
     - Akses menyeluruh data 54 indikator kompetensi seluruh staf lintas divisi (WFG, WRM, WSP, Timbangan, Ekspedisi).
     - Menghitung rasio kesenjangan antara kompetensi aktual dengan profil standar jabatan (*Job Profile Gap*).
     - Mengidentifikasi kandidat pekerja berprestasi tinggi (*High Potential Workers*) untuk jenjang karir.
  2. **Kurikulum SOP Digital & Edukasi K3**:
     - Menerbitkan dokumen Standar Operasional Prosedur (SOP) digital yang dapat dibaca pekerja di aplikasi.
     - Menyusun materi pembelajaran interaktif (*SOP Slideshow*) dengan kuis evaluasi pemahaman.
     - Mengatur kalender pelatihan penyegaran (*refresher training*) untuk operator alat berat.
  3. **Manajemen Penindakan Disipliner (Disciplinary System)**:
     - Menerbitkan dokumen sanksi resmi: Surat Peringatan I (SP 1), SP 2, SP 3, Konseling Pembinaan, atau Skorsing.
     - Mencatat kronologi pelanggaran, bukti dokumen, dan tenggat waktu masa berlaku sanksi (6 bulan sesuai UU Ketenagakerjaan).
     - Mengintegrasikan sanksi dengan pengurangan skor *Integrity* pada matriks BIB pekerja bersangkutan.
  4. **Penandatanganan Laporan Eksekutif HR**:
     - *Warehouse Workforce Competency Matrix & Gap Analysis Report*.
     - *Training Needs Analysis (TNA) & Disciplinary Action Summary Report*.

---

### 2.6. System Administrator (`admin`)

*Pengelola sistem teknologi informasi tertinggi yang memiliki kendali operasional, arsitektur data, keamanan platform, dan supervisi lintas seluruh fungsi bisnis.*

- **Jabatan Lapangan Terkait**:
  - `System Administrator`
  - `Sysadmin / IT Operations Lead`
  - `App Administrator`
- **Tujuan & Kegunaan**:
  - Memastikan platform berjalan prima, aman, dan mematuhi tata kelola data perusahaan.
  - Memiliki akses pengawasan (*supervisory override*) ke seluruh 6 konsol sistem.
  - Mengelola siklus hidup akun pengguna (registrasi tunggal, persetujuan mandiri, mutasi divisi, reset akun).
  - Mengonfigurasi parameter sistem, bobot skor matriks, master data divisi & role, serta AI Quiz Generator.
- **Konsol Utama**: **Admin Console** (Dapat beralih bebas ke **seluruh 6 konsol**: Admin, Supervisor, HSE, GA, HR, Worker)
- **Fitur Lengkap yang Didapatkan**:
  1. **Role Switcher Universal**: Membuka dan mengoperasikan konsol peran manapun secara langsung melalui *Navbar Role Selector*.
  2. **Dedicated Single Staff Creator Modal (`+ Tambah Pegawai`)**:
     - Mendaftarkan pegawai baru secara langsung satu per satu.
     - Mengatur NIK, Nama, Password awal, Divisi, Role (pilihan baku atau `+ Ketik Kustom`), dan Tier awal.
     - Akun langsung aktif seketika tanpa perlu proses approval berbelit.
  3. **Mutasi Pegawai & Clean Slate Reset Protocol**:
     - Mengubah divisi atau role fungsional pegawai yang berpindah tugas.
     - Fitur *Clean Slate Reset* opsional untuk menghapus riwayat audit lama agar penilaian di divisi baru benar-benar bersih dan adil.
  4. **Manajemen Akun Multi-Administrator**:
     - Menambah, mengubah password, atau mencabut hak akses rekan sysadmin lain.
     - Memantau log aktivitas sistem (*audit trail*) yang merekam setiap tindakan penting.
  5. **Master Data Divisi & Role**:
     - Menambah, mengedit, atau menonaktifkan kode divisi (WFG, WRM, WSP, GA, dll).
     - Menambah peran operasional baru sesuai struktur organisasi gudang yang berkembang.
  6. **Konfigurasi Parameter Sistem (System Config)**:
     - Mengatur bobot pembagian nilai pilar BIB (Behavior %, Integrity %, Benchmark %).
     - Mengatur ambang batas poin kenaikan Tier (Bronze, Silver, Gold, Platinum).
     - Mengatur nilai poin per kuis harian, bonus checklist, dan sanksi pemotongan poin.
  7. **AI Quiz Generator (Google Gemini Integration)**:
     - Membuat puluhan soal kuis K3 dan SOP gudang otomatis menggunakan kecerdasan buatan berbasis topik atau dokumen SOP yang diunggah.
  8. **Master Pengumuman & Notifikasi Global**:
     - Menerbitkan banner pengumuman darurat atau informasi operasional yang muncul di dashboard seluruh pengguna.
  9. **Supervisi Penuh Seluruh Modul**: Akses tak terbatas ke modul Insiden, SIO, APD, 5R, Kaizen, Disiplin, dan Katalog Reward.

---

## 3. Matriks Hak Akses & Otorisasi Lengkap (*Action Matrix*)

Tabel berikut mendefinisikan secara pasti apa yang diizinkan (`✓`) dan dilarang (`✗`) untuk setiap peran, mengacu langsung pada kode sumber [`PermissionService.ts`](file:///d:/Coding%20Session/Komar/src/domain/PermissionService.ts):

| Modul / Tindakan Sistem | Worker | Supervisor | HSE | GA | HR | Admin | Catatan Otorisasi Teknis |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :--- |
| **Isi Pre-shift Checklist Harian** | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | Terbuka untuk seluruh personil yang memulai giliran kerja |
| **Kerjakan Kuis Harian & Kumpulkan Poin** | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | Gamifikasi evaluasi terbuka untuk semua akun |
| **Lapor Insiden K3 & Near-Miss** | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | Siapapun wajib melapor jika melihat bahaya |
| **Validasi Insiden & Tetapkan CAPA** | ✗ | ✓ | ✓ | ✗ | ✗ | ✓ | Otoritas: HSE Specialist, Supervisor & Sysadmin |
| **Safety Patrol (Gemba Walk) Lapangan** | ✗ | ✓ | ✓ | ✗ | ✗ | ✓ | Pengawasan fisik lapangan oleh Pengawas & Ahli K3 |
| **Unggah Dokumen SIO Mandiri** | ✓ | ✓ | ✗ | ✗ | ✗ | ✓ | Khusus operator alat berat pemilik lisensi |
| **Verifikasi, Setujui & Cabut SIO Kemnaker** | ✗ | ✗ | ✓ | ✗ | ✗ | ✓ | Eksklusif untuk HSE Specialist & Sysadmin |
| **Lapor APD Rusak & Minta Penggantian** | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | Hak dasar seluruh karyawan lapangan |
| **Kelola Master Stok & Pengadaan APD** | ✗ | ✗ | ✗ | ✓ | ✗ | ✓ | Tanggung jawab departemen General Affairs (GA) |
| **Lakukan Audit 5R / 5S Fasilitas Gudang** | ✗ | ✓ | ✓ | ✓ | ✗ | ✓ | GA Officer, HSE Specialist, Supervisor & Sysadmin |
| **Ajukan Usulan Kaizen Inovasi** | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | Terbuka bagi seluruh insan gudang |
| **Review & Setujui Usulan Kaizen** | ✗ | ✓ | ✗ | ✗ | ✗ | ✓ | Supervisor seksi terkait yang memvalidasi efektivitas ide |
| **Kirim Apresiasi Kudo Rekan Kerja** | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | Fitur penguatan budaya kerja positif |
| **Tukar Poin BIB dengan Hadiah** | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | Menukarkan poin sah yang telah dikumpulkan |
| **Serah-Terima & Verifikasi Fisik Hadiah** | ✗ | ✗ | ✗ | ✓ | ✗ | ✓ | Petugas GA menyerahkan fisik barang dan scan voucher |
| **Audit 54-Item Matriks Kompetensi BIB** | ✗ | ✓ | ✗ | ✗ | ✓ | ✓ | Supervisor operasional regu & HR Specialist |
| **Terbitkan Sanksi Disipliner (SP 1, 2, 3)** | ✗ | ✓* | ✗ | ✗ | ✓ | ✓ | HR Specialist & Sysadmin (*Supervisor hanya merekomendasikan) |
| **Kelola Kurikulum SOP & Bank Soal Kuis** | ✗ | ✗ | ✗ | ✗ | ✓ | ✓ | Divisi People Development / HR & Sysadmin |
| **Tanda Tangan Laporan Eksekutif K3** | ✗ | ✗ | ✓ | ✗ | ✗ | ✓ | HSE Specialist mengesahkan laporan insiden & SIO |
| **Tanda Tangan Laporan Eksekutif GA** | ✗ | ✗ | ✗ | ✓ | ✗ | ✓ | GA Officer mengesahkan inventaris APD & anggaran reward |
| **Tanda Tangan Laporan Eksekutif HR** | ✗ | ✗ | ✗ | ✗ | ✓ | ✓ | HR mengesahkan matriks kompetensi & gap analysis |
| **Tambah Pegawai / Mutasi / Reset Akun** | ✗ | ✗ | ✗ | ✗ | ✗ | ✓ | Hak eksklusif System Administrator |
| **Konfigurasi Parameter Sistem & AI Quiz** | ✗ | ✗ | ✗ | ✗ | ✗ | ✓ | Hak eksklusif System Administrator |

---

## 4. Mekanisme Pendaftaran & Penetapan Peran (*User Onboarding*)

Aplikasi BIB menyediakan **3 jalur pendaftaran dan pengelolaan peran**:

```
JALUR 1: Registrasi Mandiri Karyawan Baru
Form Login Modal ──► Pilih Divisi & Role ──► Auto-Resolve Role ──► Masuk Dashboard

JALUR 2: Registrasi Terpusat oleh Administrator
Admin Staff Panel ──► Tombol "+ Tambah Pegawai" ──► Input Lengkap & Role Kustom ──► Akun Aktif Seketika

JALUR 3: Mutasi Jabatan & Protokol Clean Slate
Admin Staff Panel ──► Edit Pegawai ──► Ubah Divisi/Role ──► [Opsi] Reset Skor Lama ──► Transisi Selesai
```

### 4.1. Jalur 1: Registrasi Mandiri Pegawai (*Self-Registration*)
1. Karyawan membuka aplikasi dan menekan tombol **"Daftar Akun Baru"** pada modal autentikasi.
2. Karyawan mengisi identitas: **NIK**, **Nama Lengkap**, **Password**, **Divisi**, dan **Peran Lapangan**.
3. Sistem secara otomatis menjalankan [`RoleEntity.resolveSystemRole()`](file:///d:/Coding%20Session/Komar/src/domain/RoleEntity.ts#L49):
   - **Karyawan Biasa (`worker`)**: Jika memilih role lini depan (*Operator Forklift*, *Reach Truck*, *Checker*, *PIC Area*, *Admin Divisi*), akun **langsung aktif (`active`)** dan pengguna diarahkan ke **Worker Portal**.
   - **Bukan Karyawan Biasa (`supervisor`, `hse`, `ga`, `hr`, `admin`)**: Jika memilih peran pengawas atau spesialis, sistem **otomatis mengunci akun pada status antrean `pending_approval`**. Pengguna tidak dapat login sebelum diverifikasi dan disetujui oleh Administrator di panel **Approval Akun Khusus**. Form registrasi akan menampilkan banner peringatan dan notifikasi pendaftaran khusus.

### 4.2. Jalur 2: Penambahan Pegawai oleh Administrator (*Admin Dedicated Creator*)
1. Administrator membuka **Admin Console** ➔ Tab **Pegawai** (*Workers*).
2. Menekan tombol hijau **`+ Tambah Pegawai`**.
3. Mengisi data lengkap karyawan:
   - **NIK / ID Pegawai**: Harus unik di database.
   - **Nama Lengkap**: Nama resmi karyawan.
   - **Password Awal**: Kredensial masuk yang aman.
   - **Divisi**: Memilih divisi kerja (WFG, WRM, WSP, TIMBANGAN, EXPEDISI, GA).
   - **Role / Jabatan**: Memilih dari opsi baku atau mencentang **`+ Ketik Kustom`** untuk mengetikkan nama jabatan spesifik baru (misal: *Checker Retur Sparepart*, *Senior Safety Inspector*).
   - **Tier Awal**: Menentukan level awal (*Bronze*, *Silver*, *Gold*, *Platinum*).
4. Menekan **"Simpan & Daftarkan Pegawai"**. Akun tersimpan di Supabase dengan status `active` dan hash otentikasi siap pakai.

### 4.3. Jalur 3: Mutasi Jabatan & *Clean Slate Reset Protocol*
1. Ketika karyawan dipromosikan (misal: dari *Operator Forklift* menjadi *Supervisor Logistik*) atau dipindahtugaskan antar divisi (misal: dari *Checker WRM* ke *Checker WSP*), Administrator membuka menu edit pegawai.
2. Administrator mengubah Divisi dan Jabatan baru.
3. Administrator dapat mengaktifkan opsi **Clean Slate Reset Protocol**:
   - Membersihkan rekam jejak penilaian audit divisi lama agar tidak menimbulkan distorsi benchmarking di divisi baru.
   - Tetap mempertahankan Poin BIB dan Badge penghargaan yang telah diraih karyawan sebagai bentuk apresiasi prestasi masa lalu.

---

## 5. Pemetaan Divisi Gudang (*Division Hierarchy*)

Sistem BIB dirancang secara khusus untuk fasilitas rantai pasok modern dengan divisi kerja berikut:

1. **WFG — Warehouse Finished Goods**:
   - Area penyimpanan produk jadi siap kirim.
   - Armada: Forklift Counterbalance, Reach Truck High Bay.
   - Peran Utama: Operator Forklift, Operator Reachtruck, Checker WFG, Admin WFG, Supervisor Logistik.
2. **WRM — Warehouse Raw Material**:
   - Area penerimaan dan penyimpanan bahan baku produksi.
   - Peran Utama: Checker WRM, PIC Area, Admin WRM, Supervisor WRM.
3. **WSP — Warehouse Sparepart**:
   - Area penyimpanan suku cadang mesin, komponen mekanikal/elektrikal, dan consumable pabrik.
   - Peran Utama: Checker WSP, Admin WSP, Operator Forklift WSP, Supervisor WSP.
4. **TIMBANGAN — Weighbridge Operations**:
   - Area penimbangan armada muatan curah dan verifikasi tonase truk.
   - Peran Utama: Admin Timbangan.
5. **EXPEDISI — Outbound Dispatch & Transport**:
   - Area penyiapan dokumen jalan, manifest ekspedisi, dan koordinasi supir truk luar.
   - Peran Utama: Admin Ekspedisi.
6. **GA — General Affairs & Support Facility**:
   - Departemen pendukung fasilitas umum, K3L, dan pengelolaan sumber daya manusia.
   - Peran Utama: HSE Officer, GA & Facility Officer, HR & Training Specialist.

---

## 6. Standar Kepatuhan yang Didukung (*Compliance Alignment*)

Arsitektur peran dan fitur dalam dokumen ini memenuhi klausul standar internasional:
- **ISO 45001:2018 (Sistem Manajemen K3)**:
  - *Klausul 5.4*: Partisipasi dan konsultasi pekerja (diwadahi lewat Laporan Insiden, Kuis Harian, dan Usulan Kaizen).
  - *Klausul 7.2*: Kompetensi kerja (diwadahi lewat Matriks Kompetensi 54-Item BIB dan Verifikasi Lisensi SIO Kemnaker).
  - *Klausul 10.2*: Insiden, ketidaksesuaian, dan tindakan korektif (diwadahi lewat HSE Console Investigasi & CAPA).
- **ISO 9001:2015 (Sistem Manajemen Mutu)**:
  - *Klausul 7.1.3*: Infrastruktur dan lingkungan operasional (diwadahi lewat GA Console Audit 5R/5S dan Master APD).
  - *Klausul 7.1.6*: Pengetahuan organisasi (diwadahi lewat SOP Library & Kuis Harian).
- **Peraturan Menteri Ketenagakerjaan RI No. 8 Tahun 2020**:
  - Penegakan kewajiban Lisensi K3 (SIO) bagi setiap operator yang mengoperasikan Forklift dan Reach Truck di lingkungan kerja pergudangan.

---

*Dokumen ini merupakan acuan resmi pengembangan dan operasional sistem BIB Warehouse Assessment System.*
