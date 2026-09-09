import { supabase } from './supabaseClient';
import { KaizenSuggestionEntity, KaizenInput, KaizenReviewInput } from '../types/kaizen';
import { NotificationEngine } from '../domain/NotificationEngine';

export class KaizenService {
  /**
   * Submit ide Kaizen baru oleh pekerja
   */
  static async submitSuggestion(
    authorId: string,
    input: KaizenInput,
    idempotencyKey?: string
  ): Promise<{ success: boolean; data?: KaizenSuggestionEntity; error?: string }> {
    try {
      const insertPayload: Record<string, any> = {
        author_id: authorId,
        title: input.title.trim(),
        category: input.category,
        current_condition: input.currentCondition.trim(),
        proposed_solution: input.proposedSolution.trim(),
        expected_impact: input.expectedImpact ? input.expectedImpact.trim() : null,
        photo_before_url: input.photoBeforeUrl || null,
        photo_after_url: input.photoAfterUrl || null,
        status: 'Submitted',
        reward_points: 0,
      };

      if (idempotencyKey) {
        insertPayload.idempotency_key = idempotencyKey;
      }

      const { data, error } = await supabase
        .from('kaizen_suggestions')
        .insert(insertPayload)
        .select(`
          *,
          author:workers!author_id (name, avatar, role, division),
          reviewer:workers!reviewer_id (name)
        `)
        .single();

      if (error) {
        // Server-side duplicate rejection
        if (error.code === '23505') {
          return { success: false, error: 'Usulan Kaizen dengan isi yang sama sudah pernah dikirim.' };
        }
        // Fallback: kolom idempotency_key belum ada di skema
        if (error.message.includes('idempotency_key') || error.message.includes('column')) {
          delete insertPayload.idempotency_key;
          const retry = await supabase
            .from('kaizen_suggestions')
            .insert(insertPayload)
            .select(`*, author:workers!author_id (name, avatar, role, division), reviewer:workers!reviewer_id (name)`)
            .single();
          if (retry.error) throw retry.error;
          await supabase.from('activity_log').insert({
            worker_id: authorId,
            worker_name: (retry.data as any)?.author?.name,
            action: 'kaizen_submitted',
            detail: `Mengajukan ide Kaizen: "${input.title.slice(0, 30)}..."`,
          });
          return { success: true, data: this.mapToEntity(retry.data) };
        }
        throw error;
      }

      // Log activity
      await supabase.from('activity_log').insert({
        worker_id: authorId,
        worker_name: (data as any)?.author?.name,
        action: 'kaizen_submitted',
        detail: `Mengajukan ide Kaizen: "${input.title.slice(0, 30)}..."`,
      });

      // Notifikasi ke Supervisor
      NotificationEngine.addNotification({
        recipientId: 'supervisor',
        recipientRole: 'supervisor',
        title: `💡 Usulan Ide Kaizen Baru: ${input.category}`,
        message: `Usulan inovasi "${input.title.trim()}" telah diajukan oleh staf. Tinjau di Papan Kanban Kaizen.`,
        type: 'system',
      });

      return {
        success: true,
        data: this.mapToEntity(data),
      };
    } catch (err: any) {
      console.error('Error submitting Kaizen suggestion:', err);
      return {
        success: false,
        error: err.message || 'Gagal mengirim usulan Kaizen',
      };
    }
  }


  /**
   * Mengambil semua ide Kaizen untuk Admin/Supervisor (Kanban Board)
   */
  static async getAllSuggestions(limit: number = 100): Promise<KaizenSuggestionEntity[]> {
    try {
      const { data, error } = await supabase
        .from('kaizen_suggestions')
        .select(`
          *,
          author:workers!author_id (name, avatar, role, division),
          reviewer:workers!reviewer_id (name)
        `)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return (data || []).map((row) => this.mapToEntity(row));
    } catch (err) {
      console.error('Error fetching Kaizen suggestions:', err);
      return [];
    }
  }

  /**
   * Mengambil riwayat ide Kaizen milik worker tertentu
   */
  static async getSuggestionsByWorker(workerId: string): Promise<KaizenSuggestionEntity[]> {
    try {
      const { data, error } = await supabase
        .from('kaizen_suggestions')
        .select(`
          *,
          author:workers!author_id (name, avatar, role, division),
          reviewer:workers!reviewer_id (name)
        `)
        .eq('author_id', workerId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []).map((row) => this.mapToEntity(row));
    } catch (err) {
      console.error('Error fetching worker Kaizen history:', err);
      return [];
    }
  }

