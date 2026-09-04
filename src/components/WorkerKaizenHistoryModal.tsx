import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Lightbulb,
  Award,
  Clock,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  RefreshCw,
  Sparkles,
  SearchCheck,
  ShieldAlert,
  Zap,
  DollarSign,
  HeartHandshake
} from 'lucide-react';
import { KaizenService } from '../lib/kaizenService';
import { KaizenSuggestionEntity, KaizenCategory, KaizenStatus } from '../types/kaizen';

interface WorkerKaizenHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  workerId: string;
}

export function WorkerKaizenHistoryModal({
  isOpen,
  onClose,
  workerId
}: WorkerKaizenHistoryModalProps) {
  const [suggestions, setSuggestions] = useState<KaizenSuggestionEntity[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchHistory = async () => {
    setLoading(true);
    const data = await KaizenService.getSuggestionsByWorker(workerId);
    setSuggestions(data);
    setLoading(false);
  };

  useEffect(() => {
    if (isOpen) {
      fetchHistory();
    }
  }, [isOpen, workerId]);

  if (!isOpen) return null;

  const getStatusBadge = (status: KaizenStatus) => {
    switch (status) {
      case 'Submitted':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center gap-1">
            <Clock className="w-3 h-3" />
            <span>Usulan Masuk</span>
          </span>
        );
      case 'Under Review':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center gap-1">
            <AlertCircle className="w-3 h-3" />
            <span>Sedang Dikaji</span>
          </span>
        );
      case 'Approved':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" />
            <span>Disetujui</span>
          </span>
        );
      case 'Implemented':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-purple-500/10 text-purple-400 border border-purple-500/20 flex items-center gap-1">
            <Sparkles className="w-3 h-3" />
            <span>Diterapkan</span>
          </span>
        );
      case 'Rejected':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-rose-500/10 text-rose-400 border border-rose-500/20 flex items-center gap-1">
            <X className="w-3 h-3" />
            <span>Ditolak</span>
          </span>
        );
    }
  };

  const getCategoryIcon = (cat: KaizenCategory) => {
    switch (cat) {
      case 'Safety / K3':
        return <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />;
      case 'Efisiensi Operasional':
        return <Zap className="w-3.5 h-3.5 text-amber-400" />;
      case '5R & Kebersihan':
        return <Sparkles className="w-3.5 h-3.5 text-emerald-400" />;
      case 'Penghematan Biaya':
        return <DollarSign className="w-3.5 h-3.5 text-green-400" />;
      case 'Kualitas Layanan':
        return <HeartHandshake className="w-3.5 h-3.5 text-sky-400" />;
      default:
        return <HelpCircle className="w-3.5 h-3.5 text-purple-400" />;
    }
  };

  const totalRewardsEarned = suggestions.reduce((acc, curr) => acc + (curr.reward_points || 0), 0);

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] overflow-y-auto bg-black/90 backdrop-blur-xl p-4 sm:p-6 flex items-center justify-center min-h-screen animate-fade-in"
    >
      <div
        className="relative w-full max-w-3xl max-h-[88vh] sm:max-h-[90vh] m-auto flex flex-col bg-zinc-950 border border-zinc-800 rounded-3xl shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="p-5 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Lightbulb className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-white flex items-center gap-2">
                Riwayat Ide Kaizen Saya
              </h2>
              <p className="text-xs text-zinc-400">
                Pantau proses review dan reward poin atas kontribusi inovasi Anda.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchHistory}
              className="p-2 text-zinc-400 hover:text-white rounded-xl hover:bg-zinc-800 transition"
              title="Refresh Riwayat"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-amber-400' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-zinc-400 hover:text-white rounded-xl hover:bg-zinc-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Summary Stat Bar */}
        <div className="px-5 py-3 bg-zinc-900/40 border-b border-zinc-800 flex items-center justify-between text-xs">
          <span className="text-zinc-400">Total Ide Diajukan: <strong className="text-white">{suggestions.length}</strong></span>
          <span className="flex items-center gap-1.5 text-amber-400 font-bold">
            <Award className="w-4 h-4" />
            <span>Poin Reward Diperoleh: +{totalRewardsEarned} PTS</span>
          </span>
        </div>

        {/* List Content */}
        <div className="p-5 overflow-y-auto space-y-3 flex-1 custom-scrollbar">
          {loading ? (
            <div className="py-16 text-center text-zinc-500 space-y-2">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto text-amber-400" />
              <p className="text-xs">Memuat riwayat usulan Kaizen...</p>
            </div>
          ) : suggestions.length === 0 ? (
            <div className="py-16 text-center text-zinc-500 space-y-2">
              <Lightbulb className="w-10 h-10 mx-auto text-zinc-700 opacity-60" />
              <p className="text-sm font-bold text-zinc-400">Belum Ada Ide yang Diajukan</p>
              <p className="text-xs max-w-sm mx-auto text-zinc-500">
                Punya ide untuk perbaikan kerja atau K3? Ajukan sekarang dan raih reward poin!
              </p>
            </div>
          ) : (
            suggestions.map((item) => (
              <div
                key={item.id}
                className="bg-zinc-900/70 border border-zinc-800 hover:border-zinc-700 rounded-2xl p-4 transition shadow-sm space-y-3"
              >
                {/* Header item: Title & Status */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-zinc-800 text-zinc-300 border border-zinc-700">
                        {getCategoryIcon(item.category)}
                        {item.category}
                      </span>
                      <span className="text-[10px] text-zinc-500">
                        {new Date(item.created_at).toLocaleDateString('id-ID', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric'
                        })}
                      </span>
                    </div>
                    <h3 className="font-bold text-sm text-white">{item.title}</h3>
                  </div>

                  <div className="flex items-center gap-2 self-start sm:self-auto">
                    {getStatusBadge(item.status)}
                    {item.reward_points > 0 && (
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                        <Award className="w-3 h-3" />
                        <span>+{item.reward_points} PTS</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Grid Comparison Before / After */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <div className="p-3 bg-black/30 rounded-xl border border-rose-950/40">
                    <p className="text-[10px] font-bold text-rose-400 mb-1">🔴 Masalah / Kondisi Awal:</p>
                    <p className="text-zinc-300 whitespace-pre-wrap">{item.current_condition}</p>
                  </div>
                  <div className="p-3 bg-black/30 rounded-xl border border-emerald-950/40">
                    <p className="text-[10px] font-bold text-emerald-400 mb-1">🟢 Usulan Solusi Perbaikan:</p>
                    <p className="text-zinc-300 whitespace-pre-wrap">{item.proposed_solution}</p>
                  </div>
                </div>

                {/* Reviewer Feedback (Jika ada) */}
                {item.reviewer_feedback && (
                  <div className="p-3 bg-indigo-950/30 border border-indigo-500/30 rounded-xl text-xs space-y-1">
                    <p className="text-[10px] font-bold text-indigo-400 flex items-center gap-1">
                      <span>💬 Catatan Reviewer ({item.reviewer_name || 'Supervisor'}):</span>
                    </p>
                    <p className="text-indigo-200">{item.reviewer_feedback}</p>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
