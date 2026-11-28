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
import { supabase } from './supabaseClient';
import { savePdf } from './pdfReportService';
import { getTodayWibDateString } from './dateUtils';

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
  // ─── CLOUD MAPPERS & SYNC (warehouse_zones_5s & audit_5s_records) ───

  private static zoneToRow(z: WarehouseZone5s) {
    return {
      id: z.id,
      name: z.name,
      zone_type: z.zoneType || 'other',
      division: z.division || 'OPERASIONAL',
      pic_worker_id: z.picWorkerId && z.picWorkerId.trim() ? z.picWorkerId.trim() : null,
      pic_worker_name: z.picWorkerName || 'Belum Ditentukan',
      last_audit_score: typeof z.lastAuditScore === 'number' ? z.lastAuditScore : 0,
      badge_rating: z.badgeRating || 'Perlu Perbaikan',
      last_audited_date: z.lastAuditedDate || null,
      is_active: z.isActive !== false,
      notes: z.notes || null,
      updated_at: new Date().toISOString(),
    };
  }

  private static rowToZone(row: any): WarehouseZone5s {
    return {
      id: row.id,
      name: row.name,
      zoneType: (row.zone_type || 'other') as ZoneType,
      division: row.division || 'OPERASIONAL',
      picWorkerId: row.pic_worker_id || undefined,
      picWorkerName: row.pic_worker_name || undefined,
      lastAuditScore: row.last_audited_date ? Number(row.last_audit_score ?? 0) : (Number(row.last_audit_score) > 0 ? Number(row.last_audit_score) : undefined),
      badgeRating: row.last_audited_date ? ((row.badge_rating || 'Perlu Perbaikan') as Rating5s) : (Number(row.last_audit_score) > 0 ? (row.badge_rating as Rating5s) : undefined),
      lastAuditedDate: row.last_audited_date || undefined,
      isActive: row.is_active !== false,
      notes: row.notes || undefined,
    };
  }

  private static recordToRow(r: Audit5sRecord, zone?: WarehouseZone5s) {
    return {
      id: r.id,
      zone_id: r.zoneId,
      zone_name: r.zoneName,
      zone_type: zone?.zoneType || 'other',
      division: r.division || zone?.division || 'OPERASIONAL',
      auditor_id: r.auditorId && r.auditorId.trim() && r.auditorId !== 'SYS-ADMIN' ? r.auditorId.trim() : null,
      auditor_name: r.auditorName || 'Auditor 5R',
      pic_worker_name: zone?.picWorkerName || 'PIC Area',
      audit_date: r.auditDate || getTodayWibDateString(),
      ringkas_score: Number(r.scores?.ringkas_seiri ?? 0),
      rapi_score: Number(r.scores?.rapi_seiton ?? 0),
      resik_score: Number(r.scores?.resik_seiso ?? 0),
      rawat_score: Number(r.scores?.rawat_seiketsu ?? 0),
      rajin_score: Number(r.scores?.rajin_shitsuke ?? 0),
      total_score: Number(r.totalScore ?? 0),
      rating: r.rating || 'Perlu Perbaikan',
      reward_points_awarded: Number(r.allocatedRewardPoints ?? 0),
      findings_notes: r.findingsDescription || null,
      corrective_actions: r.correctiveAction || null,
      photo_urls: {
        auditRefNumber: r.auditRefNumber,
        beforePhotoUrl: r.beforePhotoUrl || null,
        afterPhotoUrl: r.afterPhotoUrl || null,
        status: r.status || 'passed',
      },
      created_at: r.createdAt || new Date().toISOString(),
    };
  }

  private static rowToRecord(row: any): Audit5sRecord {
    const photos = row.photo_urls;
    let beforePhotoUrl: string | undefined;
    let afterPhotoUrl: string | undefined;
    let auditRefNumber = `5R-${String(row.id || '').slice(-6).toUpperCase()}`;
    let status: Audit5sRecord['status'] =
      Number(row.total_score) >= 75 ? 'passed' : Number(row.total_score) >= 60 ? 'needs_improvement' : 'critical_remedial';

    if (photos && typeof photos === 'object' && !Array.isArray(photos)) {
      if (photos.auditRefNumber) auditRefNumber = String(photos.auditRefNumber);
      if (photos.beforePhotoUrl) beforePhotoUrl = String(photos.beforePhotoUrl);
      if (photos.afterPhotoUrl) afterPhotoUrl = String(photos.afterPhotoUrl);
      if (photos.status) status = photos.status;
    } else if (Array.isArray(photos)) {
      if (photos[0]) beforePhotoUrl = String(photos[0]);
      if (photos[1]) afterPhotoUrl = String(photos[1]);
    }

    return {
      id: row.id,
      auditRefNumber,
      zoneId: row.zone_id,
      zoneName: row.zone_name,
      division: row.division || 'OPERASIONAL',
      auditorId: row.auditor_id || undefined,
      auditorName: row.auditor_name || 'Auditor 5R',
      auditDate: row.audit_date || getTodayWibDateString(),
      scores: {
        ringkas_seiri: Number(row.ringkas_score ?? 0),
        rapi_seiton: Number(row.rapi_score ?? 0),
        resik_seiso: Number(row.resik_score ?? 0),
        rawat_seiketsu: Number(row.rawat_score ?? 0),
        rajin_shitsuke: Number(row.rajin_score ?? 0),
      },
      totalScore: Number(row.total_score ?? 0),
      rating: (row.rating || 'Perlu Perbaikan') as Rating5s,
      findingsDescription: row.findings_notes || undefined,
      correctiveAction: row.corrective_actions || undefined,
      beforePhotoUrl,
      afterPhotoUrl,
      allocatedRewardPoints: Number(row.reward_points_awarded ?? 0),
      status,
      createdAt: row.created_at || new Date().toISOString(),
    };
  }

  private static async upsertZoneToCloud(zone: WarehouseZone5s): Promise<void> {
    try {
      const payload = this.zoneToRow(zone);
      let { error } = await supabase.from('warehouse_zones_5s').upsert(payload, { onConflict: 'id' });
      // Fallback jika pic_worker_id tidak cocok FK workers(id)
      if (error && error.code === '23503' && payload.pic_worker_id) {
        ({ error } = await supabase
          .from('warehouse_zones_5s')
          .upsert({ ...payload, pic_worker_id: null }, { onConflict: 'id' }));
      }
      if (error) console.warn('[Audit5sService] Gagal sinkron zona ke Supabase:', error.message);
    } catch (err) {
      console.warn('[Audit5sService] Exception upsertZoneToCloud:', err);
    }
  }

  private static async upsertRecordToCloud(record: Audit5sRecord, zone?: WarehouseZone5s): Promise<void> {
    try {
      if (zone) {
        await this.upsertZoneToCloud(zone);
      }
      const payload = this.recordToRow(record, zone);
      let { error } = await supabase.from('audit_5s_records').upsert(payload, { onConflict: 'id' });
      if (error && error.code === '23503' && payload.auditor_id) {
        ({ error } = await supabase
          .from('audit_5s_records')
          .upsert({ ...payload, auditor_id: null }, { onConflict: 'id' }));
      }
      if (error) console.warn('[Audit5sService] Gagal sinkron record audit 5R ke Supabase:', error.message);
    } catch (err) {
      console.warn('[Audit5sService] Exception upsertRecordToCloud:', err);
    }
  }

  /**
   * Tarik data Zona & Riwayat Audit 5R dari Supabase (hybrid cache-first + migrasi lokal otomatis).
   */
  public static async fetchFromSupabase(): Promise<{ zones: WarehouseZone5s[]; records: Audit5sRecord[] }> {
    const localZones = this.getAllZones();
    const localRecords = this.getAllRecords();

    try {
      const [zonesRes, recordsRes] = await Promise.all([
        supabase.from('warehouse_zones_5s').select('*').order('name', { ascending: true }),
        supabase.from('audit_5s_records').select('*').order('created_at', { ascending: false }).limit(200),
      ]);

      if (zonesRes.error || recordsRes.error) {
        console.warn(
          '[Audit5sService] Supabase fetch warning, fallback ke cache lokal:',
          zonesRes.error?.message || recordsRes.error?.message
        );
        return { zones: localZones, records: localRecords };
      }

      const remoteZones = (zonesRes.data || []).map((r) => this.rowToZone(r));
      const remoteRecords = (recordsRes.data || []).map((r) => this.rowToRecord(r));

      // Merge zona: remote sebagai sumber kebenaran, plus dorong zona lokal yang belum ada di cloud
      const remoteZoneIds = new Set(remoteZones.map((z) => z.id));
      const localOnlyZones = localZones.filter((z) => !remoteZoneIds.has(z.id));
      const mergedZones = [...remoteZones, ...localOnlyZones];

      // Merge record: remote + dorong record lokal offline yang belum ada di cloud
      const remoteRecordIds = new Set(remoteRecords.map((r) => r.id));
      const localOnlyRecords = localRecords.filter((r) => !remoteRecordIds.has(r.id));
      const mergedRecords = [...remoteRecords, ...localOnlyRecords].sort(
        (a, b) => new Date(b.createdAt || b.auditDate).getTime() - new Date(a.createdAt || a.auditDate).getTime()
      );

      // Push local-only entries ke cloud secara non-blocking
      if (localOnlyZones.length > 0 || localOnlyRecords.length > 0) {
        (async () => {
          for (const z of localOnlyZones) {
            await this.upsertZoneToCloud(z);
          }
          for (const rec of localOnlyRecords) {
            const z = mergedZones.find((item) => item.id === rec.zoneId);
            await this.upsertRecordToCloud(rec, z);
          }
        })().catch(() => {});
      }

      safeLocalStorageSetItem(ZONES_STORAGE_KEY, mergedZones);
      safeLocalStorageSetItem(RECORDS_STORAGE_KEY, mergedRecords);
      window.dispatchEvent(new Event(EVENT_UPDATED));
      return { zones: mergedZones, records: mergedRecords };
    } catch (err) {
      console.warn('[Audit5sService] Network exception fetchFromSupabase:', err);
      return { zones: localZones, records: localRecords };
    }
  }

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
    this.upsertZoneToCloud(newZone).catch(() => {});
    return newZone;
  }

  public static updateZone(zoneId: string, updates: Partial<WarehouseZone5s>): boolean {
    const zones = this.getAllZones();
    const idx = zones.findIndex((z) => z.id === zoneId);
    if (idx === -1) return false;
    zones[idx] = { ...zones[idx], ...updates };
    this.saveZones(zones);
    this.upsertZoneToCloud(zones[idx]).catch(() => {});
    return true;
  }

  public static deleteZone(zoneId: string): boolean {
    const zones = this.getAllZones();
    const filtered = zones.filter((z) => z.id !== zoneId);
    if (filtered.length === zones.length) return false;
    this.saveZones(filtered);
    supabase
      .from('warehouse_zones_5s')
      .delete()
      .eq('id', zoneId)
      .then(({ error }) => {
        if (error) console.warn('[Audit5sService] Gagal hapus zona di Supabase:', error.message);
      });
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
      auditDate: params.auditDate || getTodayWibDateString(),
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

    // Update zone latest audit state (sekaligus sinkronisasi zona & record audit ke Supabase)
    const updatedZone: WarehouseZone5s = {
      ...zone,
      lastAuditScore: totalScore,
      lastAuditedDate: newRecord.auditDate,
      badgeRating: rating,
    };
    this.updateZone(zone.id, {
      lastAuditScore: totalScore,
      lastAuditedDate: newRecord.auditDate,
      badgeRating: rating,
    });
    this.upsertRecordToCloud(newRecord, updatedZone).catch(() => {});

    // Award points & notify PIC Worker if assigned
    if (zone.picWorkerId) {
      if (points > 0) {
        const picId = zone.picWorkerId;
        (async () => {
          try {
            const { data: w } = await supabase
              .from('workers')
              .select('id, name, total_points, prestige_points')
              .or(`id.eq.${picId},employee_id.eq.${picId}`)
              .maybeSingle();

            const { error: rpcErr } = await supabase.rpc('increment_worker_points', {
              p_worker_id: picId,
              p_points: points,
            });

            if (rpcErr && w) {
              const curTotal = Number(w.total_points || 0);
              const curPr = Number(w.prestige_points || curTotal);
              await supabase
                .from('workers')
                .update({
                  total_points: curTotal + points,
                  prestige_points: curPr + points,
                  updated_at: new Date().toISOString(),
                })
                .eq('id', w.id);
            }

            try {
              await supabase.from('activity_log').insert({
                worker_id: picId,
                worker_name: w?.name || 'PIC 5R Gudang',
                action: 'audit_5s_completed',
                detail: `Insentif Audit 5R Wilayah ${zone.name} (Predikat ${rating}, Skor ${totalScore}%): +${points} PTS`,
              });
            } catch {}

            if (typeof window !== 'undefined') {
              window.dispatchEvent(
                new CustomEvent('gappy_points_awarded', {
                  detail: {
                    workerId: picId,
                    pointsEarned: points,
                  },
                })
              );
            }
          } catch (err) {
            console.warn('[Audit5sService] Gagal memberikan poin reward 5S ke PIC:', err);
          }
        })();
      }

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

    savePdf(doc, `Laporan_Audit_5R_${record.zoneName.replace(/\s+/g, '_')}_${record.auditDate}.pdf`);
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
