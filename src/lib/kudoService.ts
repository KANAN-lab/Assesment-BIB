import { supabase } from './supabaseClient';
import { KudoEntity, KudoCategory } from '../types/kudos';
import { SystemConfigService } from '../domain/SystemConfigService';
import { NotificationEngine } from '../domain/NotificationEngine';

export interface KudoQuotaInfo {
  sentThisWeek: number;
  maxWeeklyQuota: number;
  remainingQuota: number;
  sentReceiverIds: string[];
}

export class KudoService {
  /**
   * Menghitung sisa kuota mingguan (maks 3 kudo / 7 hari) dan daftar penerima recent (anti-pingpong).
   */
  static async getWeeklyQuotaInfo(senderId: string): Promise<KudoQuotaInfo> {
    const maxWeeklyQuota = 3;
    try {
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();

      const { data, error } = await supabase
        .from('worker_kudos')
        .select('receiver_id, created_at')
        .eq('sender_id', senderId)
        .gte('created_at', sevenDaysAgo);

      if (error || !data) {
        return {
          sentThisWeek: 0,
          maxWeeklyQuota,
          remainingQuota: maxWeeklyQuota,
          sentReceiverIds: [],
        };
      }

      const sentThisWeek = data.length;
      const sentReceiverIds = data.map((d: any) => d.receiver_id);
      const remainingQuota = Math.max(0, maxWeeklyQuota - sentThisWeek);

      return {
        sentThisWeek,
        maxWeeklyQuota,
        remainingQuota,
        sentReceiverIds,
      };
    } catch {
      return {
        sentThisWeek: 0,
        maxWeeklyQuota,
        remainingQuota: maxWeeklyQuota,
        sentReceiverIds: [],
      };
    }
  }

  /**
   * Mengirim Kudo ke pekerja lain dengan perlindungan Anti-Fraud:
   * 1. Anti-Self (tidak bisa kirim ke diri sendiri)
   * 2. Anti-Quota (maks 3 kudo per 7 hari)
   * 3. Anti-Pingpong (tidak bisa kirim ke orang yang sama dalam 7 hari)
   */
  static async sendKudo(
    senderId: string,
    receiverId: string,
    category: KudoCategory,
    message: string = ''
  ): Promise<{ success: boolean; message: string }> {
    try {
      // 1. Anti-Self Check
      if (senderId === receiverId) {
        return {
          success: false,
          message: 'Anti-Fraud: Anda tidak dapat mengirimkan kudo apresiasi kepada diri sendiri.',
        };
      }

      // 2. Client-side Quota & Anti-Pingpong Check
      const quota = await this.getWeeklyQuotaInfo(senderId);
      if (quota.remainingQuota <= 0) {
        return {
          success: false,
          message: 'Batas Kuota: Anda telah mencapai batas maksimal 3 kudo minggu ini.',
        };
      }

      if (quota.sentReceiverIds.includes(receiverId)) {
        return {
          success: false,
          message: 'Anti-Pingpong: Anda sudah memberikan kudo kepada rekan kerja ini dalam 7 hari terakhir.',
        };
      }

      const rewardPoints = SystemConfigService.getConfig().kudoReceivedPoints || 25;
      const senderBonus = SystemConfigService.getConfig().kudoSentPoints || 10;

      // Coba panggil RPC atomik
      const { data, error } = await supabase.rpc('rpc_send_kudo', {
        p_sender_id: senderId,
        p_receiver_id: receiverId,
        p_category: category,
        p_message: message,
        p_points: rewardPoints,
      });

      if (!error && data) {
        const result = data as { success: boolean; message: string; sender_bonus?: number };
        if (!result.success) {
          return result;
        }

        // Realtime dispatch untuk penerima dan pengirim
        if (typeof window !== 'undefined') {
          window.dispatchEvent(
            new CustomEvent('gappy_points_awarded', {
              detail: { workerId: receiverId, pointsEarned: rewardPoints },
            })
          );
          window.dispatchEvent(
            new CustomEvent('gappy_points_awarded', {
              detail: { workerId: senderId, pointsEarned: result.sender_bonus ?? senderBonus },
            })
          );
        }

        // Notifikasi real-time ke akun rekan kerja penerima Kudo
        NotificationEngine.addNotification({
          recipientId: receiverId,
          recipientRole: 'worker',
          title: `👏 Kudo Keselamatan Baru: ${category}`,
          message: `Anda menerima apresiasi Kudo kategori ${category}${message ? `: "${message.trim()}"` : ''}. +${rewardPoints} PTS telah ditambahkan ke akun Anda!`,
          type: 'reward',
          metadata: { senderId, category, points: rewardPoints },
        });

        return result;
      }

      // Fallback aman jika RPC database belum dibuat di Postgres server
      const { error: insertErr } = await supabase.from('worker_kudos').insert({
        sender_id: senderId,
        receiver_id: receiverId,
        category,
        message,
        points_awarded: rewardPoints,
      });

      if (insertErr) {
        console.warn('Fallback insert worker_kudos failed:', insertErr);
      }

      // Update points penerima (+25 Operational PTS)
      const { data: recWorker } = await supabase
        .from('workers')
        .select('name, total_points, operational_points, prestige_points')
        .eq('id', receiverId)
        .maybeSingle();

      if (recWorker) {
        const curOp = Number(recWorker.operational_points || 0);
        const curTot = Number(recWorker.total_points || 0);
        await supabase
          .from('workers')
          .update({
            operational_points: curOp + rewardPoints,
            total_points: curTot + rewardPoints,
            updated_at: new Date().toISOString(),
          })
          .eq('id', receiverId);
      }

      // Bonus pengirim (+${senderBonus} Operational PTS)
      const { data: sendWorker } = await supabase
        .from('workers')
        .select('name, total_points, operational_points, prestige_points')
        .eq('id', senderId)
        .maybeSingle();

      if (sendWorker) {
        const curOp = Number(sendWorker.operational_points || 0);
        const curTot = Number(sendWorker.total_points || 0);
        await supabase
          .from('workers')
          .update({
            operational_points: curOp + senderBonus,
            total_points: curTot + senderBonus,
            updated_at: new Date().toISOString(),
          })
          .eq('id', senderId);
      }

      // Catat audit trail ke activity_log
      try {
        await supabase.from('activity_log').insert([
          {
            worker_id: receiverId,
            worker_name: recWorker?.name,
            action: 'kudo_received',
            detail: `Menerima Kudo (${category}): +${rewardPoints} PTS`,
          },
          {
            worker_id: senderId,
            worker_name: sendWorker?.name,
            action: 'kudo_sent',
            detail: `Mengirimkan Kudo (${category}): +${senderBonus} PTS`,
          },
        ]);
      } catch (logErr) {
        console.warn('Fallback insert activity_log failed:', logErr);
      }

      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('gappy_points_awarded', {
            detail: { workerId: receiverId, pointsEarned: rewardPoints },
          })
        );
        window.dispatchEvent(
          new CustomEvent('gappy_points_awarded', {
            detail: { workerId: senderId, pointsEarned: senderBonus },
          })
        );
      }

