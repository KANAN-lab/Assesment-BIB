import { supabase } from './supabaseClient';
import { KudoEntity, KudoCategory, KudoReactionType, KudoReactionSummary } from '../types/kudos';
import { SystemConfigService } from '../domain/SystemConfigService';
import { NotificationEngine } from '../domain/NotificationEngine';
import { evaluateWorkerBadgesById } from './supabaseService';

export interface KudoQuotaInfo {
  sentThisWeek: number;
  maxWeeklyQuota: number;
  remainingQuota: number;
  sentReceiverIds: string[];
}

export const KUDO_QUICK_TAGS: Record<KudoCategory, string[]> = {
  'Kerja Aman': [
    'Tertib APD Lengkap',
    'Cek Rutin MHE / Forklift Teliti',
    'Cepat Lapor Bahaya Area Staging',
    'Patuhi Jalur Pejalan Kaki (Pedestrian Safe)',
  ],
  'Bantuan Hebat': [
    'Bantu Angkat Beban Ergonomis',
    'Bantu Rapikan Buffer Inbound/Outbound',
    'Sigap Back-up Rekan Jam Sibuk',
    'Bantu Pandu Manuver Forklift / Spotter',
  ],
  'Team Player': [
    'Komunikasi Aktif saat Loading/Unloading',
    'Jaga Ritme Kerja & Kekompakan Regu',
    'Koordinasi Antar-Divisi Rapi',
    'Aktif Saling Mengingatkan K3 Rekan',
  ],
  'Inisiatif': [
    'Inisiatif 5R Area Kerja Bersih & Rapih',
    'Peka Temukan Label Barcode Rusak',
    'Rapikan Pallet Kosong Liar',
    'Usulan Praktis Percepat Alur Operasional',
  ],
};

const KUDO_REACTIONS_STORAGE_KEY = 'gappy_kudo_reactions_cache_v2';
const KUDO_PINNED_STORAGE_KEY = 'gappy_kudo_pinned_cache_v1';