  /**
   * Meninjau usulan Kaizen (update status, berikan poin reward, dan feedback reviewer via atomic RPC / robust fallback)
   */
  static async reviewSuggestion(
    review: KaizenReviewInput
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // 1. Ambil data usulan sebelumnya untuk keperluan perhitungan selisih poin & notifikasi
      const { data: suggestion } = await supabase
        .from('kaizen_suggestions')
        .select('id, author_id, title, reward_points, status')
        .eq('id', review.suggestionId)
        .maybeSingle();

      const effectiveReward = (review.newStatus === 'Approved' || review.newStatus === 'Implemented')
        ? Math.max(review.rewardPoints, 0)
        : 0;
      const prevReward = suggestion?.reward_points || 0;
      const pointDiff = effectiveReward - prevReward;

      // 2. Coba eksekusi Stored Procedure Atomik rpc_approve_kaizen
      let rpcSuccess = false;
      const { error: rpcError } = await supabase.rpc('rpc_approve_kaizen', {
        p_suggestion_id: review.suggestionId,
        p_reviewer_id: review.reviewerId,
        p_new_status: review.newStatus,
        p_reward_points: review.rewardPoints,
        p_feedback: review.feedback.trim()
      });

      if (!rpcError) {
        rpcSuccess = true;
      } else {
        console.warn('[KaizenService] RPC rpc_approve_kaizen gagal/tidak ditemukan, lanjut fallback sequential:', rpcError.message);
      }

      // 3. Fallback Client-side jika RPC tidak tersedia
      if (!rpcSuccess) {
        const { error: updateErr } = await supabase
          .from('kaizen_suggestions')
          .update({
            status: review.newStatus,
            reward_points: effectiveReward,
            reviewer_id: review.reviewerId,
            reviewer_feedback: review.feedback.trim(),
            reviewed_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', review.suggestionId);

        if (updateErr) throw updateErr;

        if (pointDiff !== 0 && suggestion?.author_id) {
          const { data: worker } = await supabase
            .from('workers')
            .select('id, name, total_points, prestige_points')
            .eq('id', suggestion.author_id)
            .maybeSingle();

          if (worker) {
            const currentTotal = Number(worker.total_points || 0);
            const currentPr = Number(worker.prestige_points || currentTotal);
            const newPoints = Math.max(currentTotal + pointDiff, 0);
            const newPrestige = Math.max(currentPr + pointDiff, 0);
            await supabase
              .from('workers')
              .update({
                total_points: newPoints,
                prestige_points: newPrestige,
                updated_at: new Date().toISOString(),
              })
              .eq('id', suggestion.author_id);
          }

          if (pointDiff > 0) {
            await supabase.from('activity_log').insert({
              worker_id: suggestion.author_id,
              worker_name: worker?.name,
              action: 'kaizen_approved',
              detail: `Poin Reward Kaizen: "${(suggestion.title || '').slice(0, 35)}..." (+${pointDiff} PTS)`,
            });
          }
        }
      }

      // 4. Reaktivitas Poin Realtime di Browser
      if (typeof window !== 'undefined' && pointDiff !== 0 && suggestion?.author_id) {
        window.dispatchEvent(
          new CustomEvent('gappy_points_awarded', {
            detail: {
              workerId: suggestion.author_id,
              pointsEarned: pointDiff,
            },
          })
        );
      }

      // 5. Notifikasi Resmi Hasil Review ke Author Kaizen
      if (suggestion?.author_id) {
        const isApproved = review.newStatus === 'Approved' || review.newStatus === 'Implemented';
        const isRejected = review.newStatus === 'Rejected';
        const statusLabel = isApproved ? 'Disetujui' : isRejected ? 'Ditolak' : review.newStatus;
        const pointText = isApproved && effectiveReward > 0 ? ` (+${effectiveReward} PTS)` : '';

        NotificationEngine.addNotification({
          recipientId: suggestion.author_id,
          recipientRole: 'worker',
          type: 'reward',
          title: `💡 Usulan Kaizen ${statusLabel}${pointText}`,
          message: `Ide Kaizen Anda "${suggestion.title}" telah dievaluasi dengan status ${statusLabel}.${review.feedback ? ` Catatan Evaluasi: "${review.feedback.trim()}"` : ''}`,
        });
      }

      return { success: true };
    } catch (err: any) {
      console.error('Error reviewing Kaizen suggestion:', err);
      return {
        success: false,
        error: err.message || 'Gagal memproses review Kaizen'
      };
    }
  }

  /**
   * Hapus ide Kaizen
   */
  static async deleteSuggestion(id: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('kaizen_suggestions')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return { success: true };
    } catch (err: any) {
      console.error('Error deleting Kaizen suggestion:', err);
      return {
        success: false,
        error: err.message || 'Gagal menghapus ide Kaizen'
      };
    }
  }

  /**
   * Mapper DB row ke domain entity
   */
  private static mapToEntity(row: any): KaizenSuggestionEntity {
    return {
      id: row.id,
      author_id: row.author_id,
      title: row.title,
      category: row.category,
      current_condition: row.current_condition,
      proposed_solution: row.proposed_solution,
      expected_impact: row.expected_impact,
      photo_before_url: row.photo_before_url,
      photo_after_url: row.photo_after_url,
      status: row.status,
      reward_points: row.reward_points || 0,
      reviewer_id: row.reviewer_id,
      reviewer_feedback: row.reviewer_feedback,
      reviewed_at: row.reviewed_at,
      created_at: row.created_at,
      updated_at: row.updated_at,
      author_name: row.author?.name,
      author_avatar: row.author?.avatar,
      author_role: row.author?.role,
      author_division: row.author?.division,
      reviewer_name: row.reviewer?.name
    };
  }
}
