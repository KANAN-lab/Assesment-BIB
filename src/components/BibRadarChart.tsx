import React, { useMemo, useState } from 'react';
import {
  ResponsiveContainer, RadarChart, PolarGrid,
  PolarAngleAxis, PolarRadiusAxis, Radar, Legend
} from 'recharts';
import { WorkerProfile } from '../types/assessment';
import { matrixEngine } from '../domain/CompetencyMatrixEngine';
import { BarChart3, Info, GitCompare, ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';

interface BibRadarChartProps {
  worker: WorkerProfile;
  competencyScores?: Record<string, number>;
  previousScores?: Record<string, number>;
  showComparison?: boolean;
}

export const BibRadarChart: React.FC<BibRadarChartProps> = ({
  worker,
  competencyScores = {},
  previousScores,
  showComparison = true,
}) => {
  const [enableCompare, setEnableCompare] = useState(Boolean(previousScores && Object.keys(previousScores).length > 0));

  const roleColumnKey = useMemo(
    () => matrixEngine.resolveRoleColumnKey(worker.role),
    [worker.role]
  );

  const prevSummariesMap = useMemo(() => {
    if (!previousScores || Object.keys(previousScores).length === 0) return {};
    const prevList = matrixEngine.calculateCategorySummaries(
      worker.role,
      previousScores,
      worker.bibScores?.totalScore || 75
    );
    const map: Record<string, number> = {};
    prevList.forEach((p) => {
      map[p.category] = p.percentage;
    });
    return map;
  }, [worker.role, previousScores, worker.bibScores?.totalScore]);

  const hasPreviousData = useMemo(() => Object.keys(prevSummariesMap).length > 0, [prevSummariesMap]);

  const categoryData = useMemo(() => {
    const summaries = matrixEngine.calculateCategorySummaries(
      worker.role,
      competencyScores,
      worker.bibScores.totalScore
    );
    return summaries.map(c => {
      const prevVal = prevSummariesMap[c.category];
      const delta = prevVal !== undefined ? c.percentage - prevVal : null;
      return {
        subject: c.category,
        value: c.percentage,
        previousValue: prevVal ?? null,
        delta,
        auditedScore: c.auditedScore,
        maxScore: c.maxScore,
        itemCount: c.itemCount,
        fullMark: 100,
      };
    });
  }, [worker.role, competencyScores, worker.bibScores.totalScore, prevSummariesMap]);

  const overallPct = useMemo(
    () => matrixEngine.calculateOverallPercentage(worker.role, competencyScores, worker.bibScores.totalScore),
    [worker.role, competencyScores, worker.bibScores.totalScore]
  );

  const getGrade = (score: number) => {
    if (score >= 90) return { label: 'Excellent · A+', cls: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' };
    if (score >= 80) return { label: 'Good · A',       cls: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20' };
    if (score >= 70) return { label: 'Fair · B',        cls: 'text-amber-400 bg-amber-500/10 border-amber-500/20' };
    return             { label: 'Perlu Evaluasi',       cls: 'text-rose-400 bg-rose-500/10 border-rose-500/20' };
  };

  const grade = getGrade(overallPct);

  const getBarColor = (val: number) => {
    if (val >= 90) return '#10b981'; // emerald
    if (val >= 75) return '#6366f1'; // indigo
    if (val >= 60) return '#f59e0b'; // amber
    return '#f43f5e';                 // rose
  };

  return (
    <div className="card p-5 space-y-4">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-emerald-400" />
            Radar Kompetensi Matrix
          </h3>
          <p className="text-[11px] text-zinc-500 mt-0.5">
            {roleColumnKey} · {categoryData.length} kategori aktif
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {hasPreviousData && showComparison && (
            <button
              type="button"
              onClick={() => setEnableCompare(!enableCompare)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold border transition ${
                enableCompare
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-sm'
                  : 'bg-zinc-800 text-zinc-400 border-zinc-700 hover:text-white'
              }`}
              title="Aktifkan perbandingan skor audit terkini vs audit periode sebelumnya"
            >
              <GitCompare className="w-3 h-3" />
              <span>{enableCompare ? 'Mode Komparasi Aktif' : 'Bandingkan Historis'}</span>
            </button>
          )}

          <span className={`text-[10px] font-bold px-2.5 py-1 rounded-md border shrink-0 ${grade.cls}`}>
            {overallPct}% · {grade.label}
          </span>
        </div>
      </div>

      {/* Legend if Compare Active */}
      {enableCompare && hasPreviousData && (
        <div className="flex items-center gap-4 px-3 py-1.5 bg-zinc-900/80 border border-zinc-800 rounded-xl text-[10px] font-semibold text-zinc-300">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
            <span>Audit Terkini</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 border border-dashed border-amber-300 inline-block" />
            <span>Audit Lalu (Historis)</span>
          </div>
        </div>
      )}

      {/* Radar */}
      <div className="h-60 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart cx="50%" cy="50%" outerRadius="70%" data={categoryData}>
            <PolarGrid stroke="#3f3f46" strokeDasharray="3 3" />
            <PolarAngleAxis
              dataKey="subject"
              tick={{ fill: '#a1a1aa', fontSize: 11, fontWeight: 700 }}
              tickLine={false}
            />
            <PolarRadiusAxis
              angle={30}
              domain={[0, 100]}
              stroke="#3f3f46"
              tick={{ fill: '#52525b', fontSize: 9 }}
              axisLine={false}
            />
            {/* Primary Current Audit Radar */}
            <Radar
              name="Audit Terkini"
              dataKey="value"
              stroke="#10b981"
              fill="#10b981"
              fillOpacity={0.25}
              strokeWidth={2}
            />
            {/* Secondary Historical Comparison Radar */}
            {enableCompare && hasPreviousData && (
              <Radar
                name="Audit Lalu"
                dataKey="previousValue"
                stroke="#f59e0b"
                fill="#f59e0b"
                fillOpacity={0.12}
                strokeWidth={1.5}
                strokeDasharray="4 4"
              />
            )}
          </RadarChart>
        </ResponsiveContainer>
      </div>

      {/* Category breakdown — compact grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 pt-3 border-t border-zinc-800 max-h-48 overflow-y-auto custom-scrollbar">
        {categoryData.map(cat => (
          <div key={cat.subject} className="bg-zinc-800/60 rounded-xl p-2.5 border border-zinc-800 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-zinc-400 font-semibold truncate max-w-[85px]" title={cat.subject}>
                {cat.subject}
              </span>
              <div className="flex items-center gap-1 ml-1 shrink-0">
                <span className="text-[11px] font-black" style={{ color: getBarColor(cat.value) }}>
                  {cat.value}%
                </span>
                {enableCompare && cat.delta !== null && (
                  <span
                    className={`text-[9px] font-bold flex items-center ${
                      cat.delta > 0
                        ? 'text-emerald-400'
                        : cat.delta < 0
                        ? 'text-rose-400'
                        : 'text-zinc-500'
                    }`}
                    title={`Perubahan dari audit lalu: ${cat.delta > 0 ? '+' : ''}${cat.delta}%`}
                  >
                    {cat.delta > 0 ? (
                      <ArrowUpRight className="w-2.5 h-2.5 inline" />
                    ) : cat.delta < 0 ? (
                      <ArrowDownRight className="w-2.5 h-2.5 inline" />
                    ) : (
                      <Minus className="w-2.5 h-2.5 inline" />
                    )}
                    {Math.abs(cat.delta)}%
                  </span>
                )}
              </div>
            </div>
            {/* Mini progress bar */}
            <div className="w-full bg-zinc-700 rounded-full h-1">
              <div
                className="h-1 rounded-full transition-all"
                style={{ width: `${cat.value}%`, background: getBarColor(cat.value) }}
              />
            </div>
            <div className="text-[9px] text-zinc-500">{cat.auditedScore}/{cat.maxScore} · {cat.itemCount} item</div>
          </div>
        ))}
      </div>

      {/* Footer note */}
      <div className="flex items-center justify-between text-[10px] text-zinc-500 border-t border-zinc-800 pt-3">
        <div className="flex items-center gap-1.5">
          <Info className="w-3 h-3 shrink-0" />
          <span>Sumbu hanya kategori relevan untuk {worker.role}.</span>
        </div>
        {hasPreviousData && (
          <span className="text-zinc-400 font-medium">
            Tersedia data historis untuk komparasi progres
          </span>
        )}
      </div>

    </div>
  );
};