function getLocalReactionsCache(): Record<string, Record<string, KudoReactionType[]>> {
  try {
    const raw = localStorage.getItem(KUDO_REACTIONS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveLocalReactionsCache(cache: Record<string, Record<string, KudoReactionType[]>>) {
  try {
    localStorage.setItem(KUDO_REACTIONS_STORAGE_KEY, JSON.stringify(cache));
  } catch {}
}

function getLocalPinnedKudos(): Set<string> {
  try {
    const raw = localStorage.getItem(KUDO_PINNED_STORAGE_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

function saveLocalPinnedKudos(pinnedSet: Set<string>) {
  try {
    localStorage.setItem(KUDO_PINNED_STORAGE_KEY, JSON.stringify(Array.from(pinnedSet)));
  } catch {}
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

        // Trigger evaluasi lencana otomatis
        evaluateWorkerBadgesById(receiverId).catch(() => {});
        evaluateWorkerBadgesById(senderId).catch(() => {});

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

      // Trigger evaluasi lencana otomatis
      evaluateWorkerBadgesById(receiverId).catch(() => {});
      evaluateWorkerBadgesById(senderId).catch(() => {});

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
   * Mengambil rekap reaksi untuk daftar kudo IDs
   */
  static async getKudoReactionsBatch(
    kudoIds: string[],
    currentWorkerId?: string
  ): Promise<Record<string, KudoReactionSummary>> {
    const result: Record<string, KudoReactionSummary> = {};
    for (const id of kudoIds) {
      result[id] = { clap: 0, muscle: 0, star: 0, userReactions: [] };
    }

    // 1. Ambil dari Supabase (jika tabel kudo_reactions ada)
    try {
      const { data, error } = await supabase
        .from('kudo_reactions')
        .select('kudo_id, worker_id, reaction_type')
        .in('kudo_id', kudoIds);

      if (!error && data && data.length > 0) {
        for (const row of data) {
          const r = result[row.kudo_id];
          if (r) {
            const type = row.reaction_type as KudoReactionType;
            if (type === 'clap') r.clap++;
            else if (type === 'muscle') r.muscle++;
            else if (type === 'star') r.star++;

            if (currentWorkerId && (row.worker_id === currentWorkerId || row.worker_id === `w-${currentWorkerId}`)) {
              if (!r.userReactions.includes(type)) r.userReactions.push(type);
            }
          }
        }
        return result;
      }
    } catch {}

    // 2. Fallback: ambil dari local storage cache
    const localCache = getLocalReactionsCache();
    for (const id of kudoIds) {
      const kudoReactions = localCache[id];
      if (kudoReactions) {
        const r = result[id];
        for (const [workerId, types] of Object.entries(kudoReactions)) {
          for (const type of types) {
            if (type === 'clap') r.clap++;
            else if (type === 'muscle') r.muscle++;
            else if (type === 'star') r.star++;

            if (currentWorkerId && (workerId === currentWorkerId || workerId === `w-${currentWorkerId}`)) {
              if (!r.userReactions.includes(type)) r.userReactions.push(type);
            }
          }
        }
      }
    }

    return result;
  }

  /**
   * Menambahkan atau menghapus reaksi (toggle) pada kartu kudo tertentu
   */
  static async toggleReaction(
    kudoId: string,
    workerId: string,
    reactionType: KudoReactionType
  ): Promise<{ success: boolean; summary: KudoReactionSummary }> {
    // 1. Update local cache seketika
    const localCache = getLocalReactionsCache();
    if (!localCache[kudoId]) localCache[kudoId] = {};
    if (!localCache[kudoId][workerId]) localCache[kudoId][workerId] = [];

    const userTypes = localCache[kudoId][workerId];
    const hasReaction = userTypes.includes(reactionType);

    if (hasReaction) {
      localCache[kudoId][workerId] = userTypes.filter((t) => t !== reactionType);
    } else {
      localCache[kudoId][workerId].push(reactionType);
    }
    saveLocalReactionsCache(localCache);

    // 2. Sync ke Supabase tabel kudo_reactions
    try {
      if (hasReaction) {
        await supabase
          .from('kudo_reactions')
          .delete()
          .eq('kudo_id', kudoId)
          .eq('worker_id', workerId)
          .eq('reaction_type', reactionType);
      } else {
        await supabase
          .from('kudo_reactions')
          .insert({
            kudo_id: kudoId,
            worker_id: workerId,
            reaction_type: reactionType,
          });
      }
    } catch {}

    // Dispatch realtime event
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('gappy_kudo_reaction_updated', { detail: { kudoId } }));
    }

    // Ambil rekap terbaru
    const batch = await this.getKudoReactionsBatch([kudoId], workerId);
    return {
      success: true,
      summary: batch[kudoId] || { clap: 0, muscle: 0, star: 0, userReactions: [] },
    };
  }

  /**
   * Toggle Pin Kudo oleh Pengawas / Admin
   */
  static async togglePinKudo(kudoId: string, adminWorkerId: string, pin: boolean): Promise<boolean> {
    // Local set
    const pinnedSet = getLocalPinnedKudos();
    if (pin) {
      pinnedSet.add(kudoId);
    } else {
      pinnedSet.delete(kudoId);
    }
    saveLocalPinnedKudos(pinnedSet);

    // Database update
    try {
      await supabase
        .from('worker_kudos')
        .update({
          is_pinned: pin,
          pinned_by: pin ? adminWorkerId : null,
        })
        .eq('id', kudoId);
    } catch {}

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('gappy_kudo_pinned_updated', { detail: { kudoId, pin } }));
    }

    return true;
  }

  /**
   * Mengambil feed kudo terbaru (maksimal 20) dan melakukan join dengan data pekerja
   */
  static async getRecentKudos(limit: number = 20, currentWorkerId?: string): Promise<KudoEntity[]> {
    const { data: kudosData, error: kudosError } = await supabase
      .from('worker_kudos')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (kudosError || !kudosData || kudosData.length === 0) {
      if (kudosError) console.error('Error fetching recent kudos:', kudosError);
      return [];
    }

    // Ambil semua worker untuk me-map nama, avatar, divisi
    const { data: workersData, error: workersError } = await supabase
      .from('workers')
      .select('id, employee_id, name, avatar, division');

    const workersMap = new Map<string, any>();
    if (!workersError && workersData) {
      workersData.forEach((w) => {
        workersMap.set(w.id, w);
        workersMap.set(w.employee_id, w);
        const clean = w.id.replace(/^w-/, '');
        workersMap.set(clean, w);
        workersMap.set(`w-${clean}`, w);
      });
    }

    const kudoIds = kudosData.map((k: any) => k.id);
    const reactionsMap = await this.getKudoReactionsBatch(kudoIds, currentWorkerId);
    const localPinned = getLocalPinnedKudos();

    const entities: KudoEntity[] = kudosData.map((kudo: any) => {
      const sender = workersMap.get(kudo.sender_id);
      const receiver = workersMap.get(kudo.receiver_id);
      const isPinned = Boolean(kudo.is_pinned || localPinned.has(kudo.id));

      return {
        id: kudo.id,
        sender_id: kudo.sender_id,
        receiver_id: kudo.receiver_id,
        category: kudo.category as KudoCategory,
        message: kudo.message,
        points_awarded: kudo.points_awarded || 25,
        created_at: kudo.created_at,
        is_pinned: isPinned,
        pinned_by: kudo.pinned_by,
        sender_name: sender?.name || kudo.sender_id,
        sender_avatar: sender?.avatar,
        sender_division: sender?.division,
        receiver_name: receiver?.name || kudo.receiver_id,
        receiver_avatar: receiver?.avatar,
        receiver_division: receiver?.division,
        reactions: reactionsMap[kudo.id] || { clap: 0, muscle: 0, star: 0, userReactions: [] },
      };
    });

    // Pinned kudo selalu ditaruh di urutan paling atas
    entities.sort((a, b) => {
      if (a.is_pinned && !b.is_pinned) return -1;
      if (!a.is_pinned && b.is_pinned) return 1;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

    return entities;
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

    const { data: workersData } = await supabase
      .from('workers')
      .select('id, employee_id, name, avatar, division');

    const workersMap = new Map<string, any>();
    if (workersData) {
      workersData.forEach((w) => {
        workersMap.set(w.id, w);
        workersMap.set(w.employee_id, w);
        const clean = w.id.replace(/^w-/, '');
        workersMap.set(clean, w);
        workersMap.set(`w-${clean}`, w);
      });
    }

    const kudoIds = kudosData.map((k: any) => k.id);
    const reactionsMap = await this.getKudoReactionsBatch(kudoIds, workerId);
    const localPinned = getLocalPinnedKudos();

    return kudosData.map((kudo: any) => {
      const sender = workersMap.get(kudo.sender_id);
      const receiver = workersMap.get(kudo.receiver_id);
      const isPinned = Boolean(kudo.is_pinned || localPinned.has(kudo.id));

      return {
        id: kudo.id,
        sender_id: kudo.sender_id,
        receiver_id: kudo.receiver_id,
        category: kudo.category as KudoCategory,
        message: kudo.message,
        points_awarded: kudo.points_awarded || 25,
        created_at: kudo.created_at,
        is_pinned: isPinned,
        pinned_by: kudo.pinned_by,
        sender_name: sender?.name || kudo.sender_id,
        sender_avatar: sender?.avatar,
        sender_division: sender?.division,
        receiver_name: receiver?.name || kudo.receiver_id,
        receiver_avatar: receiver?.avatar,
        receiver_division: receiver?.division,
        reactions: reactionsMap[kudo.id] || { clap: 0, muscle: 0, star: 0, userReactions: [] },
      };
    });
  }
}
