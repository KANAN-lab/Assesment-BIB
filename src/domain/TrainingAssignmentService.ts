import { WorkerProfile } from '../types/assessment';
import { NotificationEngine } from './NotificationEngine';
import { logActivity } from '../lib/supabaseService';
import { fetchAllSopModules } from '../lib/sopService';
import { SopModule } from '../types/sop';

export interface AssignGapTrainingParams {
  category: string;
  division: string;
  targetWorkers: WorkerProfile[];
  assignedBy?: string;
}

export interface TrainingAssignmentResult {
  success: boolean;
  assignedCount: number;
  category: string;
  moduleCode: string;
  moduleTitle: string;
  deadlineDate: string;
}

/**
 * TrainingAssignmentService (OOP)
 * Automated K3 Gap Retraining Dispatcher (PRD §11.3 Fitur B).
 * Identifies competency gaps >= 25%, matches with SOP modules,
 * and assigns mandatory retraining tasks with notifications to operational staff.
 */
export class TrainingAssignmentService {
  private static STORAGE_KEY = 'bib_gap_training_assignments_v1';

  /**
   * Assign mandatory retraining for a given competency category to affected workers
   */
  public static async assignGapTraining(params: AssignGapTrainingParams): Promise<TrainingAssignmentResult> {
    const { category, division, targetWorkers, assignedBy = 'Supervisor Logistik & HSE' } = params;

    if (!targetWorkers || targetWorkers.length === 0) {
      throw new Error('Tidak ada personel pekerja yang dipilih untuk penugasan training.');
    }

    // 1. Fetch available SOP modules to find best matching module for this category
    const allModules = await fetchAllSopModules().catch(() => []);
    const matchingModule: SopModule | undefined = allModules.find(
      (m) => m.category.toLowerCase().includes(category.toLowerCase()) || category.toLowerCase().includes(m.category.toLowerCase())
    ) || allModules[0];

    const moduleCode = matchingModule?.code || `SOP-TRN-${category.toUpperCase().slice(0, 3)}`;
    const moduleTitle = matchingModule?.title || `Modul Re-Training K3 Kepatuhan: ${category}`;

    const deadline = new Date();
    deadline.setDate(deadline.getDate() + 7);
    const deadlineDate = deadline.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });

    // 2. Dispatch High-Priority In-App Notifications to each affected worker
    for (const w of targetWorkers) {
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

      // Also log activity
      logActivity(
        w.id,
        w.name,
        'sop_completed',
        `Ditugaskan Re-Training K3 [${category}] oleh ${assignedBy}`
      ).catch(() => {});
    }

    // 3. Save assignment record in local storage cache
    this.recordAssignment({
      id: `assign-${Date.now()}`,
      category,
      division,
      moduleCode,
      moduleTitle,
      workerIds: targetWorkers.map((w) => w.id),
      assignedAt: new Date().toISOString(),
      assignedBy,
      deadlineDate,
    });

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
   * Get past gap training assignments
   */
  public static getAssignments(): any[] {
    try {
      const raw = localStorage.getItem(this.STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  private static recordAssignment(assignment: any): void {
    try {
      const list = this.getAssignments();
      list.unshift(assignment);
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(list));
    } catch (e) {
      console.warn('[TrainingAssignmentService] Failed to cache assignment:', e);
    }
  }
}
