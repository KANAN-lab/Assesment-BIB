// src/lib/audit5sService.ts

import {
  WarehouseZone5s,
  Audit5sRecord,
  Audit5sPillars,
  Rating5s,
  ZoneType,
  Audit5sStats,
} from '../types/audit5s';
import { NotificationEngine } from '../domain/NotificationEngine';
import { SystemConfigService } from '../domain/SystemConfigService';
import { Audit5sEngine } from '../domain/Audit5sEngine';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { safeLocalStorageSetItem } from './storageSanitizer';

const ZONES_STORAGE_KEY = 'gappy_5s_zones_v2';
const RECORDS_STORAGE_KEY = 'gappy_5s_audit_records_v2';
const EVENT_UPDATED = 'gappy_5s_updated';

export const ZONE_TYPE_META: Record<ZoneType, { label: string; icon: string }> = {
  loading_dock: { label: 'Loading & Unloading Dock', icon: '🚛' },
  racking_aisle: { label: 'Lorong Racking Rak Penyimpanan', icon: '📦' },
  charging_bay: { label: 'Ruang Battery Charging MHE', icon: '⚡' },
  staging_area: { label: 'Area Staging & Buffer Pallet', icon: '🏗️' },
  weighbridge_pos: { label: 'Pos Timbangan Inbound / Outbound', icon: '⚖️' },
  office_area: { label: 'Ruang Administrasi Operasional', icon: '🏢' },
  other: { label: 'Wilayah Gudang Lainnya', icon: '📍' },
};

export const RATING_META: Record<Rating5s, { label: string; badgeCls: string; rewardPoints: number }> = {
  Gold: {
    label: 'Gold (Audit Sangat Unggul)',
    badgeCls: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
    rewardPoints: 200,
  },
  Silver: {
    label: 'Silver (Audit Baik & Sesuai SOP)',
    badgeCls: 'bg-zinc-700/30 text-zinc-300 border-zinc-500/30',
    rewardPoints: 100,
  },
  Bronze: {
    label: 'Bronze (Audit Cukup Terkendali)',
    badgeCls: 'bg-orange-700/20 text-orange-400 border-orange-600/30',
    rewardPoints: 50,
  },
  'Perlu Perbaikan': {
    label: 'Perlu Perbaikan (Temuan Minor/Mayor)',
    badgeCls: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
    rewardPoints: 0,
  },
};

export class Audit5sService {
  // ─── ZONES REPOSITORY ──────────────────────────────────────

  public static getAllZones(): WarehouseZone5s[] {
    try {
      const raw = localStorage.getItem(ZONES_STORAGE_KEY);
      if (!raw) return [];
      return JSON.parse(raw);
    } catch {
      return [];
    }
  }

  private static saveZones(zones: WarehouseZone5s[]): void {
    safeLocalStorageSetItem(ZONES_STORAGE_KEY, zones);
    window.dispatchEvent(new Event(EVENT_UPDATED));
  }

