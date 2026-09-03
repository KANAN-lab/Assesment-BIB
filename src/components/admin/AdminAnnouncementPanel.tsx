import React, { useState, useEffect } from 'react';
import { Megaphone, Plus, Calendar, ToggleRight, ToggleLeft, Trash2 } from 'lucide-react';
import { Announcement } from '../../types/assessment';
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
  const [newAnnExpiry, setNewAnnExpiry] = useState('');

  const loadAnnouncements = async () => {
    setAnnLoading(true);
    try {
      const data = await fetchAnnouncements(false);
      setAnnouncements(data);
    } catch (e) {
      console.warn('Gagal memuat pengumuman:', e);
    } finally {
      setAnnLoading(false);
    }
  };

  useEffect(() => {
    loadAnnouncements();
  }, []);

  const handleCreateAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAnnTitle.trim() || !newAnnContent.trim()) return;
    try {
      const ann = await createAnnouncement(
        newAnnTitle.trim(),
        newAnnContent.trim(),
        newAnnPriority,
        currentAdminId ?? 'SYS-ADMIN',
        newAnnExpiry ? new Date(newAnnExpiry).toISOString() : undefined
      );
      setAnnouncements((prev) => [ann, ...prev]);
      setNewAnnTitle('');
      setNewAnnContent('');
      setNewAnnExpiry('');
      showToast('Pengumuman berhasil dibuat.');
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

  return (
    <div className="card p-5 space-y-5">
      {/* Form Buat Pengumuman */}
      <div>
        <h3 className="text-xs font-black text-white flex items-center gap-2 mb-3">
          <Megaphone className="w-4 h-4 text-amber-400" /> Buat Pengumuman Baru
        </h3>
        <form onSubmit={handleCreateAnnouncement} className="space-y-3">
          <input
            type="text"
            value={newAnnTitle}
            onChange={(e) => setNewAnnTitle(e.target.value)}
            placeholder="Judul pengumuman..."
            className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-amber-500"
            required
          />
          <textarea
            value={newAnnContent}
            onChange={(e) => setNewAnnContent(e.target.value)}
            placeholder="Isi pesan pengumuman untuk seluruh tim lapangan..."
            rows={3}
            className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-amber-500 resize-none"
            required
          />
          <div className="flex gap-3 flex-wrap items-center">
            <select
              value={newAnnPriority}
              onChange={(e) => setNewAnnPriority(e.target.value as Announcement['priority'])}
              className="bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500"
            >
              <option value="info">Info</option>
              <option value="normal">Normal</option>
              <option value="urgent">Urgent</option>
            </select>
            <input
              type="datetime-local"
              value={newAnnExpiry}
              onChange={(e) => setNewAnnExpiry(e.target.value)}
              className="bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500"
              title="Tanggal kadaluarsa (opsional)"
            />
            <button
              type="submit"
              className="px-4 py-1.5 bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs rounded-xl transition flex items-center gap-1.5 shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Publikasikan</span>
            </button>
          </div>
        </form>
      </div>

      {/* Daftar Pengumuman */}
      <div className="space-y-2 border-t border-zinc-800 pt-4">
        <h4 className="text-xs font-bold text-zinc-300 mb-2">Daftar Pengumuman Aktif & Arsip</h4>
        {annLoading && <p className="text-xs text-zinc-500 text-center py-4">Memuat pengumuman...</p>}
        {!annLoading && announcements.length === 0 && (
          <p className="text-xs text-zinc-600 text-center py-6">Belum ada pengumuman.</p>
        )}
        {announcements.map((ann) => (
          <div
            key={ann.id}
            className={`flex items-start gap-3 p-3 rounded-xl border transition ${
              ann.isActive ? 'bg-zinc-900/70 border-zinc-800' : 'bg-zinc-900/30 border-zinc-800/50 opacity-60'
            }`}
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
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
                {!ann.isActive && <span className="text-[9px] text-zinc-600 bg-zinc-800 px-1.5 rounded">Nonaktif</span>}
              </div>
              <p className="text-[11px] text-zinc-400 line-clamp-2">{ann.content}</p>
              {ann.expiresAt && (
                <p className="text-[10px] text-zinc-600 mt-1 flex items-center gap-1">
                  <Calendar className="w-3 h-3" /> Kadaluarsa: {new Date(ann.expiresAt).toLocaleDateString('id-ID')}
                </p>
              )}
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => handleToggleAnn(ann.id, ann.isActive)}
                className="text-zinc-500 hover:text-amber-400 transition"
                title={ann.isActive ? 'Nonaktifkan' : 'Aktifkan'}
              >
                {ann.isActive ? <ToggleRight className="w-5 h-5 text-emerald-400" /> : <ToggleLeft className="w-5 h-5" />}
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
        ))}
      </div>
    </div>
  );
};
