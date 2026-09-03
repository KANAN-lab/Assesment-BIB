import { supabase } from './supabaseClient';
import { ShiftHandoverEntity, HandoverInput } from '../types/handover';

export class HandoverManager {
  /**
   * Submit log serah terima baru
   */
  static async submitHandover(
    authorId: string,
    input: HandoverInput,
    idempotencyKey?: string
  ): Promise<ShiftHandoverEntity> {
    const insertPayload: Record<string, any> = {
      author_id: authorId,
      shift_type: input.shiftType,
      next_supervisor_id: input.nextSupervisorId,
      handover_category: input.handoverCategory,
      condition_status: input.conditionStatus,
      notes: input.notes,
    };

    if (idempotencyKey) {
      insertPayload.idempotency_key = idempotencyKey;
    }

    let { data, error } = await supabase
      .from('shift_handovers')
      .insert(insertPayload)
      .select(`
        *,
        author:workers!author_id (name, avatar),
        acknowledged_by_worker:workers!acknowledged_by (name)
      `)
      .single();

    // Fallback jika kolom idempotency_key belum ada di skema
    if (error && (error.message.includes('idempotency_key') || error.message.includes('column'))) {
      delete insertPayload.idempotency_key;
      const retry = await supabase
        .from('shift_handovers')
        .insert(insertPayload)
        .select(`
          *,
          author:workers!author_id (name, avatar),
          acknowledged_by_worker:workers!acknowledged_by (name)
        `)
        .single();
      data = retry.data;
      error = retry.error;
    }

    if (error) {
      if (error.code === '23505') {
        throw new Error('Log serah terima ini sudah pernah dikirim sebelumnya.');
      }
      console.error('Error submitting handover:', error);
      throw new Error(error.message);
    }

    return this.mapToEntity(data);
  }

  /**
   * Dapatkan log handover yang BELUM di-acknowledge untuk pekerja saat ini.
   * Logika:
   * - Menampilkan log di mana next_supervisor_id = currentWorkerId
   * ATAU
   * - next_supervisor_id IS NULL (general handover) dan dibuat dalam 24 jam terakhir.
   */
  static async getUnacknowledgedHandovers(workerId: string): Promise<ShiftHandoverEntity[]> {
    const { data, error } = await supabase
      .from('shift_handovers')
      .select(`
        *,
        author:workers!shift_handovers_author_id_fkey (name, avatar)
      `)
      .is('acknowledged_at', null)
      .or(`next_supervisor_id.eq.${workerId},next_supervisor_id.is.null`)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching unacknowledged handovers:', error);
      return [];
    }

    return (data || []).map(this.mapToEntity);
  }

  /**
   * Dapatkan history handover (sudah di acknowledge)
   */
  static async getHandoverHistory(limit: number = 20): Promise<ShiftHandoverEntity[]> {
    const { data, error } = await supabase
      .from('shift_handovers')
      .select(`
        *,
        author:workers!shift_handovers_author_id_fkey (name, avatar),
        acknowledged_by_worker:workers!shift_handovers_acknowledged_by_fkey (name)
      `)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching handover history:', error);
      return [];
    }

    return (data || []).map(this.mapToEntity);
  }

  /**
   * Acknowledge handover log (baca dan mengerti)
   */
  static async acknowledgeHandover(handoverId: string, workerId: string): Promise<void> {
    const { error } = await supabase
      .from('shift_handovers')
      .update({
        acknowledged_at: new Date().toISOString(),
        acknowledged_by: workerId
      })
      .eq('id', handoverId);

    if (error) {
      console.error('Error acknowledging handover:', error);
      throw new Error(error.message);
    }
  }

  /**
   * Update status penyelesaian handover (Untuk Kanban)
   */
  static async updateHandoverStatus(handoverId: string, status: 'Tertunda' | 'Proses' | 'Selesai'): Promise<void> {
    const { error } = await supabase
      .from('shift_handovers')
      .update({ status })
      .eq('id', handoverId);

    if (error) {
      console.error('Error updating handover status:', error);
      throw new Error(error.message);
    }
  }

  private static mapToEntity(row: any): ShiftHandoverEntity {
    return {
      id: row.id,
      shift_date: row.shift_date,
      shift_type: row.shift_type,
      author_id: row.author_id,
      next_supervisor_id: row.next_supervisor_id,
      handover_category: row.handover_category || 'MHE & Peralatan',
      condition_status: row.condition_status || row.mhe_status || 'Aman',
      status: row.status || 'Tertunda',
      notes: row.notes,
      acknowledged_at: row.acknowledged_at,
      acknowledged_by: row.acknowledged_by,
      created_at: row.created_at,
      author_name: row.author?.name,
      author_avatar: row.author?.avatar,
      acknowledged_by_name: row.acknowledged_by_worker?.name
    };
  }
}
