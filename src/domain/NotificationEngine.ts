import { supabase } from '../lib/supabaseClient';

export type NotificationType = 'incident' | 'quiz' | 'reward' | 'audit' | 'system' | 'license';

export interface AppNotification {
  id: string;
  recipientId: string; // workerId or 'supervisor' or 'admin' or 'all'
  recipientRole: 'worker' | 'supervisor' | 'admin' | 'all';
  title: string;
  message: string;
  type: NotificationType;
  isRead: boolean;
  createdAt: string;
  metadata?: Record<string, any>;
}

export interface NotificationCategoryConfig {
  type: NotificationType;
  label: string;
  description: string;
  enabled: boolean;
  visibleToRoles: Array<'worker' | 'supervisor' | 'admin'>;
}

export interface NotificationRoutingPolicy {
  categories: NotificationCategoryConfig[];
  adminMonitorAll: boolean; // Jika true, Admin memonitor seluruh notifikasi lintas role
}

export const DEFAULT_NOTIFICATION_ROUTING_POLICY: NotificationRoutingPolicy = {
  adminMonitorAll: true,
  categories: [
    {
      type: 'license',
      label: 'Lisensi SIO & MHE',
      description: 'Pendaftaran SIO mandiri, verifikasi perpanjangan, dan peringatan masa berlaku SIO operator.',
      enabled: true,
      visibleToRoles: ['worker', 'supervisor', 'admin'],
    },
    {
      type: 'incident',
      label: 'Insiden K3 & Safety Alert',
      description: 'Laporan Near-Miss, investigasi kecelakaan kerja, dan alert tanggap darurat keselamatan.',
      enabled: true,
      visibleToRoles: ['worker', 'supervisor', 'admin'],
    },
    {
      type: 'quiz',
      label: 'Kuis K3 & Edukasi SOP',
      description: 'Pengumuman kuis keselamatan harian, sertifikat micro-learning, dan panduan SOP.',
      enabled: true,
      visibleToRoles: ['worker', 'supervisor', 'admin'],
    },
    {
      type: 'reward',
      label: 'Reward Poin & Kudo',
      description: 'Pencairan reward poin kepatuhan, klaim voucher sembako/katalog, dan kiriman kudo.',
      enabled: true,
      visibleToRoles: ['worker', 'admin'],
    },
    {
      type: 'audit',
      label: 'Audit 5R/5S & Safety Patrol',
      description: 'Hasil inspeksi audit 5S wilayah gudang dan temuan patroli pengawas K3 lapangan.',
      enabled: true,
      visibleToRoles: ['supervisor', 'admin'],
    },
    {
      type: 'system',
      label: 'Pengumuman Sistem & Siaran',
      description: 'Siaran langsung admin, pembaruan operasional logistik, dan info pemeliharaan aplikasi.',
      enabled: true,
      visibleToRoles: ['worker', 'supervisor', 'admin'],
    },
  ],
};

/**
 * OOP Notification Engine
 * Handles dispatching, querying, unread counting, broadcast, multi-tab sync,
 * role-based category visibility routing, and dual cloud-persistence (Supabase + localStorage fallback)
 * for Workers, Supervisors, and System Administrators.
 */
export class NotificationEngine {
  private static STORAGE_KEY = 'gappy_app_notifications_v2';
  private static INITIALIZED_KEY = 'gappy_notifications_init_flag_v2';
  private static DELETED_KEY = 'gappy_deleted_notif_ids_v2';
  private static POLICY_KEY = 'gappy_notification_routing_policy_v1';

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
   * Get tombstone set of deleted notification IDs to prevent resurrection
   */
  private static getDeletedIds(): Set<string> {
    try {
      const raw = localStorage.getItem(this.DELETED_KEY);
      if (!raw) return new Set();
      const parsed = JSON.parse(raw);
      return new Set(Array.isArray(parsed) ? parsed : []);
    } catch {
      return new Set();
    }
  }

