import { WorkerProfile } from '../types/assessment';
import { NotificationEngine } from './NotificationEngine';
import { logActivity } from '../lib/supabaseService';
import { fetchAllSopModules } from '../lib/sopService';
import { SopModule } from '../types/sop';
import { matrixEngine } from './CompetencyMatrixEngine';
import { formatIndonesianDate } from '../lib/dateUtils';

export interface AssignGapTrainingParams {
  category: string;
  division: string;
  targetWorkers: WorkerProfile[];
  assignedBy?: string;
  gapScore?: number;
}

export interface TrainingAssignmentResult {
  success: boolean;
  assignedCount: number;
  category: string;
  moduleCode: string;
  moduleTitle: string;
  deadlineDate: string;
}

export interface TrainingAssignmentRecord {
  id: string;
  category: string;
  division: string;
  moduleCode: string;
  moduleTitle: string;
  moduleId?: string;
  workerId: string;
  workerName?: string;
  gapPercentage?: number;
  assignedAt: string;
  assignedBy: string;
  deadlineDate: string;
  isCompleted: boolean;
  completedAt?: string;
}

/**
 * Matriks Pemetaan Cerdas Kategori Audit Kompetensi ke Modul SOP Interaktif
 */
export const CATEGORY_SOP_MAP: Record<string, string> = {
  EHS: 'SOP-HSE-03',
  K3: 'SOP-HSE-03',
  AM: 'SOP-MHE-01',
  MHE: 'SOP-MHE-01',
  FORKLIFT: 'SOP-MHE-01',
  ENG: 'SOP-MHE-01',
  WRH: 'SOP-WRH-02',
  WAREHOUSE: 'SOP-WRH-02',
  QC: 'SOP-WRH-02',
  MUTU: 'SOP-WRH-02',
  PRD: 'SOP-WRH-02',
  PD: 'SOP-WRH-02',
  LOG: 'SOP-INB-04',
  LOGISTIK: 'SOP-INB-04',
  INBOUND: 'SOP-INB-04',
  TIMBANGAN: 'SOP-INB-04',
  '5S': 'SOP-5S-05',
  GENERAL: 'SOP-5S-05',
  FI: 'SOP-5S-05',
  OUTBOUND: 'SOP-OUT-06',
  EKSPEDISI: 'SOP-OUT-06',
  EXPEDISI: 'SOP-OUT-06',
  ADMINISTRASI: 'SOP-OUT-06',
  MANAGERIAL: 'SOP-WRH-02',
  'SALES & SERVICE': 'SOP-OUT-06',
  HRD: 'SOP-5S-05',
};

/**
 * TrainingAssignmentService (OOP)
 * Automated K3 Gap Retraining Dispatcher (Opsi B: 100% Otomatis Sistem).
 * Mendeteksi gap kompetensi < 75% pasca-audit, memetakan ke modul SOP spesifik,
 * dan menerbitkan tugas re-training wajib ber-deadline ke akun pekerja.
 */
export class TrainingAssignmentService {
  private static STORAGE_KEY = 'bib_gap_training_assignments_v1';

  /**
   * Cari modul SOP yang paling cocok berdasarkan kategori audit
   */
  public static findMatchingSopModule(category: string, allModules: SopModule[]): SopModule {
    const cleanCat = category.trim().toUpperCase();
    const targetCode = CATEGORY_SOP_MAP[cleanCat];

    if (targetCode) {
      const foundByCode = allModules.find((m) => m.code.toUpperCase() === targetCode);
      if (foundByCode) return foundByCode;
    }

    // Fallback: substring matching on category or title
    const foundByText = allModules.find(
      (m) =>
        m.category.toLowerCase().includes(category.toLowerCase()) ||
        category.toLowerCase().includes(m.category.toLowerCase())
    );

    return foundByText || allModules[0];
  }

