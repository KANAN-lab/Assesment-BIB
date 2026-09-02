import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { X, ShieldCheck, CheckSquare, Square, AlertCircle, Award, UserCheck } from 'lucide-react';

interface ChecklistDetailModalProps {
  onClose: () => void;
  onCompleteChecklist: () => void;
  streakDays: number;
  workerRole?: string;
  workerDivision?: string;
}

export interface ChecklistItem {
  id: string;
  category: 'Safety APD' | 'Kondisi Peralatan & Sistem' | 'Dokumen & Legal SOP';
  label: string;
  description: string;
}

export function getPreShiftChecklistForRole(role: string = '', division: string = ''): ChecklistItem[] {
  const r = role.toLowerCase().trim();
  const d = division.toLowerCase().trim();

  // 1. SYSTEM ADMINISTRATOR / IT SYSTEM
  if (r.includes('system') || r.includes('administrator') || r.includes('sysadmin') || d.includes('system')) {
    return [
      {
        id: 'sys-1',
        category: 'Safety APD',
        label: 'Kebersihan & Suhu AC Ruang Server IT (18°C - 22°C)',
        description: 'Suhu ruang server terkontrol, ventilasi exhaust lancar, dan sensor suhu/kelembaban bekerja normal.',
      },
      {
        id: 'sys-2',
        category: 'Safety APD',
        label: 'Manajemen Kabel Listrik Server & Bebas Bahaya Arus Pendek',
        description: 'Semua kabel power terikat rapi di kabel tray, UPS cadangan online, dan tidak ada kabel terkelupas.',
      },
      {
        id: 'sys-3',
        category: 'Kondisi Peralatan & Sistem',
        label: 'Konektivitas Database Cloud & Latensi Supabase API',
        description: 'Endpoint Supabase REST API dan Database Pooler merespons dalam batas latency wajar (<200ms).',
      },
      {
        id: 'sys-4',
        category: 'Kondisi Peralatan & Sistem',
        label: 'Verifikasi Eksekusi Daily Database Backup & Storage Space',
        description: 'Snapshot snapshot harian berhasil dibuat dan sisa kapasitas database cloud >30%.',
      },
      {
        id: 'sys-5',
        category: 'Kondisi Peralatan & Sistem',
        label: 'Healthcheck Layanan Web App & SSL Certificate',
        description: 'Aplikasi platform penilaian BIB online, sertifikat HTTPS valid, dan frontend bebas downtime.',
      },
      {
        id: 'sys-6',
        category: 'Kondisi Peralatan & Sistem',
        label: 'Monitoring Log Error & Antrean Transaksi Gagal',
        description: 'Pemeriksaan log error aplikasi di console untuk memastikan tidak ada unhandled exceptions.',
      },
      {
        id: 'sys-7',
        category: 'Dokumen & Legal SOP',
        label: 'Audit Log Akses Login & Pemantauan Upaya Login Ilegal',
        description: 'Verifikasi rate limiting keamanan akun dan pemeriksaan anomali percobaan login berulang.',
      },
      {
        id: 'sys-8',
        category: 'Dokumen & Legal SOP',
        label: 'Verifikasi Deployment Versioning & SOP Disaster Recovery',
        description: 'Version hash aplikasi terverifikasi dan SOP prosedur pemulihan darurat sistem (DRP) siap aktif.',
      },
    ];
  }

  // 2. OPERATOR REACH TRUCK (High Bay Warehouse)
  if (r.includes('reach') || r.includes('reachtruck')) {
    return [
      {
        id: 'rt-1',
        category: 'Safety APD',
        label: 'APD Lengkap Operator Reach Truck (Helm, Rompi, Safety Shoes)',
        description: 'Helm safety SNI dengan tali dagu terpasang kencang, rompi high-vis, dan safety shoes berujung baja.',
      },
      {
        id: 'rt-2',
        category: 'Safety APD',
        label: 'Overhead Guard Protector & Sarung Tangan Anti-Slip',
        description: 'Atap pelindung kabin (overhead guard) bebas retak benturan dan sarung tangan grip terpasang.',
      },
      {
        id: 'rt-3',
        category: 'Kondisi Peralatan & Sistem',
        label: 'Mekanisme Scissor Reach & Silinder Mast High-Bay',
        description: 'Mast elevator naik-turun halus tanpa hentakan dan mekanisme jangkau (reach) maju-mundur presisi.',
      },
      {
        id: 'rt-4',
        category: 'Kondisi Peralatan & Sistem',
        label: 'Laser Height Pointer / Kamera Garpu (Fork Camera System)',
        description: 'Laser pemandu posisi garpu dan monitor kamera kabin menampilkan gambar jelas pada top level racking.',
      },
      {
        id: 'rt-5',
        category: 'Kondisi Peralatan & Sistem',
        label: 'Tegangan Baterai Elektrik (State of Charge >80%) & Kabel Anderson',
        description: 'Level daya baterai mencukupi untuk 1 shift penuh, soket konektor tidak panas/meleleh, dan air aki cukup.',
      },
      {
        id: 'rt-6',
        category: 'Kondisi Peralatan & Sistem',
        label: 'Sistem Kemudi 360°, Deadman Foot Pedal, & Rem Elektromagnetik',
        description: 'Pedal deadman otomatis memutus tenaga saat kaki diangkat dan respons kemudi elektrik responsif.',
      },
      {
        id: 'rt-7',
        category: 'Dokumen & Legal SOP',
        label: 'SIO (Surat Izin Operasi) Kemenaker Aktif & Logsheet Unit',
        description: 'SIO Kelas II fisik/digital aktif dan form pre-use check Reach Truck telah diisi lengkap.',
      },
      {
        id: 'rt-8',
        category: 'Dokumen & Legal SOP',
        label: 'Verifikasi Berat Muatan vs Tinggi Angkat Racking (>8 Meter)',
        description: 'Memeriksa kapasitas batas angkat (derating chart) saat mengangkat palet ke level racking tertinggi.',
      },
    ];
  }

  // 3. OPERATOR FORKLIFT (Counterbalance Diesel / Electric)
  if (r.includes('forklift') || r.includes('mhe')) {
    return [
      {
        id: 'fl-1',
        category: 'Safety APD',
        label: 'APD Lengkap (Helm Safety, Rompi High-Vis, Safety Shoes)',
        description: 'Wajib menggunakan helm proyek berstandar SNI, rompi reflektif 3M, dan sepatu safety berujung besi.',
      },
      {
        id: 'fl-2',
        category: 'Safety APD',
        label: 'Sabuk Pengaman (Seatbelt) & Sarung Tangan Grip',
        description: 'Sabuk pengaman mengunci sempurna di kursi operator dan sarung tangan anti-slip terpasang.',
      },
      {
        id: 'fl-3',
        category: 'Kondisi Peralatan & Sistem',
        label: 'Sistem Hidrolik, Mast, & Rantai Elevator Garpu',
        description: 'Tidak ada kebocoran oli hidrolik pada silinder, rantai elevator tegang presisi, dan garpu (fork) tidak bengkok.',
      },
      {
        id: 'fl-4',
        category: 'Kondisi Peralatan & Sistem',
        label: 'Pemeriksaan Ban, Rem Kaki, & Handbrake Parkir',
        description: 'Tekanan ban solid/pneumatik aman, minyak rem cukup, dan fungsi rem kaki/tangan responsif.',
      },
      {
        id: 'fl-5',
        category: 'Kondisi Peralatan & Sistem',
        label: 'Lampu Utama, Klakson Siren, & Beacon Rotating Light',
        description: 'Siren peringatan mundur dan lampu rotator kuning menyala terang untuk keamanan pejalan kaki.',
      },
      {
        id: 'fl-6',
        category: 'Kondisi Peralatan & Sistem',
        label: 'Tabung APAR 3kg & Kebersihan Kabin Operator',
        description: 'APAR terpasang di bodi forklift dengan segel utuh dan kabin bebas dari botol/benda mengganjal pedal.',
      },
      {
        id: 'fl-7',
        category: 'Dokumen & Legal SOP',
        label: 'SIO (Surat Izin Operasi) & Form Pre-Use Checklist',
        description: 'SIO Kemenaker fisik/digital masih aktif dan Logsheet Pre-Use Forklift terisi sebelum operasi.',
      },
      {
        id: 'fl-8',
        category: 'Dokumen & Legal SOP',
        label: 'Verifikasi Pallet Load Tag & Zona Racking',
        description: 'Kapasitas muatan sesuai Load Chart Forklift dan lokasi penempatan palet di area racking terverifikasi.',
      },
    ];
  }

  // 4. CHECKER WRM (Raw Material Inbound)
  if (r.includes('checker') && (r.includes('wrm') || d.includes('wrm') || r.includes('raw'))) {
    return [
      {
        id: 'chk-wrm-1',
        category: 'Safety APD',
        label: 'APD Area Raw Material (Helm, Rompi, Safety Shoes, Respirator)',
        description: 'Helm safety, rompi high-vis, safety shoes, dan masker respirator partikel debu bahan baku.',
      },
      {
        id: 'chk-wrm-2',
        category: 'Safety APD',
        label: 'Kacamata Pelindung (Safety Goggles) & Sarung Tangan Kimia',
        description: 'Kacamata pelindung mata dan sarung tangan tahan bahan kimia untuk proses sampling bahan baku.',
      },
      {
        id: 'chk-wrm-3',
        category: 'Kondisi Peralatan & Sistem',
        label: 'Mobile Handheld Scanner Barcode Inbound WRM',
        description: 'Scanner barcode terhubung ke database WMS Inbound, baterai penuh, dan sinkronisasi SKU normal.',
      },
      {
        id: 'chk-wrm-4',
        category: 'Kondisi Peralatan & Sistem',
        label: 'Alat Uji Tusuk Sampling & Moisture Tester Bahan Baku',
        description: 'Alat tusuk sampling bersih steril dan alat ukur kadar air telah terkalibrasi akurat.',
      },
      {
        id: 'chk-wrm-5',
        category: 'Kondisi Peralatan & Sistem',
        label: 'Inspeksi Fisik Kemasan Jumbo Bag / Drum Bebas Bocor & Hama',
        description: 'Kemasan bahan baku tidak sobek, tidak basah/lembab, dan bebas dari kontaminasi kutu/hama.',
      },
      {
        id: 'chk-wrm-6',
        category: 'Kondisi Peralatan & Sistem',
        label: 'Pengecekan Timbangan Lantai / Timbangan Sampling Inbound',
        description: 'Timbangan sampel menunjukkan angka 0.00 saat kosong dan permukaan plat timbang bersih.',
      },
      {
        id: 'chk-wrm-7',
        category: 'Dokumen & Legal SOP',
        label: 'Pencocokan PO Supplier vs Surat Jalan & Certificate of Analysis (CoA)',
        description: 'Dokumen CoA produsen terlampir dan nomor Purchase Order (PO) sesuai dengan surat jalan suplier.',
      },
      {
        id: 'chk-wrm-8',
        category: 'Dokumen & Legal SOP',
        label: 'Penempelan Stiker Batch / Label Status Karantina Inbound QC',
        description: 'Label status Hijau (Pass) atau Merah (Karantina) siap ditempelkan pada setiap palet bahan baku.',
      },
    ];
  }

  // 5. CHECKER WFG (Finished Goods Outbound / Inbound)
  if (r.includes('checker')) {
    return [
      {
        id: 'chk-1',
        category: 'Safety APD',
        label: 'APD Loading Dock (Helm, Rompi, Safety Shoes, Sarung Tangan)',
        description: 'APD helm safety, rompi high-vis, sepatu safety berujung besi, dan sarung tangan grip terpasang.',
      },
      {
        id: 'chk-2',
        category: 'Safety APD',
        label: 'Peluit Safety Sinyal Manuver Truk & Masker Debu',
        description: 'Peluit pengatur aba-aba manuver armada truk di dock loading dan masker debu tersedia.',
      },
      {
        id: 'chk-3',
        category: 'Kondisi Peralatan & Sistem',
        label: 'Mobile Handheld Scanner Barcode & Terminal WMS',
        description: 'Handheld scanner terhubung ke sistem WMS, laser presisi, dan baterai cadangan siap.',
      },
      {
        id: 'chk-4',
        category: 'Kondisi Peralatan & Sistem',
        label: 'Papan Uji / Clipboard, Senter Inspection, & Meteran Dimensi',
        description: 'Senter LED pemeriksaan fisik container dan alat ukur dimensi/volume barang tersedia.',
      },
      {
        id: 'chk-5',
        category: 'Kondisi Peralatan & Sistem',
        label: 'Kondisi Dock Leveler, Wheel Chock, & Pintu Roll Up Dock',
        description: 'Plat Dock Leveler berfungsi normal, ganjal ban truk terpasang, dan pintu dock terkunci aman.',
      },
      {
        id: 'chk-6',
        category: 'Kondisi Peralatan & Sistem',
        label: 'Pembersihan Staging Area Loading Dock (5R)',
        description: 'Lantai dock bebas dari kayu palet pecah, paku, plastik, atau genangan oli yang licin.',
      },
      {
        id: 'chk-7',
        category: 'Dokumen & Legal SOP',
        label: 'Dokumen Packing List, Surat Jalan, & Checklist Loading',
        description: 'Packing list penyesuaian SKU barang dan lembar inspeksi muat/bongkar siap diverifikasi.',
      },
      {
        id: 'chk-8',
        category: 'Dokumen & Legal SOP',
        label: 'Stiker/Tag Merah Karantina (Quarantine Hold Tag)',
        description: 'Stiker penandaan fisik barang rusak/cacat kemasan siap untuk pemisahan ke area karantina.',
      },
    ];
  }

  // 6. ADMIN WRM (Raw Material Inventory Admin)
  if (r.includes('admin') && (r.includes('wrm') || d.includes('wrm') || r.includes('raw'))) {
    return [
      {
        id: 'adm-wrm-1',
        category: 'Safety APD',
        label: 'Sepatu Safety & Rompi High-Vis saat Masuk Area Gudang WRM',
        description: 'Wajib mengenakan safety shoes dan rompi reflektif saat berjalan ke area rak/staging raw material.',
      },
      {
        id: 'adm-wrm-2',
        category: 'Safety APD',
        label: 'ID Card Badge & Ergonomi Meja Kerja Admin',
        description: 'ID Card aktif terpasang, posisi monitor komputer sejajar mata, dan kursi ergonomis tertata.',
      },
      {
        id: 'adm-wrm-3',
        category: 'Kondisi Peralatan & Sistem',
        label: 'Konektivitas Modul Inbound WMS / SAP Raw Material',
        description: 'Aplikasi ERP/WMS Raw Material online, sinkronisasi transaksi lancar, dan jaringan LAN stabil.',
      },
      {
        id: 'adm-wrm-4',
        category: 'Kondisi Peralatan & Sistem',
        label: 'Printer Cetak Bukti Penerimaan Barang (Goods Receipt Note / GRN)',
        description: 'Ketersediaan kertas form GRN, tinta printer mencukupi, dan printer tidak mengalami paper jam.',
      },
      {
        id: 'adm-wrm-5',
        category: 'Kondisi Peralatan & Sistem',
        label: 'Docking Station Handheld Scanner WRM & Baterai Cadangan',
        description: 'Tempat pengisian daya scanner berfungsi baik dan baterai scanner terisi penuh.',
      },
      {
        id: 'adm-wrm-6',
        category: 'Kondisi Peralatan & Sistem',
        label: 'Kerapihan 5R Dokumen Arsip PO & Surat Jalan Supplier',
        description: 'Bindex map tertata rapi sesuai urutan nomor PO dan meja kerja bebas tumpukan kertas berserakan.',
      },
      {
        id: 'adm-wrm-7',
        category: 'Dokumen & Legal SOP',
        label: 'Verifikasi Surat Jalan Supplier vs Outstanding Purchase Order (PO)',
        description: 'Pemeriksaan kesesuaian kuantitas pesanan pada sistem sebelum penerimaan fisik disahkan.',
      },
      {
        id: 'adm-wrm-8',
        category: 'Dokumen & Legal SOP',
        label: 'Form Berita Acara Selisih / Kerusakan Bahan Baku (BAK)',
        description: 'Formulir klaim ketidaksesuaian tonase atau mutu bahan baku siap digunakan jika ada retur.',
      },
    ];
  }

  // 7. ADMIN WFG (Finished Goods Admin)
  if (r.includes('admin') && (r.includes('wfg') || d.includes('wfg') || r.includes('finished'))) {
    return [
      {
        id: 'wfg-1',
        category: 'Safety APD',
        label: 'Sepatu Safety & Rompi High-Vis Admin Gudang',
        description: 'Wajib mengenakan safety shoes dan rompi reflektif saat memasuki lorong atau staging WFG.',
      },
      {
        id: 'wfg-2',
        category: 'Safety APD',
        label: 'ID Card Badge & Ergonomi Workstation Admin',
        description: 'ID Card terpasang, posisi layar monitor setinggi mata (50-70cm), dan pencahayaan meja memadai.',
      },
      {
        id: 'wfg-3',
        category: 'Kondisi Peralatan & Sistem',
        label: 'Konektivitas Terminal WMS / SAP Finished Goods',
        description: 'Aplikasi WMS logistik login normal, database terhubung, dan jaringan LAN/Wi-Fi stabil.',
      },
      {
        id: 'wfg-4',
        category: 'Kondisi Peralatan & Sistem',
        label: 'Printer Thermal Label & Kertas Surat Jalan',
        description: 'Ketersediaan pita ribbon thermal, kertas label barcode, dan stok form Surat Jalan WFG mencukupi.',
      },
      {
        id: 'wfg-5',
        category: 'Kondisi Peralatan & Sistem',
        label: 'Baterai & Fungsi Handheld Barcode Scanner WFG',
        description: 'Daya baterai scanner >80%, laser pemindai bersih, dan sinkronisasi data SKU presisi.',
      },
      {
        id: 'wfg-6',
        category: 'Kondisi Peralatan & Sistem',
        label: 'Kebersihan & Kerapihan 5R Meja Kerja Admin',
        description: 'Meja kerja bebas tumpukan berkas acak, kabel komputer tertata aman tanpa bahaya tersandung.',
      },
      {
        id: 'wfg-7',
        category: 'Dokumen & Legal SOP',
        label: 'Jadwal Rencana Outbound & Dispatching List',
        description: 'Jadwal kebaruan armada pengiriman hari ini telah terverifikasi dengan tim Planner/Sales.',
      },
      {
        id: 'wfg-8',
        category: 'Dokumen & Legal SOP',
        label: 'Form Berita Acara Selisih Stock & Opname Log',
        description: 'Form rekonsiliasi persediaan WFG siap digunakan jika ditemukan discrepancy fisik vs sistem.',
      },
    ];
  }

  // 8. ADMIN TIMBANGAN (Weighbridge Administrator)
  if (r.includes('timbangan') || r.includes('timbang') || d.includes('timbangan') || d.includes('tim')) {
    return [
      {
        id: 'tim-1',
        category: 'Safety APD',
        label: 'APD Area Timbangan (Helm, Safety Shoes, Rompi Reflektif)',
        description: 'Helm safety, safety shoes, dan rompi reflektif untuk inspeksi fisik truk di platform jembatan timbang.',
      },
      {
        id: 'tim-2',
        category: 'Safety APD',
        label: 'Masker Debu & Jas Hujan Reflektif Outdoor',
        description: 'Masker pelindung debu dan jas hujan reflektif siap digunakan saat operasional malam/cuaca buruk.',
      },
      {
        id: 'tim-3',
        category: 'Kondisi Peralatan & Sistem',
        label: 'Kalibrasi Zero Balance Sensor Jembatan Timbangan (0.00 kg)',
        description: 'Indikator timbangan menampilkan 0.00 kg saat kosong dan Load Cell bebas dari ganjalan batu/tanah.',
      },
      {
        id: 'tim-4',
        category: 'Kondisi Peralatan & Sistem',
        label: 'Kamera CCTV Plat Nomor Truk, Sensor Posisi, & Lampu Traffic',
        description: 'Kamera ANPR pencatat plat nomor dan indikator lampu hijau/merah jembatan timbangan bekerja normal.',
      },
      {
        id: 'tim-5',
        category: 'Kondisi Peralatan & Sistem',
        label: 'Printer Cetak Tiket Timbang (Bruto / Tara / Netto)',
        description: 'Printer nota berfungsi lancar, pita tinta jelas terbaca, dan stok kertas struk mencukupi.',
      },
      {
        id: 'tim-6',
        category: 'Kondisi Peralatan & Sistem',
        label: 'Platform Jembatan Timbang Bebas Endapan Tanah & Sampah',
        description: 'Permukaan platform timbangan dan celah bumper bersih dari tumpukan kerikil atau tanah liat.',
      },
      {
        id: 'tim-7',
        category: 'Dokumen & Legal SOP',
        label: 'Pemeriksaan Surat Jalan Supplier & Sertifikat Uji Tera Metrologi',
        description: 'Surat Jalan Inbound Supplier lengkap dan Dokumen Sertifikat Tera Resmi Timbangan masih berlaku.',
      },
      {
        id: 'tim-8',
        category: 'Dokumen & Legal SOP',
        label: 'Form Berita Acara Kerusakan & Selisih Tonase (BAK)',
        description: 'Form BAK siap untuk mencatat klaim jika selisih berat penimbangan melebihi batas toleransi SOP (1%).',
      },
    ];
  }

  // 9. ADMIN EKSPEDISI / TRANSPORT
  if (r.includes('ekspedisi') || r.includes('expedisi') || r.includes('transport') || d.includes('ekspedisi')) {
    return [
      {
        id: 'eks-1',
        category: 'Safety APD',
        label: 'Sepatu Safety & Rompi High-Vis Reflektif Ekspedisi',
        description: 'Wajib mengenakan safety shoes dan rompi reflektif saat berjalan di area parkir armada truk.',
      },
      {
        id: 'eks-2',
        category: 'Safety APD',
        label: 'ID Card Badge & Helm Safety Inspeksi Armada',
        description: 'Helm proyek K3 terpasang saat melakukan pemeriksaan segel kontainer dan kargo truk.',
      },
      {
        id: 'eks-3',
        category: 'Kondisi Peralatan & Sistem',
        label: 'Aplikasi TMS (Transport Management System) & GPS Fleet',
        description: 'Sistem penjadwalan rute pengiriman TMS online dan indikator GPS kendaraan aktif.',
      },
      {
        id: 'eks-4',
        category: 'Kondisi Peralatan & Sistem',
        label: 'Printer Cetak Manifest & Kertas Surat Jalan Ekspedisi',
        description: 'Printer lembar jalan berfungsi lancar dan stok blanko Surat Jalan mencukupi.',
      },
      {
        id: 'eks-5',
        category: 'Kondisi Peralatan & Sistem',
        label: 'Verifikasi Fisik Segel Kontainer & Pengunci Pintu Boks',
        description: 'Kondisi fisik segel nomor baja utuh dan pengunci engsel boks kargo bekerja presisi.',
      },
      {
        id: 'eks-6',
        category: 'Kondisi Peralatan & Sistem',
        label: 'Pemeriksaan Batas Beban Muatan (Bebas ODOL)',
        description: 'Berat total muatan sesuai batas JBB KIR untuk mencegah risiko kecelakaan rem blong.',
      },
      {
        id: 'eks-7',
        category: 'Dokumen & Legal SOP',
        label: 'Dokumen Transport Manifest, Surat Jalan, & SIM Driver',
        description: 'Kelengkapan dokumen pengiriman resmi dan keabsahan SIM B/SIO driver terverifikasi.',
      },
      {
        id: 'eks-8',
        category: 'Dokumen & Legal SOP',
        label: 'Form Checklist POD (Proof of Delivery) & Log Incident',
        description: 'Formulir verifikasi penerimaan barang dan log kejadian kendala armada di jalan siap.',
      },
    ];
  }

  // 10. ADMIN GA (General Affairs / Fasilitas Gudang)
  if (r.includes('ga') || r.includes('general') || d.includes('ga') || r.includes('fasilitas')) {
    return [
      {
        id: 'ga-1',
        category: 'Safety APD',
        label: 'Sepatu Safety & Rompi High-Vis Petugas GA',
        description: 'Safety shoes berujung besi dan rompi reflektif untuk patroli inspeksi fasilitas gudang.',
      },
      {
        id: 'ga-2',
        category: 'Safety APD',
        label: 'Sarung Tangan Kerja & Kacamata Pelindung Inspeksi Fasilitas',
        description: 'Sarung tangan mekanik dan pelindung mata untuk inspeksi utilitas dan panel kelistrikan.',
      },
      {
        id: 'ga-3',
        category: 'Kondisi Peralatan & Sistem',
        label: 'Pemeriksaan Tekanan Jarum Tabung APAR & Kesiapan Hydrant',
        description: 'Jarum indikator tekanan APAR berada di zona hijau, selang tidak retak, dan hydrant tidak terhalang.',
      },
      {
        id: 'ga-4',
        category: 'Kondisi Peralatan & Sistem',
        label: 'Pemeriksaan Penerangan Selasar, Lampu Emergency, & Exhaust Fan',
        description: 'Lampu utama gudang menyala terang, emergency lamp berfungsi jika mati listrik, dan exhaust fan berputar.',
      },
      {
        id: 'ga-5',
        category: 'Kondisi Peralatan & Sistem',
        label: 'Inspeksi Panel Listrik Utama & Bebas Bau Hangus / Kabel Terbuka',
        description: 'Pintu panel listrik tertutup rapat, kunci terpasang, dan tidak ada tanda korsleting atau bau sangit.',
      },
      {
        id: 'ga-6',
        category: 'Kondisi Peralatan & Sistem',
        label: 'Kebersihan Toilet Karyawan & Kesiapan Tempat Sampah 5R',
        description: 'Fasilitas sanitasi bersih, air mengalir lancar, dan tempat sampah organik/anorganik tertata.',
      },
      {
        id: 'ga-7',
        category: 'Dokumen & Legal SOP',
        label: 'Jadwal Pemeliharaan Preventif Gedung & Pengecekan Bahan Bakar Genset',
        description: 'Level solar tangki genset darurat >80% dan logbook perawatan berkala tercatat.',
      },
      {
        id: 'ga-8',
        category: 'Dokumen & Legal SOP',
        label: 'Logbook Petugas Kebersihan / Keamanan & Form Lapor Kerusakan',
        description: 'Absensi vendor fasilitas terisi dan form perbaikan fasilitas siap ditindaklanjuti.',
      },
    ];
  }

  // 11. PIC AREA / SUPERVISOR LOGISTIK / PENGELOLA
  if (r.includes('pic') || r.includes('supervisor') || r.includes('head') || r.includes('pengawas') || r.includes('lead')) {
    return [
      {
        id: 'spv-1',
        category: 'Safety APD',
        label: 'APD Lengkap Pengawas Area Operasional Gudang',
        description: 'Helm safety putih supervisor, rompi reflektif high-vis, sepatu safety, dan ID Card Pengawas.',
      },
      {
        id: 'spv-2',
        category: 'Safety APD',
        label: 'Alat P3K Portable, Senter Inspeksi, & Peluit Darurat',
        description: 'Kotak P3K mini portable lengkap, senter patroli, dan alat komunikasi darurat siap di area kerja.',
      },
      {
        id: 'spv-3',
        category: 'Kondisi Peralatan & Sistem',
        label: 'Patroli 5R: Bebas Ganjalan Jalur Evakuasi, Exit Door, & Titik APAR',
        description: 'Verifikasi seluruh lorong gudang, pintu darurat, dan titik APAR tidak terhalang tumpukan palet.',
      },
      {
        id: 'spv-4',
        category: 'Kondisi Peralatan & Sistem',
        label: 'Inspeksi Kesiapan Kunci MHE & Sistem LOTO (Lockout/Tagout)',
        description: 'Kunci armada Forklift/Reach Truck terkontrol dan unit rusak terpasang label penanda LOTO aman.',
      },
      {
        id: 'spv-5',
        category: 'Kondisi Peralatan & Sistem',
        label: 'Pemeriksaan Kebersihan Lantai & Bebas Ceceran Oli / Bahaya Slip',
        description: 'Lantai lorong gudang bebas dari tumpahan minyak/oli licin dan serpihan kayu palet tajam.',
      },
      {
        id: 'spv-6',
        category: 'Kondisi Peralatan & Sistem',
        label: 'Kesiapan Tablet Console Supervisor & Jaringan Audit BIB',
        description: 'Tablet/laptop pengawasan terhubung ke jaringan dan baterai mencukupi untuk audit lapangan.',
      },
      {
        id: 'spv-7',
        category: 'Dokumen & Legal SOP',
        label: 'Materi & Lembar Absensi Briefing Safety Toolbox Talk (TBT)',
        description: 'Materi pengarahan K3 harian dan lembar hadir seluruh staf shift siap dipimpin.',
      },
      {
        id: 'spv-8',
        category: 'Dokumen & Legal SOP',
        label: 'Form Laporan Insiden K3 / Near-Miss & Shift Handover Log',
        description: 'Formulir investigasi cepat kecelakaan/hampir celaka siap jika terjadi keadaan darurat.',
      },
    ];
  }

  // 12. DRIVER / PENGEMUDI ARMADA LOGISTIK (DEFAULT)
  return [
    {
      id: 'drv-1',
      category: 'Safety APD',
      label: 'APD Lengkap Driver & Rompi Reflektif K3',
      description: 'Helm proyek/topi driver, sepatu safety/sepatu tertutup, dan rompi reflektif saat turun di dock.',
    },
    {
      id: 'drv-2',
      category: 'Safety APD',
      label: 'Kotak P3K & 2 Buah Segitiga Pengaman Darurat Armada',
      description: 'Perlengkapan P3K dasar dan segitiga pengaman darurat tersedia di dalam kabin truk.',
    },
    {
      id: 'drv-3',
      category: 'Kondisi Peralatan & Sistem',
      label: 'Pemeriksaan Ban, Tekanan Angin, & Kesiapan Ban Cadangan',
      description: 'Alur ban >2mm, tidak benjol, dan kondisi ban serep terisi angin aman.',
    },
    {
      id: 'drv-4',
      category: 'Kondisi Peralatan & Sistem',
      label: 'Fungsi Pengereman, Handbrake Parkir, & Minyak Rem',
      description: 'Rem kaki responsif, minyak rem mencukupi, dan rem tangan mengunci roda dengan sempurna.',
    },
    {
      id: 'drv-5',
      category: 'Kondisi Peralatan & Sistem',
      label: 'Lampu Utama, Lampu Sein, Lampu Mundur, Hazard, & Klakson',
      description: 'Seluruh sistem penerangan dan sinyal berfungsi terang dan kaca spion/lampu bersih.',
    },
    {
      id: 'drv-6',
      category: 'Kondisi Peralatan & Sistem',
      label: 'Tali Strapping / Webbing Ratchet / Terpal Boks Cargo',
      description: 'Peralatan pengikat muatan dalam kondisi kuat, tidak lapuk/sobek, dan pintu kargo terkunci.',
    },
    {
      id: 'drv-7',
      category: 'Dokumen & Legal SOP',
      label: 'STNK Asli, SIM B Aktif, & Bukti Uji Berkala (KIR) Kendaraan',
      description: 'Membawa dokumen legal fisik kendaraan dan lisensi mengemudi yang masih berlaku sah.',
    },
    {
      id: 'drv-8',
      category: 'Dokumen & Legal SOP',
      label: 'Form Pre-Shift Checklist & Surat Jalan Pengiriman Resmi',
      description: 'Surat Jalan resmi terverifikasi dan aplikasi GPS/POD Mobile siap digunakan untuk rute hari ini.',
    },
  ];
}

