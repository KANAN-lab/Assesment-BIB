import React, { useState, useEffect, useRef } from 'react';
import { Bell, CheckCircle2, ShieldAlert, Zap, X, Check } from 'lucide-react';
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
  const ref = useRef<HTMLDivElement>(null);

  const reloadNotifications = () => {
    const list = NotificationEngine.getNotificationsForUser(currentUserId, currentRole, currentEmployeeId);
    setNotifications(list);
    setUnreadCount(NotificationEngine.getUnreadCount(currentUserId, currentRole, currentEmployeeId));
  };

  useEffect(() => {
    reloadNotifications();

    const handleEvent = () => reloadNotifications();
    window.addEventListener('gappy_notification_received', handleEvent);
    window.addEventListener('gappy_notification_updated', handleEvent);

    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      window.removeEventListener('gappy_notification_received', handleEvent);
      window.removeEventListener('gappy_notification_updated', handleEvent);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [currentUserId, currentEmployeeId, currentRole]);

  const handleMarkAllRead = () => {
    NotificationEngine.markAllAsRead(currentUserId, currentRole, currentEmployeeId);
    reloadNotifications();
  };

  const handleMarkSingleRead = (id: string) => {
    NotificationEngine.markAsRead(id);
    reloadNotifications();
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-xl bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-300 transition flex items-center justify-center"
        title="Notifikasi Sistem"
      >
        <Bell className="w-4 h-4 text-zinc-300" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 text-white font-black text-[9px] flex items-center justify-center border border-zinc-950 animate-bounce">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl z-50 overflow-hidden animate-fade-in">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800 bg-zinc-950">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-emerald-400" />
              <h4 className="text-xs font-bold text-white">Notifikasi Sistem</h4>
              {unreadCount > 0 && (
                <span className="bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[10px] font-bold px-1.5 py-0.2 rounded-full">
                  {unreadCount} baru
                </span>
              )}
            </div>

            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="text-[10px] text-emerald-400 hover:text-emerald-300 font-bold transition flex items-center gap-1"
              >
                <Check className="w-3 h-3" /> Tandai semua dibaca
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-80 overflow-y-auto divide-y divide-zinc-800/60 custom-scrollbar">
            {notifications.length === 0 ? (
              <div className="p-6 text-center text-xs text-zinc-500">
                Belum ada notifikasi baru.
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  onClick={() => {
                    handleMarkSingleRead(n.id);
                    if (n.type === 'incident') {
                      window.dispatchEvent(new CustomEvent('gappy_open_incident_tab'));
                    }
                    setIsOpen(false);
                  }}
                  className={`p-3 text-xs transition cursor-pointer hover:bg-zinc-850 flex items-start gap-3 ${
                    !n.isRead ? 'bg-zinc-800/40 border-l-2 border-emerald-500' : 'opacity-70'
                  }`}
                >
                  <div className="shrink-0 mt-0.5">
                    {n.type === 'incident' ? (
                      <ShieldAlert className="w-4 h-4 text-orange-400" />
                    ) : n.type === 'quiz' ? (
                      <Zap className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4 text-indigo-400" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <h5 className="font-bold text-white text-[11px] truncate">{n.title}</h5>
                      <span className="text-[9px] text-zinc-500 shrink-0 font-mono">
                        {new Date(n.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-[11px] text-zinc-400 leading-snug line-clamp-2">{n.message}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
