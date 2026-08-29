import React, { useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie, Legend,
} from 'recharts';
import { TrendingUp, Users, Award, BookOpen, ShieldCheck, Trophy } from 'lucide-react';
import type { WorkerProfile, DivisionStat } from '../types/assessment';
import { computeDivisionStats } from '../lib/supabaseService';
import { RoleEntity } from '../domain/RoleEntity';

interface AdminAnalyticsProps {
  workers: WorkerProfile[];
}

const TIER_COLORS: Record<string, string> = {
  'Novice Operational':  '#6b7280',
  'Pro Specialist':      '#3b82f6',
  'Elite Logistician':   '#a855f7',
  'Legendary Champion':  '#f59e0b',
};

const DIV_COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ec4899', '#8b5cf6', '#06b6d4', '#ef4444', '#84cc16'];

const StatCard: React.FC<{ label: string; value: string | number; sub?: string; icon: React.ReactNode; color: string }> = ({
  label, value, sub, icon, color,
}) => (
  <div className={`card-elevated p-4 border-l-2 ${color}`}>
    <div className="flex items-center justify-between mb-2">
      <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">{label}</span>
      {icon}
    </div>
    <div className="text-2xl font-black text-white">{value}</div>
    {sub && <div className="text-[10px] text-zinc-500 mt-0.5">{sub}</div>}
  </div>
);

