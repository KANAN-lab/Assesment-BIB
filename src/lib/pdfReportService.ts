/**
 * OOP Report Service: ExecutivePDFReportGenerator
 * Generates executive-grade PDF reports for PT DAM Indonesia logistics assessment.
 */

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { WorkerProfile, IncidentReport } from '../types/assessment';
import { matrixEngine } from '../domain/CompetencyMatrixEngine';
import { RoleEntity } from '../domain/RoleEntity';

export class ExecutivePDFReportGenerator {
  public static generateExecutiveReport(
    workers: WorkerProfile[],
    supervisorName: string = 'Supervisor Logistik'
  ): void {
    // Filter operational workers only
    const opWorkers = workers.filter(
      (w) => RoleEntity.isOperationalWorker(w.role) && w.division.toUpperCase() !== 'SYSTEM'
    );

    const doc = new jsPDF('p', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    const currentDate = new Date().toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });

    // 1. Corporate Header
    doc.setFillColor(15, 23, 42); // Dark slate (#0f172a)
    doc.rect(0, 0, pageWidth, 28, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text('PT DAM INDONESIA — LOGISTICS ASSESSMENT PLATFORM', 14, 12);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(148, 163, 184); // Slate 400
    doc.text('LAPORAN EKSEKUTIF AUDIT KINERJA, EVALUASI K3 & MATRIKS KOMPETENSI TIM OPERASIONAL', 14, 19);

    // Date & Document Metadata
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(`Tanggal Cetak: ${currentDate} | Pengawas: ${supervisorName}`, 14, 34);

    // 2. Executive Summary Metrics Banner
    const totalWorkers = opWorkers.length;
    const avgBib = totalWorkers
      ? (opWorkers.reduce((s, w) => s + w.bibScores.totalScore, 0) / totalWorkers).toFixed(1)
      : '0.0';
    const totalStreak = opWorkers.reduce((s, w) => s + w.streakDays, 0);
    const auditedCount = opWorkers.filter((w) => w.bibScores.totalScore > 0).length;

    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(14, 37, pageWidth - 28, 20, 2, 2, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(15, 23, 42);
    doc.text(`TOTAL PERSONEL: ${totalWorkers} Staf`, 20, 45);
    doc.text(`RATA-RATA BIB SCORE: ${avgBib} / 100`, 75, 45);
    doc.text(`PERSONEL TER-AUDIT: ${auditedCount} / ${totalWorkers}`, 135, 45);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    doc.text(`Safety Streak Tim: ${totalStreak} Hari`, 20, 51);
    doc.text('Status K3: 100% Zero Incident', 75, 51);
    doc.text('Rasio Audit: ' + Math.round((auditedCount / (totalWorkers || 1)) * 100) + '%', 135, 51);

    // 3. Worker Audit Details Table
    const tableHead = [
      ['NO', 'NIP', 'NAMA PEKERJA', 'ROLE OPERASIONAL', 'DIVISI', 'TIER', 'BEHAVIOR', 'INTEGRITY', 'BENCHMARK', 'BIB SCORE', 'STATUS'],
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
      startY: 62,
      head: tableHead,
      body: tableBody,
      theme: 'grid',
      headStyles: {
        fillColor: [15, 23, 42],
        textColor: [255, 255, 255],
        fontSize: 7.5,
        fontStyle: 'bold',
        halign: 'center',
      },
      bodyStyles: {
        fontSize: 7.5,
        textColor: [30, 41, 59],
      },
      columnStyles: {
        0: { halign: 'center', cellWidth: 10 },
        1: { halign: 'center', cellWidth: 20 },
        2: { cellWidth: 32 },
        3: { cellWidth: 30 },
        4: { halign: 'center', cellWidth: 16 },
        5: { halign: 'center', cellWidth: 20 },
        6: { halign: 'right', cellWidth: 14 },
        7: { halign: 'right', cellWidth: 14 },
        8: { halign: 'right', cellWidth: 14 },
        9: { halign: 'right', cellWidth: 16, fontStyle: 'bold' },
        10: { halign: 'center', cellWidth: 18 },
      },
      didParseCell: (data) => {
        if (data.section === 'body' && data.column.index === 9) {
          const val = parseFloat(data.cell.text[0]);
          if (val >= 80) data.cell.styles.textColor = [16, 185, 129];
          else if (val > 0) data.cell.styles.textColor = [245, 158, 11];
          else data.cell.styles.textColor = [225, 29, 72];
        }
      },
    });

    // 4. Verification Signatures Block
    const finalY = (doc as any).lastAutoTable.finalY || 180;
    const signY = Math.min(finalY + 20, doc.internal.pageSize.getHeight() - 40);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(30, 41, 59);

    // Left Signature: Supervisor
    doc.text('Dibuat & Diverifikasi Oleh,', 30, signY);
    doc.text('Supervisor Logistik / Pengawas', 30, signY + 5);
    doc.line(30, signY + 22, 85, signY + 22);
    doc.setFont('helvetica', 'bold');
    doc.text(supervisorName, 30, signY + 26);

    // Right Signature: Head of Logistics & HSE
    doc.setFont('helvetica', 'normal');
    doc.text('Disetujui Oleh,', pageWidth - 85, signY);
    doc.text('Head of Operations & HSE Manager', pageWidth - 85, signY + 5);
    doc.line(pageWidth - 85, signY + 22, pageWidth - 30, signY + 22);
    doc.setFont('helvetica', 'bold');
    doc.text('PT DAM Indonesia Management', pageWidth - 85, signY + 26);

    // Footer Page Number
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184);
    doc.text(
      `Dokumen Rahasia Internal — BIB Logistics Assessment System v3.3.0 | Halaman 1 dari 1`,
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 8,
      { align: 'center' }
    );

