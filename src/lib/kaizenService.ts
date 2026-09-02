import { supabase } from './supabaseClient';
import { KaizenSuggestionEntity, KaizenInput, KaizenReviewInput } from '../types/kaizen';

export class KaizenService {
  /**
   * Submit ide Kaizen baru oleh pekerja
   */
  static async submitSuggestion(
    authorId: string,
    input: KaizenInput
  ): Promise<{ success: boolean; data?: KaizenSuggestionEntity; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('kaizen_suggestions')
        .insert({
          author_id: authorId,
          title: input.title.trim(),
          category: input.category,
          current_condition: input.currentCondition.trim(),
          proposed_solution: input.proposedSolution.trim(),
          expected_impact: input.expectedImpact ? input.expectedImpact.trim() : null,
          photo_before_url: input.photoBeforeUrl || null,
          photo_after_url: input.photoAfterUrl || null,
          status: 'Submitted',
          reward_points: 0
        })
        .select(`
          *,
          author:workers!author_id (name, avatar, role, division),
          reviewer:workers!reviewer_id (name)
        `)
        .single();

      if (error) throw error;

      // Log activity
      await supabase.from('activity_log').insert({
        worker_id: authorId,
        action: 'kaizen_submitted',
        detail: `Mengajukan ide Kaizen: "${input.title.slice(0, 30)}..."`
      });

      return {
        success: true,
        data: this.mapToEntity(data)
      };
    } catch (err: any) {
      console.error('Error submitting Kaizen suggestion:', err);
      return {
        success: false,
        error: err.message || 'Gagal mengirim usulan Kaizen'
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
   * Meninjau usulan Kaizen (update status, berikan poin reward, dan feedback reviewer via atomic RPC)
   */
  static async reviewSuggestion(
    review: KaizenReviewInput
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase.rpc('rpc_approve_kaizen', {
        p_suggestion_id: review.suggestionId,
        p_reviewer_id: review.reviewerId,
        p_new_status: review.newStatus,
        p_reward_points: review.rewardPoints,
        p_feedback: review.feedback.trim()
      });

      if (error) throw error;

      return { success: true };
    } catch (err: any) {
      console.error('Error reviewing Kaizen suggestion via RPC:', err);
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
