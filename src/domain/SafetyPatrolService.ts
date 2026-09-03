import { supabase } from '../lib/supabaseClient';
import {
  SafetyPatrolRecord,
  PatrolStatus,
  FindingType,
  PatrolSeverity,
  SEVERITY_CONFIG,
  FINDING_TYPE_CONFIG
} from '../types/safetyPatrol';
import { OfflineQueueManager } from '../lib/offlineQueueManager';
import { SystemConfigService } from './SystemConfigService';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const STORAGE_KEY = 'gappy_safety_patrol_records';

export class SafetyPatrolService {
  /**
   * Mengambil seluruh log inspeksi patroli keselamatan (Gemba Walk)
   */
  public static async getAllPatrols(): Promise<SafetyPatrolRecord[]> {
    try {
      const { data, error } = await supabase
        .from('safety_patrol_logs')
        .select('*')
        .order('patrol_date', { ascending: false });

      if (!error && data) {
        const mapped: SafetyPatrolRecord[] = data.map((d: any) => ({
          id: d.id,
          supervisorId: d.supervisor_id,
          supervisorName: d.supervisor_name,
          patrolDate: d.patrol_date,
          zoneId: d.zone_id,
          zoneName: d.zone_name,
          findingType: d.finding_type,
          severity: d.severity,
          description: d.description,
          photoUrl: d.photo_url,
          assignedPicId: d.assigned_pic_id,
          assignedPicName: d.assigned_pic_name,
          status: d.status,
          dueDate: d.due_date,
          resolutionNotes: d.resolution_notes,
          resolvedAt: d.resolved_at,
          pointsAwarded: d.points_awarded,
          createdAt: d.created_at,
          updatedAt: d.updated_at,
        }));
        this.saveToLocal(mapped);
        return mapped;
      }
    } catch (err) {
      console.warn('Supabase fetch safety patrol logs failed, using local cache:', err);
    }

    // Fallback ke localStorage murni (tanpa seed mock hardcoded)
    return this.getFromLocal();
  }

