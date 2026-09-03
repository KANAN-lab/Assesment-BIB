/**
 * OOP Report Service: ExecutivePDFReportGenerator
 * Generates executive-grade, audit-compliant PDF and CSV reports for PT DAM Indonesia logistics assessment.
 */

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { WorkerProfile, IncidentReport, RewardItem } from '../types/assessment';
import { MheLicenseEntity } from '../types/license';
import { PpeItemEntity, PpeDistributionEntity, PpeDamageReportEntity } from '../types/ppe';
import { RoleEntity } from '../domain/RoleEntity';
import { LicenseService } from './licenseService';
import { PpeService } from './ppeService';

export interface ReportSigningConfig {
  reportTitle?: string;
  documentNumber?: string;
  periodLabel?: string;
  supervisorName?: string;
  supervisorTitle?: string;
  managerName?: string;
  managerTitle?: string;
  divisionFilter?: string;
}

export class ExecutivePDFReportGenerator {
  // ─────────────────────────────────────────────────────────────
  // 1. LAPORAN MATRIKS KOMPETENSI & EVALUASI KINERJA (BIB)
  // ─────────────────────────────────────────────────────────────

  public static generateCompetencyMatrixPDF(
    workers: WorkerProfile[],
    config: ReportSigningConfig = {}
  ): void {
    const supervisorName = config.supervisorName || 'Supervisor Logistik';
    const managerName = config.managerName || 'Head of Operations';
    const docNumber = config.documentNumber || `DAM/HRD-MAT/${new Date().getFullYear()}/${Date.now().toString().slice(-4)}`;
    const periodLabel = config.periodLabel || 'Tahun Berjalan 2026';
    const divFilter = config.divisionFilter || 'Semua Divisi';

    let opWorkers = workers.filter(
      (w) => RoleEntity.isOperationalWorker(w.role) && w.division.toUpperCase() !== 'SYSTEM'
    );
    if (config.divisionFilter && config.divisionFilter !== 'all' && config.divisionFilter !== 'Semua') {
      opWorkers = opWorkers.filter((w) => w.division === config.divisionFilter);
    }

    const doc = new jsPDF('p', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    const currentDate = new Date().toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });

