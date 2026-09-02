import { supabase } from '../lib/supabaseClient';

export interface AppNotification {
  id: string;
  recipientId: string; // workerId or 'supervisor' or 'admin' or 'all'
  recipientRole: 'worker' | 'supervisor' | 'admin' | 'all';
  title: string;
  message: string;
  type: 'incident' | 'quiz' | 'reward' | 'audit' | 'system' | 'license';
  isRead: boolean;
  createdAt: string;
  metadata?: Record<string, any>;
}

/**
 * OOP Notification Engine
 * Handles dispatching, querying, unread counting, broadcast, multi-tab sync,
 * and dual cloud-persistence (Supabase + localStorage fallback) of notifications
 * for Workers, Supervisors, and System Administrators.
 */
export class NotificationEngine {
  private static STORAGE_KEY = 'gappy_app_notifications_v2';

  // Cross-tab broadcast channel
  private static channel: BroadcastChannel | null = (() => {
    if (typeof window !== 'undefined' && typeof BroadcastChannel !== 'undefined') {
      try {
        const ch = new BroadcastChannel('gappy_notifications_channel');
        ch.onmessage = (event) => {
          if (event.data?.type === 'gappy_notification_updated') {
            window.dispatchEvent(new CustomEvent('gappy_notification_updated'));
          }
        };
        return ch;
      } catch {
        return null;
      }
    }
    return null;
  })();

  private static notifyUpdate(notif?: AppNotification): void {
    if (typeof window !== 'undefined') {
      if (notif) {
        window.dispatchEvent(new CustomEvent('gappy_notification_received', { detail: notif }));
      }
      window.dispatchEvent(new CustomEvent('gappy_notification_updated'));
      try {
        this.channel?.postMessage({ type: 'gappy_notification_updated' });
      } catch {
        // Ignore broadcast errors
      }
    }
  }

  private static async executeRemote(action: () => Promise<any>): Promise<void> {
    try {
      await action();
    } catch {
      // Offline fallback
    }
  }

