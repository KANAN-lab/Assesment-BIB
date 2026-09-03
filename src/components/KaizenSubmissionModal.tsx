import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Lightbulb,
  Send,
  AlertTriangle,
  Sparkles,
  ShieldAlert,
  Zap,
  DollarSign,
  HeartHandshake,
  HelpCircle,
  Loader2,
  CheckCircle2,
  ArrowRight
} from 'lucide-react';
import { KaizenService } from '../lib/kaizenService';
import { KaizenCategory, KaizenInput } from '../types/kaizen';
import { uploadFileToGoogleDrive } from '../lib/googleDriveService';
import { Camera, Image as ImageIcon } from 'lucide-react';

interface KaizenSubmissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentWorkerId: string;
  currentWorkerName?: string;
  onSubmitted?: () => void;
}

const CATEGORIES: { label: KaizenCategory; icon: React.ReactNode; color: string; desc: string }[] = [
  {
    label: 'Safety / K3',
    icon: <ShieldAlert className="w-4 h-4 text-rose-400" />,
    color: 'border-rose-500/30 bg-rose-500/10 text-rose-300',
    desc: 'Mencegah insiden & bahaya kerja'
  },
  {
    label: 'Efisiensi Operasional',
    icon: <Zap className="w-4 h-4 text-amber-400" />,
    color: 'border-amber-500/30 bg-amber-500/10 text-amber-300',
    desc: 'Mempercepat alur & eliminasi bottleneck'
  },
  {
    label: '5R & Kebersihan',
    icon: <Sparkles className="w-4 h-4 text-emerald-400" />,
    color: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
    desc: 'Ringkas, Rapi, Resik, Rawat, Rajin'
  },
  {
    label: 'Penghematan Biaya',
    icon: <DollarSign className="w-4 h-4 text-green-400" />,
    color: 'border-green-500/30 bg-green-500/10 text-green-300',
    desc: 'Pengurangan limbah & pemborosan energi'
  },
  {
    label: 'Kualitas Layanan',
    icon: <HeartHandshake className="w-4 h-4 text-sky-400" />,
    color: 'border-sky-500/30 bg-sky-500/10 text-sky-300',
    desc: 'Akurasi picking & kepuasan customer'
  },
  {
    label: 'Lainnya',
    icon: <HelpCircle className="w-4 h-4 text-purple-400" />,
    color: 'border-purple-500/30 bg-purple-500/10 text-purple-300',
    desc: 'Inovasi lingkungan kerja lainnya'
  }
];