    // Corporate Header
    doc.setFillColor(15, 23, 42); // #0f172a
    doc.rect(0, 0, pageWidth, 28, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text('PT DAM INDONESIA — GAPPY ASSESSMENT PLATFORM', 14, 11);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(148, 163, 184);
    doc.text('LAPORAN EKSEKUTIF MATRIKS KOMPETENSI & AUDIT KINERJA OPERASIONAL (BIB)', 14, 18);
    doc.text(`No. Dokumen: ${docNumber} | Periode: ${periodLabel} | Divisi: ${divFilter}`, 14, 24);

    // Summary Metric Banner
    const totalWorkers = opWorkers.length;
    const avgBib = totalWorkers
      ? (opWorkers.reduce((s, w) => s + w.bibScores.totalScore, 0) / totalWorkers).toFixed(1)
      : '0.0';
    const totalStreak = opWorkers.reduce((s, w) => s + w.streakDays, 0);
    const auditedCount = opWorkers.filter((w) => w.bibScores.totalScore > 0).length;

    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(14, 34, pageWidth - 28, 18, 2, 2, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(15, 23, 42);
    doc.text(`TOTAL PERSONEL: ${totalWorkers} Staf`, 18, 41);
    doc.text(`RATA-RATA SKOR BIB: ${avgBib} / 100`, 75, 41);
    doc.text(`TER-AUDIT RESMI: ${auditedCount} / ${totalWorkers} (${Math.round((auditedCount / (totalWorkers || 1)) * 100)}%)`, 135, 41);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(71, 85, 105);
    doc.text(`Safety Streak: ${totalStreak} Hari`, 18, 47);
    doc.text('Status Kelayakan: 100% Sesuai SOP', 75, 47);
    doc.text(`Tanggal Cetak: ${currentDate}`, 135, 47);

    // Table
    const tableHead = [
      ['NO', 'NIP', 'NAMA PEKERJA', 'ROLE OPERASIONAL', 'DIV', 'TIER', 'BEHAVIOR', 'INTEGRITY', 'BENCHMARK', 'BIB SCORE', 'STATUS'],
    ];

    const tableBody = opWorkers.map((w, idx) => {
      const bib = w.bibScores.totalScore;
      const statusText = bib >= 80 ? 'Kompeten' : bib > 0 ? 'Pengawasan' : 'Perlu Audit';
      return [
        idx + 1,
        w.employeeId,
        w.name,
        w.role,
        w.division,
        w.tier.replace(' Operational', '').replace(' Specialist', ''),
        w.bibScores.behavior.toFixed(1),
        w.bibScores.integrity.toFixed(1),
        w.bibScores.benchmark.toFixed(1),
        w.bibScores.totalScore.toFixed(1),
        statusText,
      ];
    });

    autoTable(doc, {
      startY: 56,
      head: tableHead,
      body: tableBody,
      theme: 'grid',
      headStyles: {
        fillColor: [15, 23, 42],
        textColor: [255, 255, 255],
        fontSize: 7,
        fontStyle: 'bold',
        halign: 'center',
      },
      bodyStyles: {
        fontSize: 7,
        textColor: [30, 41, 59],
      },
      columnStyles: {
        0: { halign: 'center', cellWidth: 8 },
        1: { halign: 'center', cellWidth: 18 },
        2: { cellWidth: 32 },
        3: { cellWidth: 30 },
        4: { halign: 'center', cellWidth: 12 },
        5: { halign: 'center', cellWidth: 18 },
        6: { halign: 'right', cellWidth: 14 },
        7: { halign: 'right', cellWidth: 14 },
        8: { halign: 'right', cellWidth: 14 },
        9: { halign: 'right', cellWidth: 16, fontStyle: 'bold' },
        10: { halign: 'center', cellWidth: 16 },
      },
    });

    this.appendSignatureAndFooter(doc, pageWidth, supervisorName, managerName, config);
    doc.save(`Laporan_Eksekutif_Matriks_Kompetensi_${new Date().toISOString().slice(0, 10)}.pdf`);
  }

  // ─────────────────────────────────────────────────────────────
  // 2. LAPORAN K3 ZERO INCIDENT & KEPATUHAN CAPA
  // ─────────────────────────────────────────────────────────────

  public static generateK3ZeroIncidentPDF(
    incidents: IncidentReport[],
    workers: WorkerProfile[],
    config: ReportSigningConfig = {}
  ): void {
    const supervisorName = config.supervisorName || 'Supervisor HSE & K3';
    const managerName = config.managerName || 'Plant Safety Manager';
    const docNumber = config.documentNumber || `DAM/HSE-REP/${new Date().getFullYear()}/${Date.now().toString().slice(-4)}`;
    const periodLabel = config.periodLabel || 'Tahun Berjalan 2026';

    const doc = new jsPDF('p', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();

    // Corporate Header
    doc.setFillColor(180, 83, 9); // Amber-700
    doc.rect(0, 0, pageWidth, 28, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text('PT DAM INDONESIA — DIVISI K3 & KESELAMATAN KERJA (HSE)', 14, 11);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(254, 243, 199);
    doc.text('LAPORAN EKSEKUTIF AUDIT K3, PENGAWASAN ZERO INCIDENT & MONITORING CAPA', 14, 18);
    doc.text(`No. Dokumen: ${docNumber} | Periode: ${periodLabel}`, 14, 24);

    // Metrics
    const totalIncidents = incidents.length;
    const openCount = incidents.filter((i) => i.status === 'open' || i.status === 'investigating').length;
    const resolvedCount = incidents.filter((i) => i.status === 'resolved' || i.status === 'closed').length;
    const totalDaysStreak = workers.reduce((max, w) => Math.max(max, w.streakDays || 0), 0);

    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(14, 34, pageWidth - 28, 18, 2, 2, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(15, 23, 42);
    doc.text(`TOTAL INSIDEN TERCATAT: ${totalIncidents}`, 18, 41);
    doc.text(`TINDAKAN CAPA SELESAI: ${resolvedCount} (${totalIncidents ? Math.round((resolvedCount / totalIncidents) * 100) : 100}%)`, 75, 41);
    doc.text(`STATUS PENDING / OPEN: ${openCount}`, 145, 41);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(71, 85, 105);
    doc.text(`Max Zero-Incident Streak: ${totalDaysStreak} Hari`, 18, 47);
    doc.text('Kepatuhan Audit: Sangat Baik', 75, 47);
    doc.text(`Tanggal Cetak: ${new Date().toLocaleDateString('id-ID')}`, 145, 47);

    // Table
    const tableHead = [['NO', 'PELAPOR / KORBAN', 'JENIS INSIDEN', 'KEPARAHAN', 'LOKASI', 'WAKTU', 'STATUS', 'AKAR MASALAH & CAPA']];
    const tableBody = incidents.map((inc, i) => [
      i + 1,
      inc.workerName || inc.workerId,
      inc.incidentType.toUpperCase().replace('_', ' '),
      inc.severity.toUpperCase(),
      inc.location,
      new Date(inc.occurredAt).toLocaleDateString('id-ID'),
      inc.status.toUpperCase(),
      inc.correctiveAction ? `CAPA: ${inc.correctiveAction.slice(0, 45)}...` : 'Dalam Investigasi 5-Why',
    ]);

    autoTable(doc, {
      startY: 56,
      head: tableHead,
      body: tableBody.length ? tableBody : [['-', 'Tidak ada catatan insiden (Zero Incident)', '-', '-', '-', '-', '-', '-']],
      theme: 'grid',
      headStyles: { fillColor: [180, 83, 9], textColor: [255, 255, 255], fontSize: 7, fontStyle: 'bold' },
      bodyStyles: { fontSize: 7, textColor: [30, 41, 59] },
    });

    this.appendSignatureAndFooter(doc, pageWidth, supervisorName, managerName, config);
    doc.save(`Laporan_Eksekutif_Audit_K3_${new Date().toISOString().slice(0, 10)}.pdf`);
  }

  // ─────────────────────────────────────────────────────────────
  // 3. LAPORAN KEPATUHAN SIO & LISENSI ALAT BERAT (MHE)
  // ─────────────────────────────────────────────────────────────

  public static generateMheLicensesPDF(
    licenses: MheLicenseEntity[],
    config: ReportSigningConfig = {}
  ): void {
    const supervisorName = config.supervisorName || 'Supervisor Operasional MHE';
    const managerName = config.managerName || 'Head of Engineering & K3';
    const docNumber = config.documentNumber || `DAM/MHE-SIO/${new Date().getFullYear()}/${Date.now().toString().slice(-4)}`;

    const doc = new jsPDF('p', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();

    // Corporate Header
    doc.setFillColor(30, 41, 59);
    doc.rect(0, 0, pageWidth, 28, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text('PT DAM INDONESIA — AUDIT KEPATUHAN LISENSI ALAT BERAT (MHE)', 14, 11);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(203, 213, 225);
    doc.text('LEGALITAS SURAT IZIN OPERATOR (SIO) FORKLIFT, REACH TRUCK & K3 KEMNAKER RI', 14, 18);
    doc.text(`No. Dokumen: ${docNumber} | Tanggal Cetak: ${new Date().toLocaleDateString('id-ID')}`, 14, 24);

    // Summary Metric
    const total = licenses.length;
    const active = licenses.filter((l) => l.status === 'active').length;
    const expiring = licenses.filter((l) => l.status === 'expiring_soon').length;
    const expired = licenses.filter((l) => l.status === 'expired').length;

    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(14, 34, pageWidth - 28, 18, 2, 2, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(15, 23, 42);
    doc.text(`TOTAL OPERATOR TERSERTIFIKASI: ${total}`, 18, 41);
    doc.text(`SIO AKTIF & VALID: ${active} (${total ? Math.round((active / total) * 100) : 100}%)`, 80, 41);
    doc.text(`SEGERA HABIS / EXPIRED: ${expiring + expired}`, 145, 41);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(71, 85, 105);
    doc.text('Regulasi: Kemenaker RI Permenaker No. 08/2020', 18, 47);
    doc.text(`Segera Habis (<=30h): ${expiring} Unit`, 80, 47);
    doc.text(`Kedaluwarsa: ${expired} Unit`, 145, 47);

    // Table
    const tableHead = [['NO', 'OPERATOR & NIP', 'DIVISI', 'JENIS LISENSI', 'NOMOR SIO', 'LEMBAGA PENERBIT', 'MASA BERLAKU', 'STATUS LEGAL']];
    const tableBody = licenses.map((lic, i) => [
      i + 1,
      `${lic.workerName}\n(${lic.employeeId})`,
      lic.division,
      lic.licenseType,
      lic.licenseNumber,
      lic.issuingAuthority || 'Kemenaker RI',
      `${lic.expiryDate}\n(${lic.daysRemaining} hari)`,
      lic.status.toUpperCase().replace('_', ' '),
    ]);

    autoTable(doc, {
      startY: 56,
      head: tableHead,
      body: tableBody.length ? tableBody : [['-', 'Belum ada data lisensi SIO terdaftar', '-', '-', '-', '-', '-', '-']],
      theme: 'grid',
      headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontSize: 7, fontStyle: 'bold' },
      bodyStyles: { fontSize: 7, textColor: [30, 41, 59] },
    });

    this.appendSignatureAndFooter(doc, pageWidth, supervisorName, managerName, config);
    doc.save(`Laporan_Eksekutif_Legalitas_SIO_MHE_${new Date().toISOString().slice(0, 10)}.pdf`);
  }

  // ─────────────────────────────────────────────────────────────
  // 4. LAPORAN INVENTARIS & DISTRIBUSI APD PEKERJA
  // ─────────────────────────────────────────────────────────────

  public static generatePpeLifecyclePDF(
    distributions: PpeDistributionEntity[],
    masterItems: PpeItemEntity[],
    damageReports: PpeDamageReportEntity[],
    config: ReportSigningConfig = {}
  ): void {
    const supervisorName = config.supervisorName || 'Supervisor K3 / Safety Officer';
    const managerName = config.managerName || 'Logistics Operations Manager';
    const docNumber = config.documentNumber || `DAM/PPE-REP/${new Date().getFullYear()}/${Date.now().toString().slice(-4)}`;

    const doc = new jsPDF('p', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();

    // Corporate Header
    doc.setFillColor(13, 148, 136); // Teal-600
    doc.rect(0, 0, pageWidth, 28, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text('PT DAM INDONESIA — AUDIT INVENTARIS & SIKLUS HIDUP APD', 14, 11);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(204, 251, 241);
    doc.text('MONITORING DISTRIBUSI ALAT PELINDUNG DIRI, JATUH TEMPO & TIKET PENGGANTIAN', 14, 18);
    doc.text(`No. Dokumen: ${docNumber} | Tanggal Cetak: ${new Date().toLocaleDateString('id-ID')}`, 14, 24);

    // Summary Metric
    const totalDist = distributions.length;
    const activeDist = distributions.filter((d) => d.status === 'active' || d.status === 'expiring_soon').length;
    const damageCount = damageReports.length;

    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(14, 34, pageWidth - 28, 18, 2, 2, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(15, 23, 42);
    doc.text(`KATALOG MASTER: ${masterItems.length} Jenis`, 18, 41);
    doc.text(`APD TERDISTRIBUSI AKTIF: ${activeDist} Unit`, 75, 41);
    doc.text(`TIKET KERUSAKAN/GANTI: ${damageCount}`, 145, 41);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(71, 85, 105);
    doc.text(`Total Serah Terima: ${totalDist} Kali`, 18, 47);
    doc.text('Kepatuhan Standar: SNI / ANSI Terpenuhi', 75, 47);
    doc.text(`Pending Review: ${damageReports.filter((r) => r.status === 'pending_review').length}`, 145, 47);

    // Table
    const tableHead = [['NO', 'NAMA PEKERJA', 'DIVISI', 'NAMA APD', 'UKURAN & QTY', 'TGL SERAH TERIMA', 'BATAS GANTI', 'STATUS']];
    const tableBody = distributions.map((d, i) => [
      i + 1,
      `${d.workerName}\n(${d.employeeId})`,
      d.division,
      d.ppeName,
      `${d.quantity} Unit ${d.size ? `(${d.size})` : ''}`,
      d.distributionDate,
      `${d.expectedReplacementDate}\n(${d.daysRemaining}h)`,
      d.status.toUpperCase().replace('_', ' '),
    ]);

    autoTable(doc, {
      startY: 56,
      head: tableHead,
      body: tableBody.length ? tableBody : [['-', 'Belum ada data distribusi APD', '-', '-', '-', '-', '-', '-']],
      theme: 'grid',
      headStyles: { fillColor: [13, 148, 136], textColor: [255, 255, 255], fontSize: 7, fontStyle: 'bold' },
      bodyStyles: { fontSize: 7, textColor: [30, 41, 59] },
    });

    this.appendSignatureAndFooter(doc, pageWidth, supervisorName, managerName, config);
    doc.save(`Laporan_Eksekutif_Inventaris_APD_${new Date().toISOString().slice(0, 10)}.pdf`);
  }

  // ─────────────────────────────────────────────────────────────
  // 5. LAPORAN ANGGARAN & PENYERAPAN POIN REWARD
  // ─────────────────────────────────────────────────────────────

  public static generateRewardBudgetPDF(
    rewardCatalog: RewardItem[],
    workers: WorkerProfile[],
    config: ReportSigningConfig = {}
  ): void {
    const supervisorName = config.supervisorName || 'HRD & Compensation Specialist';
    const managerName = config.managerName || 'Finance & Plant Director';
    const docNumber = config.documentNumber || `DAM/REW-BUD/${new Date().getFullYear()}/${Date.now().toString().slice(-4)}`;

    const doc = new jsPDF('p', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();

    // Corporate Header
    doc.setFillColor(147, 51, 234); // Purple-600
    doc.rect(0, 0, pageWidth, 28, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text('PT DAM INDONESIA — LAPORAN ANGGARAN & PENUKARAN REWARD', 14, 11);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(243, 232, 255);
    doc.text('EVALUASI POIN INSENTIF PRESTASI K3, TINGKAT PENUKARAN & ALOKASI ANGGARAN', 14, 18);
    doc.text(`No. Dokumen: ${docNumber} | Tanggal Cetak: ${new Date().toLocaleDateString('id-ID')}`, 14, 24);

    // Metric Summary
    const totalPointsInCirculation = workers.reduce((sum, w) => sum + (w.totalPoints || 0), 0);
    const totalCatalogItems = rewardCatalog.length;
    const totalStockAvailable = rewardCatalog.reduce((sum, r) => sum + (r.availableStock || 0), 0);

    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(14, 34, pageWidth - 28, 18, 2, 2, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(15, 23, 42);
    doc.text(`TOTAL POIN BEREDAR: ${totalPointsInCirculation.toLocaleString()} PTS`, 18, 41);
    doc.text(`TOTAL STOK REWARD: ${totalStockAvailable} Unit`, 85, 41);
    doc.text(`KATALOG AKTIF: ${totalCatalogItems} Item`, 145, 41);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(71, 85, 105);
    doc.text(`Nilai Konversi Est: Rp ${(totalPointsInCirculation * 100).toLocaleString()}`, 18, 47);
    doc.text('Status Alokasi Anggaran: Terkendali', 85, 47);
    doc.text(`Total Penerima Reward: ${workers.filter((w) => w.totalPoints > 0).length} Staf`, 145, 47);

    // Table
    const tableHead = [['NO', 'NAMA REWARD / VOUCHER', 'KATEGORI', 'BIAYA POIN', 'MINIMAL TIER', 'STOK TERSEDIA']];
    const tableBody = rewardCatalog.map((r, i) => [
      i + 1,
      r.title,
      r.category,
      `${r.pointsRequired.toLocaleString()} PTS`,
      r.minTier ? r.minTier.replace(' Operational', '').replace(' Specialist', '') : 'Semua Tier',
      `${r.availableStock || 0} Unit`,
    ]);

    autoTable(doc, {
      startY: 56,
      head: tableHead,
      body: tableBody.length ? tableBody : [['-', 'Belum ada katalog reward aktif', '-', '-', '-', '-']],
      theme: 'grid',
      headStyles: { fillColor: [147, 51, 234], textColor: [255, 255, 255], fontSize: 7, fontStyle: 'bold' },
      bodyStyles: { fontSize: 7, textColor: [30, 41, 59] },
    });

    this.appendSignatureAndFooter(doc, pageWidth, supervisorName, managerName, config);
    doc.save(`Laporan_Eksekutif_Anggaran_Reward_${new Date().toISOString().slice(0, 10)}.pdf`);
  }

  // ─────────────────────────────────────────────────────────────
  // HELPER: SIGNATURE & FOOTER
  // ─────────────────────────────────────────────────────────────

  private static appendSignatureAndFooter(
    doc: jsPDF,
    pageWidth: number,
    supervisorName: string,
    managerName: string,
    config: ReportSigningConfig
  ): void {
    const finalY = (doc as any).lastAutoTable?.finalY || 180;
    const signY = Math.min(finalY + 16, doc.internal.pageSize.getHeight() - 36);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(30, 41, 59);

    // Left Signature
    doc.text('Dibuat & Diverifikasi Oleh,', 25, signY);
    doc.text(config.supervisorTitle || 'Supervisor Operasional & HSE', 25, signY + 4.5);
    doc.line(25, signY + 19, 75, signY + 19);
    doc.setFont('helvetica', 'bold');
    doc.text(supervisorName, 25, signY + 23);

    // Right Signature
    doc.setFont('helvetica', 'normal');
    doc.text('Disetujui Oleh,', pageWidth - 75, signY);
    doc.text(config.managerTitle || 'Plant & Logistics Operations Head', pageWidth - 75, signY + 4.5);
    doc.line(pageWidth - 75, signY + 19, pageWidth - 25, signY + 19);
    doc.setFont('helvetica', 'bold');
    doc.text(managerName, pageWidth - 75, signY + 23);

    // Security Footer
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
    doc.text(
      `Dokumen Resmi Internal PT DAM Indonesia — Gappy Assessment Platform v3.3.0 | Halaman 1 dari 1`,
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 6,
      { align: 'center' }
    );
  }

  // Backward compatibility alias
  public static generateExecutiveReport(workers: WorkerProfile[], supervisorName?: string): void {
    this.generateCompetencyMatrixPDF(workers, { supervisorName });
  }

  public static generateBulkIncidentSummaryPDF(
    incidents: IncidentReport[],
    supervisorName: string = 'Supervisor Logistik'
  ): void {
    this.generateK3ZeroIncidentPDF(incidents, [], { supervisorName });
  }

  public static exportIncidentReportPDF(incident: IncidentReport, reporterWorker?: WorkerProfile, config: ReportSigningConfig = {}): void {
    this.exportOfficialBapIncidentPDF(incident, reporterWorker, config);
  }

  /**
   * Formulir Resmi Berita Acara Pemeriksaan (BAP) Kecelakaan Kerja & Insiden K3
   * Standar Corporate PT DAM Indonesia (PRD §11.3 Fitur D)
   */
  public static exportOfficialBapIncidentPDF(
    incident: IncidentReport,
    reporterWorker?: WorkerProfile,
    config: ReportSigningConfig = {}
  ): void {
    const doc = new jsPDF('p', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    const docNumber = config.documentNumber || `BAP-K3/DAM/${new Date().getFullYear()}/${incident.id.slice(0, 8).toUpperCase()}`;
    const supervisorName = config.supervisorName || 'Supervisor Operasional & HSE';
    const managerName = config.managerName || 'Plant Operations & HSE Head';
    const reporterName = reporterWorker?.name || incident.workerName || incident.workerId;
    const reporterEmpId = reporterWorker?.employeeId || incident.workerId;
    const reporterRole = reporterWorker?.role || 'Staff Operasional Gudang';
    const reporterDiv = reporterWorker?.division || 'Divisi Logistik';

    // ── Corporate Header Banner ──
    doc.setFillColor(194, 65, 12); // Orange-700
    doc.rect(0, 0, pageWidth, 28, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12.5);
    doc.text('PT DAM INDONESIA — DEPARTEMEN HEALTH, SAFETY & ENVIRONMENT (HSE)', 14, 11);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(254, 215, 170);
    doc.text('BERITA ACARA PEMERIKSAAN KECELAKAAN KERJA & INSIDEN K3 (FORMULIR BAP RESMI)', 14, 18);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text(`No. Dokumen: ${docNumber}  |  Tanggal Terbit: ${new Date().toLocaleDateString('id-ID')}  |  Status: ${incident.status.toUpperCase()}`, 14, 24);

    // ── Metric Highlight Card ──
    doc.setFillColor(254, 243, 199); // Amber-100
    doc.setDrawColor(245, 158, 11); // Amber-500
    doc.roundedRect(14, 33, pageWidth - 28, 16, 2, 2, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(120, 53, 15);
    doc.text(`TINGKAT SEVERITY: ${incident.severity.toUpperCase()}`, 18, 40);
    doc.text(`KATEGORI: ${incident.incidentType.replace('_', ' ').toUpperCase()}`, 75, 40);
    doc.text(`LOKASI: ${incident.location}`, 135, 40);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(146, 64, 14);
    const occurDate = new Date(incident.occurredAt).toLocaleString('id-ID');
    doc.text(`Waktu Kejadian: ${occurDate}`, 18, 45.5);
    doc.text(`Status Investigasi: ${incident.status.toUpperCase()}`, 75, 45.5);
    doc.text(`Poin K3 Pelapor: +50 PTS (${incident.pointsAwarded ? 'Disetujui' : 'Dalam Proses'})`, 135, 45.5);

    // ── Tabel 1: Identitas Pelapor & Rincian Insiden ──
    const table1Head = [['BAGIAN I: IDENTITAS PELAPOR & DATA KEJADIAN', 'KETERANGAN']];
    const table1Body = [
      ['Nama Pelapor / Korban', reporterName],
      ['Nomor Induk Pegawai (NIP)', reporterEmpId],
      ['Peran & Posisi Operasional', reporterRole],
      ['Divisi / Staging Area', reporterDiv],
      ['Lokasi Spesifik Kejadian', incident.location],
      ['Waktu & Tanggal Kejadian', occurDate],
      ['Tingkat Keparahan (Severity)', incident.severity.toUpperCase()],
      ['Status Penanganan', incident.status.toUpperCase()],
    ];

    autoTable(doc, {
      startY: 53,
      head: table1Head,
      body: table1Body,
      theme: 'grid',
      headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontSize: 7.5, fontStyle: 'bold' },
      bodyStyles: { fontSize: 7.5, textColor: [30, 41, 59] },
      columnStyles: { 0: { cellWidth: 65, fontStyle: 'bold' }, 1: { cellWidth: pageWidth - 28 - 65 } },
    });

    let currentY = (doc as any).lastAutoTable.finalY + 5;

    // ── Tabel 2: Uraian Kronologis & Analisis Akar Masalah ──
    const table2Head = [['BAGIAN II: URAIAN KRONOLOGIS & ANALISIS AKAR MASALAH (5-WHY)', 'RINCIAN HASIL INVESTIGASI']];
    const table2Body = [
      ['Kronologi Kejadian Lengkap', incident.description || 'Tidak ada uraian kronologi terlampir.'],
      ['Analisis Akar Masalah (Root Cause)', incident.rootCause || 'Sedang diinvestigasi oleh Supervisor & Tim K3 Lapangan.'],
      ['Bukti Dokumentasi Lapangan', incident.photoUrl ? 'Foto bukti telah diverifikasi dan tersimpan pada arsip cloud Google Drive resmi.' : 'Tidak ada foto bukti terlampir.'],
    ];

    autoTable(doc, {
      startY: currentY,
      head: table2Head,
      body: table2Body,
      theme: 'grid',
      headStyles: { fillColor: [194, 65, 12], textColor: [255, 255, 255], fontSize: 7.5, fontStyle: 'bold' },
      bodyStyles: { fontSize: 7.5, textColor: [30, 41, 59] },
      columnStyles: { 0: { cellWidth: 65, fontStyle: 'bold' }, 1: { cellWidth: pageWidth - 28 - 65 } },
    });

    currentY = (doc as any).lastAutoTable.finalY + 5;

    // ── Tabel 3: Matriks Tindakan Korektif & Pencegahan (CAPA) ──
    const table3Head = [['BAGIAN III: RENCANA TINDAKAN KOREKTIF & PENCEGAHAN (CAPA)', 'DETAIL AKSI PENANGGULANGAN']];
    const table3Body = [
      ['Rencana Aksi Korektif (Corrective Action)', incident.correctiveAction || 'Pemberian instruksi kerja ulang dan perapihan area kerja.'],
      ['Penanggung Jawab (Assigned PIC)', incident.assignedPic || 'Supervisor Lapangan & HSE'],
      ['Target Penyelesaian (Due Date)', incident.dueDate ? new Date(incident.dueDate).toLocaleDateString('id-ID') : 'Dalam 3 Hari Kerja'],
      ['Catatan Penyelesaian Insiden', incident.resolutionNote || 'Laporan telah divalidasi dan dicatat dalam audit trail K3 sistem.'],
    ];

    autoTable(doc, {
      startY: currentY,
      head: table3Head,
      body: table3Body,
      theme: 'grid',
      headStyles: { fillColor: [15, 118, 110], textColor: [255, 255, 255], fontSize: 7.5, fontStyle: 'bold' },
      bodyStyles: { fontSize: 7.5, textColor: [30, 41, 59] },
      columnStyles: { 0: { cellWidth: 65, fontStyle: 'bold' }, 1: { cellWidth: pageWidth - 28 - 65 } },
    });

    currentY = (doc as any).lastAutoTable.finalY + 12;

    // ── Lembar Pengesahan Tanda Tangan 3 Pihak ──
    const signY = Math.min(currentY, doc.internal.pageSize.getHeight() - 42);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(30, 41, 59);

    // Left: Pelapor / Korban
    doc.text('Pihak I: Pelapor / Saksi,', 18, signY);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.text('Staf Operasional Pelapor', 18, signY + 4);
    doc.line(18, signY + 18, 65, signY + 18);
    doc.setFont('helvetica', 'bold');
    doc.text(reporterName, 18, signY + 22);

    // Middle: Saksi Mata / PIC Lapangan
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text('Pihak II: PIC Area Gudang,', 80, signY);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.text('Penanggung Jawab Lokasi', 80, signY + 4);
    doc.line(80, signY + 18, 127, signY + 18);
    doc.setFont('helvetica', 'bold');
    doc.text(incident.assignedPic || 'PIC Area Gudang', 80, signY + 22);

    // Right: Supervisor Operasional & HSE
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text('Pihak III: Verifikator HSE,', 142, signY);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.text('Supervisor Operasional & HSE', 142, signY + 4);
    doc.line(142, signY + 18, 192, signY + 18);
    doc.setFont('helvetica', 'bold');
    doc.text(supervisorName, 142, signY + 22);

    // ── Security Footer ──
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
    doc.text(
      `Dokumen Resmi Berita Acara K3 PT DAM Indonesia — Terverifikasi Digital Melalui Sistem Gappy Assessment | Halaman 1 dari 1`,
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 6,
      { align: 'center' }
    );

    doc.save(`BAP_Insiden_K3_${incident.id.slice(0, 8)}_${new Date().toISOString().slice(0, 10)}.pdf`);
  }
}