export const ChecklistDetailModal: React.FC<ChecklistDetailModalProps> = ({
  onClose,
  onCompleteChecklist,
  streakDays,
  workerRole = 'Operator Forklift',
  workerDivision = 'WFG',
}) => {
  const checklistItems = useMemo(
    () => getPreShiftChecklistForRole(workerRole, workerDivision),
    [workerRole, workerDivision]
  );

  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const toggleItem = (id: string) => {
    setCheckedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
    setErrorMsg(null);
  };

  const isAllChecked = checkedIds.size === checklistItems.length;
  const progressPercent = Math.round((checkedIds.size / checklistItems.length) * 100);

  const handleSubmit = () => {
    if (!isAllChecked) {
      setErrorMsg(`Semua ${checklistItems.length} item inspeksi WAJIB dicentang sebelum menyelesaikan Pre-Shift Check.`);
      return;
    }
    onCompleteChecklist();
    onClose();
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] overflow-y-auto bg-black/90 backdrop-blur-xl p-4 sm:p-6 flex items-center justify-center min-h-screen animate-fade-in"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg max-h-[82vh] sm:max-h-[85vh] m-auto card-elevated p-6 flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-zinc-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-3 shrink-0">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
            <ShieldCheck className="w-5 h-5 text-indigo-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-white text-base">Inspeksi Pre-Shift Harian</h3>
              <span className="text-[10px] font-bold px-2 py-0.5 bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded-md">
                {workerRole}
              </span>
            </div>
            <p className="text-xs text-zinc-400 mt-0.5">
              Standar Inspeksi Spesifik Role ({workerDivision}) · Matriks Kompetensi K3
            </p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mb-3 bg-zinc-950 p-3 rounded-xl border border-zinc-800 shrink-0">
          <div className="flex justify-between items-center text-xs mb-1.5 font-bold">
            <span className="text-zinc-300 flex items-center gap-1">
              <UserCheck className="w-3.5 h-3.5 text-indigo-400" />
              Progress Inspeksi ({workerRole})
            </span>
            <span className={isAllChecked ? 'text-emerald-400' : 'text-indigo-400'}>
              {checkedIds.size} / {checklistItems.length} ({progressPercent}%)
            </span>
          </div>
          <div className="w-full bg-zinc-800 rounded-full h-2 overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${
                isAllChecked ? 'bg-emerald-500' : 'bg-indigo-500'
              }`}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Checklist items scrollable list */}
        <div className="overflow-y-auto space-y-2 pr-1 my-2 flex-1 scrollbar-thin">
          {checklistItems.map((item) => {
            const isChecked = checkedIds.has(item.id);
            return (
              <div
                key={item.id}
                onClick={() => toggleItem(item.id)}
                className={`p-3 rounded-xl border cursor-pointer transition-all flex items-start gap-3 ${
                  isChecked
                    ? 'bg-indigo-950/20 border-indigo-500/40 ring-1 ring-indigo-500/15'
                    : 'bg-zinc-950 border-zinc-800 hover:border-zinc-700'
                }`}
              >
                <div className="mt-0.5 shrink-0 text-indigo-400">
                  {isChecked ? (
                    <CheckSquare className="w-5 h-5 text-emerald-400" />
                  ) : (
                    <Square className="w-5 h-5 text-zinc-600" />
                  )}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={`text-xs font-bold ${
                        isChecked ? 'text-white' : 'text-zinc-200'
                      }`}
                    >
                      {item.label}
                    </span>
                    <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400">
                      {item.category}
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-500 mt-0.5 leading-relaxed">{item.description}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Error Notification */}
        {errorMsg && (
          <div className="flex items-center gap-2 p-3 bg-rose-950/40 border border-rose-500/30 rounded-xl text-xs text-rose-300 mb-3 shrink-0">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Footer actions */}
        <div className="pt-3 border-t border-zinc-800 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-1.5 text-xs text-amber-400 font-bold">
            <Award className="w-4 h-4" />
            <span>+30 Poin + Streak Harian</span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-semibold rounded-xl text-xs transition"
            >
              Batal
            </button>
            <button
              onClick={handleSubmit}
              disabled={!isAllChecked}
              className={`px-5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                isAllChecked
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/20'
                  : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
              }`}
            >
              <ShieldCheck className="w-4 h-4" />
              Selesaikan Check (+30 Poin)
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
