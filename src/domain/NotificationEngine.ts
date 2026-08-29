export interface AppNotification {
  id: string;
  recipientId: string; // workerId or 'supervisor' or 'admin' or 'all'
  recipientRole: 'worker' | 'supervisor' | 'admin' | 'all';
  title: string;
  message: string;
  type: 'incident' | 'quiz' | 'reward' | 'audit' | 'system';
  isRead: boolean;
  createdAt: string;
  metadata?: Record<string, any>;
}

/**
 * OOP Notification Engine
 * Handles dispatching, querying, unread counting, and local persistence of notifications
 * for Workers and Supervisors.
 */
export class NotificationEngine {
  private static STORAGE_KEY = 'gappy_app_notifications_v2';

  /**
   * Fetch all notifications stored locally
   */
  public static getAll(): AppNotification[] {
    try {
      const raw = localStorage.getItem(this.STORAGE_KEY);
      if (!raw) return this.getDefaultNotifications();
      return JSON.parse(raw);
    } catch {
      return this.getDefaultNotifications();
    }
  }

  /**
   * Save notifications array to storage
   */
  private static saveAll(list: AppNotification[]): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(list.slice(0, 100)));
    } catch (e) {
      console.warn('[NotificationEngine] Gagal menyimpan notifikasi:', e);
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

    // Trigger custom window event for real-time reactivity in UI
    window.dispatchEvent(new CustomEvent('gappy_notification_received', { detail: newNotif }));

    return newNotif;
  }

  /**
   * Get filtered notifications for a specific user or role
   */
  public static getNotificationsForUser(userId?: string, role?: string): AppNotification[] {
    const all = this.getAll();
    return all.filter((n) => {
      if (n.recipientRole === 'all') return true;
      if (role && n.recipientRole === role) return true;
      if (userId && n.recipientId === userId) return true;
      return false;
    });
  }

  /**
   * Get unread notifications count for a user or role
   */
  public static getUnreadCount(userId?: string, role?: string): number {
    const list = this.getNotificationsForUser(userId, role);
    return list.filter((n) => !n.isRead).length;
  }

  /**
   * Mark a specific notification as read
   */
  public static markAsRead(id: string): void {
    const list = this.getAll();
    const updated = list.map((n) => (n.id === id ? { ...n, isRead: true } : n));
    this.saveAll(updated);
    window.dispatchEvent(new CustomEvent('gappy_notification_updated'));
  }

  /**
   * Mark all notifications for a user/role as read
   */
  public static markAllAsRead(userId?: string, role?: string): void {
    const list = this.getAll();
    const updated = list.map((n) => {
      const isMatch = n.recipientRole === 'all' || (role && n.recipientRole === role) || (userId && n.recipientId === userId);
      return isMatch ? { ...n, isRead: true } : n;
    });
    this.saveAll(updated);
    window.dispatchEvent(new CustomEvent('gappy_notification_updated'));
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
        title: '⚠️ Laporan Insiden K3 Membutuhkan Validasi',
        message: 'Laporan Near-Miss di Area Loading Dock B membutuhkan verifikasi Supervisor.',
        type: 'incident',
        isRead: false,
        createdAt: new Date(Date.now() - 3600000).toISOString(),
      },
      {
        id: 'notif-default-2',
        recipientId: 'all',
        recipientRole: 'all',
        title: '🎉 Selamat Datang di Gappy Assessment Platform',
        message: 'Gunakan kuis harian & pre-shift checklist untuk mengumpulkan poin reward K3.',
        type: 'system',
        isRead: true,
        createdAt: new Date(Date.now() - 86400000).toISOString(),
      },
    ];
  }
}
