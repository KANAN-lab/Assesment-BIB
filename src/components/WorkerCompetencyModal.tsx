import React, { useMemo, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, BookOpen, ChevronRight, BarChart3, CheckCircle2, ShieldCheck } from 'lucide-react';
import { WorkerProfile } from '../types/assessment';
import { matrixEngine } from '../domain/CompetencyMatrixEngine';

interface WorkerCompetencyModalProps {
  worker: WorkerProfile;
  competencyScores: Record<string, number>;
  onClose: () => void;
}

export const WorkerCompetencyModal: React.FC<WorkerCompetencyModalProps> = ({
  worker,
  competencyScores,
  onClose,
}) => {
  const roleKey = useMemo(() => matrixEngine.resolveRoleColumnKey(worker.role), [worker.role]);
  const closeBtnRef = useRef<HTMLButtonElement>(null);

  const categorySummaries = useMemo(() => {
    return matrixEngine.calculateCategorySummaries(
      worker.role,
      competencyScores,
      worker.bibScores.totalScore
    );
  }, [worker.role, worker.bibScores.totalScore, competencyScores]);

  const overallPct = useMemo(() => {
    return matrixEngine.calculateOverallPercentage(
      worker.role,
      competencyScores,
      worker.bibScores.totalScore
    );
  }, [worker.role, worker.bibScores.totalScore, competencyScores]);

  const activeItems = useMemo(() => {
    return matrixEngine.getItems().filter((item) => (item.maxScores[roleKey] ?? 0) > 0);
  }, [roleKey]);

  const hasAuditData = Object.keys(competencyScores).length > 0;

  const getColorClass = (pct: number) =>
    pct >= 80 ? 'text-emerald-400' : pct >= 65 ? 'text-amber-400' : 'text-rose-400';
  const getBarClass = (pct: number) =>
    pct >= 80 ? 'bg-emerald-500' : pct >= 65 ? 'bg-amber-500' : 'bg-rose-500';
  const getLabel = (pct: number) =>
    pct >= 80 ? 'Kompeten' : pct >= 65 ? 'Pengawasan' : 'Perlu Training';
  const getLabelClass = (pct: number) =>
    pct >= 80
      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
      : pct >= 65
      ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
      : 'bg-rose-500/10 text-rose-400 border-rose-500/20';

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    const timer = setTimeout(() => {
      closeBtnRef.current?.focus();
    }, 50);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      clearTimeout(timer);
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] overflow-y-auto bg-black/90 backdrop-blur-xl p-4 sm:p-6 flex items-center justify-center min-h-screen animate-fade-in"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-4xl max-h-[88vh] sm:max-h-[90vh] m-auto bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-scale-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-500/10 border border-indigo-500/20 rounded-xl flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white">Profil & Breakdown Matrix Kompetensi</h2>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700">
                  {roleKey}
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-0.5">
                Struktur indikator penilaian berdasarkan standar peran operasional
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="text-xs font-mono font-bold text-white">
                Rata-rata: <span className="text-emerald-400">{overallPct.toFixed(1)}%</span>
              </div>
              <div className={`text-[10px] font-bold px-2 py-0.5 rounded border ${getLabelClass(overallPct)}`}>
                {getLabel(overallPct)}
              </div>
            </div>
            <button
              ref={closeBtnRef}
              onClick={onClose}
              className="text-zinc-500 hover:text-white transition p-1 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400"
              aria-label="Tutup modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Scrollable */}
        <div className="flex-1 min-h-0 overflow-y-auto p-6 space-y-5 custom-scrollbar">
          {!hasAuditData && (
            <div className="text-xs text-zinc-400 bg-zinc-950 border border-zinc-800/80 rounded-xl p-3 flex items-center gap-2.5">
              <ChevronRight className="w-4 h-4 text-amber-400 shrink-0" />
              <span>
                Nilai kompetensi berikut merupakan <strong className="text-white">estimasi baseline</strong> berdasarkan Skor BIB ({worker.bibScores.totalScore.toFixed(1)}). Audit kompetensi spesifik dilakukan secara berkala oleh Supervisor.
              </span>
            </div>
          )}

          {/* Category Summary Grid */}
          <div>
            <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-3 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-emerald-400" />
              Ringkasan per Kategori ({categorySummaries.length} Kategori)
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {categorySummaries.map((cat) => {
                const pct = cat.percentage;
                return (
                  <div key={cat.category} className="bg-zinc-950 rounded-xl border border-zinc-800 p-3.5 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-1 gap-2">
                        <span className="text-xs font-bold text-white truncate">{cat.category}</span>
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border shrink-0 ${getLabelClass(pct)}`}>
                          {getLabel(pct)}
                        </span>
                      </div>
                      <div className="text-[10px] text-zinc-500 mb-2">{cat.itemCount} Modul Spesifik</div>
                    </div>

                    <div>
                      <div className="flex items-baseline justify-between mb-1">
                        <span className={`text-base font-black ${getColorClass(pct)}`}>
                          {cat.auditedScore}
                          <span className="text-[10px] text-zinc-500 font-normal ml-1">/ {cat.maxScore}</span>
                        </span>
                        <span className="text-[10px] text-zinc-400 font-bold">{pct}%</span>
                      </div>
                      <div className="w-full bg-zinc-900 rounded-full h-1.5 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${getBarClass(pct)}`}
                          style={{ width: `${Math.min(100, pct)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Active Items List */}
          <div className="space-y-2 pt-2 border-t border-zinc-800/80">
            <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2 flex items-center justify-between">
              <span>Daftar Modul Spesifik Role ({activeItems.length} Item)</span>
              <span className="text-[10px] text-zinc-500 font-normal normal-case">Target vs Evaluasi</span>
            </h3>

            <div className="space-y-2 max-h-64 overflow-y-auto pr-1 custom-scrollbar">
              {activeItems.map((item) => {
                const maxScore = item.maxScores[roleKey] ?? 0;
                const audited = competencyScores[item.id] ?? Math.round(maxScore * (worker.bibScores.totalScore / 100) * 10) / 10;
                const itemPct = maxScore > 0 ? (audited / maxScore) * 100 : 0;
                const isPassed = itemPct >= 75;

                return (
                  <div key={item.id} className="bg-zinc-950 p-3 rounded-xl border border-zinc-800/80 flex items-center justify-between text-xs gap-3">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${isPassed ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                      <div className="min-w-0">
                        <div className="font-bold text-white truncate flex items-center gap-2">
                          <span>{item.title}</span>
                          <span className="text-[9px] bg-zinc-800 text-zinc-400 px-1.5 py-0.2 rounded font-mono">
                            {item.type}
                          </span>
                        </div>
                        <div className="text-[10px] text-zinc-500 truncate">{item.definition}</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0 text-right">
                      <div className="text-right">
                        <div className="font-bold text-white font-mono">{audited} / {maxScore}</div>
                        <div className="text-[9px] text-zinc-500">Target Lvl {maxScore}</div>
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${isPassed ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border-amber-500/20'}`}>
                        {isPassed ? 'Lulus' : 'Evaluasi'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-zinc-800 bg-zinc-950/60 flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5 text-zinc-500 text-[11px]">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Matriks Kompetensi Logistik ISO 45001 & K3 Operasional</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-bold rounded-xl transition text-xs"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
