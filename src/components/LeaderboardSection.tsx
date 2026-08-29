import React, { useState, useMemo } from 'react';
import { LeaderboardEntry } from '../types/assessment';
import { RoleEntity } from '../domain/RoleEntity';
import { PaginationControls } from './PaginationControls';
import { Trophy, Medal, Flame, Users, ShieldCheck } from 'lucide-react';
import { WorkerAvatar } from './WorkerAvatar';

interface LeaderboardSectionProps {
  entries: LeaderboardEntry[];
  currentWorkerId: string;
}

interface DivisionLeaderboardEntry {
  division: string;
  rank: number;
  workerCount: number;
  avgBibScore: number;
  avgTotalPoints: number;
}

export const LeaderboardSection: React.FC<LeaderboardSectionProps> = ({
  entries,
  currentWorkerId,
}) => {
  const [mode, setMode] = useState<'individual' | 'division'>('individual');
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

  const filteredEntries = useMemo(() => {
    return employeeEntries.filter((e) => {
      const matchDiv = divisionFilter === 'Semua Divisi' || e.division === divisionFilter;
      const matchRole = roleFilter === 'Semua Role' || e.role === roleFilter;
      return matchDiv && matchRole;
    });
  }, [employeeEntries, divisionFilter, roleFilter]);

  const paginatedEntries = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredEntries.slice(start, start + pageSize);
  }, [filteredEntries, currentPage]);

  // Division leaderboard calculation
  const divisionRankings = useMemo<DivisionLeaderboardEntry[]>(() => {
    const divMap = new Map<string, { totalBib: number; totalPts: number; count: number }>();
    for (const e of employeeEntries) {
      const div = e.division || 'Umum';
      const existing = divMap.get(div) ?? { totalBib: 0, totalPts: 0, count: 0 };
      const score = (e as any).bibScore ?? e.totalScore;
      existing.totalBib += score;
      existing.totalPts += e.totalPoints ?? 0;
      existing.count += 1;
      divMap.set(div, existing);
    }
    const sorted = Array.from(divMap.entries())
      .map(([division, data]) => ({
        division,
        workerCount: data.count,
        avgBibScore: Math.round((data.totalBib / data.count) * 10) / 10,
        avgTotalPoints: Math.round(data.totalPts / data.count),
      }))
      .sort((a, b) => b.avgBibScore - a.avgBibScore);

    return sorted.map((d, idx) => ({ ...d, rank: idx + 1 }));
  }, [entries]);

  const getRankDisplay = (rank: number) => {
    if (rank === 1) return <Trophy className="w-4 h-4 text-amber-400 fill-amber-400" />;
    if (rank === 2) return <Medal className="w-4 h-4 text-zinc-300" />;
    if (rank === 3) return <Medal className="w-4 h-4 text-amber-700" />;
    return <span className="text-[10px] font-bold text-zinc-500 font-mono">#{rank}</span>;
  };

  const getTierClass = (tier: string) => {
    if (tier.includes('Champion')) return 'tier-legendary';
    if (tier.includes('Elite'))    return 'tier-elite';
    if (tier.includes('Pro'))      return 'tier-pro';
    return 'tier-novice';
  };

  return (
    <div className="card p-5 space-y-4 flex flex-col">

      {/* Header + Mode Switcher */}
      <div>
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Trophy className="w-4 h-4 text-amber-400" />
            Klasemen Divisi Logistik
          </h3>

          <div className="bg-zinc-950 p-0.5 rounded-lg border border-zinc-800 flex items-center gap-1">
            <button
              onClick={() => { setMode('individual'); setCurrentPage(1); }}
              className={`px-2.5 py-1 rounded-md text-[10px] font-bold transition ${
                mode === 'individual' ? 'bg-amber-600 text-white' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Individu
            </button>
            <button
              onClick={() => { setMode('division'); setCurrentPage(1); }}
              className={`px-2.5 py-1 rounded-md text-[10px] font-bold transition flex items-center gap-1 ${
                mode === 'division' ? 'bg-amber-600 text-white' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Users className="w-3 h-3" /> Tim Divisi
            </button>
          </div>
        </div>
        <p className="text-[11px] text-zinc-500 mt-0.5">
          {mode === 'individual' ? 'Berdasarkan Skor BIB & Safety Streak' : 'Peringkat rata-rata Skor BIB per Divisi'}
        </p>
      </div>

      {mode === 'individual' ? (
        <>
          {/* Division filter */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5" style={{ scrollbarWidth: 'none' }}>
            <span className="text-[10px] text-zinc-500 font-bold uppercase shrink-0 mr-1">Divisi:</span>
            {divisions.map(div => (
              <button
                key={div}
                onClick={() => { setDivisionFilter(div); setCurrentPage(1); }}
                className={`px-2.5 py-0.5 rounded-md text-[10px] font-bold whitespace-nowrap transition-all ${
                  divisionFilter === div
                    ? 'bg-indigo-600 text-white'
                    : 'bg-zinc-800/80 border border-zinc-700/60 text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {div}
              </button>
            ))}
          </div>

          {/* Role filter */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5" style={{ scrollbarWidth: 'none' }}>
            <span className="text-[10px] text-zinc-500 font-bold uppercase shrink-0 mr-1">Role:</span>
            {roles.map(role => (
              <button
                key={role}
                onClick={() => { setRoleFilter(role); setCurrentPage(1); }}
                className={`px-2.5 py-0.5 rounded-md text-[10px] font-bold whitespace-nowrap transition-all ${
                  roleFilter === role
                    ? 'bg-emerald-600 text-white'
                    : 'bg-zinc-800/80 border border-zinc-700/60 text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {role}
              </button>
            ))}
          </div>

          {/* Individual Entries */}
          <div className="space-y-1.5 flex-1">
            {paginatedEntries.map(entry => {
              const isMe = entry.workerId === currentWorkerId;
              const score = (entry as any).bibScore ?? entry.totalScore;

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
                      {getRankDisplay(entry.rank)}
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
                        <span className="text-[10px] text-zinc-500 truncate">{entry.role}</span>
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${getTierClass(entry.tier)}`}>
                          {entry.tier.split(' ')[0]}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5 shrink-0">
                    <div className="flex items-center gap-1 text-[10px] font-bold text-amber-400">
                      <Flame className="w-3 h-3" />
                      {entry.streakDays}d
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-black text-emerald-400">{score.toFixed(1)}</div>
                      <div className="text-[9px] text-zinc-600 font-semibold">BIB</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <PaginationControls
            currentPage={currentPage}
            totalItems={filteredEntries.length}
            pageSize={pageSize}
            onPageChange={p => setCurrentPage(p)}
          />
        </>
      ) : (
        /* Division Rankings */
        <div className="space-y-2 flex-1">
          {divisionRankings.map((div) => (
            <div
              key={div.division}
              className="flex items-center justify-between gap-3 p-3 rounded-xl bg-zinc-900/60 border border-zinc-800"
            >
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 flex items-center justify-center shrink-0">
                  {getRankDisplay(div.rank)}
                </div>
                <div>
                  <div className="text-xs font-bold text-white flex items-center gap-2">
                    {div.division}
                    <span className="text-[10px] font-normal text-zinc-500 flex items-center gap-1">
                      <Users className="w-3 h-3" /> {div.workerCount} anggota
                    </span>
                  </div>
                  <div className="text-[10px] text-zinc-500 mt-0.5">
                    Avg Poin: <span className="text-zinc-300 font-mono font-bold">{div.avgTotalPoints.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              <div className="text-right">
                <div className={`text-sm font-black ${
                  div.avgBibScore >= 70 ? 'text-emerald-400' : div.avgBibScore >= 50 ? 'text-amber-400' : 'text-rose-400'
                }`}>
                  {div.avgBibScore}
                </div>
                <div className="text-[9px] text-zinc-600 font-semibold flex items-center justify-end gap-0.5">
                  <ShieldCheck className="w-2.5 h-2.5 text-emerald-400" /> Avg BIB
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

    </div>
  );
};
