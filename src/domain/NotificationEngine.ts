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
 * Handles dispatching, querying, unread counting, broadcast, and persistence of notifications
 * for Workers, Supervisors, and System Administrators.
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
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(list.slice(0, 150)));
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
    window.dispatchEvent(new CustomEvent('gappy_notification_updated'));

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
   * Get filtered notifications for a specific user or role
   */
  public static getNotificationsForUser(userId?: string, role?: string, employeeId?: string): AppNotification[] {
    const all = this.getAll();
    return all.filter((n) => {
      // 1. Notifikasi Publik / Sistem
      if (n.recipientRole === 'all' || n.recipientId === 'all') return true;

      // 2. Jika user adalah Pengawas (Supervisor) atau System Admin
      if (role === 'supervisor' || role === 'admin') {
        if (n.recipientRole === 'supervisor' || n.recipientRole === 'admin') return true;
        if (userId && n.recipientId === userId) return true;
        return false;
      }

      // 3. Jika user adalah Operational Employee (Worker)
      if (role === 'worker' || !role) {
        if (n.recipientRole === 'supervisor' || n.recipientRole === 'admin') return false;
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
    window.dispatchEvent(new CustomEvent('gappy_notification_updated'));
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
    window.dispatchEvent(new CustomEvent('gappy_notification_updated'));
  }

  /**
   * Delete a specific notification by ID
   */
  public static deleteNotification(id: string): void {
    const list = this.getAll();
    const updated = list.filter((n) => n.id !== id);
    this.saveAll(updated);
    window.dispatchEvent(new CustomEvent('gappy_notification_updated'));
  }

  /**
   * Clear all notifications for user or globally
   */
  public static clearAllNotifications(): void {
    this.saveAll([]);
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