  /**
   * Fetch all notifications stored locally
   */
  public static getAll(): AppNotification[] {
    try {
      const raw = localStorage.getItem(this.STORAGE_KEY);
      if (!raw) return this.getDefaultNotifications();
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) && parsed.length > 0 ? parsed : this.getDefaultNotifications();
    } catch {
      return this.getDefaultNotifications();
    }
  }

  /**
   * Save notifications array to storage
   */
  private static saveAll(list: AppNotification[]): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(list.slice(0, 200)));
    } catch (e) {
      console.warn('[NotificationEngine] Gagal menyimpan notifikasi lokal:', e);
    }
  }

  /**
   * Sync notifications from Supabase cloud database
   */
  public static async syncFromRemote(): Promise<AppNotification[]> {
    try {
      const { data, error } = await supabase
        .from('app_notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error || !data || data.length === 0) {
        return this.getAll();
      }

      const remoteList: AppNotification[] = data.map((row: any) => ({
        id: row.id,
        recipientId: row.recipient_id,
        recipientRole: row.recipient_role,
        title: row.title,
        message: row.message,
        type: row.type,
        isRead: Boolean(row.is_read),
        createdAt: row.created_at,
        metadata: row.metadata || {}
      }));

      const localList = this.getAll();
      const localMap = new Map(localList.map((n) => [n.id, n]));

      // Merge: preserve local isRead status if read locally
      for (const r of remoteList) {
        if (localMap.has(r.id)) {
          const existing = localMap.get(r.id)!;
          localMap.set(r.id, { ...r, isRead: existing.isRead || r.isRead });
        } else {
          localMap.set(r.id, r);
        }
      }

      const merged = Array.from(localMap.values()).sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      this.saveAll(merged);
      this.notifyUpdate();
      return merged;
    } catch {
      return this.getAll();
    }
  }

  /**
   * Create and dispatch a new notification
   */
  public static addNotification(
    data: Omit<AppNotification, 'id' | 'isRead' | 'createdAt'>
  ): AppNotification {
    const list = this.getAll();
    const newNotif: AppNotification = {
      ...data,
      id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      isRead: false,
      createdAt: new Date().toISOString(),
    };

    const updated = [newNotif, ...list];
    this.saveAll(updated);
    this.notifyUpdate(newNotif);

    // Asynchronously push to Supabase if available
    this.executeRemote(async () => {
      await supabase.from('app_notifications').insert({
        id: newNotif.id,
        recipient_id: newNotif.recipientId,
        recipient_role: newNotif.recipientRole,
        title: newNotif.title,
        message: newNotif.message,
        type: newNotif.type,
        is_read: false,
        metadata: newNotif.metadata || {},
        created_at: newNotif.createdAt,
      });
    });

    return newNotif;
  }

  /**
   * Broadcast a notification from Administrator console
   */
  public static broadcast(
    title: string,
    message: string,
    recipientRole: 'all' | 'worker' | 'supervisor' | 'admin' = 'all',
    type: 'system' | 'incident' | 'quiz' | 'reward' | 'audit' = 'system',
    metadata?: Record<string, any>
  ): AppNotification {
    return this.addNotification({
      recipientId: recipientRole,
      recipientRole,
      title,
      message,
      type,
      metadata
    });
  }

  /**
   * Get filtered notifications for a specific user or role.
   * FIX: Operational worker receives both individual notifications AND role-wide broadcasts!
   */
  public static getNotificationsForUser(userId?: string, role?: string, employeeId?: string): AppNotification[] {
    const all = this.getAll();
    return all.filter((n) => {
      // 1. Notifikasi Publik / Sistem Global
      if (n.recipientRole === 'all' || n.recipientId === 'all') return true;

      // 2. Jika user adalah System Admin (Admin dapat memonitor seluruh notifikasi)
      if (role === 'admin') {
        return true;
      }

      // 3. Jika user adalah Pengawas (Supervisor)
      if (role === 'supervisor') {
        if (n.recipientRole === 'supervisor' || n.recipientId === 'supervisor') return true;
        if (userId && (n.recipientId === userId || n.recipientId === employeeId)) return true;
        return false;
      }

      // 4. Jika user adalah Operational Employee (Worker)
      if (role === 'worker' || !role) {
        // Jangan tampilkan notifikasi khusus supervisor atau admin
        if (n.recipientRole === 'supervisor' || n.recipientRole === 'admin') return false;

        // Tampilkan siaran yang ditujukan ke seluruh staf operasional
        if (n.recipientRole === 'worker' || n.recipientId === 'worker') return true;

        // Tampilkan notifikasi pribadi untuk worker ini (berdasarkan userId atau NIK employeeId)
        if (userId && (n.recipientId === userId || n.recipientId === employeeId)) return true;

        return false;
      }

      return false;
    });
  }

  /**
   * Get unread notifications count for a user or role
   */
  public static getUnreadCount(userId?: string, role?: string, employeeId?: string): number {
    const list = this.getNotificationsForUser(userId, role, employeeId);
    return list.filter((n) => !n.isRead).length;
  }

  /**
   * Mark a specific notification as read
   */
  public static markAsRead(id: string): void {
    const list = this.getAll();
    const updated = list.map((n) => (n.id === id ? { ...n, isRead: true } : n));
    this.saveAll(updated);
    this.notifyUpdate();

    this.executeRemote(async () => {
      await supabase.from('app_notifications').update({ is_read: true }).eq('id', id);
    });
  }

  /**
   * Mark all notifications for a user/role as read
   */
  public static markAllAsRead(userId?: string, role?: string, employeeId?: string): void {
    const list = this.getAll();
    const allowedIds = new Set(this.getNotificationsForUser(userId, role, employeeId).map(n => n.id));
    const updated = list.map((n) => {
      return allowedIds.has(n.id) ? { ...n, isRead: true } : n;
    });
    this.saveAll(updated);
    this.notifyUpdate();

    const ids = Array.from(allowedIds);
    if (ids.length > 0) {
      this.executeRemote(async () => {
        await supabase.from('app_notifications').update({ is_read: true }).in('id', ids);
      });
    }
  }

  /**
   * Delete a specific notification by ID
   */
  public static deleteNotification(id: string): void {
    const list = this.getAll();
    const updated = list.filter((n) => n.id !== id);
    this.saveAll(updated);
    this.notifyUpdate();

    this.executeRemote(async () => {
      await supabase.from('app_notifications').delete().eq('id', id);
    });
  }

  /**
   * Clear all notifications for user or globally
   */
  public static clearAllNotifications(): void {
    this.saveAll([]);
    this.notifyUpdate();
  }

  /**
   * Seed initial default notifications for demo/testing
   */
  private static getDefaultNotifications(): AppNotification[] {
    return [
      {
        id: 'notif-default-1',
        recipientId: 'supervisor',
        recipientRole: 'supervisor',
        title: 'Laporan Insiden K3 Membutuhkan Validasi',
        message: 'Laporan Near-Miss di Area Loading Dock B membutuhkan verifikasi Supervisor.',
        type: 'incident',
        isRead: false,
        createdAt: new Date(Date.now() - 3600000).toISOString(),
      },
      {
        id: 'notif-default-2',
        recipientId: 'all',
        recipientRole: 'all',
        title: 'Selamat Datang di Gappy Assessment Platform',
        message: 'Gunakan kuis harian & pre-shift checklist untuk mengumpulkan poin reward K3.',
        type: 'system',
        isRead: true,
        createdAt: new Date(Date.now() - 86400000).toISOString(),
      },
    ];
  }
}

