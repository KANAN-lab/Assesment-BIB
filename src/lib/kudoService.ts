import { supabase } from './supabaseClient';
import { KudoEntity, KudoCategory } from '../types/kudos';

export class KudoService {
  /**
   * Mengirim Kudo ke pekerja lain (maksimal 3x seminggu per pengirim)
   */
  static async sendKudo(
    senderId: string,
    receiverId: string,
    category: KudoCategory,
    message: string = ''
  ): Promise<{ success: boolean; message: string }> {
    try {
      const { data, error } = await supabase.rpc('rpc_send_kudo', {
        p_sender_id: senderId,
        p_receiver_id: receiverId,
        p_category: category,
        p_message: message
      });

      if (error) {
        console.error('Supabase RPC Error:', error);
        return { success: false, message: error.message };
      }

      return data as { success: boolean; message: string };
    } catch (error: any) {
      console.error('Error sending kudo:', error);
      return {
        success: false,
        message: error.message || 'Terjadi kesalahan saat mengirim kudo'
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