  /**
   * Penugasan Re-Training Otomatis 100% (Opsi B)
   * Dipanggil otomatis setelah audit kompetensi disimpan
   */
  public static async evaluateAndAutoAssign(
    worker: WorkerProfile,
    auditedScores: Record<string, number>,
    assignedBy: string = 'Sistem Audit Otomatis (BIB Engine)'
  ): Promise<TrainingAssignmentResult[]> {
    if (!worker || !auditedScores) return [];

    try {
      // 1. Hitung ringkasan persentase tiap kategori
      const summaries = matrixEngine.calculateCategorySummaries(worker.role, auditedScores);
      // Kategori yang di bawah standar (skor < 75%, artinya gap >= 25%)
      const weakCategories = summaries.filter((s) => s.maxScore > 0 && s.percentage < 75);

      if (weakCategories.length === 0) return [];

      // 2. Ambil seluruh modul SOP aktif
      const allModules = await fetchAllSopModules().catch(() => []);
      if (!allModules || allModules.length === 0) return [];

      const activeAssignments = this.getActiveAssignmentsForWorker(worker.id);
      const results: TrainingAssignmentResult[] = [];

      for (const weak of weakCategories) {
        const matchingModule = this.findMatchingSopModule(weak.category, allModules);
        if (!matchingModule) continue;

        // Idempotency: Cegah duplikasi jika pekerja sudah memiliki penugasan modul yang sama dalam 14 hari terakhir
        const isAlreadyAssigned = activeAssignments.some(
          (a) => a.moduleCode === matchingModule.code && !a.isCompleted
        );
        if (isAlreadyAssigned) continue;

        // Deadline: 7 hari kalender dari sekarang
        const deadline = new Date();
        deadline.setDate(deadline.getDate() + 7);
        const deadlineDateStr = formatIndonesianDate(deadline.toISOString(), true);

        // Rekam penugasan baru
        const record: TrainingAssignmentRecord = {
          id: `assign-auto-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          category: weak.category,
          division: worker.division,
          moduleCode: matchingModule.code,
          moduleTitle: matchingModule.title,
          moduleId: matchingModule.id,
          workerId: worker.id,
          workerName: worker.name,
          gapPercentage: Math.round(100 - weak.percentage),
          assignedAt: new Date().toISOString(),
          assignedBy,
          deadlineDate: deadlineDateStr,
          isCompleted: false,
        };

        this.recordAssignment(record);

        // Kirim notifikasi prioritas tinggi ke akun pekerja
        NotificationEngine.addNotification({
          recipientId: worker.id,
          recipientRole: 'worker',
          title: `🚨 Penugasan Re-Training Wajib: ${weak.category}`,
          message: `Berdasarkan hasil evaluasi audit Divisi ${worker.division}, skor kategori ${weak.category} (${weak.percentage}%) berada di bawah standar. Anda wajib menyelesaikan ${matchingModule.title} (${matchingModule.code}) sebelum ${deadlineDateStr}.`,
          type: 'audit',
          metadata: {
            category: weak.category,
            division: worker.division,
            moduleId: matchingModule.id,
            moduleCode: matchingModule.code,
            moduleTitle: matchingModule.title,
            deadlineDate: deadlineDateStr,
            assignedBy,
            gapPercentage: Math.round(100 - weak.percentage),
          },
        });

        // Log audit trail
        logActivity(
          worker.id,
          worker.name,
          'sop_completed',
          `Otomatis ditugaskan Re-Training: ${matchingModule.title} (Kategori ${weak.category} - ${weak.percentage}%)`
        ).catch(() => {});

        results.push({
          success: true,
          assignedCount: 1,
          category: weak.category,
          moduleCode: matchingModule.code,
          moduleTitle: matchingModule.title,
          deadlineDate: deadlineDateStr,
        });
      }

      if (results.length > 0) {
        window.dispatchEvent(new CustomEvent('bib_training_assignments_updated', { detail: { workerId: worker.id } }));
      }

      return results;
    } catch (err) {
      console.warn('[TrainingAssignmentService] Gagal memproses auto-assign training:', err);
      return [];
    }
  }

  /**
   * Penugasan manual / batch dari panel Gap Analysis
   */
  public static async assignGapTraining(params: AssignGapTrainingParams): Promise<TrainingAssignmentResult> {
    const { category, division, targetWorkers, assignedBy = 'Supervisor Logistik & HSE' } = params;

    if (!targetWorkers || targetWorkers.length === 0) {
      throw new Error('Tidak ada personel pekerja yang dipilih untuk penugasan training.');
    }

    const allModules = await fetchAllSopModules().catch(() => []);
    const matchingModule = this.findMatchingSopModule(category, allModules);

    const moduleCode = matchingModule?.code || `SOP-TRN-${category.toUpperCase().slice(0, 3)}`;
    const moduleTitle = matchingModule?.title || `Modul Re-Training K3 Kepatuhan: ${category}`;

    const deadline = new Date();
    deadline.setDate(deadline.getDate() + 7);
    const deadlineDate = formatIndonesianDate(deadline.toISOString(), true);

    for (const w of targetWorkers) {
      const record: TrainingAssignmentRecord = {
        id: `assign-${Date.now()}-${w.id.slice(0, 5)}`,
        category,
        division,
        moduleCode,
        moduleTitle,
        moduleId: matchingModule?.id,
        workerId: w.id,
        workerName: w.name,
        assignedAt: new Date().toISOString(),
        assignedBy,
        deadlineDate,
        isCompleted: false,
      };

      this.recordAssignment(record);

      NotificationEngine.addNotification({
        recipientId: w.id,
        recipientRole: 'worker',
        title: `🚨 Penugasan Re-Training K3: ${category}`,
        message: `Berdasarkan audit gap kompetensi Divisi ${division}, Anda wajib menyelesaikan ${moduleTitle} (${moduleCode}). Batas penyelesaian: ${deadlineDate}.`,
        type: 'audit',
        metadata: {
          category,
          division,
          moduleId: matchingModule?.id,
          moduleCode,
          moduleTitle,
          deadlineDate,
          assignedBy,
        },
      });

      logActivity(
        w.id,
        w.name,
        'sop_completed',
        `Ditugaskan Re-Training K3 [${category}] oleh ${assignedBy}`
      ).catch(() => {});
    }

    window.dispatchEvent(new CustomEvent('bib_training_assignments_updated', { detail: { category } }));

    return {
      success: true,
      assignedCount: targetWorkers.length,
      category,
      moduleCode,
      moduleTitle,
      deadlineDate,
    };
  }

  /**
   * Mengambil daftar tugas pelatihan aktif untuk pekerja tertentu
   */
  public static getActiveAssignmentsForWorker(workerId: string): TrainingAssignmentRecord[] {
    try {
      const list = this.getAssignments();
      return list.filter((a) => a.workerId === workerId && !a.isCompleted);
    } catch {
      return [];
    }
  }

  /**
   * Menandai penugasan sebagai selesai setelah pekerja menuntaskan modul
   */
  public static markAssignmentCompleted(
    workerId: string,
    moduleCodeOrId: string,
    workerName?: string
  ): boolean {
    try {
      const list = this.getAssignments();
      let updated = false;

      for (const item of list) {
        if (
          item.workerId === workerId &&
          !item.isCompleted &&
          (item.moduleCode === moduleCodeOrId || item.moduleId === moduleCodeOrId)
        ) {
          item.isCompleted = true;
          item.completedAt = new Date().toISOString();
          updated = true;

          // Kirim notifikasi konfirmasi ke Supervisor & HR
          NotificationEngine.addNotification({
            recipientId: 'supervisor',
            recipientRole: 'supervisor',
            title: '✅ Re-Training Kompetensi Selesai',
            message: `Operator ${workerName || item.workerName || 'Pekerja'} telah menyelesaikan modul ${item.moduleTitle} (${item.moduleCode}) tepat waktu.`,
            type: 'audit',
            metadata: {
              workerId,
              moduleCode: item.moduleCode,
              category: item.category,
              completedAt: item.completedAt,
            },
          });
        }
      }

      if (updated) {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(list));
        window.dispatchEvent(
          new CustomEvent('bib_training_assignments_updated', {
            detail: { workerId, moduleCodeOrId },
          })
        );
      }

      return updated;
    } catch (e) {
      console.warn('[TrainingAssignmentService] Gagal menandai tugas selesai:', e);
      return false;
    }
  }

  /**
   * Mengambil seluruh riwayat penugasan
   */
  public static getAssignments(): TrainingAssignmentRecord[] {
    try {
      const raw = localStorage.getItem(this.STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  private static recordAssignment(assignment: TrainingAssignmentRecord): void {
    try {
      const list = this.getAssignments();
      list.unshift(assignment);
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(list.slice(0, 200)));
    } catch (e) {
      console.warn('[TrainingAssignmentService] Failed to cache assignment:', e);
    }
  }
}
