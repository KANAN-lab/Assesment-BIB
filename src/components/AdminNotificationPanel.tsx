import React, { useState, useEffect, useMemo } from 'react';
import {
  Bell,
  Send,
  Trash2,
  RefreshCw,
  ShieldAlert,
  Zap,
  Award,
  CheckCircle2,
  Megaphone,
  Users,
  UserCheck,
  Search,
  Filter,
  Check,
  AlertTriangle,
  Sparkles
} from 'lucide-react';
import { NotificationEngine, AppNotification } from '../domain/NotificationEngine';
import { PaginationControls } from './PaginationControls';

export const AdminNotificationPanel: React.FC = () => {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [recipientRole, setRecipientRole] = useState<'all' | 'worker' | 'supervisor'>('all');
  const [notifType, setNotifType] = useState<'system' | 'incident' | 'quiz' | 'reward' | 'audit'>('system');
  const [sending, setSending] = useState(false);
  const [sentSuccess, setSentSuccess] = useState(false);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRole, setFilterRole] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 8;

  const reloadData = () => {
    setNotifications(NotificationEngine.getAll());
  };

  useEffect(() => {
    reloadData();
    const handleUpdate = () => reloadData();
    window.addEventListener('gappy_notification_updated', handleUpdate);
    return () => window.removeEventListener('gappy_notification_updated', handleUpdate);
  }, []);

  const handleBroadcast = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !message.trim()) return;

    setSending(true);
    NotificationEngine.broadcast(
      title.trim(),
      message.trim(),
      recipientRole,
      notifType
    );

    setSending(false);
    setSentSuccess(true);
    setTitle('');
    setMessage('');
    reloadData();

    setTimeout(() => {
      setSentSuccess(false);
    }, 3000);
  };

  const handleDelete = (id: string) => {
    NotificationEngine.deleteNotification(id);
    reloadData();
  };

  const handleClearAll = () => {
    if (window.confirm('Apakah Anda yakin ingin menghapus seluruh riwayat notifikasi sistem?')) {
      NotificationEngine.clearAllNotifications();
      reloadData();
    }
  };

  const filteredNotifications = useMemo(() => {
    return notifications.filter((n) => {
      const matchSearch =
        n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        n.message.toLowerCase().includes(searchQuery.toLowerCase());
      const matchRole = filterRole === 'all' || n.recipientRole === filterRole;
      return matchSearch && matchRole;
    });
  }, [notifications, searchQuery, filterRole]);

  const paginatedNotifications = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredNotifications.slice(start, start + pageSize);
  }, [filteredNotifications, currentPage]);

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'incident':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-orange-500/15 text-orange-400 border border-orange-500/30 flex items-center gap-1"><ShieldAlert className="w-3 h-3" /> Insiden K3</span>;
      case 'quiz':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-1"><Zap className="w-3 h-3" /> Kuis K3</span>;
      case 'reward':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30 flex items-center gap-1"><Award className="w-3 h-3" /> Reward</span>;
      case 'audit':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/15 text-blue-400 border border-blue-500/30 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Audit</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-500/15 text-indigo-400 border border-indigo-500/30 flex items-center gap-1"><Megaphone className="w-3 h-3" /> Sistem</span>;
    }
  };

  const getRecipientLabel = (role: string) => {
    switch (role) {
      case 'worker': return <span className="text-emerald-400 font-semibold">Operational Only</span>;
      case 'supervisor': return <span className="text-indigo-400 font-semibold">Supervisor Only</span>;
      case 'admin': return <span className="text-purple-400 font-semibold">Admin Only</span>;
      default: return <span className="text-zinc-300 font-semibold">Semua User (Global)</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner Header */}
      <div className="card p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <Bell className="w-4 h-4" />
            </div>
            <h2 className="text-base font-black text-white flex items-center gap-2">
              Pusat Manajemen & Siaran Notifikasi
              <span className="text-[10px] font-bold px-2 py-0.5 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-md">
                Admin Control
              </span>
            </h2>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            Kirim siaran notifikasi push ke seluruh pekerja logistik, pantau log pengiriman, dan kelola antrean pesan.
          </p>
        </div>

        <button
          onClick={reloadData}
          className="p-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl border border-zinc-700 transition flex items-center gap-1.5 text-xs font-bold self-start md:self-auto"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh Data</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* ─── FORM KIRIM SIARAN NOTIFIKASI (LEFT: 5 COLS) ─── */}
        <div className="lg:col-span-5 card p-5 space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-zinc-800">
            <Send className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-bold text-white">Kirim Siaran Notifikasi Instan</h3>
          </div>

          <form onSubmit={handleBroadcast} className="space-y-4">
            {/* Target Recipient */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-zinc-400">Target Audiens Penerima:</label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setRecipientRole('all')}
                  className={`p-2.5 rounded-xl border text-xs font-bold transition flex flex-col items-center gap-1 ${
                    recipientRole === 'all'
                      ? 'bg-amber-500/15 border-amber-500/40 text-amber-300'
                      : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>Semua</span>
                </button>
                <button
                  type="button"
                  onClick={() => setRecipientRole('worker')}
                  className={`p-2.5 rounded-xl border text-xs font-bold transition flex flex-col items-center gap-1 ${
                    recipientRole === 'worker'
                      ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                      : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>Operational</span>
                </button>
                <button
                  type="button"
                  onClick={() => setRecipientRole('supervisor')}
                  className={`p-2.5 rounded-xl border text-xs font-bold transition flex flex-col items-center gap-1 ${
                    recipientRole === 'supervisor'
                      ? 'bg-indigo-500/15 border-indigo-500/40 text-indigo-300'
                      : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  <UserCheck className="w-3.5 h-3.5" />
                  <span>Supervisor</span>
                </button>
              </div>
            </div>

            {/* Type Selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-zinc-400">Kategori Pesan:</label>
              <select
                value={notifType}
                onChange={(e) => setNotifType(e.target.value as any)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-2.5 text-xs text-zinc-200 focus:outline-none focus:border-amber-500 font-medium"
                required
              >
                <option value="" disabled>-- Pilih Kategori Notifikasi --</option>
                <option value="system">📢 Pengumuman Sistem / Operasional</option>
                <option value="incident">⚠️ Safety Alert / K3 Darurat</option>
                <option value="quiz">⚡ Kuis K3 / Checkpoint</option>
                <option value="reward">🏆 Reward & Prestasi</option>
                <option value="audit">📋 Audit & Kepatuhan</option>
              </select>
            </div>

            {/* Title Input */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-zinc-400">Judul Notifikasi:</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Contoh: ⚠️ Pengingat Toolbox Talk Shift 1"
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-2.5 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-amber-500 font-bold"
                required
              />
            </div>

            {/* Message Input */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-zinc-400">Isi Pesan Siaran:</label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Tuliskan instruksi atau pengumuman penting bagi staf..."
                rows={4}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-amber-500 leading-relaxed"
                required
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={sending || !title.trim() || !message.trim()}
              className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-black font-black text-xs rounded-xl transition flex items-center justify-center gap-2 disabled:opacity-50 shadow-md"
            >
              {sending ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : sentSuccess ? (
                <>
                  <Check className="w-4 h-4 text-emerald-950" />
                  <span>Notifikasi Berhasil Disiarkan!</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Siarkan Notifikasi Sekarang</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* ─── TABEL LOG & RIWAYAT NOTIFIKASI (RIGHT: 7 COLS) ─── */}
        <div className="lg:col-span-7 card p-5 space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-zinc-800">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Megaphone className="w-4 h-4 text-indigo-400" />
                  Riwayat & Log Notifikasi ({notifications.length})
                </h3>
                <p className="text-[11px] text-zinc-400 mt-0.5">
                  Daftar seluruh notifikasi aktif yang tersimpan dalam sistem
                </p>
              </div>

              {notifications.length > 0 && (
                <button
                  onClick={handleClearAll}
                  className="px-2.5 py-1.5 bg-rose-950/30 hover:bg-rose-900/50 border border-rose-500/30 text-rose-400 rounded-xl text-xs font-bold transition flex items-center gap-1.5 self-start sm:self-auto"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Hapus Semua</span>
                </button>
              )}
            </div>

            {/* Search & Filter Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-2">
              <div className="relative w-full sm:w-60">
                <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Cari judul/pesan..."
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex items-center gap-1.5 w-full sm:w-auto">
                <Filter className="w-3.5 h-3.5 text-zinc-500" />
                <select
                  value={filterRole}
                  onChange={(e) => { setFilterRole(e.target.value); setCurrentPage(1); }}
                  className="bg-zinc-950 border border-zinc-800 text-xs text-zinc-300 rounded-xl px-2.5 py-1.5 focus:outline-none cursor-pointer"
                >
                  <option value="all">Semua Target</option>
                  <option value="worker">Operational Only</option>
                  <option value="supervisor">Supervisor Only</option>
                </select>
              </div>
            </div>

            {/* Notification List */}
            <div className="space-y-2 max-h-[380px] overflow-y-auto custom-scrollbar">
              {filteredNotifications.length === 0 ? (
                <div className="py-12 text-center text-xs text-zinc-500 space-y-1">
                  <Bell className="w-6 h-6 text-zinc-700 mx-auto opacity-60" />
                  <p>Tidak ada data notifikasi yang sesuai filter.</p>
                </div>
              ) : (
                paginatedNotifications.map((n) => (
                  <div
                    key={n.id}
                    className="p-3 bg-zinc-900/60 border border-zinc-800/80 rounded-2xl flex items-start justify-between gap-3 hover:border-zinc-700 transition"
                  >
                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        {getTypeBadge(n.type)}
                        <span className="text-[10px] text-zinc-500">
                          Target: {getRecipientLabel(n.recipientRole)}
                        </span>
                        <span className="text-[10px] text-zinc-600 font-mono ml-auto">
                          {new Date(n.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>

                      <h4 className="font-bold text-xs text-white truncate">{n.title}</h4>
                      <p className="text-[11px] text-zinc-400 line-clamp-2 leading-relaxed">{n.message}</p>
                    </div>

                    <button
                      onClick={() => handleDelete(n.id)}
                      className="p-1.5 text-zinc-500 hover:text-rose-400 rounded-lg hover:bg-zinc-800 transition shrink-0"
                      title="Hapus Notifikasi"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Pagination */}
          <PaginationControls
            currentPage={currentPage}
            totalItems={filteredNotifications.length}
            pageSize={pageSize}
            onPageChange={(p) => setCurrentPage(p)}
          />
        </div>
      </div>
    </div>
  );
};
