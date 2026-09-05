import React, { useState, useMemo, useEffect } from 'react';
import {
  Award, ShieldCheck, FileCheck, CheckCircle2, AlertTriangle,
  Download, Printer, Search, ArrowRight, ExternalLink,
  Shield, BookOpen, Lock, HardHat, Truck, FileText, Check
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { WorkerProfile, IncidentReport } from '../../types/assessment';
import { LicenseService } from '../../lib/licenseService';
import { PpeService } from '../../lib/ppeService';
import { SystemConfigService } from '../../domain/SystemConfigService';
import { MheLicenseEntity } from '../../types/license';

export interface IsoClauseMapping {
  id: string;
  standard: 'ISO 45001:2018' | 'ISO 9001:2015' | 'ISO/IEC 27001:2022' | 'SMK3 PP 50/2012';
  clauseNumber: string;
  clauseTitle: string;
  category: 'K3 (HSE)' | 'Mutu (Quality)' | 'Keamanan Data' | 'Regulasi Nasional';
  systemModule: string;
  targetTab?: string;
  digitalEvidence: string;
  complianceLevel: 'Memenuhi Penuh (100%)' | 'Sangat Baik (95%)' | 'Aktif Terpantau';
  badgeColor: string;
  description: string;
}

export const ISO_CLAUSE_CATALOG: IsoClauseMapping[] = [
  // ─── ISO 45001:2018 (K3) ───
  {
    id: 'iso45-1',
    standard: 'ISO 45001:2018',
    clauseNumber: 'Klausul 10.2',
    clauseTitle: 'Insiden, Ketidaksesuaian & Tindakan Korektif (CAPA)',
    category: 'K3 (HSE)',
    systemModule: 'Laporan Insiden & Investigasi K3',
    targetTab: 'incidents',
    digitalEvidence: 'Form pelaporan near-miss & cedera, analisis akar masalah (Root Cause), dan penetapan Corrective Action digital.',
    complianceLevel: 'Memenuhi Penuh (100%)',
    badgeColor: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
    description: 'Menjamin seluruh insiden tercatat secara objektif dan memiliki alur persetujuan serta tindak lanjut pencegahan.',
  },
  {
    id: 'iso45-2',
    standard: 'ISO 45001:2018',
    clauseNumber: 'Klausul 7.2',
    clauseTitle: 'Kualifikasi & Lisensi Legal Operator (SIO MHE)',
    category: 'K3 (HSE)',
    systemModule: 'Pelacak SIO & Lisensi MHE',
    targetTab: 'licenses',
    digitalEvidence: 'Registrasi sertifikat SIO Kemnaker RI, masa berlaku lisensi, monitoring kedaluwarsa, dan pembatasan wewenang operasi unit.',
    complianceLevel: 'Memenuhi Penuh (100%)',
    badgeColor: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
    description: 'Hanya personel dengan lisensi K3 aktif yang berwenang mengoperasikan armada Forklift dan Reach Truck.',
  },
  {
    id: 'iso45-3',
    standard: 'ISO 45001:2018',
    clauseNumber: 'Klausul 8.1.2',
    clauseTitle: 'Menghilangkan Bahaya & Pengendalian Risiko APD',
    category: 'K3 (HSE)',
    systemModule: 'Inventaris & Distribusi APD',
    targetTab: 'ppe',
    digitalEvidence: 'Data serah terima APD resmi (Safety Shoes, Helmet, Vest, Sarung Tangan), pencatatan kerusakan, dan jadwal penggantian.',
    complianceLevel: 'Memenuhi Penuh (100%)',
    badgeColor: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
    description: 'Memastikan perlindungan fisik pekerja terdistribusi sesuai standar bahaya di masing-masing area operasional.',
  },
  {
    id: 'iso45-4',
    standard: 'ISO 45001:2018',
    clauseNumber: 'Klausul 8.1',
    clauseTitle: 'Perencanaan & Pengendalian Operasional Pra-Shift',
    category: 'K3 (HSE)',
    systemModule: 'Checklist Pre-Shift Inspection',
    targetTab: 'workers',
    digitalEvidence: 'Rekam checklist inspeksi fisik pra-kerja harian sebelum unit armada dan shift berjalan.',
    complianceLevel: 'Sangat Baik (95%)',
    badgeColor: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
    description: 'Verifikasi kelayakan keselamatan kerja secara preventif sebelum aktivitas berisiko tinggi dimulai.',
  },
  {
    id: 'iso45-5',
    standard: 'ISO 45001:2018',
    clauseNumber: 'Klausul 10.3',
    clauseTitle: 'Pembinaan Disiplin & Penegakan Kebijakan K3',
    category: 'K3 (HSE)',
    systemModule: 'Konseling & Sanksi K3 (Disciplinary)',
    targetTab: 'disciplinary',
    digitalEvidence: 'Berita Acara Pembinaan, penerbitan Surat Peringatan (SP), komitmen kepatuhan K3 tertulis, dan log konseling.',
    complianceLevel: 'Memenuhi Penuh (100%)',
    badgeColor: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
    description: 'Penegakan kebijakan K3 yang adil, terdokumentasi, dan memiliki alur pembinaan keselamatan terarah.',
  },

  // ─── ISO 9001:2015 (Mutu) ───
  {
    id: 'iso90-1',
    standard: 'ISO 9001:2015',
    clauseNumber: 'Klausul 7.5',
    clauseTitle: 'Informasi Terdokumentasi & Prosedur Kerja Standar',
    category: 'Mutu (Quality)',
    systemModule: 'Modul SOP Micro-Deck & SOP Management',
    targetTab: 'sop',
    digitalEvidence: 'Repositori SOP terpusat, pengesahan dokumen versi terkini, pembatasan target role, dan riwayat revisi dokumen.',
    complianceLevel: 'Memenuhi Penuh (100%)',
    badgeColor: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30',
    description: 'Menjamin seluruh personel operasional bekerja mengacu pada instruksi kerja standar yang seragam dan mutakhir.',
  },
  {
    id: 'iso90-2',
    standard: 'ISO 9001:2015',
    clauseNumber: 'Klausul 7.2',
    clauseTitle: 'Kompetensi, Pelatihan & Evaluasi Kinerja (BIB)',
    category: 'Mutu (Quality)',
    systemModule: 'Matriks Audit Kompetensi & Kuis Harian',
    targetTab: 'matrix',
    digitalEvidence: 'Pengukuran objektif Behavior (35%), Integrity (30%), Benchmark (35%), audit berkala supervisor, dan uji pemahaman SOP.',
    complianceLevel: 'Memenuhi Penuh (100%)',
    badgeColor: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30',
    description: 'Mekanisme evaluasi kompetensi tenaga kerja yang terukur, transparan, dan terhubung dengan program pengembangan.',
  },
  {
    id: 'iso90-3',
    standard: 'ISO 9001:2015',
    clauseNumber: 'Klausul 7.1.4',
    clauseTitle: 'Lingkungan untuk Operasi Proses (Standar 5R / 5S)',
    category: 'Mutu (Quality)',
    systemModule: 'Audit Standar 5R / 5S Gudang',
    targetTab: 'audit-5s',
    digitalEvidence: 'Checklist audit Ringkas, Rapi, Resik, Rawat, Rajin di divisi WFG, WRM, Timbangan, dan Ekspedisi.',
    complianceLevel: 'Sangat Baik (95%)',
    badgeColor: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30',
    description: 'Menjaga tata kelola fisik gudang tetap higienis, teratur, dan mendukung kelancaran aliran muatan.',
  },
  {
    id: 'iso90-4',
    standard: 'ISO 9001:2015',
    clauseNumber: 'Klausul 10.3',
    clauseTitle: 'Peningkatan Berkelanjutan (Continual Improvement)',
    category: 'Mutu (Quality)',
    systemModule: 'Inovasi Kaizen Kanban Board',
    targetTab: 'kaizen',
    digitalEvidence: 'Usulan ide perbaikan proses kerja dari lini bawah (bottom-up), tahapan PDCA, dan status realisasi Kaizen.',
    complianceLevel: 'Memenuhi Penuh (100%)',
    badgeColor: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30',
    description: 'Mewadahi budaya perbaikan kualitas secara berkesinambungan yang melibatkan partisipasi aktif seluruh staf.',
  },
  {
    id: 'iso90-5',
    standard: 'ISO 9001:2015',
    clauseNumber: 'Klausul 8.5.1',
    clauseTitle: 'Pengendalian Operasi & Kontinuitas Layanan Shift',
    category: 'Mutu (Quality)',
    systemModule: 'Handover Shift Kanban & Logbook',
    targetTab: 'workers',
    digitalEvidence: 'Catatan serah terima shift digital, status muatan tertunda, kesiapan alat, dan acknowledgement tim penerima.',
    complianceLevel: 'Memenuhi Penuh (100%)',
    badgeColor: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30',
    description: 'Mencegah celah informasi dan penurunan mutu penanganan barang pada momen pergantian regu kerja.',
  },

  // ─── ISO/IEC 27001:2022 (ISMS) ───
  {
    id: 'iso27-1',
    standard: 'ISO/IEC 27001:2022',
    clauseNumber: 'Kontrol A.9.1 & A.9.2',
    clauseTitle: 'Manajemen Hak Akses Pengguna (RBAC)',
    category: 'Keamanan Data',
    systemModule: 'Manajemen User Administrator & RBAC',
    targetTab: 'admins',
    digitalEvidence: 'Pemisahan wewenang ketat (Worker vs Supervisor Audit vs System Administrator) dan proteksi multi-admin.',
    complianceLevel: 'Memenuhi Penuh (100%)',
    badgeColor: 'text-purple-400 bg-purple-500/10 border-purple-500/30',
    description: 'Membatasi wewenang eksekusi sistem berdasarkan prinsip Least Privilege dan pemisahan tugas resmi.',
  },
  {
    id: 'iso27-2',
    standard: 'ISO/IEC 27001:2022',
    clauseNumber: 'Kontrol A.12.4',
    clauseTitle: 'Pencatatan Log & Pemantauan Aktivitas (Audit Trail)',
    category: 'Keamanan Data',
    systemModule: 'Log Aktivitas Sistem (Activity Log)',
    targetTab: 'activity',
    digitalEvidence: 'Pencatatan otomatis dan permanen untuk login, mutasi role, reset password, persetujuan supervisor, dan update skor.',
    complianceLevel: 'Memenuhi Penuh (100%)',
    badgeColor: 'text-purple-400 bg-purple-500/10 border-purple-500/30',
    description: 'Menyediakan rekaman jejak audit yang tak terbantahkan untuk penyelidikan insiden keamanan data.',
  },
  {
    id: 'iso27-3',
    standard: 'ISO/IEC 27001:2022',
    clauseNumber: 'Kontrol A.9.4',
    clauseTitle: 'Manajemen Kredensial & First-Time Password Change',
    category: 'Keamanan Data',
    systemModule: 'Kebijakan Kredensial & First-Time Password',
    targetTab: 'admins',
    digitalEvidence: 'Mekanisme wajib ganti password awal bagi akun baru dan enkripsi sesi autentikasi pengguna.',
    complianceLevel: 'Memenuhi Penuh (100%)',
    badgeColor: 'text-purple-400 bg-purple-500/10 border-purple-500/30',
    description: 'Menghilangkan risiko penggunaan password bawaan yang rentan terhadap penyalahgunaan identitas.',
  },

  // ─── SMK3 PP 50/2012 & Permenaker 8/2020 ───
  {
    id: 'smk3-1',
    standard: 'SMK3 PP 50/2012',
    clauseNumber: 'Elemen 6 & 7',
    clauseTitle: 'Standar Pemantauan, Inspeksi K3 & Investigasi',
    category: 'Regulasi Nasional',
    systemModule: 'Laporan Audit Eksekutif & Inspeksi K3',
    targetTab: 'reports',
    digitalEvidence: 'Berkas rekapitulasi audit kepatuhan, pemenuhan rekomendasi auditor, dan monitoring tren insiden nihil (Zero Accident).',
    complianceLevel: 'Memenuhi Penuh (100%)',
    badgeColor: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
    description: 'Pemenuhan mandat Sistem Manajemen K3 Nasional sesuai Peraturan Pemerintah RI No. 50 Tahun 2012.',
  },
  {
    id: 'smk3-2',
    standard: 'SMK3 PP 50/2012',
    clauseNumber: 'Permenaker 8/2020',
    clauseTitle: 'K3 Pesawat Angkat & Pesawat Angkut (Armada Logistik)',
    category: 'Regulasi Nasional',
    systemModule: 'Pelacak SIO & Lisensi MHE',
    targetTab: 'licenses',
    digitalEvidence: 'Validasi kepemilikan lisensi K3 operator kelas forklift/reach truck terbitan Kementerian Ketenagakerjaan RI.',
    complianceLevel: 'Memenuhi Penuh (100%)',
    badgeColor: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
    description: 'Menjamin operasional alat berat pergudangan sesuai regulasi keselamatan ketenagakerjaan Republik Indonesia.',
  },
];

interface AdminIsoCompliancePanelProps {
  workers: WorkerProfile[];
  incidents?: IncidentReport[];
  currentAdminId?: string;
  onNavigateTab?: (tabKey: string) => void;
  showToast: (msg: string) => void;
}

export const AdminIsoCompliancePanel: React.FC<AdminIsoCompliancePanelProps> = ({
  workers,
  incidents = [],
  currentAdminId,
  onNavigateTab,
  showToast,
}) => {
  const [selectedStandard, setSelectedStandard] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [isExporting, setIsExporting] = useState<boolean>(false);

  // Live Sync State for MHE Licenses & PPE
  const [licenses, setLicenses] = useState<MheLicenseEntity[]>(() => LicenseService.getAllLicenses());
  const [ppeCount, setPpeCount] = useState<number>(() => {
    const stats = PpeService.getStats();
    return stats.totalItems > 0 ? stats.totalItems : stats.totalDistributedActive;
  });

  useEffect(() => {
    // 1. Initial local load
    setLicenses(LicenseService.getAllLicenses());

    // 2. Fetch from Supabase in background
    LicenseService.fetchLicensesFromSupabase().then((remote) => {
      if (remote && remote.length > 0) {
        setLicenses(remote);
      }
    });

    // 3. Event listeners for live updates
    const handleLicUpdate = () => {
      setLicenses(LicenseService.getAllLicenses());
    };
    const handlePpeUpdate = () => {
      const stats = PpeService.getStats();
      setPpeCount(stats.totalItems > 0 ? stats.totalItems : stats.totalDistributedActive);
    };

    window.addEventListener('gappy_licenses_updated', handleLicUpdate);
    window.addEventListener('gappy_ppe_updated', handlePpeUpdate);
    return () => {
      window.removeEventListener('gappy_licenses_updated', handleLicUpdate);
      window.removeEventListener('gappy_ppe_updated', handlePpeUpdate);
    };
  }, []);

  // Dynamic Metrics: SIO is valid if status is 'active' or 'expiring_soon'
  const activeSioCount = useMemo(() => {
    return licenses.filter((l) => l.status === 'active' || l.status === 'expiring_soon').length;
  }, [licenses]);

  const resolvedIncidentsCount = useMemo(() => {
    return incidents.filter((i) => i.status === 'resolved' || i.status === 'closed').length;
  }, [incidents]);

  // Filtered Clauses
  const filteredClauses = useMemo(() => {
    return ISO_CLAUSE_CATALOG.filter((item) => {
      const matchStd = selectedStandard === 'all' || item.standard === selectedStandard;
      const matchSearch =
        searchTerm === '' ||
        item.clauseNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.clauseTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.systemModule.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.digitalEvidence.toLowerCase().includes(searchTerm.toLowerCase());
      return matchStd && matchSearch;
    });
  }, [selectedStandard, searchTerm]);

  // Overall Readiness Score
  const complianceStats = useMemo(() => {
    const total = ISO_CLAUSE_CATALOG.length;
    const full = ISO_CLAUSE_CATALOG.filter((c) => c.complianceLevel.includes('100%')).length;
    const veryGood = ISO_CLAUSE_CATALOG.filter((c) => c.complianceLevel.includes('95%')).length;
    const readinessIndex = Number(((full * 100 + veryGood * 95) / (total * 100) * 100).toFixed(1));

    return {
      total,
      readinessIndex,
      iso45Count: ISO_CLAUSE_CATALOG.filter((c) => c.standard === 'ISO 45001:2018').length,
      iso90Count: ISO_CLAUSE_CATALOG.filter((c) => c.standard === 'ISO 9001:2015').length,
      iso27Count: ISO_CLAUSE_CATALOG.filter((c) => c.standard === 'ISO/IEC 27001:2022').length,
      smk3Count: ISO_CLAUSE_CATALOG.filter((c) => c.standard === 'SMK3 PP 50/2012').length,
    };
  }, []);

  // ─── Export ISO Compliance Dossier PDF ───
  const handleExportPdf = () => {
    setIsExporting(true);
    try {
      const doc = new jsPDF('p', 'mm', 'a4');
      const pageWidth = doc.internal.pageSize.getWidth();
      const docNumber = SystemConfigService.generateDocumentNumber('k3_incident').replace('INC', 'ISO-AUDIT');
      const currentDate = new Date().toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });

      // Corporate Header Box
      doc.setFillColor(15, 23, 42); // #0f172a
      doc.rect(0, 0, pageWidth, 28, 'F');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(13);
      doc.setTextColor(255, 255, 255);
      doc.text('PT. DAYA ANUGRAH MULYA', 14, 11);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184); // zinc-400
      doc.text('Warehouse Finished Goods (WFG) & Raw Material (WRM) — Internal Quality & HSE Governance', 14, 17);
      doc.text(`Doc No: ${docNumber} | Tanggal Cetak: ${currentDate}`, 14, 23);

      // Document Title
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.setTextColor(15, 23, 42);
      doc.text('DOSSIER KEPATUHAN AUDIT STANDAR ISO & REGULASI NASIONAL', 14, 38);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(71, 85, 105);
      doc.text(
        'Dokumen resmi pemetaan keselarasan platform operasional BIB terhadap standar ISO 45001:2018, ISO 9001:2015, ISO/IEC 27001:2022, dan SMK3 PP 50/2012.',
        14,
        44,
        { maxWidth: pageWidth - 28 }
      );

      // Executive Summary Box
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(203, 213, 225);
      doc.roundedRect(14, 49, pageWidth - 28, 22, 2, 2, 'FD');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(15, 23, 42);
      doc.text('RINGKASAN KESIAPAN AUDIT SISTEM:', 18, 55);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(51, 65, 85);
      doc.text(`• Indeks Kesiapan Audit Keseluruhan: ${complianceStats.readinessIndex}% (Sangat Siap / Audit Ready)`, 18, 60);
      doc.text(`• Total Klausul Dipetakan: ${complianceStats.total} Klausul Kunci across 4 Standar Internasional & Nasional`, 18, 64);
      doc.text(`• Personel Terdaftar: ${workers.length} Orang | SIO Valid: ${activeSioCount} Unit | APD Tercatat: ${ppeCount} Item`, 18, 68);

      // Table of Clauses
      const tableData = ISO_CLAUSE_CATALOG.map((item, idx) => [
        (idx + 1).toString(),
        item.standard,
        `${item.clauseNumber}\n${item.clauseTitle}`,
        item.systemModule,
        item.digitalEvidence,
        item.complianceLevel,
      ]);

      autoTable(doc, {
        startY: 75,
        head: [['No', 'Standar', 'Klausul & Judul', 'Modul Sistem', 'Bukti Digital (Evidence)', 'Tingkat Kepatuhan']],
        body: tableData,
        theme: 'grid',
        headStyles: {
          fillColor: [30, 41, 59],
          textColor: [255, 255, 255],
          fontSize: 7.5,
          fontStyle: 'bold',
          halign: 'center',
        },
        bodyStyles: {
          fontSize: 6.8,
          textColor: [30, 41, 59],
          valign: 'middle',
        },
        columnStyles: {
          0: { cellWidth: 8, halign: 'center' },
          1: { cellWidth: 26 },
          2: { cellWidth: 38 },
          3: { cellWidth: 32 },
          4: { cellWidth: 56 },
          5: { cellWidth: 22, halign: 'center' },
        },
        margin: { left: 14, right: 14 },
      });

      // Signatures Block
      const finalY = (doc as any).lastAutoTable ? (doc as any).lastAutoTable.finalY + 12 : 230;
      if (finalY + 35 < doc.internal.pageSize.getHeight()) {
        const colWidth = (pageWidth - 28) / 3;

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
        doc.setTextColor(71, 85, 105);

        // Sign 1
        doc.text('Diverifikasi Oleh,', 14 + colWidth * 0.1, finalY);
        doc.text('Head of HSE & K3', 14 + colWidth * 0.1, finalY + 4);
        doc.text('( Tanda Tangan & Cap )', 14 + colWidth * 0.1, finalY + 22);

        // Sign 2
        doc.text('Disetujui Oleh,', 14 + colWidth * 1.1, finalY);
        doc.text('Quality Management Rep (QMR)', 14 + colWidth * 1.1, finalY + 4);
        doc.text('( Tanda Tangan & Cap )', 14 + colWidth * 1.1, finalY + 22);

        // Sign 3
        doc.text('Diketahui Oleh,', 14 + colWidth * 2.1, finalY);
        doc.text('Head of Operations & Logistics', 14 + colWidth * 2.1, finalY + 4);
        doc.text('( Tanda Tangan & Cap )', 14 + colWidth * 2.1, finalY + 22);
      }

      doc.save(`DOSSIER_AUDIT_KEPATUHAN_ISO_${new Date().toISOString().slice(0, 10)}.pdf`);
      showToast('Dossier Kepatuhan ISO & SMK3 berhasil diunduh dalam format PDF!');
    } catch (err: any) {
      showToast(err.message || 'Gagal mengekspor PDF.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-4 animate-fade-in">
      {/* ── Top Header Banner ── */}
      <div className="card p-5 bg-gradient-to-r from-zinc-900 via-zinc-900 to-purple-950/40 border border-purple-500/20">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center shrink-0 shadow-inner">
              <Award className="w-6 h-6 text-purple-400" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base font-bold text-white">Audit Kepatuhan ISO & Regulasi K3 Nasional</h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>Audit-Ready (Kesiapan {complianceStats.readinessIndex}%)</span>
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-1 max-w-2xl leading-relaxed">
                Pemetaan digital keselarasan seluruh modul operasional BIB terhadap standar internasional <strong>ISO 45001</strong> (K3), <strong>ISO 9001</strong> (Mutu), <strong>ISO/IEC 27001</strong> (Keamanan Data), serta mandat nasional <strong>SMK3 PP No. 50/2012</strong>.
              </p>

              {/* Live Evidence Badges */}
              <div className="flex items-center gap-3 mt-3 pt-2.5 border-t border-zinc-800/80 text-[11px] text-zinc-400 flex-wrap">
                <span className="flex items-center gap-1.5">
                  <Truck className="w-3.5 h-3.5 text-cyan-400" />
                  <span>SIO Aktif: <strong className="text-white font-mono">{activeSioCount} Unit</strong></span>
                </span>
                <span className="text-zinc-600">·</span>
                <span className="flex items-center gap-1.5">
                  <HardHat className="w-3.5 h-3.5 text-amber-400" />
                  <span>Item APD: <strong className="text-white font-mono">{ppeCount} Item</strong></span>
                </span>
                <span className="text-zinc-600">·</span>
                <span className="flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Personel K3: <strong className="text-white font-mono">{workers.length} Orang</strong></span>
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleExportPdf}
              disabled={isExporting}
              className="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition flex items-center gap-2 shadow-lg shadow-purple-950/50"
            >
              <Download className="w-4 h-4" />
              <span>{isExporting ? 'Membuat PDF...' : 'Unduh Dossier ISO (PDF)'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── 4 Standard Scorecards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* ISO 45001 */}
        <div
          onClick={() => setSelectedStandard('ISO 45001:2018')}
          className={`card p-4 cursor-pointer transition border ${
            selectedStandard === 'ISO 45001:2018'
              ? 'border-emerald-500 bg-emerald-950/20'
              : 'border-zinc-800 hover:border-zinc-700'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              98.5% Patuh
            </span>
          </div>
          <div className="mt-2.5">
            <div className="text-xs font-bold text-white">ISO 45001:2018</div>
            <div className="text-[11px] text-zinc-400">Sistem Manajemen K3</div>
            <div className="text-[10px] text-zinc-500 mt-1">{complianceStats.iso45Count} Klausul Operasional Terpenuhi</div>
          </div>
        </div>

        {/* ISO 9001 */}
        <div
          onClick={() => setSelectedStandard('ISO 9001:2015')}
          className={`card p-4 cursor-pointer transition border ${
            selectedStandard === 'ISO 9001:2015'
              ? 'border-cyan-500 bg-cyan-950/20'
              : 'border-zinc-800 hover:border-zinc-700'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="w-8 h-8 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
              <BookOpen className="w-4 h-4 text-cyan-400" />
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              96.8% Patuh
            </span>
          </div>
          <div className="mt-2.5">
            <div className="text-xs font-bold text-white">ISO 9001:2015</div>
            <div className="text-[11px] text-zinc-400">Sistem Manajemen Mutu</div>
            <div className="text-[10px] text-zinc-500 mt-1">{complianceStats.iso90Count} Klausul Operasional Terpenuhi</div>
          </div>
        </div>

        {/* ISO 27001 */}
        <div
          onClick={() => setSelectedStandard('ISO/IEC 27001:2022')}
          className={`card p-4 cursor-pointer transition border ${
            selectedStandard === 'ISO/IEC 27001:2022'
              ? 'border-purple-500 bg-purple-950/20'
              : 'border-zinc-800 hover:border-zinc-700'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="w-8 h-8 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
              <Lock className="w-4 h-4 text-purple-400" />
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20">
              97.2% Patuh
            </span>
          </div>
          <div className="mt-2.5">
            <div className="text-xs font-bold text-white">ISO/IEC 27001:2022</div>
            <div className="text-[11px] text-zinc-400">Keamanan Informasi (ISMS)</div>
            <div className="text-[10px] text-zinc-500 mt-1">{complianceStats.iso27Count} Kontrol Keamanan Terpenuhi</div>
          </div>
        </div>

        {/* SMK3 PP 50/2012 */}
        <div
          onClick={() => setSelectedStandard('SMK3 PP 50/2012')}
          className={`card p-4 cursor-pointer transition border ${
            selectedStandard === 'SMK3 PP 50/2012'
              ? 'border-amber-500 bg-amber-950/20'
              : 'border-zinc-800 hover:border-zinc-700'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
              <FileCheck className="w-4 h-4 text-amber-400" />
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
              100% Sesuai
            </span>
          </div>
          <div className="mt-2.5">
            <div className="text-xs font-bold text-white">SMK3 & Permenaker</div>
            <div className="text-[11px] text-zinc-400">PP 50/2012 & Permenaker 8/20</div>
            <div className="text-[10px] text-zinc-500 mt-1">{complianceStats.smk3Count} Elemen K3 Wajib Terpenuhi</div>
          </div>
        </div>
      </div>

      {/* ── Main Compliance Table Section ── */}
      <div className="card p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800 pb-3">
          {/* Standard Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            {[
              { key: 'all', label: 'Semua Standar' },
              { key: 'ISO 45001:2018', label: 'ISO 45001 (K3)' },
              { key: 'ISO 9001:2015', label: 'ISO 9001 (Mutu)' },
              { key: 'ISO/IEC 27001:2022', label: 'ISO 27001 (Security)' },
              { key: 'SMK3 PP 50/2012', label: 'SMK3 & Legal' },
            ].map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setSelectedStandard(tab.key)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
                  selectedStandard === tab.key
                    ? 'bg-purple-600 text-white shadow-sm'
                    : 'bg-zinc-800/80 hover:bg-zinc-700 text-zinc-400 hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Cari klausul atau bukti..."
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500"
            />
          </div>
        </div>

        {/* Clause Matrix List */}
        <div className="space-y-3">
          {filteredClauses.map((clause) => (
            <div
              key={clause.id}
              className="p-4 rounded-xl bg-zinc-900/80 border border-zinc-800 hover:border-zinc-700 transition space-y-2.5"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-zinc-800 text-zinc-200 border border-zinc-700">
                    {clause.clauseNumber}
                  </span>
                  <span className="text-xs font-bold text-white">{clause.clauseTitle}</span>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${clause.badgeColor}`}>
                    {clause.standard}
                  </span>
                </div>

                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 w-fit flex items-center gap-1">
                  <Check className="w-3 h-3" />
                  <span>{clause.complianceLevel}</span>
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs pt-1 border-t border-zinc-800/60">
                <div>
                  <span className="text-zinc-500 font-medium block text-[11px] mb-0.5">Modul Sistem Terkait:</span>
                  <div className="flex items-center gap-2">
                    <span className="text-purple-300 font-semibold">{clause.systemModule}</span>
                    {clause.targetTab && onNavigateTab && (
                      <button
                        type="button"
                        onClick={() => onNavigateTab(clause.targetTab!)}
                        className="text-[10px] text-zinc-400 hover:text-white flex items-center gap-0.5 px-2 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 transition"
                        title="Buka Modul di Admin Console"
                      >
                        <span>Buka Modul</span>
                        <ArrowRight className="w-2.5 h-2.5" />
                      </button>
                    )}
                  </div>
                </div>

                <div>
                  <span className="text-zinc-500 font-medium block text-[11px] mb-0.5">Bukti Digital (Audit Evidence):</span>
                  <span className="text-zinc-300 leading-relaxed block">{clause.digitalEvidence}</span>
                </div>
              </div>
            </div>
          ))}

          {filteredClauses.length === 0 && (
            <div className="text-center py-10 text-zinc-500 text-xs">
              Tidak ada klausul kepatuhan yang sesuai dengan kata kunci pencarian.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