  public static addZone(zone: Omit<WarehouseZone5s, 'id' | 'isActive'>): WarehouseZone5s {
    const zones = this.getAllZones();
    const newZone: WarehouseZone5s = {
      ...zone,
      id: `zone_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      isActive: true,
    };
    zones.push(newZone);
    this.saveZones(zones);
    return newZone;
  }

  public static updateZone(zoneId: string, updates: Partial<WarehouseZone5s>): boolean {
    const zones = this.getAllZones();
    const idx = zones.findIndex((z) => z.id === zoneId);
    if (idx === -1) return false;
    zones[idx] = { ...zones[idx], ...updates };
    this.saveZones(zones);
    return true;
  }

  public static deleteZone(zoneId: string): boolean {
    const zones = this.getAllZones();
    const filtered = zones.filter((z) => z.id !== zoneId);
    if (filtered.length === zones.length) return false;
    this.saveZones(filtered);
    return true;
  }

  // ─── AUDIT RECORDS REPOSITORY ──────────────────────────────

  public static getAllRecords(): Audit5sRecord[] {
    try {
      const raw = localStorage.getItem(RECORDS_STORAGE_KEY);
      if (!raw) return [];
      return JSON.parse(raw);
    } catch {
      return [];
    }
  }

  private static saveRecords(records: Audit5sRecord[]): void {
    safeLocalStorageSetItem(RECORDS_STORAGE_KEY, records);
    window.dispatchEvent(new Event(EVENT_UPDATED));
  }

  public static calculateRating(score: number): { rating: Rating5s; points: number; status: Audit5sRecord['status'] } {
    return Audit5sEngine.evaluateRating(score);
  }

  public static getRatingRewardPoints(rating: Rating5s): number {
    return Audit5sEngine.evaluateRating(rating === 'Gold' ? 95 : rating === 'Silver' ? 85 : rating === 'Bronze' ? 75 : 0).points;
  }

  public static submitAuditRecord(params: {
    zoneId: string;
    auditorName: string;
    auditorId?: string;
    scores: Audit5sPillars;
    findingsDescription?: string;
    correctiveAction?: string;
    beforePhotoUrl?: string;
    afterPhotoUrl?: string;
    auditDate?: string;
    idempotencyKey?: string;
  }): Audit5sRecord {
    const zones = this.getAllZones();
    const zone = zones.find((z) => z.id === params.zoneId);
    if (!zone) throw new Error('Zona gudang tidak ditemukan');

    const records = this.getAllRecords();

    // Guard: cegah duplikat di localStorage jika idempotencyKey sudah ada
    if (params.idempotencyKey) {
      const existing = records.find((r) => (r as any).idempotencyKey === params.idempotencyKey);
      if (existing) {
        console.info('[Audit5sService] Duplikat audit diabaikan (idempotencyKey sudah ada):', params.idempotencyKey);
        return existing;
      }
    }

    const auditRefNumber = SystemConfigService.generateDocumentNumber('audit_5s', { code: zone.division });

    // Average of 5 pillars computed via OOP Domain Engine
    const totalScore = Audit5sEngine.calculateCompositeScore(params.scores);
    const { rating, points, status } = this.calculateRating(totalScore);

    const newRecord: Audit5sRecord = {
      id: `audit5s_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      auditRefNumber,
      zoneId: zone.id,
      zoneName: zone.name,
      division: zone.division,
      auditorId: params.auditorId,
      auditorName: params.auditorName,
      auditDate: params.auditDate || new Date().toISOString().slice(0, 10),
      scores: params.scores,
      totalScore,
      rating,
      findingsDescription: params.findingsDescription,
      correctiveAction: params.correctiveAction,
      beforePhotoUrl: params.beforePhotoUrl,
      afterPhotoUrl: params.afterPhotoUrl,
      allocatedRewardPoints: points,
      status,
      createdAt: new Date().toISOString(),
      ...(params.idempotencyKey ? { idempotencyKey: params.idempotencyKey } : {}),
    } as Audit5sRecord & { idempotencyKey?: string };

    records.unshift(newRecord);
    this.saveRecords(records);

    // Update zone latest audit state
    this.updateZone(zone.id, {
      lastAuditScore: totalScore,
      lastAuditedDate: newRecord.auditDate,
      badgeRating: rating,
    });

    // Notify PIC Worker if assigned
    if (zone.picWorkerId) {
      NotificationEngine.addNotification({
        recipientId: zone.picWorkerId,
        recipientRole: 'worker',
        type: 'audit',
        title: `🏢 Hasil Audit 5R Wilayah: ${zone.name}`,
        message: `Audit Standar 5R/5S selesai dengan Skor ${totalScore}% (Predikat ${rating}). Alokasi Insentif: +${points} Poin.`,
      });
    }

    return newRecord;
  }


  public static getStats(): Audit5sStats {
    const zones = this.getAllZones();
    const records = this.getAllRecords();

    const scoredZones = zones.filter((z) => typeof z.lastAuditScore === 'number');
    const avgScore = scoredZones.length
      ? Math.round(scoredZones.reduce((s, z) => s + (z.lastAuditScore || 0), 0) / scoredZones.length)
      : 0;

    return {
      totalZones: zones.length,
      avgScore,
      goldZones: zones.filter((z) => z.badgeRating === 'Gold').length,
      silverZones: zones.filter((z) => z.badgeRating === 'Silver').length,
      improvementNeededZones: zones.filter((z) => z.badgeRating === 'Perlu Perbaikan').length,
      totalAuditsRecorded: records.length,
      totalRewardPointsAwarded: records.reduce((s, r) => s + (r.allocatedRewardPoints || 0), 0),
    };
  }

  // ─────────────────────────────────────────────────────────────
  // CETAK SERTIFIKAT & BERITA ACARA AUDIT 5R (PDF)
  // ─────────────────────────────────────────────────────────────

