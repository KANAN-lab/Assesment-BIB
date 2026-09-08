import React from 'react';
import { Zap, ShieldCheck, Flame, CheckCircle2, Clock, Hourglass } from 'lucide-react';
import { WorkerProfile } from '../types/assessment';
import { getPointsExpiryInfo } from '../lib/supabaseService';
import { SystemConfigService } from '../domain/SystemConfigService';

interface DailyProgressCardProps {
  worker: WorkerProfile;
  onOpenQuiz: () => void;
  onOpenChecklist: () => void;
}

export const DailyProgressCard: React.FC<DailyProgressCardProps> = ({
  worker,
  onOpenQuiz,
  onOpenChecklist,
}) => {
  const completedCount = [worker.dailyQuizCompleted, worker.preShiftChecklistDone].filter(Boolean).length;
  const totalTasks = 2;
  const overallPct = Math.round((completedCount / totalTasks) * 100);

  const streakWeekPct = Math.min(100, Math.round((worker.streakDays % 7 || (worker.streakDays > 0 ? 7 : 0)) / 7 * 100));

  const expiryInfo = getPointsExpiryInfo(worker.totalPoints, worker.operationalPoints);

  const cfg = SystemConfigService.getConfig();
  const tasks = [
    {
      id: 'quiz',
      label: 'Kuis Safety Harian',
      description: 'Uji pengetahuan K3 & SOP logistik',
      done: worker.dailyQuizCompleted,
      reward: `+${cfg.dailyQuizRewardPoints} poin`,
      icon: Zap,
      iconColor: 'text-emerald-400',
      iconBg: 'bg-emerald-500/10 border-emerald-500/20',
      barColor: 'bg-emerald-500',
      onClick: onOpenQuiz,
    },
    {
      id: 'checklist',
      label: 'Pre-Shift Checklist',
      description: 'Inspeksi keselamatan sebelum shift',
      done: worker.preShiftChecklistDone,
      reward: `+${cfg.preShiftRewardPoints} poin`,
      icon: ShieldCheck,
      iconColor: 'text-cyan-400',
      iconBg: 'bg-cyan-500/10 border-cyan-500/20',
      barColor: 'bg-cyan-500',
      onClick: onOpenChecklist,
    },
  ];

  return (
    <div className="card p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Clock className="w-4 h-4 text-zinc-400" />
            Target Harian
          </h3>
          <p className="text-[11px] text-zinc-500 mt-0.5">
            {completedCount}/{totalTasks} tugas selesai hari ini
          </p>
        </div>
        <div className="text-right">
          <div className={`text-xl font-black ${overallPct === 100 ? 'text-emerald-400' : 'text-zinc-300'}`}>
            {overallPct}%
          </div>
          {overallPct === 100 && (
            <div className="text-[10px] text-emerald-400 font-bold flex items-center gap-1 justify-end">
              <CheckCircle2 className="w-3 h-3" /> Lengkap
            </div>
          )}
        </div>
      </div>

      {/* Dual-Wallet Mini Breakdown */}
      <div className="grid grid-cols-2 gap-2 text-[11px]">
        <div className="p-2 rounded-xl bg-zinc-950/70 border border-zinc-800/80 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-zinc-400">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
            <span>Poin Harian</span>
          </div>
          <span className="font-bold text-amber-400 font-mono">{(worker.operationalPoints ?? 0).toLocaleString()} PTS</span>
        </div>
        <div className="p-2 rounded-xl bg-zinc-950/70 border border-zinc-800/80 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-zinc-400">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-400"></span>
            <span>Poin Prestasi</span>
          </div>
          <span className="font-bold text-purple-300 font-mono">{(worker.prestigePoints ?? worker.totalPoints).toLocaleString()} PTS</span>
        </div>
      </div>

      {/* Overall progress bar */}
      <div className="w-full bg-zinc-900 rounded-full h-1.5 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${overallPct === 100 ? 'bg-emerald-500' : 'bg-zinc-600'}`}
          style={{ width: `${overallPct}%` }}
        />
      </div>

      {/* Early Warning Poin Operasional Hangus Bulanan */}
      {expiryInfo.isWarningActive && (
        <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-2.5 text-xs">
          <Hourglass className="w-4 h-4 text-amber-400 shrink-0 mt-0.5 animate-pulse" />
          <div className="space-y-0.5">
            <div className="flex items-center gap-1.5 font-bold text-amber-300">
              <span>Peringatan Masa Berlaku Poin Harian</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                H-{expiryInfo.daysRemaining}
              </span>
            </div>
            <p className="text-[11px] text-amber-200/80 leading-relaxed">
              Sebanyak <strong className="text-amber-100 font-bold">{expiryInfo.pointsExpiring} PTS Operasional</strong> akan di-reset pada{' '}
              <strong className="text-white font-medium">{expiryInfo.expiryDate}</strong>. Saldo Poin Prestasi Anda tetap aman. Segera tukarkan di Katalog Reward!
            </p>
          </div>
        </div>
      )}

      {/* Task list */}
      <div className="space-y-2.5">
        {tasks.map((task) => {
          const Icon = task.icon;
          return (
            <button
              key={task.id}
              onClick={task.done ? undefined : task.onClick}
              disabled={task.done}
              className={`w-full flex items-center gap-3 p-3 rounded-xl border transition text-left ${
                task.done
                  ? 'border-zinc-800/60 bg-zinc-950/40 cursor-default'
                  : 'border-zinc-800 bg-zinc-950 hover:border-zinc-700 hover:bg-zinc-900/60 cursor-pointer'
              }`}
            >
              <div className={`w-9 h-9 shrink-0 rounded-xl border flex items-center justify-center ${task.done ? 'bg-emerald-500/10 border-emerald-500/20' : task.iconBg}`}>
                {task.done
                  ? <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  : <Icon className={`w-5 h-5 ${task.iconColor}`} />
                }
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className={`text-xs font-bold ${task.done ? 'text-zinc-500 line-through' : 'text-white'}`}>
                    {task.label}
                  </span>
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0 ${
                    task.done
                      ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                      : 'bg-zinc-800 text-zinc-400 border border-zinc-700'
                  }`}>
                    {task.done ? 'Selesai ✓' : task.reward}
                  </span>
                </div>
                <p className="text-[10px] text-zinc-500 mt-0.5">{task.description}</p>
                {/* Per-task progress bar */}
                <div className="w-full bg-zinc-900 rounded-full h-1 mt-2 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${task.done ? 'bg-emerald-500' : task.barColor + '/40'}`}
                    style={{ width: task.done ? '100%' : '0%' }}
                  />
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Weekly streak section */}
      <div className="border-t border-zinc-800/60 pt-3.5">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <Flame className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-[11px] font-bold text-zinc-300">Streak Aktif</span>
          </div>
          <span className="text-[11px] font-black text-amber-300">{worker.streakDays} hari</span>
        </div>
        <div className="flex gap-1">
          {Array.from({ length: 7 }).map((_, i) => {
            const filled = i < (worker.streakDays % 7 || (worker.streakDays > 0 ? 7 : 0));
            return (
              <div
                key={i}
                className={`flex-1 h-1.5 rounded-full transition-all ${filled ? 'bg-amber-400' : 'bg-zinc-800'}`}
              />
            );
          })}
        </div>
        <p className="text-[10px] text-zinc-600 mt-1.5">
          {worker.streakDays % 7 === 0 && worker.streakDays > 0
            ? 'Minggu ini penuh! 🔥'
            : `${7 - (worker.streakDays % 7)} hari lagi lengkap minggu ini`}
        </p>
      </div>
    </div>
  );
};