  /**
   * Catat temuan patroli baru (Gemba Walk Quick Tour)
   */
  public static async createPatrolRecord(
    entry: Omit<SafetyPatrolRecord, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<SafetyPatrolRecord> {
    const id = `patrol-${Date.now()}`;
    const newRecord: SafetyPatrolRecord = {
      ...entry,
      id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // 1. Simpan ke local cache segera
    const current = this.getFromLocal();
    const updated = [newRecord, ...current];
    this.saveToLocal(updated);

    // 2. Kirim ke Supabase
    try {
      const { error } = await supabase.from('safety_patrol_logs').insert({
        id: newRecord.id,
        supervisor_id: newRecord.supervisorId,
        supervisor_name: newRecord.supervisorName,
        patrol_date: newRecord.patrolDate,
        zone_id: newRecord.zoneId,
        zone_name: newRecord.zoneName,
        finding_type: newRecord.findingType,
        severity: newRecord.severity,
        description: newRecord.description,
        photo_url: newRecord.photoUrl,
        assigned_pic_id: newRecord.assignedPicId,
        assigned_pic_name: newRecord.assignedPicName,
        status: newRecord.status,
        due_date: newRecord.dueDate,
        resolution_notes: newRecord.resolutionNotes,
        points_awarded: newRecord.pointsAwarded ?? false,
      });

      if (error) {
        throw error;
      }
    } catch (err: any) {
      console.warn('Gagal sinkronisasi patrol ke Supabase, simpan ke antrean offline:', err);
      OfflineQueueManager.enqueueItem({
        type: 'safety_patrol',
        title: `Safety Patrol: ${newRecord.zoneName}`,
        subtitle: newRecord.description,
        workerId: newRecord.supervisorId,
        workerName: newRecord.supervisorName,
        idempotencyKey: `idemp-patrol-${newRecord.id}`,
        payload: newRecord,
      });
    }

    return newRecord;
  }

  /**
   * Update status temuan & catatan tindakan perbaikan
   */
  public static async updatePatrolStatus(
    id: string,
    status: PatrolStatus,
    resolutionNotes?: string,
    resolvedBy?: string
  ): Promise<{ success: boolean; pointsAwarded: boolean }> {
    let pointsAwarded = false;
    const resolvedAt = status === 'Resolved' ? new Date().toISOString() : null;

    // Ambil record
    const all = this.getFromLocal();
    const target = all.find((p) => p.id === id);

    if (target && status === 'Resolved' && !target.pointsAwarded && target.assignedPicId) {
      pointsAwarded = true;
    }

    // Update local cache
    const updated = all.map((p) => {
      if (p.id === id) {
        return {
          ...p,
          status,
          resolutionNotes: resolutionNotes ?? p.resolutionNotes,
          resolvedAt: resolvedAt ?? p.resolvedAt,
          pointsAwarded: p.pointsAwarded || pointsAwarded,
          updatedAt: new Date().toISOString(),
        };
      }
      return p;
    });
    this.saveToLocal(updated);

    // Update Supabase
    try {
      await supabase
        .from('safety_patrol_logs')
        .update({
          status,
          resolution_notes: resolutionNotes,
          resolved_at: resolvedAt,
          points_awarded: target?.pointsAwarded || pointsAwarded,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      // Bila ada poin yang dihadiahkan, tambah poin pekerja di Supabase
      if (pointsAwarded && target?.assignedPicId) {
        const awardPoints = SystemConfigService.getConfig().safetyPatrolResolvedPoints ?? 25;
        await supabase.rpc('rpc_award_integrity_points', {
          p_worker_id: target.assignedPicId,
          p_points: awardPoints,
          p_reason: `Penyelesaian Temuan Safety Patrol Gemba Walk: ${target.zoneName}`,
        });
      }
    } catch (e) {
      console.warn('Gagal update patrol di Supabase:', e);
    }

    return { success: true, pointsAwarded };
  }

  /**
   * Cetak Berita Acara Temuan Patroli K3 (BAP Gemba Walk) ke format PDF
   */
  public static exportPatrolBapPdf(record: SafetyPatrolRecord): void {
    const doc = new jsPDF('p', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    const docNumber = SystemConfigService.generateDocumentNumber('safety_patrol', { id: record.id });

    // Corporate Header Banner (PT. DAYA ANUGRAH MULYA)
    doc.setFillColor(15, 23, 42); // #0f172a
    doc.rect(0, 0, pageWidth, 28, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text('PT. DAYA ANUGRAH MULYA', 14, 11);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(148, 163, 184);
    doc.text('DIVISI HEALTH, SAFETY & ENVIRONMENT (HSE) — LOGISTICS OPERATIONAL WAREHOUSE', 14, 18);
    doc.text(`No. Dokumen: ${docNumber}`, 14, 23);

    // Title
    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text('BERITA ACARA TEMUAN SAFETY PATROL (GEMBA WALK)', 14, 38);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text(
      `Tanggal Patroli: ${new Date(record.patrolDate).toLocaleDateString('id-ID', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })} WIB`,
      14,
      44
    );

    // Detail Table
    autoTable(doc, {
      startY: 50,
      theme: 'grid',
      headStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42], fontStyle: 'bold', fontSize: 9 },
      bodyStyles: { fontSize: 8.5, textColor: [30, 41, 59] },
      head: [['Parameter Inspeksi', 'Rincian Temuan Lapangan']],
      body: [
        ['ID Temuan Patroli', record.id],
        ['Pengawas / Supervisor', record.supervisorName],
        ['Area / Zona Gudang', `${record.zoneName} (${record.zoneId})`],
        ['Kategori Temuan', FINDING_TYPE_CONFIG[record.findingType]?.label || record.findingType],
        ['Tingkat Keparahan', SEVERITY_CONFIG[record.severity]?.label || record.severity],
        ['Status Penanganan', record.status.toUpperCase()],
        ['PIC Penanggung Jawab', record.assignedPicName || 'Belum Ditentukan'],
        ['Target Penyelesaian', record.dueDate || 'Hari ini'],
        ['Waktu Penyelesaian', record.resolvedAt ? new Date(record.resolvedAt).toLocaleString('id-ID') : 'Dalam Proses'],
      ],
      columnStyles: {
        0: { cellWidth: 55, fontStyle: 'bold' },
        1: { cellWidth: 'auto' },
      },
    });

    let currentY = (doc as any).lastAutoTable.finalY + 8;

    // Deskripsi Temuan
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(15, 23, 42);
    doc.text('Deskripsi Observasi Lapangan:', 14, currentY);

    currentY += 5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(51, 65, 85);
    const splitDesc = doc.splitTextToSize(record.description, pageWidth - 28);
    doc.text(splitDesc, 14, currentY);

    currentY += splitDesc.length * 4.5 + 6;

    // Catatan Tindakan Perbaikan
    if (record.resolutionNotes) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.setTextColor(15, 23, 42);
      doc.text('Tindakan Korektif & Resolusi:', 14, currentY);

      currentY += 5;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(51, 65, 85);
      const splitNotes = doc.splitTextToSize(record.resolutionNotes, pageWidth - 28);
      doc.text(splitNotes, 14, currentY);

      currentY += splitNotes.length * 4.5 + 8;
    }

    // Signatures
    const signY = Math.max(currentY + 10, 220);
    const colW = (pageWidth - 28) / 2;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(15, 23, 42);
    doc.text('Pengawas Lapangan (Supervisor)', 14, signY);
    doc.text('HSE Officer / Head of Warehouse', 14 + colW, signY);

    doc.line(14, signY + 22, 14 + colW - 15, signY + 22);
    doc.line(14 + colW, signY + 22, 14 + colW * 2 - 15, signY + 22);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(record.supervisorName, 14, signY + 27);
    doc.text('Head of Safety & Operations', 14 + colW, signY + 27);

    // Save PDF
    doc.save(`BAP_Gemba_Patrol_${record.id}_${new Date().toISOString().slice(0, 10)}.pdf`);
  }

  // ─── Local Storage Helpers ─────────────────────────────────────
  private static getFromLocal(): SafetyPatrolRecord[] {
    try {
      // Hapus data mock dari key lama jika ada
      if (typeof window !== 'undefined' && localStorage.getItem('bib_safety_patrol_records')) {
        localStorage.removeItem('bib_safety_patrol_records');
      }
      const raw = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
      if (!raw) return [];
      const records: SafetyPatrolRecord[] = JSON.parse(raw);
      // Filter keluar record dummy seed bawaan masa testing
      return records.filter((r) => !['patrol-101', 'patrol-102', 'patrol-103'].includes(r.id));
    } catch {
      return [];
    }
  }

  private static saveToLocal(records: SafetyPatrolRecord[]): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
    } catch (e) {
      console.warn('Gagal menyimpan patrol records ke localStorage:', e);
    }
  }
}
