import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Bell,
  CheckCircle2,
  ShieldAlert,
  Zap,
  X,
  Check,
  CheckCheck,
  Trash2,
  Award,
  HelpCircle,
  Megaphone,
  Filter,
  Truck
} from 'lucide-react';
import { NotificationEngine, AppNotification } from '../domain/NotificationEngine';

interface NotificationBellProps {
  currentUserId?: string;
  currentEmployeeId?: string;
  currentRole?: string;
}

export const NotificationBell: React.FC<NotificationBellProps> = ({
  currentUserId,
  currentEmployeeId,
  currentRole,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [filterType, setFilterType] = useState<'all' | 'unread' | 'license' | 'incident' | 'system'>('all');
  const ref = useRef<HTMLDivElement>(null);

  const reloadNotifications = () => {
    const list = NotificationEngine.getNotificationsForUser(currentUserId, currentRole, currentEmployeeId);
    setNotifications(list);
    setUnreadCount(NotificationEngine.getUnreadCount(currentUserId, currentRole, currentEmployeeId));
  };

  useEffect(() => {
    reloadNotifications();
    NotificationEngine.syncFromRemote().then(() => reloadNotifications());

    const handleEvent = () => reloadNotifications();
    window.addEventListener('gappy_notification_received', handleEvent);
    window.addEventListener('gappy_notification_updated', handleEvent);
    window.addEventListener('storage', handleEvent);

    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        // Only close if not clicking within modal overlay
        const isOverlay = (e.target as HTMLElement)?.closest('.notification-modal-container');
        if (!isOverlay) {
          setIsOpen(false);
        }
      }
    };
    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      window.removeEventListener('gappy_notification_received', handleEvent);
      window.removeEventListener('gappy_notification_updated', handleEvent);
      window.removeEventListener('storage', handleEvent);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [currentUserId, currentRole, currentEmployeeId]);

  useEffect(() => {
    if (isOpen) {
      NotificationEngine.syncFromRemote().then(() => reloadNotifications());
    }
  }, [isOpen]);

  const filteredNotifications = useMemo(() => {
    return notifications.filter((n) => {
      if (filterType === 'unread') return !n.isRead;
      if (filterType === 'license') return n.type === 'license';
      if (filterType === 'incident') return n.type === 'incident';
      if (filterType === 'system') return n.type === 'system';
      return true;
    });
  }, [notifications, filterType]);

  const handleMarkAllRead = () => {
    NotificationEngine.markAllAsRead(currentUserId, currentRole, currentEmployeeId);
    reloadNotifications();
  };

  const handleMarkSingleRead = (id: string) => {
    NotificationEngine.markAsRead(id);
    reloadNotifications();
  };

  const handleDeleteNotification = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    NotificationEngine.deleteNotification(id);
    reloadNotifications();
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'incident':
        return <ShieldAlert className="w-4 h-4 text-orange-400 shrink-0" />;
      case 'license':
        return <Truck className="w-4 h-4 text-amber-400 shrink-0" />;
      case 'quiz':
        return <Zap className="w-4 h-4 text-emerald-400 shrink-0" />;
      case 'reward':
        return <Award className="w-4 h-4 text-amber-400 shrink-0" />;
      case 'audit':
        return <CheckCircle2 className="w-4 h-4 text-blue-400 shrink-0" />;
      default:
        return <Megaphone className="w-4 h-4 text-indigo-400 shrink-0" />;
    }
  };

  return (
    <div className="relative" ref={ref}>
      {/* Bell Icon Trigger */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-xl bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-300 transition flex items-center justify-center min-h-[38px] min-w-[38px]"
        title="Notifikasi Sistem"
        aria-label="Buka Notifikasi Sistem"
      >
        <Bell className="w-4 h-4 text-zinc-300" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 text-white font-black text-[9px] flex items-center justify-center border border-zinc-950 animate-bounce shadow-sm">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Backdrop for Mobile */}
      {isOpen && (
        <div
          onClick={() => setIsOpen(false)}
          className="fixed inset-0 bg-black/70 backdrop-blur-xs z-40 sm:hidden animate-fade-in"
        />
      )}

      {/* Responsive Dropdown / Mobile Modal Popover */}
      {isOpen && (
        <div
          className="notification-modal-container fixed inset-x-3 top-16 max-w-md mx-auto sm:max-w-none sm:absolute sm:inset-auto sm:right-0 sm:top-full sm:mt-2 sm:w-96 bg-zinc-950 border border-zinc-800 rounded-3xl shadow-2xl z-50 overflow-hidden animate-fade-in flex flex-col max-h-[80vh] sm:max-h-[500px]"
        >
          {/* Header */}
          <div className="p-3.5 border-b border-zinc-800 bg-zinc-900/80 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                <Bell className="w-3.5 h-3.5" />
              </div>
              <h4 className="text-xs font-black text-white">Notifikasi Sistem</h4>
              {unreadCount > 0 && (
                <span className="bg-rose-500/15 border border-rose-500/30 text-rose-400 text-[10px] font-black px-1.5 py-0.2 rounded-full">
                  {unreadCount} baru
                </span>
              )}
            </div>

            <div className="flex items-center gap-1.5">
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  className="px-2 py-1 rounded-lg text-[10px] bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-400 border border-emerald-500/20 font-bold transition flex items-center gap-1"
                  title="Tandai semua sudah dibaca"
                >
                  <CheckCheck className="w-3 h-3" />
                  <span className="hidden xs:inline">Dibaca Semua</span>
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition"
                title="Tutup Notifikasi"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Quick Filter Tabs */}
          <div className="flex items-center gap-1 px-3 py-2 bg-zinc-950 border-b border-zinc-800/80 overflow-x-auto custom-scrollbar shrink-0">
            <button
              onClick={() => setFilterType('all')}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-bold whitespace-nowrap transition ${
                filterType === 'all'
                  ? 'bg-zinc-800 text-white border border-zinc-700'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              Semua ({notifications.length})
            </button>
            <button
              onClick={() => setFilterType('unread')}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-bold whitespace-nowrap transition ${
                filterType === 'unread'
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              Belum Dibaca ({unreadCount})
            </button>
            <button
              onClick={() => setFilterType('license')}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-bold whitespace-nowrap transition ${
                filterType === 'license'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              Lisensi SIO
            </button>
            <button
              onClick={() => setFilterType('incident')}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-bold whitespace-nowrap transition ${
                filterType === 'incident'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              Insiden K3
            </button>
            <button
              onClick={() => setFilterType('system')}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-bold whitespace-nowrap transition ${
                filterType === 'system'
                  ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              Sistem
            </button>
          </div>

          {/* Notification List with Smooth Scroll */}
          <div className="overflow-y-auto divide-y divide-zinc-800/60 custom-scrollbar flex-1">
            {filteredNotifications.length === 0 ? (
              <div className="p-8 text-center text-xs text-zinc-500 space-y-1">
                <Bell className="w-6 h-6 text-zinc-700 mx-auto opacity-60" />
                <p>Tidak ada notifikasi pada kategori ini.</p>
              </div>
            ) : (
              filteredNotifications.map((n) => (
                <div
                  key={n.id}
                  onClick={() => {
                    handleMarkSingleRead(n.id);
                    if (n.type === 'incident') {
                      window.dispatchEvent(new CustomEvent('gappy_open_incident_tab'));
                    }
                  }}
                  className={`p-3 text-xs transition cursor-pointer hover:bg-zinc-900 flex items-start gap-2.5 group ${
                    !n.isRead ? 'bg-zinc-900/60 border-l-2 border-emerald-500' : 'opacity-70'
                  }`}
                >
                  <div className="mt-0.5">
                    {getNotificationIcon(n.type)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1 mb-0.5">
                      <h5 className="font-bold text-white text-[11px] truncate">{n.title}</h5>
                      <span className="text-[9px] text-zinc-500 shrink-0 font-mono">
                        {new Date(n.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-[11px] text-zinc-400 leading-snug line-clamp-2">{n.message}</p>
                  </div>

                  {/* Delete button */}
                  <button
                    onClick={(e) => handleDeleteNotification(e, n.id)}
                    className="opacity-0 group-hover:opacity-100 p-1 text-zinc-500 hover:text-rose-400 rounded-md hover:bg-zinc-800 transition shrink-0"
                    title="Hapus Notifikasi"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="p-2 border-t border-zinc-800 bg-zinc-950 flex items-center justify-between text-[10px] text-zinc-500 shrink-0 px-3">
              <span>{notifications.length} total notifikasi</span>
              <button
                onClick={() => NotificationEngine.clearAllNotifications()}
                className="text-zinc-500 hover:text-rose-400 transition"
              >
                Hapus Semua Riwayat
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
