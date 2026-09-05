import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, CheckCircle2, Loader2, Info } from 'lucide-react';
import { ShiftHandoverEntity } from '../types/handover';
import { HandoverManager } from '../lib/handoverService';

interface AcknowledgeHandoverModalProps {
  handovers: ShiftHandoverEntity[];
  currentWorkerId: string;
  onAllAcknowledged: () => void;
}

export function AcknowledgeHandoverModal({ handovers, currentWorkerId, onAllAcknowledged }: AcknowledgeHandoverModalProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ackBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    const timer = setTimeout(() => {
      ackBtnRef.current?.focus();
    }, 50);
    return () => {
      document.body.style.overflow = 'unset';
      clearTimeout(timer);
    };
  }, [currentIndex]);

  if (handovers.length === 0) return null;

  const currentLog = handovers[currentIndex];

  const handleAcknowledge = async () => {
    setLoading(true);
    setError(null);
    try {
      await HandoverManager.acknowledgeHandover(currentLog.id, currentWorkerId);
      
      if (currentIndex < handovers.length - 1) {
        setCurrentIndex(prev => prev + 1);
      } else {
        onAllAcknowledged();
      }
    } catch (err: any) {
      setError(err.message || 'Gagal mengakui log.');
    } finally {
      setLoading(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] overflow-y-auto bg-black/90 backdrop-blur-xl p-4 sm:p-6 flex items-center justify-center min-h-screen animate-fade-in">
      <div 
        className="bg-zinc-950 w-full max-w-md max-h-[88vh] sm:max-h-[90vh] m-auto rounded-3xl border border-rose-500/30 shadow-[0_0_50px_-12px_rgba(225,29,72,0.3)] overflow-y-auto custom-scrollbar"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Header - Warning Theme */}
        <div className="bg-rose-950/40 p-5 border-b border-rose-900/50 flex flex-col items-center text-center">
          <div className="w-12 h-12 rounded-full bg-rose-500/20 flex items-center justify-center mb-3">
            <AlertTriangle className="w-6 h-6 text-rose-400" />
          </div>
          <h2 className="text-lg font-black text-white mb-1">WAJIB DIBACA</h2>
          <p className="text-xs text-rose-300">
            Log Serah Terima Shift belum di-acknowledge ({currentIndex + 1} dari {handovers.length})
          </p>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {error && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
              {error}
            </div>
          )}

          <div className="flex items-center gap-3 pb-4 border-b border-zinc-800">
            <img 
              src={currentLog.author_avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${currentLog.author_id}`}
              alt="Author"
              className="w-10 h-10 rounded-full bg-zinc-800"
            />
            <div>
              <p className="text-sm font-bold text-white">{currentLog.author_name}</p>
              <p className="text-xs text-zinc-500">
                Shift {currentLog.shift_type} • {new Date(currentLog.created_at).toLocaleDateString('id-ID')}
              </p>
            </div>
          </div>

          <div className="space-y-4">
            {/* Info Kategori & Status */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="bg-zinc-900 p-3 rounded-xl border border-zinc-800">
                <span className="text-xs text-zinc-500 font-bold block mb-1">Kategori Handover</span>
                <span className="text-sm font-bold text-zinc-300">{currentLog.handover_category || '-'}</span>
              </div>
              <div className="bg-zinc-900 p-3 rounded-xl border border-zinc-800">
                <span className="text-xs text-zinc-500 font-bold block mb-1">Status Kondisi</span>
                <span className={`text-sm font-bold ${
                  currentLog.condition_status === 'Aman' ? 'text-emerald-400' :
                  currentLog.condition_status === 'Perlu Perhatian' ? 'text-amber-400' : 'text-rose-400'
                }`}>
                  {currentLog.condition_status || '-'}
                </span>
              </div>
            </div>

            <div>
              <p className="text-xs font-bold text-zinc-500 mb-2 uppercase tracking-wider">Catatan Serah Terima</p>
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 min-h-[100px]">
                <p className="text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap">
                  {currentLog.notes}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-sky-500/10 border border-sky-500/20 rounded-xl p-3 flex gap-3">
            <Info className="w-5 h-5 text-sky-400 shrink-0" />
            <p className="text-xs text-sky-300 leading-relaxed">
              Anda tidak dapat melanjutkan sebelum menyatakan telah membaca dan memahami log serah terima ini.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-zinc-800 bg-zinc-900/50">
          <button
            ref={ackBtnRef}
            onClick={handleAcknowledge}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-4 rounded-xl transition disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-emerald-400"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <CheckCircle2 className="w-5 h-5" />
            )}
            {loading ? 'Memproses...' : 'Saya Telah Membaca & Mengerti'}
          </button>
        </div>

      </div>
    </div>,
    document.body
  );
}
