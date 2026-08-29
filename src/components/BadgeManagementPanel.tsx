import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Award, Plus, Edit2, Trash2, Loader2, CheckCircle2, X, ShieldCheck } from 'lucide-react';
import type { Badge } from '../types/assessment';
import {
  fetchAllBadges,
  createBadge,
  updateBadge,
  deleteBadge,
} from '../lib/supabaseService';

const CONDITION_OPTIONS = [
  { value: 'streak_days',       label: 'Streak Harian (hari berturut-turut)' },
  { value: 'total_points',      label: 'Total Poin Reward' },
  { value: 'bib_score',         label: 'Skor BIB Total' },
  { value: 'quiz_count',        label: 'Jumlah Kuis Diselesaikan' },
  { value: 'checklist_streak',  label: 'Streak Pre-Shift Checklist' },
];

const ICON_OPTIONS = ['🏆','⭐','🔥','🛡️','⚡','💎','🎯','🥇','🌟','🦁','🚀','💪','🎖️','🏅','✨'];
const COLOR_OPTIONS = [
  { value: '#fbbf24', label: 'Emas' },
  { value: '#818cf8', label: 'Ungu' },
  { value: '#34d399', label: 'Hijau' },
  { value: '#f87171', label: 'Merah' },
  { value: '#60a5fa', label: 'Biru' },
  { value: '#fb923c', label: 'Oranye' },
  { value: '#a1a1aa', label: 'Abu-abu' },
];

interface BadgeFormData {
  name: string;
  description: string;
  icon: string;
  color: string;
  condition: string;
  threshold: number;
}

const emptyForm = (): BadgeFormData => ({
  name: '',
  description: '',
  icon: '🏆',
  color: '#fbbf24',
  condition: 'streak_days',
  threshold: 7,
});