export const AdminAnalytics: React.FC<AdminAnalyticsProps> = ({ workers }) => {
  // Hanya hitung staf operasional (keluarkan System Administrator & Supervisor)
  const operationalWorkers = useMemo(() => {
    return workers.filter((w) => RoleEntity.isOperationalWorker(w.role) && w.division.toUpperCase() !== 'SYSTEM');
  }, [workers]);

  const stats = useMemo<DivisionStat[]>(() => computeDivisionStats(operationalWorkers), [operationalWorkers]);

  // Summary stats
  const totalWorkers = operationalWorkers.length;
  const avgBib = totalWorkers
    ? Math.round((operationalWorkers.reduce((s, w) => s + w.bibScores.totalScore, 0) / totalWorkers) * 10) / 10
    : 0;
  const quizToday = operationalWorkers.filter((w) => w.dailyQuizCompleted).length;
  const quizRate = totalWorkers ? Math.round((quizToday / totalWorkers) * 100) : 0;

  // Tier distribution
  const tierData = useMemo(() => {
    const dist: Record<string, number> = {};
    for (const w of operationalWorkers) dist[w.tier] = (dist[w.tier] ?? 0) + 1;
    return Object.entries(dist).map(([name, value]) => ({ name, value }));
  }, [operationalWorkers]);

  // Division BIB bar chart
  const divBibData = stats.map((s, i) => ({
    name: s.division.length > 8 ? s.division.slice(0, 8) + '…' : s.division,
    fullName: s.division,
    bib: s.avgBibScore,
    workers: s.workerCount,
    color: DIV_COLORS[i % DIV_COLORS.length],
  }));

  // Top 5 workers
  const top5 = [...operationalWorkers].sort((a, b) => b.totalPoints - a.totalPoints).slice(0, 5);

  return (
    <div className="space-y-5">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard
          label="Total Pekerja"
          value={totalWorkers}
          sub={`${stats.length} divisi aktif`}
          icon={<Users className="w-4 h-4 text-zinc-500" />}
          color="border-zinc-500"
        />
        <StatCard
          label="Rata-rata BIB"
          value={avgBib}
          sub="dari skala 100"
          icon={<TrendingUp className="w-4 h-4 text-emerald-400" />}
          color="border-emerald-500"
        />
        <StatCard
          label="Kuis Hari Ini"
          value={`${quizRate}%`}
          sub={`${quizToday} dari ${totalWorkers} pekerja`}
          icon={<BookOpen className="w-4 h-4 text-cyan-400" />}
          color="border-cyan-500"
        />
        <StatCard
          label="Tertinggi"
          value={top5[0]?.totalPoints ?? 0}
          sub={top5[0]?.name ?? '-'}
          icon={<Award className="w-4 h-4 text-amber-400" />}
          color="border-amber-500"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* BIB Per Divisi */}
        <div className="card-elevated p-4">
          <div className="flex items-center gap-2 mb-4">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <h3 className="text-xs font-black text-white">Rata-rata BIB Score per Divisi</h3>
          </div>
          {divBibData.length === 0 ? (
            <p className="text-xs text-zinc-500 text-center py-8">Belum ada data divisi.</p>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={divBibData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <XAxis dataKey="name" tick={{ fill: '#71717a', fontSize: 10 }} />
                <YAxis domain={[0, 100]} tick={{ fill: '#71717a', fontSize: 10 }} />
                <Tooltip
                  contentStyle={{ background: '#18181b', border: '1px solid #3f3f46', borderRadius: 8, fontSize: 11 }}
                  formatter={(val: number, _: string, props: any) => [
                    `${val} (${props.payload.workers} pekerja)`, props.payload.fullName,
                  ]}
                />
                <Bar dataKey="bib" radius={[4, 4, 0, 0]}>
                  {divBibData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Tier Distribution */}
        <div className="card-elevated p-4">
          <div className="flex items-center gap-2 mb-4">
            <Award className="w-4 h-4 text-amber-400" />
            <h3 className="text-xs font-black text-white">Distribusi Tier Pekerja</h3>
          </div>
          {tierData.length === 0 ? (
            <p className="text-xs text-zinc-500 text-center py-8">Belum ada data tier.</p>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={tierData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  dataKey="value"
                  paddingAngle={3}
                  label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}
                  labelLine={false}
                >
                  {tierData.map((entry, i) => (
                    <Cell key={i} fill={TIER_COLORS[entry.name] ?? '#6b7280'} />
                  ))}
                </Pie>
                <Legend
                  formatter={(value) => <span style={{ fontSize: 10, color: '#a1a1aa' }}>{value}</span>}
                />
                <Tooltip
                  contentStyle={{ background: '#18181b', border: '1px solid #3f3f46', borderRadius: 8, fontSize: 11 }}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Top 5 Pekerja */}
      <div className="card-elevated p-4">
        <div className="flex items-center gap-2 mb-4">
          <Trophy className="w-4 h-4 text-amber-400" />
          <h3 className="text-xs font-black text-white">Top 5 Pekerja — Total Poin</h3>
        </div>
        <div className="space-y-2">
          {top5.map((w, i) => (
            <div key={w.id} className="flex items-center gap-3">
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 ${
                i === 0 ? 'bg-amber-500/20 text-amber-300' :
                i === 1 ? 'bg-zinc-600/30 text-zinc-300' :
                i === 2 ? 'bg-orange-900/30 text-orange-400' : 'bg-zinc-800 text-zinc-500'
              }`}>{i + 1}</span>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-bold text-white truncate">{w.name}</div>
                <div className="text-[10px] text-zinc-500">{w.division} · {w.role}</div>
              </div>
              <div className="text-right">
                <div className="text-xs font-black text-emerald-400">{w.totalPoints.toLocaleString()}</div>
                <div className="text-[10px] text-zinc-600">poin</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Division Detail Table */}
      <div className="card-elevated p-4">
        <div className="flex items-center gap-2 mb-3">
          <Users className="w-4 h-4 text-zinc-400" />
          <h3 className="text-xs font-black text-white">Statistik Per Divisi</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[11px]">
            <thead>
              <tr className="text-left text-zinc-500 border-b border-zinc-800">
                <th className="pb-2 font-bold">Divisi</th>
                <th className="pb-2 font-bold text-right">Pekerja</th>
                <th className="pb-2 font-bold text-right">Avg BIB</th>
                <th className="pb-2 font-bold text-right">Avg Poin</th>
                <th className="pb-2 font-bold text-right">Kuis %</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/50">
              {stats.map((s) => (
                <tr key={s.division} className="text-zinc-300">
                  <td className="py-2 font-semibold">{s.division}</td>
                  <td className="py-2 text-right text-zinc-400">{s.workerCount}</td>
                  <td className={`py-2 text-right font-bold ${s.avgBibScore >= 70 ? 'text-emerald-400' : s.avgBibScore >= 50 ? 'text-amber-400' : 'text-rose-400'}`}>
                    {s.avgBibScore}
                  </td>
                  <td className="py-2 text-right text-zinc-400">{s.avgTotalPoints.toLocaleString()}</td>
                  <td className={`py-2 text-right font-bold ${s.quizCompletionRate >= 70 ? 'text-cyan-400' : 'text-zinc-500'}`}>
                    {s.quizCompletionRate}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
