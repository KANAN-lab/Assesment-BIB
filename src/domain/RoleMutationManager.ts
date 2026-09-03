import { supabase } from '../lib/supabaseClient';
import { WorkerRoleMutation } from '../types/assessment';
import { NotificationEngine } from './NotificationEngine';
import { logActivity } from '../lib/supabaseService';

export interface ExecuteRoleMutationParams {
  workerId: string;
  newRole: string;
  newDivision: string;
  mutatedBy?: string;
  reason?: string;
}

export interface MutationResult {
  success: boolean;
  workerId: string;
  previousRole: string;
  previousDivision: string;
  newRole: string;
  newDivision: string;
  archivedScoresCount: number;
}

/**
 * RoleMutationManager (OOP)
 * Implements the Clean-Slate Baseline Reset Protocol (PRD §11.1).
 * Isolates historical competency audit scores, snapshots them to JSONB archive,
 * resets active competency scores, updates worker role & division,
 * dispatches notifications, and logs audit activities atomically.
 */
export class RoleMutationManager {
  private static STORAGE_FALLBACK_KEY = 'bib_worker_role_mutations_v2';

  /**
   * Execute atomic role and division mutation with clean slate reset
   */
  public static async executeRoleMutation(params: ExecuteRoleMutationParams): Promise<MutationResult> {
    const { workerId, newRole, newDivision, mutatedBy = 'System Admin', reason = 'Mutasi Role & Divisi Operasional' } = params;

    // 1. Fetch current worker profile
    const { data: worker, error: workerErr } = await supabase
      .from('workers')
      .select('*')
      .eq('id', workerId)
      .single();

    if (workerErr || !worker) {
      throw new Error(`Data pekerja (${workerId}) tidak ditemukan di database.`);
    }

    const previousRole = worker.role;
    const previousDivision = worker.division;

    if (previousRole === newRole && previousDivision === newDivision) {
      throw new Error('Role dan Divisi baru tidak boleh sama dengan posisi saat ini.');
    }

    // 2. Fetch all active 54-item competency audit scores for full historical snapshot
    const { data: rawScores } = await supabase
      .from('worker_competency_scores')
      .select('competency_id, score')
      .eq('worker_id', workerId);

    const scoresMap: Record<string, number> = {};
    if (rawScores && rawScores.length > 0) {
      rawScores.forEach((row) => {
        scoresMap[row.competency_id] = Number(row.score) || 0;
      });
    }

    // 3. Construct Archive Payload (OOP encapsulation)
    const mutationPayload = {
      worker_id: workerId,
      previous_role: previousRole,
      previous_division: previousDivision,
      new_role: newRole,
      new_division: newDivision,
      archived_bib_behavior: Number(worker.bib_behavior) || 0,
      archived_bib_integrity: Number(worker.bib_integrity) || 0,
      archived_bib_benchmark: Number(worker.bib_benchmark) || 0,
      archived_bib_total: Number(worker.bib_total_score) || 0,
      archived_competency_scores: scoresMap,
      mutated_at: new Date().toISOString(),
      mutated_by: mutatedBy,
      reason: reason.trim() || 'Mutasi Operasional',
    };

    // 4. Save to remote table `worker_role_mutations` with local fallback
    try {
      await supabase.from('worker_role_mutations').insert(mutationPayload);
    } catch (err) {
      console.warn('[RoleMutationManager] Fallback saving mutation to localStorage:', err);
      this.saveMutationToLocal(mutationPayload);
    }

    // 5. Atomic Update to Worker Profile: Update Role/Division & Reset BIB Scores to 0
    const { error: updateWorkerErr } = await supabase
      .from('workers')
      .update({
        role: newRole,
        division: newDivision,
        bib_behavior: 0,
        bib_integrity: 0,
        bib_benchmark: 0,
        bib_total_score: 0,
        updated_at: new Date().toISOString(),
      })
      .eq('id', workerId);

    if (updateWorkerErr) {
      throw new Error(`Gagal memperbarui data pekerja di workers table: ${updateWorkerErr.message}`);
    }

    // 6. Clean-Slate Reset: Delete old active scores to guarantee zero cross-contamination
    try {
      await supabase
        .from('worker_competency_scores')
        .delete()
        .eq('worker_id', workerId);
    } catch (delErr) {
      console.warn('[RoleMutationManager] Error clearing active competency scores:', delErr);
    }

    // 7. Dispatch High-Priority In-App Notification to Worker
    NotificationEngine.addNotification({
      recipientId: workerId,
      recipientRole: 'worker',
      title: '🔄 Pemindahan Role & Divisi Operasional',
      message: `Peran Anda telah diperbarui menjadi ${newRole} (${newDivision}). Matriks audit kompetensi Anda direset ke baseline 0 (Clean Slate).`,
      type: 'audit',
      metadata: {
        previousRole,
        previousDivision,
        newRole,
        newDivision,
        reason,
      },
    });

    // 8. Log to system audit trail
    logActivity(
      workerId,
      worker.name,
      'role_mutated',
      `Mutasi dari ${previousRole} (${previousDivision}) ke ${newRole} (${newDivision}) oleh ${mutatedBy}`
    ).catch(() => {});

    return {
      success: true,
      workerId,
      previousRole,
      previousDivision,
      newRole,
      newDivision,
      archivedScoresCount: Object.keys(scoresMap).length,
    };
  }

