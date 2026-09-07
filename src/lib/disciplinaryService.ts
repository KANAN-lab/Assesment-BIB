// src/lib/disciplinaryService.ts

import { DisciplinaryActionEntity, ViolationLevel, ViolationCategory, SanctionStatus, DisciplinaryStats } from '../types/disciplinary';
import { NotificationEngine } from '../domain/NotificationEngine';
import { SystemConfigService } from '../domain/SystemConfigService';
import { DisciplinaryMatrixEngine } from '../domain/DisciplinaryMatrixEngine';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { safeLocalStorageSetItem } from './storageSanitizer';
import { supabase } from './supabaseClient';
import { deductWorkerPoints, refundWorkerPoints } from './supabaseService';

const STORAGE_KEY = 'gappy_disciplinary_actions_v2';
const EVENT_UPDATED = 'gappy_disciplinary_updated';

export const VIOLATION_META: Record<ViolationLevel, { label: string; badgeCls: string; defaultPoints: number; validityMonths: number }> = {
  coaching_verbal: {
    label: 'Pembinaan Lisan (Konseling)',
    badgeCls: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30',
    defaultPoints: 25,
    validityMonths: 1,
  },
  written_warning_1: {
    label: 'Surat Peringatan I (SP 1)',
    badgeCls: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
    defaultPoints: 100,
    validityMonths: 6,
  },
  written_warning_2: {
    label: 'Surat Peringatan II (SP 2)',
    badgeCls: 'bg-orange-500/10 text-orange-400 border-orange-500/30',
    defaultPoints: 250,
    validityMonths: 6,
  },
  written_warning_3: {
    label: 'Surat Peringatan III (SP 3)',
    badgeCls: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
    defaultPoints: 500,
    validityMonths: 6,
  },
  suspension: {
    label: 'Skorsing Operasional Sementara',
    badgeCls: 'bg-red-950 text-red-300 border-red-500/50',
    defaultPoints: 1000,
    validityMonths: 12,
  },
  remedial_evaluation: {
    label: 'Evaluasi & Uji Ulang Kompetensi',
    badgeCls: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30',
    defaultPoints: 50,
    validityMonths: 3,
  },
};

export const CATEGORY_META: Record<ViolationCategory, { label: string; icon: string }> = {
  ppe_violation: { label: 'Pelanggaran APD Wajib', icon: '🥾' },
  mhe_reckless: { label: 'Operasional MHE / Alat Berat Ceroboh', icon: '🚜' },
  sop_breach: { label: 'Penyimpangan SOP & Bypass Prosedur', icon: '⚠️' },
  unauthorized_area: { label: 'Masuk Area Terlarang / Tanpa Izin', icon: '⛔' },
  hazard_negligence: { label: 'Pembiaran Bahaya / Tumpahan Cairan', icon: '🛢️' },
  cellphone_in_staging: { label: 'Penggunaan Gadget di Area Staging', icon: '📱' },
  late_absent: { label: 'Mangkir Briefing K3 / Terlambat', icon: '⏰' },
  other: { label: 'Pelanggaran Operasional Lainnya', icon: '📋' },
};