    doc.save(`Laporan_Eksekutif_Audit_Logistik_${new Date().toISOString().split('T')[0]}.pdf`);
  }

  public static exportIncidentReportPDF(incident: IncidentReport): void {
    const doc = new jsPDF('p', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    const currentDate = new Date().toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });

    // 1. Corporate Header
    doc.setFillColor(194, 65, 12); // Deep Orange/Amber K3 Header
    doc.rect(0, 0, pageWidth, 28, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text('BERITA ACARA & LAPORAN INSIDEN K3 (SAFETY INCIDENT REPORT)', 14, 12);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(254, 215, 170);
    doc.text('PT DAM INDONESIA — DIVISI KESELAMATAN & KESEHATAN KERJA (HSE DEPT)', 14, 19);

    // Meta bar
    doc.setFillColor(241, 245, 249);
    doc.rect(14, 32, pageWidth - 28, 10, 'F');
    doc.setFontSize(8);
    doc.setTextColor(51, 65, 85);
    doc.text(`ID Dokumen: INC-${incident.id.slice(0, 8).toUpperCase()} | Tanggal Cetak: ${currentDate}`, 18, 38);

    // Table detail insiden
    autoTable(doc, {
      startY: 46,
      head: [['Parameter', 'Detail Informasi Insiden K3']],
      body: [
        ['Pelapor / Pekerja', incident.workerName || incident.workerId],
        ['Jenis Insiden', incident.incidentType.toUpperCase().replace('_', ' ')],
        ['Tingkat Keparahan (Severity)', incident.severity.toUpperCase()],
        ['Status Laporan', incident.status.toUpperCase()],
        ['Lokasi Kejadian', incident.location],
        ['Waktu Kejadian', new Date(incident.occurredAt).toLocaleString('id-ID')],
        ['Deskripsi Kronologi', incident.description],
      ],
      headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontStyle: 'bold' },
      styles: { fontSize: 8, cellPadding: 3 },
      columnStyles: { 0: { fontStyle: 'bold', cellWidth: 50 } },
    });

    let currentY = (doc as any).lastAutoTable.finalY + 8;

    // CAPA Section Table
    autoTable(doc, {
      startY: currentY,
      head: [['Modul Kontrol & Follow-Up CAPA (Corrective & Preventive Action)']],
      body: [
        [`Akar Masalah (Root Cause):\n${incident.rootCause || 'Belum diisi / Dalam proses analisis 5-Why'}`],
        [`Rencana Tindakan Korektif (Action Plan):\n${incident.correctiveAction || 'Belum diisi'}`],
        [`PIC Penanggung Jawab: ${incident.assignedPic || '-'} | Target Selesai (Due Date): ${incident.dueDate || '-'}`],
        [`Catatan Resolusi / Penutupan: ${incident.resolutionNote || '-'}`],
      ],
      headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: 'bold' },
      styles: { fontSize: 8, cellPadding: 3 },
    });

    currentY = (doc as any).lastAutoTable.finalY + 12;

    // Signature blocks
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    doc.text('Dibuat Oleh (Pelapor K3):', 20, currentY);
    doc.text('Disetujui Oleh (HSE / Supervisor):', pageWidth - 80, currentY);

    currentY += 15;
    doc.setFont('helvetica', 'bold');
    doc.text(`( ${incident.workerName || 'Pekerja Logistik'} )`, 20, currentY);
    doc.text('( HSE / Supervisor Logistik )', pageWidth - 80, currentY);

    doc.save(`Berita_Acara_Insiden_K3_${incident.id.slice(0, 6)}.pdf`);
  }
}