      // Notifikasi real-time ke akun rekan kerja penerima Kudo
      NotificationEngine.addNotification({
        recipientId: receiverId,
        recipientRole: 'worker',
        title: `👏 Kudo Keselamatan Baru: ${category}`,
        message: `Anda menerima apresiasi Kudo kategori ${category}${message ? `: "${message.trim()}"` : ''}. +${rewardPoints} PTS telah ditambahkan ke akun Anda!`,
        type: 'reward',
        metadata: { senderId, category, points: rewardPoints },
      });

      return {
        success: true,
        message: 'Kudo apresiasi berhasil dikirimkan!',
      };
    } catch (error: any) {
      console.error('Error sending kudo:', error);
      return {
        success: false,
        message: error.message || 'Terjadi kesalahan saat mengirim kudo',
      };
    }
  }

  /**
   * Mengambil feed kudo terbaru (maksimal 20) dan melakukan join dengan data pekerja
   */
  static async getRecentKudos(limit: number = 20): Promise<KudoEntity[]> {
    const { data: kudosData, error: kudosError } = await supabase
      .from('worker_kudos')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (kudosError || !kudosData || kudosData.length === 0) {
      if (kudosError) console.error('Error fetching recent kudos:', kudosError);
      return [];
    }

    // Ambil semua worker untuk me-map nama dan avatar
    const { data: workersData, error: workersError } = await supabase
      .from('workers')
      .select('id, employee_id, name, avatar');

    const workersMap = new Map<string, any>();
    if (!workersError && workersData) {
      workersData.forEach(w => {
        workersMap.set(w.id, w);
        workersMap.set(w.employee_id, w);
      });
    }

    return kudosData.map((kudo: any) => {
      const sender = workersMap.get(kudo.sender_id);
      const receiver = workersMap.get(kudo.receiver_id);

      return {
        id: kudo.id,
        sender_id: kudo.sender_id,
        receiver_id: kudo.receiver_id,
        category: kudo.category as KudoCategory,
        message: kudo.message,
        created_at: kudo.created_at,
        sender_name: sender?.name || kudo.sender_id,
        sender_avatar: sender?.avatar,
        receiver_name: receiver?.name || kudo.receiver_id,
        receiver_avatar: receiver?.avatar
      };
    });
  }

  /**
   * Mengambil kudos yang diterima oleh pekerja tertentu
   */
  static async getWorkerKudos(workerId: string): Promise<KudoEntity[]> {
    const { data: kudosData, error: kudosError } = await supabase
      .from('worker_kudos')
      .select('*')
      .eq('receiver_id', workerId)
      .order('created_at', { ascending: false });

    if (kudosError || !kudosData) {
      return [];
    }

    // Ambil data pengirim
    const { data: workersData } = await supabase
      .from('workers')
      .select('id, employee_id, name, avatar');

    const workersMap = new Map<string, any>();
    if (workersData) {
      workersData.forEach(w => {
        workersMap.set(w.id, w);
        workersMap.set(w.employee_id, w);
      });
    }

    return kudosData.map((kudo: any) => {
      const sender = workersMap.get(kudo.sender_id);
      const receiver = workersMap.get(kudo.receiver_id);

      return {
        id: kudo.id,
        sender_id: kudo.sender_id,
        receiver_id: kudo.receiver_id,
        category: kudo.category as KudoCategory,
        message: kudo.message,
        created_at: kudo.created_at,
        sender_name: sender?.name || kudo.sender_id,
        sender_avatar: sender?.avatar,
        receiver_name: receiver?.name || kudo.receiver_id,
        receiver_avatar: receiver?.avatar
      };
    });
  }
}