  public static generateAudit5sReportPDF(record: Audit5sRecord): void {
    const doc = new jsPDF('p', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();

    // Header
    doc.setFillColor(15, 118, 110); // Teal-700
    doc.rect(0, 0, pageWidth, 28, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text('PT. DAYA ANUGRAH MULYA — AUDIT STANDAR 5R / 5S WILAYAH GUDANG', 14, 11);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(204, 251, 241);
    doc.text('BERITA ACARA EVALUASI RINGKAS, RAPI, RESIK, RAWAT & RAJIN (HOUSEKEEPING)', 14, 18);
    doc.text(`No. Audit: ${record.auditRefNumber} | Tanggal Audit: ${record.auditDate}`, 14, 24);

    // Summary Banner
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(14, 34, pageWidth - 28, 18, 2, 2, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(15, 23, 42);
    doc.text(`WILAYAH ZONA: ${record.zoneName.toUpperCase()}`, 18, 41);
    doc.text(`TOTAL SKOR 5R: ${record.totalScore}% / 100%`, 85, 41);
    doc.text(`PREDIKAT: ${record.rating.toUpperCase()}`, 145, 41);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(71, 85, 105);
    doc.text(`Divisi: ${record.division}`, 18, 47);
    doc.text(`Auditor: ${record.auditorName}`, 85, 47);
    doc.text(`Reward PIC: +${record.allocatedRewardPoints} Poin BIB`, 145, 47);

    // Detail Skor 5 Pilar Table
    autoTable(doc, {
      startY: 56,
      head: [['Pilar 5R / 5S', 'Fokus Standar Evaluasi', 'Skor Penilaian', 'Status Kepatuhan']],
      body: [
        ['1. Ringkas (Seiri)', 'Pemisahan barang terpakai vs tidak terpakai, bebas red-tag & sampah', `${record.scores.ringkas_seiri}%`, record.scores.ringkas_seiri >= 80 ? 'Sesuai' : 'Perlu Rapih'],
        ['2. Rapi (Seiton)', 'Penataan letak barang, batas garis marka jalan, label identitas jelas', `${record.scores.rapi_seiton}%`, record.scores.rapi_seiton >= 80 ? 'Sesuai' : 'Perlu Rapih'],
        ['3. Resik (Seiso)', 'Kebersihan lantai dari ceceran oli/sampah, peralatan kerja terawat bersih', `${record.scores.resik_seiso}%`, record.scores.resik_seiso >= 80 ? 'Sesuai' : 'Kurang Bersih'],
        ['4. Rawat (Seiketsu)', 'Standarisasi visual control, konsistensi pemeliharaan kebersihan harian', `${record.scores.rawat_seiketsu}%`, record.scores.rawat_seiketsu >= 80 ? 'Sesuai' : 'Perlu Standar'],
        ['5. Rajin (Shitsuke)', 'Disiplin pekerja dalam merawat zona kerja, aktif safety 5R briefing', `${record.scores.rajin_shitsuke}%`, record.scores.rajin_shitsuke >= 80 ? 'Sesuai' : 'Perlu Edukasi'],
      ],
      headStyles: { fillColor: [15, 118, 110], textColor: [255, 255, 255], fontStyle: 'bold' },
      styles: { fontSize: 7.5, cellPadding: 2.5 },
      columnStyles: { 0: { fontStyle: 'bold', cellWidth: 35 }, 2: { halign: 'center', cellWidth: 25 }, 3: { halign: 'center', cellWidth: 30 } },
    });

    let currentY = (doc as any).lastAutoTable.finalY + 6;

    // Findings & Action Plan Table
    autoTable(doc, {
      startY: currentY,
      head: [['Temuan Ketidaksesuaian & Rencana Perbaikan (Action Plan)']],
      body: [
        [`Catatan Temuan Lapangan:\n${record.findingsDescription || 'Tidak ada temuan ketidaksesuaian mayor. Kebersihan dan keteraturan area sangat baik.'}`],
        [`Tindakan Korektif & Target:\n${record.correctiveAction || 'Pertahankan standar 5R saat pergantian shift.'}`],
      ],
      headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontStyle: 'bold' },
      styles: { fontSize: 7.5, cellPadding: 3 },
    });

    currentY = (doc as any).lastAutoTable.finalY + 14;

    // Signature Block
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    doc.text('Auditor / Pengawas 5R,', 25, currentY);
    doc.text('PIC Penanggung Jawab Wilayah,', pageWidth - 80, currentY);

    currentY += 16;
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(`( ${record.auditorName} )`, 25, currentY);
    doc.text('( PIC Zona Gudang )', pageWidth - 80, currentY);

    // Footer
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
    doc.text(
      'Dokumen Resmi Audit 5R PT. DAYA ANUGRAH MULYA — Gappy Assessment Platform | Halaman 1 dari 1',
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 6,
      { align: 'center' }
    );

    doc.save(`Laporan_Audit_5R_${record.zoneName.replace(/\s+/g, '_')}_${record.auditDate}.pdf`);
  }

  // ─────────────────────────────────────────────────────────────
  // EKSPOR CSV
  // ─────────────────────────────────────────────────────────────

  public static exportAuditRecordsCSV(records: Audit5sRecord[]): void {
    const headers = [
      'No Audit',
      'Nama Zona',
      'Divisi',
      'Auditor',
      'Tanggal Audit',
      'Ringkas',
      'Rapi',
      'Resik',
      'Rawat',
      'Rajin',
      'Total Skor (%)',
      'Predikat Rating',
      'Alokasi Poin Insentif',
      'Status',
    ];

    const rows = records.map((r) => [
      `"${r.auditRefNumber}"`,
      `"${r.zoneName}"`,
      `"${r.division}"`,
      `"${r.auditorName}"`,
      `"${r.auditDate}"`,
      r.scores.ringkas_seiri,
      r.scores.rapi_seiton,
      r.scores.resik_seiso,
      r.scores.rawat_seiketsu,
      r.scores.rajin_shitsuke,
      r.totalScore,
      `"${r.rating}"`,
      r.allocatedRewardPoints,
      `"${r.status.toUpperCase()}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Rekap_Audit_5R_PT_DAYA_ANUGRAH_MULYA_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}