export function KaizenSubmissionModal({
  isOpen,
  onClose,
  currentWorkerId,
  currentWorkerName = 'Pekerja',
  onSubmitted
}: KaizenSubmissionModalProps) {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<KaizenCategory>('Efisiensi Operasional');
  const [currentCondition, setCurrentCondition] = useState('');
  const [proposedSolution, setProposedSolution] = useState('');
  const [expectedImpact, setExpectedImpact] = useState('');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !currentCondition.trim() || !proposedSolution.trim()) {
      setError('Mohon lengkapi Judul, Kondisi Masalah, dan Usulan Solusi.');
      return;
    }

    setLoading(true);
    setError(null);

    let uploadedPhotoUrl: string | undefined = undefined;
    if (photoFile) {
      try {
        const uploadRes = await uploadFileToGoogleDrive(photoFile, {
          workerId: currentWorkerId,
          workerName: currentWorkerName,
          moduleCategory: 'Kaizen_Inovasi',
          customFilename: `KAIZEN_${currentWorkerId}_${Date.now()}.jpg`,
        });
        if (uploadRes.directUrl || uploadRes.webViewLink) {
          uploadedPhotoUrl = uploadRes.directUrl || uploadRes.webViewLink;
        }
      } catch (err) {
        console.warn('Gagal upload bukti foto Kaizen ke Google Drive:', err);
      }
    }

    const input: KaizenInput = {
      title,
      category,
      currentCondition,
      proposedSolution,
      expectedImpact: expectedImpact.trim() || undefined,
      photoBeforeUrl: uploadedPhotoUrl || photoPreview || undefined,
    };

    const res = await KaizenService.submitSuggestion(currentWorkerId, input);
    setLoading(false);

    if (res.success) {
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        setTitle('');
        setCurrentCondition('');
        setProposedSolution('');
        setExpectedImpact('');
        onClose();
        if (onSubmitted) onSubmitted();
      }, 1500);
    } else {
      setError(res.error || 'Terjadi kesalahan saat mengirim saran Kaizen.');
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] overflow-y-auto bg-black/90 backdrop-blur-xl p-4 sm:p-6 flex items-center justify-center min-h-screen animate-fade-in"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl max-h-[88vh] sm:max-h-[90vh] m-auto flex flex-col bg-zinc-950 border border-zinc-800 rounded-3xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-inner">
              <Lightbulb className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-white flex items-center gap-2">
                Kotak Saran Inovasi (Kaizen)
              </h2>
              <p className="text-xs text-zinc-400">
                Ajukan ide perbaikan kerja. Ide terbaik akan di-reward poin oleh Supervisor!
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-zinc-400 hover:text-white rounded-xl hover:bg-zinc-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Success Splash */}
        {success ? (
          <div className="p-12 flex flex-col items-center justify-center text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 animate-bounce">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-black text-white">Ide Kaizen Berhasil Dikirim!</h3>
            <p className="text-sm text-zinc-400 max-w-md">
              Terima kasih atas kontribusi inovasi Anda. Supervisor dan Admin akan segera meninjau ide ini di Papan Kanban Kaizen.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4 custom-scrollbar">
            {error && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-400 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Judul Ide */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-zinc-400">
                Judul Inovasi / Topik Perbaikan <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Contoh: Pembuatan Jalur Khusus Pallet Rusak di Zona B"
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                maxLength={100}
                required
              />
            </div>

            {/* Kategori Kaizen Grid */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-zinc-400">
                Kategori Ide <span className="text-rose-500">*</span>
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {CATEGORIES.map((cat) => {
                  const isSelected = category === cat.label;
                  return (
                    <button
                      key={cat.label}
                      type="button"
                      onClick={() => setCategory(cat.label)}
                      className={`p-3 rounded-xl border text-left transition flex items-start gap-2.5 ${
                        isSelected
                          ? 'bg-amber-500/10 border-amber-500 text-white shadow-sm ring-1 ring-amber-500/50'
                          : 'bg-zinc-900/80 border-zinc-800 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
                      }`}
                    >
                      <div className="p-1.5 rounded-lg bg-zinc-800 shrink-0">
                        {cat.icon}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold truncate">{cat.label}</p>
                        <p className="text-[10px] text-zinc-500 line-clamp-1">{cat.desc}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Kondisi Masalah & Solusi (Before & After) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-rose-400 flex items-center gap-1">
                  <span>1. Masalah / Kondisi Saat Ini (Sebelum)</span>
                  <span className="text-rose-500">*</span>
                </label>
                <textarea
                  value={currentCondition}
                  onChange={(e) => setCurrentCondition(e.target.value)}
                  placeholder="Jelaskan apa yang kurang efektif, potensi bahaya, atau pemborosan waktu yang terjadi..."
                  rows={4}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-xs sm:text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-rose-500/40"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                  <span>2. Usulan Solusi / Ide Kaizen (Sesudah)</span>
                  <span className="text-rose-500">*</span>
                </label>
                <textarea
                  value={proposedSolution}
                  onChange={(e) => setProposedSolution(e.target.value)}
                  placeholder="Langkah perbaikan nyata yang Anda sarankan untuk mengatasi masalah tersebut..."
                  rows={4}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-xs sm:text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                  required
                />
              </div>
            </div>

            {/* Ekspektasi Dampak */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-zinc-400">
                Ekspektasi Manfaat / Dampak Positif <span className="text-zinc-500">(Opsional)</span>
              </label>
              <input
                type="text"
                value={expectedImpact}
                onChange={(e) => setExpectedImpact(e.target.value)}
                placeholder="Contoh: Menghemat waktu pencarian barang ~15 menit per shift"
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
              />
            </div>

            {/* Unggah Foto Bukti (Google Drive Integration) */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-zinc-400 flex items-center gap-1">
                <Camera className="w-3.5 h-3.5 text-amber-400" />
                <span>Foto Bukti Lapangan (Sebelum Perbaikan) <span className="text-zinc-500">(Opsional)</span></span>
              </label>
              <div className="flex items-center gap-3">
                <label className="cursor-pointer inline-flex items-center gap-2 px-3.5 py-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-xl text-xs font-bold text-zinc-300 transition">
                  <ImageIcon className="w-4 h-4 text-amber-400" />
                  <span>{photoFile ? 'Ganti Foto' : 'Pilih / Jepret Foto'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      setPhotoFile(file);
                      const reader = new FileReader();
                      reader.onload = () => setPhotoPreview(reader.result as string);
                      reader.readAsDataURL(file);
                    }}
                  />
                </label>
                {photoFile && (
                  <span className="text-xs text-amber-400 truncate max-w-xs">
                    ✓ {photoFile.name} (akan disimpan ke Google Drive)
                  </span>
                )}
              </div>
            </div>

            {/* Footer Form */}
            <div className="pt-3 border-t border-zinc-800 flex items-center justify-between">
              <p className="text-[11px] text-zinc-500 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Ide disetujui berhak mendapat reward hingga <strong>+500 Poin</strong>!</span>
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-zinc-400 hover:text-white hover:bg-zinc-800 transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-black flex items-center gap-2 transition disabled:opacity-50 shadow-lg shadow-amber-500/20 active:scale-95"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                  <span>Kirim Usulan Kaizen</span>
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>,
    document.body
  );
};