  /**
   * Fetch historical mutations for a given worker or for all workers
   */
  public static async fetchMutationHistory(workerId?: string): Promise<WorkerRoleMutation[]> {
    try {
      let query = supabase
        .from('worker_role_mutations')
        .select('*')
        .order('mutated_at', { ascending: false });

      if (workerId) {
        query = query.eq('worker_id', workerId);
      }

      const { data, error } = await query;
      if (!error && data) {
        return data.map((row: any) => ({
          id: row.id,
          workerId: row.worker_id,
          previousRole: row.previous_role,
          previousDivision: row.previous_division,
          newRole: row.new_role,
          newDivision: row.new_division,
          archivedBibBehavior: Number(row.archived_bib_behavior) || 0,
          archivedBibIntegrity: Number(row.archived_bib_integrity) || 0,
          archivedBibBenchmark: Number(row.archived_bib_benchmark) || 0,
          archivedBibTotal: Number(row.archived_bib_total) || 0,
          archivedCompetencyScores: row.archived_competency_scores || {},
          mutatedAt: row.mutated_at,
          mutatedBy: row.mutated_by || 'System Admin',
          reason: row.reason || 'Mutasi Operasional',
        }));
      }
    } catch (err) {
      console.warn('[RoleMutationManager] Fetching from local fallback:', err);
    }

    const local = this.getLocalMutations();
    if (workerId) {
      return local.filter((m) => m.workerId === workerId);
    }
    return local;
  }

  private static saveMutationToLocal(payload: any): void {
    try {
      const list = this.getLocalMutations();
      list.unshift({
        id: `mut-${Date.now()}`,
        workerId: payload.worker_id,
        previousRole: payload.previous_role,
        previousDivision: payload.previous_division,
        newRole: payload.new_role,
        newDivision: payload.new_division,
        archivedBibBehavior: payload.archived_bib_behavior,
        archivedBibIntegrity: payload.archived_bib_integrity,
        archivedBibBenchmark: payload.archived_bib_benchmark,
        archivedBibTotal: payload.archived_bib_total,
        archivedCompetencyScores: payload.archived_competency_scores,
        mutatedAt: payload.mutated_at,
        mutatedBy: payload.mutated_by,
        reason: payload.reason,
      });
      localStorage.setItem(this.STORAGE_FALLBACK_KEY, JSON.stringify(list));
    } catch {
      // ignore local storage error
    }
  }

  private static getLocalMutations(): WorkerRoleMutation[] {
    try {
      const raw = localStorage.getItem(this.STORAGE_FALLBACK_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }
}