export class DisciplinaryService {
  private static load(): DisciplinaryActionEntity[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      return JSON.parse(raw);
    } catch {
      return [];
    }
  }

  private static save(items: DisciplinaryActionEntity[]): void {
    safeLocalStorageSetItem(STORAGE_KEY, items);
    window.dispatchEvent(new Event(EVENT_UPDATED));
  }

  public static getDefaultPointDeduction(level: ViolationLevel): number {
    return DisciplinaryMatrixEngine.calculatePenalty(level);
  }

  public static getAllActions(): DisciplinaryActionEntity[] {
    return this.load();
  }

  /**
   * Mengambil data sanksi dari Supabase cloud, memperbarui cache lokal, dan mengembalikan data terbaru
   */
  public static async fetchActionsFromSupabase(): Promise<DisciplinaryActionEntity[]> {
    try {
      const { data, error } = await supabase
        .from('disciplinary_actions')
        .select('*')
        .order('issued_at', { ascending: false });

      if (error) {
        console.warn('[DisciplinaryService] Gagal fetch dari Supabase, menggunakan data lokal:', error.message);
        return this.load();
      }

      if (data && Array.isArray(data)) {
        const remoteList: DisciplinaryActionEntity[] = data.map((row: any) => ({
          id: row.id,
          documentRefNumber: row.document_ref_number || row.documentRefNumber || '',
          workerId: row.worker_id || row.workerId || '',
          workerName: row.worker_name || row.workerName || '',
          employeeId: row.employee_id || row.employeeId || '',
          division: row.division || row.worker_division || '',
          role: row.role || row.worker_role || '',
          violationLevel: row.violation_level || row.violationLevel,
          violationCategory: row.violation_category || row.violationCategory,
          incidentDate: row.incident_date || row.incidentDate || '',
          location: row.location || '',
          description: row.description || '',
          pointDeduction: Number(row.point_deduction ?? row.pointDeduction ?? 0),
          mandatoryRetrainingSopId: row.mandatory_retraining_sop_id || row.mandatoryRetrainingSopId,
          mandatoryRetrainingSopTitle: row.mandatory_retraining_sop_title || row.mandatoryRetrainingSopTitle,
          isRetrainingCompleted: Boolean(row.is_retraining_completed ?? row.isRetrainingCompleted),
          retrainingCompletedAt: row.retraining_completed_at || row.retrainingCompletedAt,
          status: row.status as SanctionStatus,
          issuedBy: row.issued_by || row.issuedBy || 'Supervisor HSE',
          issuedAt: row.issued_at || row.issuedAt || new Date().toISOString(),
          expiryDate: row.expiry_date || row.expiryDate,
          resolutionNotes: row.resolution_notes || row.resolutionNotes,
          evidencePhotoUrl: row.evidence_photo_url || row.evidencePhotoUrl,
          actionPlan: row.action_plan || row.actionPlan,
        }));

        this.save(remoteList);
        return remoteList;
      }
    } catch (err) {
      console.warn('[DisciplinaryService] Exception fetching from Supabase:', err);
    }
    return this.load();
  }

  public static getActionsByWorkerId(workerId: string): DisciplinaryActionEntity[] {
    return this.load().filter((a) => a.workerId === workerId || a.employeeId === workerId);
  }

  public static getStats(): DisciplinaryStats {
    const actions = this.load();
    return {
      totalActions: actions.length,
      activeSanctions: actions.filter((a) => DisciplinaryMatrixEngine.isSanctionActive(a)).length,
      verbalCoachings: actions.filter((a) => a.violationLevel === 'coaching_verbal').length,
      warningLetters: actions.filter((a) => a.violationLevel.startsWith('written_warning')).length,
      pendingRetrainings: actions.filter((a) => !a.isRetrainingCompleted && !!a.mandatoryRetrainingSopId).length,
      totalPointsDeducted: actions.reduce((sum, a) => sum + (a.pointDeduction || 0), 0),
    };
  }

  public static issueSanction(
    params: Omit<DisciplinaryActionEntity, 'id' | 'documentRefNumber' | 'issuedAt' | 'isRetrainingCompleted' | 'status'> & {
      status?: SanctionStatus;
      idempotencyKey?: string;
    }
  ): DisciplinaryActionEntity {
    const items = this.load();
    const prefix = params.violationLevel === 'coaching_verbal' ? 'CONS' : 'SP';
    const docRef = SystemConfigService.generateDocumentNumber('disciplinary', { code: prefix });

    // Guard: cegah duplikat di localStorage jika idempotencyKey sudah ada
    if (params.idempotencyKey) {
      const existing = items.find((a) => (a as any).idempotencyKey === params.idempotencyKey);
      if (existing) {
        console.info('[DisciplinaryService] Duplikat sanksi diabaikan (idempotencyKey sudah ada):', params.idempotencyKey);
        return existing;
      }
    }

    // Calculate expiry date using domain engine
    const expiryDate = DisciplinaryMatrixEngine.calculateExpiryDate(params.violationLevel);

    const { idempotencyKey: _k, ...restParams } = params;
    const newAction: DisciplinaryActionEntity = {
      ...restParams,
      id: `disc_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      documentRefNumber: docRef,
      issuedAt: new Date().toISOString(),
      expiryDate,
      isRetrainingCompleted: false,
      status: params.mandatoryRetrainingSopId ? 'in_retraining' : (params.status || 'active'),
      ...(params.idempotencyKey ? { idempotencyKey: params.idempotencyKey } : {}),
    } as DisciplinaryActionEntity & { idempotencyKey?: string };

    items.unshift(newAction);
    this.save(items);

    // Otomatis kurangi poin pekerja via RPC Supabase jika ada penalti poin
    if (params.pointDeduction && params.pointDeduction > 0) {
      deductWorkerPoints(params.workerId, params.pointDeduction, docRef).catch((err) => {
        console.warn('[DisciplinaryService] Gagal memotong poin sanksi:', err);
      });
    }

    // Simpan ke Supabase cloud jika online
    supabase
      .from('disciplinary_actions')
      .insert({
        id: newAction.id,
        document_ref_number: newAction.documentRefNumber,
        worker_id: newAction.workerId,
        worker_name: newAction.workerName,
        employee_id: newAction.employeeId,
        division: newAction.division,
        role: newAction.role,
        violation_level: newAction.violationLevel,
        violation_category: newAction.violationCategory,
        incident_date: newAction.incidentDate,
        location: newAction.location,
        description: newAction.description,
        point_deduction: newAction.pointDeduction,
        mandatory_retraining_sop_id: newAction.mandatoryRetrainingSopId || null,
        mandatory_retraining_sop_title: newAction.mandatoryRetrainingSopTitle || null,
        is_retraining_completed: newAction.isRetrainingCompleted,
        status: newAction.status,
        issued_by: newAction.issuedBy,
        issued_at: newAction.issuedAt,
        expiry_date: newAction.expiryDate || null,
        action_plan: newAction.actionPlan || null,
        evidence_photo_url: newAction.evidencePhotoUrl || null,
        idempotency_key: (newAction as any).idempotencyKey || null,
      })
      .then(({ error }) => {
        if (error) console.info('[DisciplinaryService] Supabase cloud sync info:', error.message);
      }, () => {});

    // Log ke activity_log audit trail
    try {
      supabase.from('activity_log').insert({
        worker_id: newAction.workerId,
        worker_name: newAction.workerName,
        action: 'disciplinary_issued',
        detail: `Penerbitan ${docRef} (${VIOLATION_META[params.violationLevel]?.label || 'Sanksi K3'}): ${params.description?.slice(0, 60) || 'Pelanggaran K3'} (Penalti: -${params.pointDeduction || 0} PTS)`,
      }).then(() => {}, () => {});
    } catch {}

    // Dispatch system notification
    NotificationEngine.addNotification({
      recipientId: params.workerId,
      recipientRole: 'worker',
      type: 'system',
      title: `⚠️ Catatan Pembinaan K3: ${docRef}`,
      message: `Tindakan ${VIOLATION_META[params.violationLevel]?.label || 'Sanksi K3'} telah diterbitkan untuk Anda terkait ${CATEGORY_META[params.violationCategory]?.label || 'Pelanggaran K3'}. Penalti: -${params.pointDeduction} Poin.`,
    });

    return newAction;
  }

  public static completeRetraining(actionId: string, resolutionNotes?: string): boolean {
    const items = this.load();
    const idx = items.findIndex((a) => a.id === actionId);
    if (idx === -1) return false;

    items[idx] = {
      ...items[idx],
      isRetrainingCompleted: true,
      retrainingCompletedAt: new Date().toISOString(),
      status: 'resolved',
      resolutionNotes: resolutionNotes || items[idx].resolutionNotes || 'Retraining SOP selesai diverifikasi.',
    };

    this.save(items);

    // Sync status ke Supabase cloud
    supabase
      .from('disciplinary_actions')
      .update({
        is_retraining_completed: true,
        retraining_completed_at: items[idx].retrainingCompletedAt,
        status: 'resolved',
        resolution_notes: items[idx].resolutionNotes || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', actionId)
      .then(() => {}, () => {});

    // Log ke activity_log audit trail
    try {
      supabase.from('activity_log').insert({
        worker_id: items[idx].workerId,
        worker_name: items[idx].workerName,
        action: 'disciplinary_retraining_completed',
        detail: `Penyelesaian retraining SOP pembinaan untuk ${items[idx].documentRefNumber}`,
      }).then(() => {}, () => {});
    } catch {}

    NotificationEngine.addNotification({
      recipientId: items[idx].workerId,
      recipientRole: 'worker',
      type: 'system',
      title: '✅ Pembinaan & Retraining SOP Selesai',
      message: `Selamat, retraining SOP untuk ${items[idx].documentRefNumber} telah diverifikasi tuntas oleh Supervisor.`,
    });

    return true;
  }

  public static updateActionStatus(
    actionId: string,
    status: SanctionStatus,
    resolutionNotes?: string,
    refundPoints: boolean = false
  ): boolean {
    const items = this.load();
    const idx = items.findIndex((a) => a.id === actionId);
    if (idx === -1) return false;

    const action = items[idx];
    items[idx] = {
      ...action,
      status,
      resolutionNotes: resolutionNotes ?? action.resolutionNotes,
    };

    this.save(items);

    supabase
      .from('disciplinary_actions')
      .update({
        status,
        resolution_notes: resolutionNotes ?? action.resolutionNotes,
        updated_at: new Date().toISOString(),
      })
      .eq('id', actionId)
      .then(() => {}, () => {});

    // Jika refundPoints diminta dan ada pointDeduction > 0
    if (refundPoints && action.pointDeduction && action.pointDeduction > 0) {
      const reason = `Pemulihan Poin: Banding Sanksi ${action.documentRefNumber} Diterima (${status})`;
      refundWorkerPoints(action.workerId, action.pointDeduction, reason).catch((err) => {
        console.warn('[DisciplinaryService] Gagal memulihkan poin banding sanksi:', err);
      });

      NotificationEngine.addNotification({
        recipientId: action.workerId,
        recipientRole: 'worker',
        type: 'system',
        title: `✅ Banding Disetujui: Pemulihan Poin (+${action.pointDeduction} PTS)`,
        message: `Banding untuk sanksi ${action.documentRefNumber} telah disetujui. Penalti ${action.pointDeduction} Poin telah dipulihkan kembali ke akun Anda.`,
      });
    }

    return true;
  }

  public static deleteAction(actionId: string): boolean {
    const items = this.load();
    const target = items.find((a) => a.id === actionId);
    if (!target) return false;

    const filtered = items.filter((a) => a.id !== actionId);
    this.save(filtered);
    supabase.from('disciplinary_actions').delete().eq('id', actionId).then(() => {}, () => {});

    // Jika sanksi memiliki penalti poin, pulihkan kembali poin pekerja secara otomatis!
    if (target.pointDeduction && target.pointDeduction > 0) {
      const reason = `Pemulihan Poin K3: Pembatalan Arsip ${target.documentRefNumber}`;
      refundWorkerPoints(target.workerId, target.pointDeduction, reason).catch((err) => {
        console.warn('[DisciplinaryService] Gagal memulihkan poin pembatalan sanksi:', err);
      });

      NotificationEngine.addNotification({
        recipientId: target.workerId,
        recipientRole: 'worker',
        type: 'system',
        title: `✅ Pemulihan Poin Sanksi K3 (+${target.pointDeduction} PTS)`,
        message: `Arsip sanksi ${target.documentRefNumber} telah dihapus/dibatalkan. Penalti -${target.pointDeduction} Poin Anda telah dipulihkan kembali ke saldo akun.`,
      });
    }

    return true;
  }

  // ─────────────────────────────────────────────────────────────
  // CETAK SURAT PERINGATAN / BERITA ACARA PEMBINAAN K3 (PDF)
  // ─────────────────────────────────────────────────────────────

  public static generateWarningLetterPDF(action: DisciplinaryActionEntity): void {
    const doc = new jsPDF('p', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    const meta = VIOLATION_META[action.violationLevel];
    const catMeta = CATEGORY_META[action.violationCategory];

    // Header Korporat
    const isSP = action.violationLevel.startsWith('written_warning') || action.violationLevel === 'suspension';
    doc.setFillColor(isSP ? 159 : 30, isSP ? 18 : 41, isSP ? 57 : 59); // Rose-900 or Slate-800
    doc.rect(0, 0, pageWidth, 28, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text('PT. DAYA ANUGRAH MULYA — DIVISI K3 & KESELAMATAN KERJA', 14, 11);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(isSP ? 254 : 203, isSP ? 205 : 213, isSP ? 211 : 225);
    doc.text('BERITA ACARA PEMBINAAN DISIPLIN, KONSELING K3 & SURAT PERINGATAN KERJA', 14, 18);
    doc.text(`No. Dokumen: ${action.documentRefNumber} | Tanggal Terbit: ${new Date(action.issuedAt).toLocaleDateString('id-ID')}`, 14, 24);

    // Tabel Identitas Pekerja & Pelanggaran
    autoTable(doc, {
      startY: 36,
      head: [['Parameter', 'Detail Informasi Pelanggaran & Sanksi']],
      body: [
        ['Nama Pekerja', action.workerName],
        ['Nomor Induk Pekerja (NIP)', action.employeeId],
        ['Divisi / Role Operasional', `${action.division} — ${action.role}`],
        ['Tingkat Sanksi / Tindakan', meta.label.toUpperCase()],
        ['Kategori Pelanggaran', `${catMeta?.icon || ''} ${catMeta?.label || action.violationCategory}`],
        ['Waktu & Lokasi Kejadian', `${action.incidentDate} di ${action.location}`],
        ['Penalti Pengurangan Poin', `-${action.pointDeduction} BIB Points`],
        ['Masa Berlaku Sanksi', `Hingga ${action.expiryDate || '-'}`],
        ['Modul Retraining Wajib', action.mandatoryRetrainingSopTitle || 'Tidak ada penugasan khusus'],
        ['Status Pemenuhan Retraining', action.isRetrainingCompleted ? 'SUDAH TUNTAS & DIVERIFIKASI' : 'BELUM TUNTAS / DALAM PROSES'],
      ],
      headStyles: { fillColor: isSP ? [159, 18, 57] : [30, 41, 59], textColor: [255, 255, 255], fontStyle: 'bold' },
      styles: { fontSize: 7.5, cellPadding: 2.5 },
      columnStyles: { 0: { fontStyle: 'bold', cellWidth: 50 } },
    });

    let currentY = (doc as any).lastAutoTable.finalY + 6;

    // Kronologi & Komitmen
    autoTable(doc, {
      startY: currentY,
      head: [['Kronologi Kejadian & Komitmen Tindakan Perbaikan (Action Plan)']],
      body: [
        [`Deskripsi Kronologi Kejadian:\n${action.description}`],
        [`Komitmen Perbaikan Pekerja:\n${action.actionPlan || 'Pekerja berkomitmen mematuhi SOP K3 dan tidak mengulangi pelanggaran serupa.'}`],
        [`Catatan Penutup / Hasil Konseling:\n${action.resolutionNotes || 'Dalam pemantauan aktif pengawas lapangan.'}`],
      ],
      headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: 'bold' },
      styles: { fontSize: 7.5, cellPadding: 3 },
    });

    currentY = (doc as any).lastAutoTable.finalY + 14;

    // Tanda Tangan
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    doc.text('Pekerja yang Bersangkutan,', 25, currentY);
    doc.text('Petugas Pemeriksa / Supervisor,', pageWidth / 2 - 25, currentY);
    doc.text('Mengetahui Head of HSE,', pageWidth - 70, currentY);

    currentY += 16;
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(`( ${action.workerName} )`, 25, currentY);
    doc.text(`( ${action.issuedBy} )`, pageWidth / 2 - 25, currentY);
    doc.text('( Head of HSE & Ops )', pageWidth - 70, currentY);

    // Footer
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
    doc.text(
      'Dokumen Resmi Disiplin K3 PT. DAYA ANUGRAH MULYA — Gappy Assessment System | Halaman 1 dari 1',
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 6,
      { align: 'center' }
    );

    doc.save(`Surat_Pembinaan_K3_${action.documentRefNumber.replace(/\//g, '_')}.pdf`);
  }

  // ─────────────────────────────────────────────────────────────
  // EKSPOR CSV
  // ─────────────────────────────────────────────────────────────

  public static exportActionsCSV(actions: DisciplinaryActionEntity[]): void {
    const headers = [
      'No SK',
      'Nama Pekerja',
      'NIP',
      'Divisi',
      'Role',
      'Tingkat Sanksi',
      'Kategori',
      'Tanggal Insiden',
      'Lokasi',
      'Penalti Poin',
      'Retraining SOP',
      'Status Retraining',
      'Status Sanksi',
      'Diterbitkan Oleh',
      'Tanggal Terbit',
      'Masa Berlaku',
    ];

    const rows = actions.map((a) => [
      `"${a.documentRefNumber}"`,
      `"${a.workerName}"`,
      `"${a.employeeId}"`,
      `"${a.division}"`,
      `"${a.role}"`,
      `"${VIOLATION_META[a.violationLevel]?.label || a.violationLevel}"`,
      `"${CATEGORY_META[a.violationCategory]?.label || a.violationCategory}"`,
      `"${a.incidentDate}"`,
      `"${a.location}"`,
      a.pointDeduction,
      `"${a.mandatoryRetrainingSopTitle || '-'}"`,
      `"${a.isRetrainingCompleted ? 'Selesai' : 'Pending'}"`,
      `"${a.status.toUpperCase()}"`,
      `"${a.issuedBy}"`,
      `"${a.issuedAt.slice(0, 10)}"`,
      `"${a.expiryDate || '-'}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Rekap_Sanksi_Konseling_K3_PT_DAYA_ANUGRAH_MULYA_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}
