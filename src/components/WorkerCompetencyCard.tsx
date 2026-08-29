import React, { useMemo } from 'react';
import { BookOpen, ChevronRight } from 'lucide-react';
import { WorkerProfile } from '../types/assessment';
import { matrixEngine } from '../domain/CompetencyMatrixEngine';

interface WorkerCompetencyCardProps {
  worker: WorkerProfile;
  competencyScores: Record<string, number>;
}

export const WorkerCompetencyCard: React.FC<WorkerCompetencyCardProps> = ({
  worker,
  competencyScores,
}) => {
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

  const hasAuditData = Object.keys(competencyScores).length > 0;

  if (categorySummaries.length === 0) return null;

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

  return (
    <div className="card p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-indigo-400" />
            Profil Kompetensi Saya
          </h3>
          <p className="text-[11px] text-zinc-500 mt-0.5">
            {categorySummaries.length} kategori · Role: <span className="text-zinc-400 font-mono">{worker.role}</span>
          </p>
        </div>
        <div className="text-right">
          <div className={`text-xl font-black ${getColorClass(overallPct)}`}>{overallPct}%</div>
          <div className={`text-[10px] font-bold px-2 py-0.5 rounded border mt-0.5 ${getLabelClass(overallPct)}`}>
            {getLabel(overallPct)}
          </div>
        </div>
      </div>

      {!hasAuditData && (
        <div className="text-[11px] text-zinc-500 bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 flex items-center gap-2">
          <ChevronRight className="w-3 h-3 text-zinc-600 shrink-0" />
          Skor estimasi berdasarkan BIB score. Audit kompetensi lengkap dilakukan oleh Supervisor.
        </div>
      )}

      {/* Category breakdown */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {categorySummaries.map((cat) => {
          const pct = cat.percentage;
          return (
            <div key={cat.category} className="bg-zinc-950 rounded-xl border border-zinc-800 p-3">
              <div className="flex items-center justify-between mb-1.5 gap-2">
                <span className="text-xs font-bold text-white truncate">{cat.category}</span>
                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border shrink-0 ${getLabelClass(pct)}`}>
                  {getLabel(pct)}
                </span>
              </div>
              <div className="flex items-baseline justify-between mb-1.5">
                <span className={`text-base font-black ${getColorClass(pct)}`}>
                  {cat.auditedScore}
                  <span className="text-[10px] text-zinc-600 font-normal ml-1">/ {cat.maxScore}</span>
                </span>
                <span className="text-[10px] text-zinc-400 font-bold">{pct}%</span>
              </div>
              <div className="w-full bg-zinc-900 rounded-full h-1.5 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${getBarClass(pct)}`}
                  style={{ width: `${Math.min(100, pct)}%` }}
                />
              </div>
              <div className="text-[10px] text-zinc-600 mt-1">{cat.itemCount} modul</div>
            </div>
          );
        })}
      </div>

      {/* Overall bar */}
      <div className="border-t border-zinc-800/60 pt-3">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[11px] text-zinc-400 font-bold">Pencapaian Keseluruhan</span>
          <span className={`text-[11px] font-black ${getColorClass(overallPct)}`}>{overallPct}%</span>
        </div>
        <div className="w-full bg-zinc-900 rounded-full h-2 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-700 ${getBarClass(overallPct)}`}
            style={{ width: `${Math.min(100, overallPct)}%` }}
          />
        </div>
      </div>
    </div>
  );
};
