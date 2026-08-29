import React from 'react';
import { Target, Trophy, Flame, TrendingUp, Award, CheckCircle2, ShieldCheck } from 'lucide-react';
import { WorkerProfile } from '../types/assessment';

interface PerformanceSummaryCardProps {
  worker: WorkerProfile;
  onOpenCompetencyModal: () => void;
}

export const PerformanceSummaryCard: React.FC<PerformanceSummaryCardProps> = ({
  worker,
  onOpenCompetencyModal,
}) => {
  // Hitung target tier berikutnya
  const getNextTierGoal = (currentPoints: number, tier: string) => {
    if (tier.includes('Champion')) return { targetPoints: 5000, nextTier: 'Legendary Master', remaining: 0 };
    if (tier.includes('Elite'))    return { targetPoints: 2500, nextTier: 'Safety Champion', remaining: Math.max(0, 2500 - currentPoints) };
    if (tier.includes('Pro'))      return { targetPoints: 1000, nextTier: 'Elite Operational', remaining: Math.max(0, 1000 - currentPoints) };
    return { targetPoints: 500, nextTier: 'Pro Operational', remaining: Math.max(0, 500 - currentPoints) };
  };

  const tierGoal = getNextTierGoal(worker.totalPoints, worker.tier);
  const tierProgressPct = Math.min(100, Math.round((worker.totalPoints / tierGoal.targetPoints) * 100));

  // Target poin aktivitas harian per minggu (7 hari x (50 pts kuis + 30 pts checklist) = 560 PTS)
  const weeklyTargetPts = 560;
  const currentWeeklyPts = worker.totalPoints % weeklyTargetPts;
  const weeklyPct = Math.min(100, Math.round((currentWeeklyPts / weeklyTargetPts) * 100));

  return (
    <div className="card p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Target className="w-4 h-4 text-emerald-400" />
            Target & Progress Performa
          </h3>
          <p className="text-[11px] text-zinc-500 mt-0.5">
            Target aktivitas harian: Kuis Safety (+50 PTS) & Pre-Shift (+30 PTS) · 560 PTS/minggu
          </p>
        </div>
        <button
          onClick={onOpenCompetencyModal}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-950/60 hover:bg-indigo-900/60 text-indigo-300 text-xs font-bold border border-indigo-500/30 rounded-xl transition"
          title="Lihat Rincian Matrix Kompetensi Saya"
        >
          <Award className="w-3.5 h-3.5 text-indigo-400" />
          Detail Kompetensi
        </button>
      </div>

      {/* Grid: 2 Progress Bars (Weekly Goal & Tier Advancement) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">

        {/* Card 1: Target Poin Mingguan */}
        <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-3.5 flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-zinc-300 flex items-center gap-1.5">
              <Award className="w-3.5 h-3.5 text-amber-400" />
              Target Aktivitas Mingguan
            </span>
            <span className="text-xs font-black text-amber-400">{weeklyPct}%</span>
          </div>

          <div>
            <div className="flex items-baseline justify-between text-[11px] mb-1">
              <span className="text-white font-bold font-mono">{currentWeeklyPts} / {weeklyTargetPts} PTS</span>
              <span className="text-zinc-500">Target 80 PTS/hari</span>
            </div>
            <div className="w-full bg-zinc-900 rounded-full h-2 overflow-hidden">
              <div
                className="h-full bg-amber-400 rounded-full transition-all duration-700"
                style={{ width: `${weeklyPct}%` }}
              />
            </div>
          </div>
        </div>

        {/* Card 2: Milestone Tier Berikutnya */}
        <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-3.5 flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-zinc-300 flex items-center gap-1.5">
              <Trophy className="w-3.5 h-3.5 text-emerald-400" />
              Menuju {tierGoal.nextTier}
            </span>
            <span className="text-xs font-black text-emerald-400">{tierProgressPct}%</span>
          </div>

          <div>
            <div className="flex items-baseline justify-between text-[11px] mb-1">
              <span className="text-white font-bold font-mono">{worker.totalPoints} / {tierGoal.targetPoints} PTS</span>
              <span className="text-zinc-500">
                {tierGoal.remaining > 0 ? `${tierGoal.remaining} pts lagi` : 'Tier Max! 🎉'}
              </span>
            </div>
            <div className="w-full bg-zinc-900 rounded-full h-2 overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all duration-700"
                style={{ width: `${tierProgressPct}%` }}
              />
            </div>
          </div>
        </div>

      </div>

      {/* Footer: Streak Active & Status Insiden */}
      <div className="border-t border-zinc-800/60 pt-3 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <Flame className="w-4 h-4 text-amber-400 shrink-0" />
          <span className="text-zinc-300 font-medium">
            Streak Aktif: <strong className="text-amber-300 font-bold">{worker.streakDays} Hari</strong>
          </span>
        </div>
        <div className="flex items-center gap-1 text-[11px] text-emerald-400 font-semibold">
          <ShieldCheck className="w-3.5 h-3.5" /> Zero Harm K3
        </div>
      </div>
    </div>
  );
};
