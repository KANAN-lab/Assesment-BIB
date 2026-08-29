import React, { useMemo } from 'react';
import {
  ResponsiveContainer, RadarChart, PolarGrid,
  PolarAngleAxis, PolarRadiusAxis, Radar,
} from 'recharts';
import { WorkerProfile } from '../types/assessment';
import { matrixEngine } from '../domain/CompetencyMatrixEngine';
import { BarChart3, Info } from 'lucide-react';

interface BibRadarChartProps {
  worker: WorkerProfile;
  competencyScores?: Record<string, number>;
}

export const BibRadarChart: React.FC<BibRadarChartProps> = ({
  worker,
  competencyScores = {},
}) => {
  const roleColumnKey = useMemo(
    () => matrixEngine.resolveRoleColumnKey(worker.role),
    [worker.role]
  );

  const categoryData = useMemo(() => {
    const summaries = matrixEngine.calculateCategorySummaries(
      worker.role,
      competencyScores,
      worker.bibScores.totalScore
    );
    return summaries.map(c => ({
      subject: c.category,
      value: c.percentage,
      auditedScore: c.auditedScore,
      maxScore: c.maxScore,
      itemCount: c.itemCount,
      fullMark: 100,
    }));
  }, [worker.role, competencyScores, worker.bibScores.totalScore]);

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
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-emerald-400" />
            Radar Kompetensi Matrix
          </h3>
          <p className="text-[11px] text-zinc-500 mt-0.5">
            {roleColumnKey} · {categoryData.length} kategori aktif
          </p>
        </div>
        <span className={`text-[10px] font-bold px-2.5 py-1 rounded-md border shrink-0 ${grade.cls}`}>
          {overallPct}% · {grade.label}
        </span>
      </div>

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
            <Radar
              name="Capaian"
              dataKey="value"
              stroke="#10b981"
              fill="#10b981"
              fillOpacity={0.2}
              strokeWidth={2}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>

      {/* Category breakdown — compact grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 pt-3 border-t border-zinc-800 max-h-40 overflow-y-auto custom-scrollbar">
        {categoryData.map(cat => (
          <div key={cat.subject} className="bg-zinc-800/60 rounded-xl p-2.5 border border-zinc-800">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] text-zinc-400 font-semibold truncate max-w-[70px]" title={cat.subject}>
                {cat.subject}
              </span>
              <span className="text-[11px] font-black ml-1 shrink-0" style={{ color: getBarColor(cat.value) }}>
                {cat.value}%
              </span>
            </div>
            {/* Mini progress bar */}
            <div className="w-full bg-zinc-700 rounded-full h-1">
              <div
                className="h-1 rounded-full transition-all"
                style={{ width: `${cat.value}%`, background: getBarColor(cat.value) }}
              />
            </div>
            <div className="text-[9px] text-zinc-600 mt-1">{cat.auditedScore}/{cat.maxScore} · {cat.itemCount} item</div>
          </div>
        ))}
      </div>

      {/* Footer note */}
      <div className="flex items-center gap-1.5 text-[10px] text-zinc-600 border-t border-zinc-800 pt-3">
        <Info className="w-3 h-3 shrink-0" />
        Sumbu hanya kategori relevan untuk {worker.role}.
      </div>

    </div>
  );
};