  /**
   * Mark a notification ID as permanently deleted
   */
  private static markDeletedId(id: string): void {
    try {
      const set = this.getDeletedIds();
      set.add(id);
      localStorage.setItem(this.DELETED_KEY, JSON.stringify(Array.from(set).slice(-300)));
    } catch {
      // Ignore
    }
  }

  /**
   * Fetch all notifications stored locally.
   * FIX: Never resurrects defaults once initialized!
   */
  public static getAll(): AppNotification[] {
    try {
      const isInit = localStorage.getItem(this.INITIALIZED_KEY);
      const raw = localStorage.getItem(this.STORAGE_KEY);
      const deletedIds = this.getDeletedIds();

      if (!isInit) {
        // First run ever: seed default notifications
        const defaults = this.getDefaultNotifications().filter((n) => !deletedIds.has(n.id));
        this.saveAll(defaults);
        localStorage.setItem(this.INITIALIZED_KEY, 'true');
        return defaults;
      }

      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];

      return parsed.filter((n) => !deletedIds.has(n.id));
    } catch {
      return [];
    }
  }

  /**
   * Save notifications array to storage
   */
  private static saveAll(list: AppNotification[]): void {
    try {
      const deletedIds = this.getDeletedIds();
      const cleanList = list.filter((n) => !deletedIds.has(n.id));
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(cleanList.slice(0, 200)));
      localStorage.setItem(this.INITIALIZED_KEY, 'true');
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

      if (error || !data) {
        return this.getAll();
      }

      const deletedIds = this.getDeletedIds();

      const remoteList: AppNotification[] = data
        .filter((row: any) => !deletedIds.has(row.id))
        .map((row: any) => ({
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
        if (deletedIds.has(r.id)) continue;
        if (localMap.has(r.id)) {
          const existing = localMap.get(r.id)!;
          localMap.set(r.id, { ...r, isRead: existing.isRead || r.isRead });
        } else {
          localMap.set(r.id, r);
        }
      }

      const merged = Array.from(localMap.values())
        .filter((n) => !deletedIds.has(n.id))
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

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
    type: NotificationType = 'system',
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
   * Mengambil kebijakan perutean dan visibilitas notifikasi dari penyimpanan lokal/konfigurasi
   */
  public static getRoutingPolicy(): NotificationRoutingPolicy {
    try {
      const raw = localStorage.getItem(this.POLICY_KEY);
      if (!raw) return DEFAULT_NOTIFICATION_ROUTING_POLICY;
      const parsed = JSON.parse(raw);
      if (!parsed || !Array.isArray(parsed.categories)) {
        return DEFAULT_NOTIFICATION_ROUTING_POLICY;
      }
      // Merge with default categories in case new types are added
      const mergedCategories = DEFAULT_NOTIFICATION_ROUTING_POLICY.categories.map((defCat) => {
        const existing = parsed.categories.find((c: any) => c.type === defCat.type);
        return existing ? { ...defCat, ...existing } : defCat;
      });

      return {
        adminMonitorAll: parsed.adminMonitorAll ?? true,
        categories: mergedCategories,
      };
    } catch {
      return DEFAULT_NOTIFICATION_ROUTING_POLICY;
    }
  }

  /**
   * Menyimpan kebijakan perutean notifikasi yang dikustomisasi oleh Administrator
   */
  public static saveRoutingPolicy(policy: NotificationRoutingPolicy): void {
    try {
      localStorage.setItem(this.POLICY_KEY, JSON.stringify(policy));
      this.notifyUpdate();
    } catch (err) {
      console.error('[NotificationEngine] Gagal menyimpan kebijakan notifikasi:', err);
    }
  }

  /**
   * Mengembalikan kebijakan perutean notifikasi ke pengaturan standar
   */
  public static resetRoutingPolicy(): NotificationRoutingPolicy {
    this.saveRoutingPolicy(DEFAULT_NOTIFICATION_ROUTING_POLICY);
    return DEFAULT_NOTIFICATION_ROUTING_POLICY;
  }

  /**
   * Memeriksa apakah sebuah kategori notifikasi diaktifkan dan diizinkan tampil untuk role tertentu
   */
  public static isNotificationVisibleForRole(
    type: NotificationType,
    role?: string,
    policy: NotificationRoutingPolicy = this.getRoutingPolicy()
  ): boolean {
    const category = policy.categories.find((c) => c.type === type);
    // Jika tidak terdaftar, izinkan secara default
    if (!category) return true;

    // Jika kategori dinonaktifkan secara sistem
    if (!category.enabled) return false;

    // Jika user adalah admin dan adminMonitorAll aktif, selalu izinkan
    if (role === 'admin' && policy.adminMonitorAll) return true;

    const normalizedRole = role === 'admin' || role === 'supervisor' || role === 'worker' ? role : 'worker';
    return category.visibleToRoles.includes(normalizedRole);
  }

  /**
   * Mengambil daftar notifikasi terisolasi secara akurat untuk user atau peran tertentu.
   * FIX: 
   * 1. Notifikasi personal pekerja HANYA tampil jika recipientId cocok dengan ID pekerja (tidak bocor ke pekerja lain).
   * 2. Siaran massal hanya tampil jika recipientId eksplisit 'worker', 'supervisor', atau 'all'.
   * 3. Memfilter kategori notifikasi berdasarkan hak akses NotificationRoutingPolicy yang disetel Administrator.
   */
  public static getNotificationsForUser(userId?: string, role?: string, employeeId?: string): AppNotification[] {
    const all = this.getAll();
    const policy = this.getRoutingPolicy();

    return all.filter((n) => {
      // 0. Filter berdasarkan izin kategori dan role
      if (!this.isNotificationVisibleForRole(n.type, role, policy)) {
        return false;
      }

      // 1. Notifikasi Publik / Sistem Global (ditujukan ke 'all')
      if (n.recipientRole === 'all' || n.recipientId === 'all') return true;

      // 2. Jika user adalah System Administrator
      if (role === 'admin') {
        // Jika adminMonitorAll aktif, admin dapat memantau seluruh log notifikasi
        if (policy.adminMonitorAll) return true;
        // Jika tidak, admin hanya melihat notifikasi yang ditujukan ke admin
        if (n.recipientRole === 'admin' || n.recipientId === 'admin') return true;
        return false;
      }

      // 3. Jika user adalah Pengawas (Supervisor)
      if (role === 'supervisor') {
        // Tampilkan broadcast khusus supervisor
        if (n.recipientId === 'supervisor') return true;
        if (n.recipientRole === 'supervisor' && (n.recipientId === 'all' || n.recipientId === 'supervisor')) return true;

        // Tampilkan notifikasi personal yang ditujukan khusus ke supervisor ini
        if (userId && n.recipientId === userId) return true;
        if (employeeId && n.recipientId === employeeId) return true;

        return false;
      }

      // 4. Jika user adalah Operational Employee (Worker)
      if (role === 'worker' || !role) {
        // Jangan tampilkan notifikasi khusus supervisor atau admin
        if (n.recipientRole === 'supervisor' || n.recipientRole === 'admin') return false;

        // Tampilkan broadcast khusus seluruh staf operasional (recipientId === 'worker')
        if (n.recipientId === 'worker') return true;

        // Tampilkan notifikasi personal HANYA jika recipientId cocok dengan userId atau employeeId pekerja ini
        if (userId && n.recipientId === userId) return true;
        if (employeeId && n.recipientId === employeeId) return true;

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
    this.markDeletedId(id);
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
    const currentList = this.getAll();
    currentList.forEach((n) => this.markDeletedId(n.id));
    this.saveAll([]);
    this.notifyUpdate();

    this.executeRemote(async () => {
      const ids = currentList.map((n) => n.id);
      if (ids.length > 0) {
        await supabase.from('app_notifications').delete().in('id', ids);
      }
    });
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


