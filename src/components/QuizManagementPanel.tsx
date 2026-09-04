import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { HelpCircle, Plus, Edit2, Trash2, Loader2, CheckCircle2, X, ChevronDown } from 'lucide-react';
import type { QuizQuestion } from '../types/assessment';
import {
  fetchQuizQuestions,
  createQuizQuestion,
  updateQuizQuestion,
  deleteQuizQuestion,
} from '../lib/supabaseService';
import { SystemConfigService } from '../domain/SystemConfigService';
import { SwalService } from '../domain/SwalService';

interface QuizFormData {
  question: string;
  options: [string, string, string, string];
  correctAnswerIndex: number;
  explanation: string;
  pointsReward: number;
  category: string;
}

const emptyForm = (defaultCategory = 'Safety & APD'): QuizFormData => ({
  question: '',
  options: ['', '', '', ''],
  correctAnswerIndex: 0,
  explanation: '',
  pointsReward: 50,
  category: defaultCategory,
});

export const QuizManagementPanel: React.FC = () => {
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [quizCategories, setQuizCategories] = useState<string[]>(() =>
    SystemConfigService.getConfig().quizCategories
  );
  const [form, setForm] = useState<QuizFormData>(() =>
    emptyForm(SystemConfigService.getConfig().quizCategories[0] || 'Safety & APD')
  );
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filterCat, setFilterCat] = useState<string>('all');
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategoryInput, setNewCategoryInput] = useState('');

  useEffect(() => {
    const handleConfigUpdate = (e: any) => {
      if (e.detail?.quizCategories) {
        setQuizCategories(e.detail.quizCategories);
      }
    };
    window.addEventListener('gappy_config_updated', handleConfigUpdate);
    return () => window.removeEventListener('gappy_config_updated', handleConfigUpdate);
  }, []);

  const handleAddNewCategory = () => {
    const trimmed = newCategoryInput.trim();
    if (!trimmed) return;
    const updated = SystemConfigService.addQuizCategory(trimmed);
    setQuizCategories(updated);
    setForm(f => ({ ...f, category: trimmed }));
    setNewCategoryInput('');
    setIsAddingCategory(false);
    showToast(`Kategori quiz "${trimmed}" berhasil ditambahkan!`);
  };

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  const loadQuestions = () => {
    setLoading(true);
    fetchQuizQuestions()
      .then(setQuestions)
      .catch(() => showToast('Gagal memuat soal quiz.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadQuestions(); }, []);

  const handleOpenCreate = () => {
    setForm(emptyForm());
    setEditingId(null);
    setShowForm(true);
  };

  const handleOpenEdit = (q: QuizQuestion) => {
    const opts: [string, string, string, string] = ['', '', '', ''];
    q.options.forEach((o, i) => { if (i < 4) opts[i] = o; });
    setForm({
      question: q.question,
      options: opts,
      correctAnswerIndex: q.correctAnswerIndex,
      explanation: q.explanation,
      pointsReward: q.pointsReward,
      category: q.category,
    });
    setEditingId(q.id);
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.question.trim() || form.options.some(o => !o.trim())) {
      showToast('Lengkapi semua soal dan pilihan jawaban.');
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        question: form.question.trim(),
        options: form.options.map(o => o.trim()),
        correctAnswerIndex: form.correctAnswerIndex,
        explanation: form.explanation.trim(),
        pointsReward: form.pointsReward,
        category: form.category,
      };
      if (editingId) {
        await updateQuizQuestion(editingId, payload);
        showToast('Soal berhasil diperbarui.');
      } else {
        await createQuizQuestion(payload);
        showToast('Soal baru berhasil ditambahkan.');
      }
      setShowForm(false);
      loadQuestions();
    } catch (err: any) {
      showToast(err?.message || 'Gagal menyimpan soal.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (q: QuizQuestion) => {
    const isConfirmed = await SwalService.confirm({
      title: 'Hapus Soal Kuis?',
      text: `Apakah Anda yakin ingin menghapus soal ini?\n"${q.question.slice(0, 60)}..."`,
      confirmButtonText: 'Ya, Hapus Soal',
      isDestructive: true,
    });
    if (!isConfirmed) return;
    setDeletingId(q.id);
    try {
      await deleteQuizQuestion(q.id);
      showToast('Soal berhasil dihapus.');
      loadQuestions();
    } catch (err: any) {
      showToast(err?.message || 'Gagal menghapus soal.');
    } finally {
      setDeletingId(null);
    }
  };

  const filtered = filterCat === 'all' ? questions : questions.filter(q => q.category === filterCat);

  const CAT_COLORS: Record<string, string> = {
    'Safety & APD':     'bg-rose-500/10 text-rose-400 border-rose-500/20',
    'SOP Logistics':    'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
    'Defensive Driving':'bg-amber-500/10 text-amber-400 border-amber-500/20',
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
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <HelpCircle className="w-4 h-4 text-indigo-400" /> Manajemen Soal Quiz
          </h3>
          <p className="text-[11px] text-zinc-500 mt-0.5">{questions.length} soal · Bank soal custom (di luar AI generator)</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={filterCat}
            onChange={e => setFilterCat(e.target.value)}
            className="bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500 font-semibold"
          >
            <option value="all">Semua Kategori</option>
            {quizCategories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <button
            onClick={handleOpenCreate}
            className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-3 py-2 rounded-xl transition whitespace-nowrap"
          >
            <Plus className="w-3.5 h-3.5" /> Tambah Soal
          </button>
        </div>
      </div>

      {/* Question list */}
      {loading ? (
        <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 text-zinc-500 animate-spin" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-10 text-zinc-500 text-sm">
          <HelpCircle className="w-8 h-8 mx-auto mb-2 text-zinc-700" />
          {questions.length === 0
            ? 'Belum ada soal. Tambahkan soal pertama untuk bank soal custom.'
            : 'Tidak ada soal di kategori ini.'}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((q, idx) => {
            const isExpanded = expandedId === q.id;
            return (
              <div key={q.id} className="bg-zinc-950 border border-zinc-800 rounded-xl overflow-hidden">
                <div className="flex items-start gap-3 p-3.5">
                  <div className="w-6 h-6 shrink-0 bg-zinc-800 rounded-lg flex items-center justify-center text-[10px] font-black text-zinc-400 mt-0.5">
                    {idx + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${CAT_COLORS[q.category] ?? ''}`}>{q.category}</span>
                      <span className="text-[10px] text-amber-400 font-bold">+{q.pointsReward} poin</span>
                    </div>
                    <p className="text-xs font-semibold text-white leading-relaxed">{q.question}</p>
                    {isExpanded && (
                      <div className="mt-3 space-y-1.5">
                        {q.options.map((opt, i) => (
                          <div key={i} className={`flex items-center gap-2 text-[11px] px-2.5 py-1.5 rounded-lg ${i === q.correctAnswerIndex ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 font-bold' : 'bg-zinc-900 text-zinc-400'}`}>
                            <span className={`w-4 h-4 shrink-0 rounded text-[10px] flex items-center justify-center font-black ${i === q.correctAnswerIndex ? 'bg-emerald-500 text-white' : 'bg-zinc-700 text-zinc-400'}`}>
                              {String.fromCharCode(65 + i)}
                            </span>
                            {opt}
                          </div>
                        ))}
                        {q.explanation && (
                          <div className="text-[10px] text-indigo-300/80 bg-indigo-500/5 border border-indigo-500/20 rounded-lg px-3 py-2 mt-2">
                            <span className="font-bold">Penjelasan: </span>{q.explanation}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : q.id)}
                      className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-500 hover:text-white transition"
                    >
                      <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                    </button>
                    <button
                      onClick={() => handleOpenEdit(q)}
                      className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-500 hover:text-white transition"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(q)}
                      disabled={deletingId === q.id}
                      className="p-1.5 rounded-lg hover:bg-rose-950/60 text-zinc-500 hover:text-rose-400 transition disabled:opacity-50"
                    >
                      {deletingId === q.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                    </button>
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
        >
          <div
            className="relative w-full max-w-xl max-h-[82vh] sm:max-h-[85vh] m-auto bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden"
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800 shrink-0">
              <button onClick={() => setShowForm(false)} className="text-zinc-500 hover:text-white p-1">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] text-zinc-400 font-bold block">Kategori *</label>
                  <button
                    type="button"
                    onClick={() => setIsAddingCategory(!isAddingCategory)}
                    className="text-[10px] text-emerald-400 hover:text-emerald-300 font-bold underline"
                  >
                    {isAddingCategory ? 'Tutup' : '+ Kategori Baru'}
                  </button>
                </div>

                {isAddingCategory ? (
                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      value={newCategoryInput}
                      onChange={e => setNewCategoryInput(e.target.value)}
                      placeholder="Nama kategori bank soal baru..."
                      className="w-full bg-zinc-950 border border-emerald-500 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={handleAddNewCategory}
                      className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shrink-0"
                    >
                      Simpan
                    </button>
                  </div>
                ) : (
                  <select
                    value={form.category}
                    onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                  >
                    {quizCategories.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                )}
              </div>
              <div>
                <label className="text-[11px] text-zinc-400 font-bold mb-1 block">Pertanyaan *</label>
                <textarea
                  required
                  rows={3}
                  value={form.question}
                  onChange={e => setForm(f => ({ ...f, question: e.target.value }))}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500 resize-none"
                  placeholder="Tulis pertanyaan quiz..."
                />
              </div>
              <div className="space-y-2">
                <label className="text-[11px] text-zinc-400 font-bold block">Pilihan Jawaban * (pilih yang benar)</label>
                {form.options.map((opt, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setForm(f => ({ ...f, correctAnswerIndex: i }))}
                      className={`w-7 h-7 shrink-0 rounded-lg text-[11px] font-black flex items-center justify-center transition ${form.correctAnswerIndex === i ? 'bg-emerald-500 text-white' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'}`}
                    >
                      {String.fromCharCode(65 + i)}
                    </button>
                    <input
                      required
                      value={opt}
                      onChange={e => {
                        const newOpts = [...form.options] as [string, string, string, string];
                        newOpts[i] = e.target.value;
                        setForm(f => ({ ...f, options: newOpts }));
                      }}
                      className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-1.5 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500"
                      placeholder={`Pilihan ${String.fromCharCode(65 + i)}`}
                    />
                  </div>
                ))}
                <p className="text-[10px] text-zinc-600">Klik huruf A/B/C/D untuk menandai jawaban yang benar.</p>
              </div>
              <div>
                <label className="text-[11px] text-zinc-400 font-bold mb-1 block">Penjelasan Jawaban</label>
                <textarea
                  rows={2}
                  value={form.explanation}
                  onChange={e => setForm(f => ({ ...f, explanation: e.target.value }))}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500 resize-none"
                  placeholder="Penjelasan mengapa jawaban tersebut benar..."
                />
              </div>
              <div>
                <label className="text-[11px] text-zinc-400 font-bold mb-1 block">Poin Reward</label>
                <input
                  type="number" min={10} max={500}
                  value={form.pointsReward}
                  onChange={e => setForm(f => ({ ...f, pointsReward: Number(e.target.value) }))}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div className="flex gap-2 pt-1">
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold text-xs py-2.5 rounded-xl transition">
                  Batal
                </button>
                <button type="submit" disabled={submitting} className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs py-2.5 rounded-xl transition flex items-center justify-center gap-2 disabled:opacity-60">
                  {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  {editingId ? 'Simpan Perubahan' : 'Tambah Soal'}
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
