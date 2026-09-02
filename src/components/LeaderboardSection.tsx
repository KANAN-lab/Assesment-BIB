import React, { useState, useMemo } from 'react';
import { LeaderboardEntry } from '../types/assessment';
import { RoleEntity } from '../domain/RoleEntity';
import { PaginationControls } from './PaginationControls';
import { Trophy, Medal, Flame, Users, ShieldCheck, Coins, Building2, Crown } from 'lucide-react';
import { WorkerAvatar } from './WorkerAvatar';

interface LeaderboardSectionProps {
  entries: LeaderboardEntry[];
  currentWorkerId: string;
}

interface DivisionLeaderboardEntry {
  division: string;
  rank: number;
  workerCount: number;
  totalPoints: number;
  avgBibScore: number;
  avgTotalPoints: number;
  topWorkerName?: string;
  topWorkerPoints?: number;
}

export const LeaderboardSection: React.FC<LeaderboardSectionProps> = ({
  entries,
  currentWorkerId,
}) => {
  const [scope, setScope] = useState<'division' | 'individual'>('division');
  const [divisionFilter, setDivisionFilter] = useState('Semua Divisi');
  const [roleFilter, setRoleFilter] = useState('Semua Role');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 5;

  // Filter secara ketat: Hanya sesama employee biasa yang tampil di Leaderboard
  const employeeEntries = useMemo(() => {
    return entries.filter((e) => RoleEntity.resolveSystemRole(e.role) === 'worker');
  }, [entries]);

  const divisions = useMemo(() => {
    const unique = Array.from(new Set(employeeEntries.map((e) => e.division).filter(Boolean)));
    return ['Semua Divisi', ...unique];
  }, [employeeEntries]);

  const roles = useMemo(() => {
    const unique = Array.from(new Set(employeeEntries.map((e) => e.role)));
    return ['Semua Role', ...unique.slice(0, 5)];
  }, [employeeEntries]);

  // Individual entries sorted by combined PTS then BIB
  const sortedIndividualEntries = useMemo(() => {
    const filtered = employeeEntries.filter((e) => {
      const matchDiv = divisionFilter === 'Semua Divisi' || e.division === divisionFilter;
      const matchRole = roleFilter === 'Semua Role' || e.role === roleFilter;
      return matchDiv && matchRole;
    });

    return [...filtered].sort((a, b) => {
      const diffPts = (b.totalPoints || 0) - (a.totalPoints || 0);
      if (diffPts !== 0) return diffPts;
      return (b.totalScore || 0) - (a.totalScore || 0);
    });
  }, [employeeEntries, divisionFilter, roleFilter]);

  const paginatedEntries = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedIndividualEntries.slice(start, start + pageSize);
  }, [sortedIndividualEntries, currentPage]);

  // Division leaderboard calculation & sorting
  const divisionRankings = useMemo<DivisionLeaderboardEntry[]>(() => {
    const divMap = new Map<string, { totalBib: number; totalPts: number; count: number; workers: typeof employeeEntries }>();
    for (const e of employeeEntries) {
      const div = e.division || 'Umum';
      const existing = divMap.get(div) ?? { totalBib: 0, totalPts: 0, count: 0, workers: [] };
      const score = (e as any).bibScore ?? e.totalScore ?? 0;
      existing.totalBib += score;
      existing.totalPts += e.totalPoints || 0;
      existing.count += 1;
      existing.workers.push(e);
      divMap.set(div, existing);
    }

    const aggregated = Array.from(divMap.entries()).map(([division, data]) => {
      const sortedW = [...data.workers].sort((a, b) => (b.totalPoints || 0) - (a.totalPoints || 0));
      const topW = sortedW[0];

      return {
        division,
        workerCount: data.count,
        totalPoints: data.totalPts,
        avgBibScore: Math.round((data.totalBib / data.count) * 10) / 10,
        avgTotalPoints: Math.round(data.totalPts / data.count),
        topWorkerName: topW?.name,
        topWorkerPoints: topW?.totalPoints || 0,
      };
    });

    // Sort by Total Points, then Average BIB
    aggregated.sort((a, b) => b.totalPoints - a.totalPoints || b.avgBibScore - a.avgBibScore);

    return aggregated.map((d, idx) => ({ ...d, rank: idx + 1 }));
  }, [employeeEntries]);

  const maxDivisionPoints = useMemo(() => {
    return Math.max(...divisionRankings.map(d => d.totalPoints), 1);
  }, [divisionRankings]);

  const getRankDisplay = (rank: number) => {
    if (rank === 1) return <Trophy className="w-4 h-4 text-amber-400 fill-amber-400" />;
    if (rank === 2) return <Medal className="w-4 h-4 text-zinc-300 fill-zinc-300" />;
    if (rank === 3) return <Medal className="w-4 h-4 text-amber-700 fill-amber-700" />;
    return <span className="text-[11px] font-bold text-zinc-500 font-mono">#{rank}</span>;
  };

  const getTierClass = (tier: string = '') => {
    if (tier.includes('Champion')) return 'tier-legendary';
    if (tier.includes('Elite')) return 'tier-elite';
    if (tier.includes('Pro')) return 'tier-pro';
    return 'tier-novice';
  };

  return (
    <div className="card p-5 space-y-4 flex flex-col">
      {/* Header + Scope Switcher */}
      <div className="flex items-center justify-between gap-2 flex-wrap pb-1">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
            <Trophy className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-black text-white">
              {scope === 'division' ? 'Klasemen Divisi Logistik' : 'Klasemen Individu (Operational Employee)'}
            </h3>
            <p className="text-[11px] text-zinc-400 mt-0.5">
              {scope === 'division'
                ? 'Akumulasi Poin Prestasi & Rata-rata Kepatuhan K3'
                : 'Peringkat Poin PTS & Kepatuhan Safety BIB'}
            </p>
          </div>
        </div>

        {/* Scope Toggle: Divisi vs Individu */}
        <div className="bg-zinc-950 p-1 rounded-xl border border-zinc-800 flex items-center gap-1">
          <button
            onClick={() => { setScope('division'); setCurrentPage(1); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
              scope === 'division' ? 'bg-amber-600 text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>Divisi</span>
          </button>
          <button
            onClick={() => { setScope('individual'); setCurrentPage(1); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
              scope === 'individual' ? 'bg-amber-600 text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Individu</span>
          </button>
        </div>
      </div>

      {/* ─── MODE: KLASEMEN DIVISI ─── */}
      {scope === 'division' ? (
        <div className="space-y-3 flex-1">
          {divisionRankings.map((div) => {
            const percentOfMax = Math.round((div.totalPoints / maxDivisionPoints) * 100);

            return (
              <div
                key={div.division}
                className="p-3.5 rounded-2xl bg-zinc-900/70 border border-zinc-800/80 space-y-2.5 hover:border-zinc-700 transition"
              >
                {/* Header Baris Utama */}
                <div className="flex items-center justify-between gap-3">
                  {/* Kiri: Rank + Nama Divisi + Operational Tag */}
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-7 h-7 flex items-center justify-center shrink-0">
                      {getRankDisplay(div.rank)}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-black text-white">{div.division}</h4>
                        <span className="text-[10px] font-bold text-zinc-400 px-2 py-0.5 bg-zinc-800 border border-zinc-700 rounded-md">
                          {div.workerCount} Operational
                        </span>
                      </div>
                      {div.topWorkerName ? (
                        <p className="text-[11px] text-zinc-400 mt-0.5 truncate flex items-center gap-1">
                          <Crown className="w-3 h-3 text-amber-400 shrink-0" />
                          <span>MVP: <strong className="text-zinc-200">{div.topWorkerName}</strong></span>
                        </p>
                      ) : (
                        <p className="text-[11px] text-zinc-500 mt-0.5">Belum ada aktivitas</p>
                      )}
                    </div>
                  </div>

                  {/* Kanan: Sepasang Nilai Bersih (Total PTS & Skor BIB) */}
                  <div className="text-right shrink-0">
                    <div className="text-base font-black text-amber-400 font-mono flex items-center justify-end gap-1">
                      <Coins className="w-3.5 h-3.5 text-amber-400" />
                      <span>{div.totalPoints.toLocaleString()}</span>
                      <span className="text-[10px] font-bold text-zinc-400">PTS</span>
                    </div>
                    <div className="text-[10px] text-emerald-400 font-semibold flex items-center justify-end gap-1 mt-0.5">
                      <ShieldCheck className="w-3 h-3" />
                      <span>{div.avgBibScore.toFixed(1)} BIB</span>
                    </div>
                  </div>
                </div>

                {/* Progress Bar & Sub-Stat */}
                <div className="space-y-1 pt-0.5">
                  <div className="w-full bg-zinc-950 rounded-full h-1.5 overflow-hidden border border-zinc-800/80">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-amber-600 to-amber-400 transition-all duration-500"
                      style={{ width: `${Math.max(percentOfMax, div.totalPoints > 0 ? 8 : 0)}%` }}
                    />
                  </div>
                  <div className="flex justify-between items-center text-[10px] text-zinc-500">
                    <span>Rata-rata: <strong className="text-zinc-300">{div.avgTotalPoints.toLocaleString()} PTS</strong>/user</span>
                    <span>Kepatuhan K3: <strong className="text-emerald-400">{div.avgBibScore} BIB</strong></span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* ─── MODE: INDIVIDU ─── */
        <>
          {/* Filters */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 custom-scrollbar">
              <span className="text-[10px] text-zinc-500 font-bold uppercase shrink-0 mr-1">Divisi:</span>
              {divisions.map(div => (
                <button
                  key={div}
                  onClick={() => { setDivisionFilter(div); setCurrentPage(1); }}
                  className={`px-2.5 py-0.5 rounded-md text-[10px] font-bold whitespace-nowrap transition-all ${
                    divisionFilter === div
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'bg-zinc-800/80 border border-zinc-700/60 text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  {div}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 custom-scrollbar">
              <span className="text-[10px] text-zinc-500 font-bold uppercase shrink-0 mr-1">Role:</span>
              {roles.map(role => (
                <button
                  key={role}
                  onClick={() => { setRoleFilter(role); setCurrentPage(1); }}
                  className={`px-2.5 py-0.5 rounded-md text-[10px] font-bold whitespace-nowrap transition-all ${
                    roleFilter === role
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'bg-zinc-800/80 border border-zinc-700/60 text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  {role}
                </button>
              ))}
            </div>
          </div>

          {/* Individual List */}
          <div className="space-y-1.5 flex-1">
            {paginatedEntries.length === 0 ? (
              <div className="py-10 text-center text-zinc-500 text-xs">
                Tidak ada user operasional yang sesuai dengan filter.
              </div>
            ) : (
              paginatedEntries.map((entry, index) => {
                const isMe = entry.workerId === currentWorkerId;
                const dynamicRank = (currentPage - 1) * pageSize + index + 1;
                const score = (entry as any).bibScore ?? entry.totalScore ?? 0;
                const points = entry.totalPoints || 0;

                return (
                  <div
                    key={entry.workerId}
                    className={`flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl border transition-all ${
                      isMe
                        ? 'bg-emerald-950/30 border-emerald-500/30 ring-1 ring-emerald-500/15'
                        : 'bg-zinc-800/50 border-zinc-800 hover:border-zinc-700'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-6 h-6 flex items-center justify-center shrink-0">
                        {getRankDisplay(dynamicRank)}
                      </div>

                      <WorkerAvatar
                        src={entry.avatar}
                        name={entry.name}
                        className="w-8 h-8 rounded-lg ring-1 ring-zinc-700 shrink-0"
                      />

                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-zinc-100 truncate">{entry.name}</span>
                          {isMe && (
                            <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-emerald-600/20 border border-emerald-500/30 text-emerald-400 uppercase shrink-0">
                              ANDA
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-[10px] text-zinc-500 truncate">{entry.role} ({entry.division})</span>
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${getTierClass(entry.tier)}`}>
                            {entry.tier.split(' ')[0]}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <div className="flex items-center gap-1 text-[10px] font-bold text-amber-400">
                        <Flame className="w-3 h-3" />
                        {entry.streakDays}d
                      </div>

                      {/* Dual Metric Display: PTS + BIB */}
                      <div className="text-right">
                        <div className="text-xs font-black text-amber-400 font-mono">
                          {points.toLocaleString()} <span className="text-[9px] text-zinc-500">PTS</span>
                        </div>
                        <div className="text-[9px] text-emerald-400 font-semibold mt-0.5">
                          {score.toFixed(1)} BIB
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <PaginationControls
            currentPage={currentPage}
            totalItems={sortedIndividualEntries.length}
            pageSize={pageSize}
            onPageChange={p => setCurrentPage(p)}
          />
        </>
      )}
    </div>
  );
};