export const BadgeManagementPanel: React.FC = () => {
  const [badges, setBadges] = useState<Badge[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<BadgeFormData>(emptyForm());
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const loadBadges = () => {
    setLoading(true);
    fetchAllBadges()
      .then(setBadges)
      .catch(() => showToast('Gagal memuat data badge.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadBadges(); }, []);

  const handleOpenCreate = () => {
    setForm(emptyForm());
    setEditingId(null);
    setShowForm(true);
  };

  const handleOpenEdit = (badge: Badge) => {
    setForm({
      name: badge.name,
      description: badge.description,
      icon: badge.icon,
      color: badge.color,
      condition: badge.condition,
      threshold: badge.threshold,
    });
    setEditingId(badge.id);
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.condition) return;
    setSubmitting(true);
    try {
      if (editingId) {
        await updateBadge(editingId, form);
        showToast(`Badge "${form.name}" berhasil diperbarui.`);
      } else {
        await createBadge(form);
        showToast(`Badge "${form.name}" berhasil dibuat.`);
      }
      setShowForm(false);
      loadBadges();
    } catch (err: any) {
      showToast(err?.message || 'Gagal menyimpan badge.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (badge: Badge) => {
    if (!window.confirm(`Hapus badge "${badge.name}"? Ini akan menghapus badge dari semua worker.`)) return;
    setDeletingId(badge.id);
    try {
      await deleteBadge(badge.id);
      showToast(`Badge "${badge.name}" dihapus.`);
      loadBadges();
    } catch (err: any) {
      showToast(err?.message || 'Gagal menghapus badge.');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Toast */}
      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-zinc-950 border border-emerald-500/30 text-emerald-300 text-xs px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" /> {toast}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Award className="w-4 h-4 text-amber-400" /> Manajemen Badge
          </h3>
          <p className="text-[11px] text-zinc-500 mt-0.5">{badges.length} badge terdaftar</p>
        </div>
        <button
          onClick={handleOpenCreate}
          className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-3 py-2 rounded-xl transition"
        >
          <Plus className="w-3.5 h-3.5" /> Tambah Badge
        </button>
      </div>

      {/* Badge list */}
      {loading ? (
        <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 text-zinc-500 animate-spin" /></div>
      ) : badges.length === 0 ? (
        <div className="text-center py-10 text-zinc-500 text-sm">
          <Award className="w-8 h-8 mx-auto mb-2 text-zinc-700" />
          Belum ada badge. Tambahkan badge pertama.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {badges.map((badge) => {
            const condLabel = CONDITION_OPTIONS.find(c => c.value === badge.condition)?.label ?? badge.condition;
            return (
              <div key={badge.id} className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 flex flex-col gap-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0"
                      style={{ background: badge.color + '18', border: `1px solid ${badge.color}40` }}
                    >
                      {badge.icon}
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-bold text-white truncate">{badge.name}</div>
                      <div className="text-[10px] text-zinc-500 truncate">{badge.description}</div>
                    </div>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <button
                      onClick={() => handleOpenEdit(badge)}
                      className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-500 hover:text-white transition"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(badge)}
                      disabled={deletingId === badge.id}
                      className="p-1.5 rounded-lg hover:bg-rose-950/60 text-zinc-500 hover:text-rose-400 transition disabled:opacity-50"
                    >
                      {deletingId === badge.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
                <div className="border-t border-zinc-800/60 pt-2 space-y-1">
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="text-zinc-500">Kondisi</span>
                    <span className="text-zinc-300 font-mono text-right max-w-[160px] truncate">{condLabel}</span>
                  </div>
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="text-zinc-500">Threshold</span>
                    <span className="text-white font-black font-mono">{badge.threshold}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Form Modal */}
      {showForm && createPortal(
        <div
          className="fixed inset-0 z-[9999] overflow-y-auto bg-black/90 backdrop-blur-xl p-4 sm:p-6 flex items-center justify-center min-h-screen animate-fade-in"
          onClick={() => setShowForm(false)}
        >
          <div
            className="relative w-full max-w-lg max-h-[82vh] sm:max-h-[85vh] m-auto bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
              <h3 className="text-sm font-bold text-white">{editingId ? 'Edit Badge' : 'Tambah Badge Baru'}</h3>
              <button onClick={() => setShowForm(false)} className="text-zinc-500 hover:text-white p-1">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              {/* Preview */}
              <div className="flex items-center gap-3 bg-zinc-950 rounded-xl border border-zinc-800 p-3">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0"
                  style={{ background: form.color + '18', border: `1px solid ${form.color}40` }}
                >
                  {form.icon}
                </div>
                <div>
                  <div className="text-sm font-bold text-white">{form.name || 'Nama Badge'}</div>
                  <div className="text-[10px] text-zinc-500">{form.description || 'Deskripsi badge'}</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="text-[11px] text-zinc-400 font-bold mb-1 block">Nama Badge *</label>
                  <input
                    required
                    value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500"
                    placeholder="Cth: Safety Champion"
                  />
                </div>
                <div className="col-span-2">
                  <label className="text-[11px] text-zinc-400 font-bold mb-1 block">Deskripsi</label>
                  <input
                    value={form.description}
                    onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500"
                    placeholder="Deskripsi singkat pencapaian"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-zinc-400 font-bold mb-1 block">Icon</label>
                  <div className="flex flex-wrap gap-1.5">
                    {ICON_OPTIONS.map(ic => (
                      <button
                        key={ic} type="button"
                        onClick={() => setForm(f => ({ ...f, icon: ic }))}
                        className={`w-8 h-8 rounded-lg text-base flex items-center justify-center transition ${form.icon === ic ? 'bg-emerald-500/20 ring-1 ring-emerald-500' : 'bg-zinc-800 hover:bg-zinc-700'}`}
                      >
                        {ic}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-[11px] text-zinc-400 font-bold mb-1 block">Warna</label>
                  <div className="flex flex-wrap gap-1.5">
                    {COLOR_OPTIONS.map(col => (
                      <button
                        key={col.value} type="button"
                        onClick={() => setForm(f => ({ ...f, color: col.value }))}
                        className={`w-7 h-7 rounded-lg transition ${form.color === col.value ? 'ring-2 ring-white scale-110' : 'hover:scale-105'}`}
                        style={{ background: col.value }}
                        title={col.label}
                      />
                    ))}
                  </div>
                </div>
                <div className="col-span-2">
                  <label className="text-[11px] text-zinc-400 font-bold mb-1 block">Kondisi</label>
                  <select
                    value={form.condition}
                    onChange={e => setForm(f => ({ ...f, condition: e.target.value }))}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                  >
                    {CONDITION_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="text-[11px] text-zinc-400 font-bold mb-1 block">
                    Threshold — nilai minimum untuk mendapat badge
                  </label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={form.threshold}
                    onChange={e => setForm(f => ({ ...f, threshold: Number(e.target.value) }))}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-1">
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold text-xs py-2.5 rounded-xl transition">
                  Batal
                </button>
                <button type="submit" disabled={submitting} className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs py-2.5 rounded-xl transition flex items-center justify-center gap-2 disabled:opacity-60">
                  {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  {editingId ? 'Simpan Perubahan' : 'Buat Badge'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
