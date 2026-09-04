import React, { useState, useEffect } from 'react';
import {
  Megaphone,
  Plus,
  Calendar,
  ToggleRight,
  ToggleLeft,
  Trash2,
  RefreshCw,
  Eye,
  Clock,
  Infinity as InfinityIcon,
  Zap,
  CheckCircle2
} from 'lucide-react';
import { Announcement } from '../../types/assessment';
import { AnnouncementBanner } from '../AnnouncementBanner';
import {
  fetchAnnouncements,
  createAnnouncement,
  toggleAnnouncement,
  deleteAnnouncement
} from '../../lib/supabaseService';

interface AdminAnnouncementPanelProps {
  currentAdminId?: string;
  showToast: (msg: string) => void;
}

export const AdminAnnouncementPanel: React.FC<AdminAnnouncementPanelProps> = ({
  currentAdminId,
  showToast,
}) => {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [annLoading, setAnnLoading] = useState(false);

  // Form states
  const [newAnnTitle, setNewAnnTitle] = useState('');
  const [newAnnContent, setNewAnnContent] = useState('');
  const [newAnnPriority, setNewAnnPriority] = useState<Announcement['priority']>('info');

  // Friendly Start & End Scheduling states
  const [startMode, setStartMode] = useState<'immediate' | 'scheduled'>('immediate');
  const [newAnnStartsAt, setNewAnnStartsAt] = useState('');

  const [endMode, setEndMode] = useState<'forever' | 'scheduled'>('forever');
  const [newAnnExpiry, setNewAnnExpiry] = useState('');

  const loadAnnouncements = async (showSpinner = false) => {
    if (showSpinner) setAnnLoading(true);
    try {
      const data = await fetchAnnouncements(false);
      setAnnouncements(data);
    } catch (e) {
      console.warn('Gagal memuat pengumuman:', e);
    } finally {
      if (showSpinner) setAnnLoading(false);
    }
  };

  useEffect(() => {
    loadAnnouncements(true);
    const handleUpdate = () => loadAnnouncements(false);
    window.addEventListener('gappy_announcement_updated', handleUpdate);
    return () => window.removeEventListener('gappy_announcement_updated', handleUpdate);
  }, []);

  const handleCreateAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAnnTitle.trim() || !newAnnContent.trim()) return;

    const now = new Date();
    const finalStartsAt =
      startMode === 'scheduled' && newAnnStartsAt
        ? new Date(newAnnStartsAt).toISOString()
        : now.toISOString();

    const finalExpiresAt =
      endMode === 'scheduled' && newAnnExpiry
        ? new Date(newAnnExpiry).toISOString()
        : undefined;

    if (startMode === 'scheduled' && newAnnStartsAt && new Date(newAnnStartsAt) < new Date(now.getTime() - 60000)) {
      showToast('Waktu jadwal mulai tayang tidak boleh di masa lalu.');
      return;
    }

    if (finalExpiresAt && new Date(finalExpiresAt) <= new Date(finalStartsAt)) {
      showToast('Waktu batas berakhir harus lebih lama daripada waktu mulai tayang.');
      return;
    }

    try {
      const ann = await createAnnouncement(
        newAnnTitle.trim(),
        newAnnContent.trim(),
        newAnnPriority,
        currentAdminId ?? 'SYS-ADMIN',
        finalStartsAt,
        finalExpiresAt
      );
      setAnnouncements((prev) => [ann, ...prev.filter((a) => a.id !== ann.id)]);
      setNewAnnTitle('');
      setNewAnnContent('');
      setNewAnnStartsAt('');
      setNewAnnExpiry('');
      setStartMode('immediate');
      setEndMode('forever');
      showToast(startMode === 'scheduled' ? 'Pengumuman berhasil dijadwalkan.' : 'Pengumuman berhasil disiarkan.');
    } catch (err: any) {
      showToast(err.message || 'Gagal membuat pengumuman.');
    }
  };

  const handleToggleAnn = async (id: string, current: boolean) => {
    try {
      await toggleAnnouncement(id, !current);
      setAnnouncements((prev) => prev.map((a) => (a.id === id ? { ...a, isActive: !current } : a)));
      showToast(`Pengumuman ${!current ? 'diaktifkan' : 'dinonaktifkan'}.`);
    } catch (err: any) {
      showToast(err.message || 'Gagal mengubah status.');
    }
  };

  const handleDeleteAnn = async (id: string) => {
    try {
      await deleteAnnouncement(id);
      setAnnouncements((prev) => prev.filter((a) => a.id !== id));
      showToast('Pengumuman dihapus.');
    } catch (err: any) {
      showToast(err.message || 'Gagal menghapus pengumuman.');
    }
  };

  const now = new Date();
  const activeAnnouncements = announcements.filter(
    (a) =>
      a.isActive &&
      (!a.startsAt || new Date(a.startsAt) <= now) &&
      (!a.expiresAt || new Date(a.expiresAt) > now)
  );

  const getStatusBadge = (ann: Announcement) => {
    if (!ann.isActive) {
      return {
        label: 'Nonaktif',
        className: 'bg-zinc-800 text-zinc-400 border border-zinc-700',
      };
    }
    if (ann.startsAt && new Date(ann.startsAt) > now) {
      return {
        label: 'Terjadwal',
        className: 'bg-blue-500/20 text-blue-300 border border-blue-500/30',
      };
    }
    if (ann.expiresAt && new Date(ann.expiresAt) <= now) {
      return {
        label: 'Kedaluwarsa',
        className: 'bg-rose-500/20 text-rose-300 border border-rose-500/30',
      };
    }
    return {
      label: 'Sedang Tayang',
      className: 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30',
    };
  };

  return (
    <div className="card p-5 space-y-6">
      {/* Live Preview Banner Section */}
      <div className="bg-zinc-950/80 border border-zinc-800/80 rounded-2xl p-4 space-y-3 shadow-inner">
        <div className="flex items-center justify-between text-xs font-bold">
          <span className="flex items-center gap-1.5 text-amber-400">
            <Eye className="w-4 h-4" /> Pratinjau Siaran Langsung (Tampilan Real di Layar Tim)
          </span>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 font-bold">
              {activeAnnouncements.length} Sedang Tayang
            </span>
            <button
              type="button"
              onClick={() => loadAnnouncements(true)}
              className="p-1 text-zinc-500 hover:text-white transition"
              title="Segarkan Data"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${annLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {activeAnnouncements.length > 0 ? (
          <div className="pt-1">
            <AnnouncementBanner announcements={activeAnnouncements} />
          </div>
        ) : (
          <div className="py-4 text-center text-xs text-zinc-500 border border-dashed border-zinc-800 rounded-xl">
            Saat ini tidak ada banner pengumuman yang aktif sedang tayang di dashboard tim.
          </div>
        )}
      </div>

      {/* Form Buat Pengumuman */}
      <div className="space-y-3">
        <h3 className="text-xs font-black text-white flex items-center gap-2">
          <Megaphone className="w-4 h-4 text-amber-400" /> Buat & Jadwalkan Pengumuman Baru
        </h3>

        <form onSubmit={handleCreateAnnouncement} className="space-y-3.5">
          <input
            type="text"
            value={newAnnTitle}
            onChange={(e) => setNewAnnTitle(e.target.value)}
            placeholder="Judul pengumuman singkat (cth: Safety Briefing Pukul 14.00)..."
            className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-amber-500"
            required
          />

          <textarea
            value={newAnnContent}
            onChange={(e) => setNewAnnContent(e.target.value)}
            placeholder="Isi pesan detail pengumuman untuk seluruh personil gudang..."
            rows={3}
            className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-amber-500 resize-none"
            required
          />

          {/* Setting Grid: Prioritas, Waktu Mulai, Waktu Selesai */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-3.5 bg-zinc-950/60 border border-zinc-850 rounded-2xl">
            {/* 1. Prioritas Pesan */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">
                Tingkat Prioritas
              </label>
              <select
                value={newAnnPriority}
                onChange={(e) => setNewAnnPriority(e.target.value as Announcement['priority'])}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500 font-medium"
              >
                <option value="info">🔵 Informasi (Biru Standar)</option>
                <option value="normal">🟡 Normal (Amber Perhatian)</option>
                <option value="urgent">🔴 Urgent (Merah Peringatan Kritis)</option>
              </select>
            </div>

            {/* 2. Waktu Mulai Tayang (Start Window) */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block flex items-center gap-1">
                <Clock className="w-3 h-3 text-emerald-400" /> Waktu Mulai Tayang
              </label>
              <div className="grid grid-cols-2 gap-1.5 p-1 bg-zinc-900 border border-zinc-800 rounded-xl">
                <button
                  type="button"
                  onClick={() => setStartMode('immediate')}
                  className={`py-1 text-[11px] font-bold rounded-lg transition flex items-center justify-center gap-1 ${
                    startMode === 'immediate'
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  <Zap className="w-3 h-3" /> Langsung
                </button>
                <button
                  type="button"
                  onClick={() => setStartMode('scheduled')}
                  className={`py-1 text-[11px] font-bold rounded-lg transition flex items-center justify-center gap-1 ${
                    startMode === 'scheduled'
                      ? 'bg-amber-600 text-white shadow-sm'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  <Calendar className="w-3 h-3" /> Jadwalkan
                </button>
              </div>

              {startMode === 'scheduled' && (
                <input
                  type="datetime-local"
                  value={newAnnStartsAt}
                  onChange={(e) => setNewAnnStartsAt(e.target.value)}
                  className="w-full bg-zinc-900 border border-amber-500/50 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none animate-fade-in"
                  min={new Date().toISOString().slice(0, 16)}
                  required
                />
              )}
            </div>

            {/* 3. Waktu Selesai Tayang (End Window) */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block flex items-center gap-1">
                <Calendar className="w-3 h-3 text-amber-400" /> Waktu Selesai Tayang
              </label>
              <div className="grid grid-cols-2 gap-1.5 p-1 bg-zinc-900 border border-zinc-800 rounded-xl">
                <button
                  type="button"
                  onClick={() => setEndMode('forever')}
                  className={`py-1 text-[11px] font-bold rounded-lg transition flex items-center justify-center gap-1 ${
                    endMode === 'forever'
                      ? 'bg-purple-600 text-white shadow-sm'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  <InfinityIcon className="w-3 h-3" /> Seterusnya
                </button>
                <button
                  type="button"
                  onClick={() => setEndMode('scheduled')}
                  className={`py-1 text-[11px] font-bold rounded-lg transition flex items-center justify-center gap-1 ${
                    endMode === 'scheduled'
                      ? 'bg-amber-600 text-white shadow-sm'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  <Clock className="w-3 h-3" /> Beri Batas
                </button>
              </div>

              {endMode === 'scheduled' && (
                <input
                  type="datetime-local"
                  value={newAnnExpiry}
                  onChange={(e) => setNewAnnExpiry(e.target.value)}
                  className="w-full bg-zinc-900 border border-amber-500/50 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none animate-fade-in"
                  min={newAnnStartsAt || new Date().toISOString().slice(0, 16)}
                  required
                />
              )}
            </div>
          </div>

          <div className="flex items-center justify-between pt-1">
            <div className="text-[11px] text-zinc-500 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>
                {startMode === 'immediate' ? 'Akan langsung aktif detik ini' : 'Akan mulai tayang sesuai jadwal'} •{' '}
                {endMode === 'forever' ? 'tanpa batas waktu' : 'berhenti tayang otomatis'}
              </span>
            </div>
            <button
              type="submit"
              className="px-5 py-2 bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs rounded-xl transition flex items-center gap-2 shadow-lg shadow-amber-950/40 hover:scale-[1.02] active:scale-[0.98]"
            >
              <Plus className="w-4 h-4" />
              <span>Publikasikan Siaran</span>
            </button>
          </div>
        </form>
      </div>

      {/* Daftar Pengumuman */}
      <div className="space-y-3 border-t border-zinc-800 pt-5">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-bold text-zinc-300">Daftar Arsip & Jadwal Pengumuman</h4>
          <span className="text-[10px] text-zinc-500 font-mono">Total: {announcements.length}</span>
        </div>

        {annLoading && <p className="text-xs text-zinc-500 text-center py-4">Memuat pengumuman...</p>}
        {!annLoading && announcements.length === 0 && (
          <p className="text-xs text-zinc-600 text-center py-6">Belum ada pengumuman yang tersimpan.</p>
        )}

        <div className="space-y-2.5">
          {announcements.map((ann) => {
            const status = getStatusBadge(ann);
            return (
              <div
                key={ann.id}
                className={`flex items-start gap-3 p-3.5 rounded-2xl border transition ${
                  status.label === 'Sedang Tayang'
                    ? 'bg-zinc-900/80 border-zinc-800 hover:border-zinc-700'
                    : 'bg-zinc-950/40 border-zinc-850/60 opacity-75'
                }`}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-md ${status.className}`}>
                      {status.label}
                    </span>
                    <span
                      className={`text-[9px] font-black px-1.5 py-0.5 rounded uppercase ${
                        ann.priority === 'urgent'
                          ? 'bg-rose-500/20 text-rose-300'
                          : ann.priority === 'info'
                          ? 'bg-sky-500/20 text-sky-300'
                          : 'bg-amber-500/20 text-amber-300'
                      }`}
                    >
                      {ann.priority}
                    </span>
                    <span className="text-xs font-bold text-white truncate">{ann.title}</span>
                  </div>

                  <p className="text-[11px] text-zinc-300 leading-relaxed line-clamp-2">{ann.content}</p>

                  <div className="flex items-center gap-3 mt-2 text-[10px] text-zinc-500 flex-wrap font-mono">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-zinc-600" />
                      Mulai:{' '}
                      <strong className="text-zinc-400 font-sans">
                        {ann.startsAt
                          ? new Date(ann.startsAt).toLocaleString('id-ID', {
                              dateStyle: 'short',
                              timeStyle: 'short',
                            })
                          : 'Langsung'}
                      </strong>
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-zinc-600" />
                      Berakhir:{' '}
                      <strong className="text-zinc-400 font-sans">
                        {ann.expiresAt
                          ? new Date(ann.expiresAt).toLocaleString('id-ID', {
                              dateStyle: 'short',
                              timeStyle: 'short',
                            })
                          : 'Seterusnya (Tanpa Batas)'}
                      </strong>
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 pt-0.5">
                  <button
                    type="button"
                    onClick={() => handleToggleAnn(ann.id, ann.isActive)}
                    className="text-zinc-500 hover:text-amber-400 transition"
                    title={ann.isActive ? 'Nonaktifkan' : 'Aktifkan'}
                  >
                    {ann.isActive ? (
                      <ToggleRight className="w-5 h-5 text-emerald-400" />
                    ) : (
                      <ToggleLeft className="w-5 h-5 text-zinc-600" />
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteAnn(ann.id)}
                    className="text-zinc-600 hover:text-rose-400 transition"
                    title="Hapus Pengumuman"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
