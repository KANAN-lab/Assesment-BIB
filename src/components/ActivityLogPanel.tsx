import React, { useState } from 'react';
import { Activity, LogIn, LogOut, Key, Shield, BookOpen, CheckCircle2, ShieldAlert, User, RefreshCw, Award, ArrowRightLeft, BookMarked } from 'lucide-react';
import type { ActivityLog, ActivityAction } from '../types/assessment';

interface ActivityLogPanelProps {
  logs: ActivityLog[];
  onRefresh?: () => void;
  loading?: boolean;
}

const ACTION_CONFIG: Record<ActivityAction, { icon: React.ReactNode; label: string; color: string }> = {
  login:                { icon: <LogIn className="w-3.5 h-3.5" />,       label: 'Login',            color: 'text-emerald-400 bg-emerald-500/10' },
  logout:               { icon: <LogOut className="w-3.5 h-3.5" />,      label: 'Logout',           color: 'text-zinc-400 bg-zinc-700/30' },
  password_reset:       { icon: <Key className="w-3.5 h-3.5" />,         label: 'Reset Password',   color: 'text-amber-400 bg-amber-500/10' },
  profile_update:       { icon: <User className="w-3.5 h-3.5" />,        label: 'Update Profil',    color: 'text-sky-400 bg-sky-500/10' },
  badge_awarded:        { icon: <Shield className="w-3.5 h-3.5" />,      label: 'Badge Diraih',     color: 'text-violet-400 bg-violet-500/10' },
  quiz_completed:       { icon: <BookOpen className="w-3.5 h-3.5" />,    label: 'Kuis Selesai',     color: 'text-cyan-400 bg-cyan-500/10' },
  checklist_completed:  { icon: <CheckCircle2 className="w-3.5 h-3.5" />,label: 'Checklist Selesai',color: 'text-green-400 bg-green-500/10' },
  incident_reported:    { icon: <ShieldAlert className="w-3.5 h-3.5" />, label: 'Laporan Insiden',  color: 'text-orange-400 bg-orange-500/10' },
  kudo_sent:            { icon: <Award className="w-3.5 h-3.5" />,       label: 'Kirim Kudo',       color: 'text-sky-400 bg-sky-500/10' },
  kudo_received:        { icon: <Award className="w-3.5 h-3.5" />,       label: 'Terima Kudo',      color: 'text-amber-400 bg-amber-500/10' },
  shift_handover:       { icon: <ArrowRightLeft className="w-3.5 h-3.5" />, label: 'Handover Shift', color: 'text-indigo-400 bg-indigo-500/10' },
  sop_completed:        { icon: <BookMarked className="w-3.5 h-3.5" />,  label: 'SOP Selesai',      color: 'text-purple-400 bg-purple-500/10' },
  kaizen_submitted:     { icon: <Activity className="w-3.5 h-3.5" />,    label: 'Submit Kaizen',    color: 'text-amber-400 bg-amber-500/10' },
  kaizen_approved:      { icon: <CheckCircle2 className="w-3.5 h-3.5" />,label: 'Kaizen Disetujui', color: 'text-emerald-400 bg-emerald-500/10' },
};

function formatTimeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'baru saja';
  if (mins < 60) return `${mins} mnt lalu`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} jam lalu`;
  const days = Math.floor(hrs / 24);
  return `${days} hari lalu`;
}

export const ActivityLogPanel: React.FC<ActivityLogPanelProps> = ({ logs, onRefresh, loading }) => {
  const [filterAction, setFilterAction] = useState<ActivityAction | 'all'>('all');

  const filtered = filterAction === 'all'
    ? logs
    : logs.filter((l) => l.action === filterAction);

  const actionCounts = logs.reduce<Record<string, number>>((acc, l) => {
    acc[l.action] = (acc[l.action] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-cyan-400" />
          <h3 className="text-sm font-black text-white">Log Aktivitas</h3>
          <span className="text-[10px] text-zinc-500 bg-zinc-800 px-2 py-0.5 rounded-full">{logs.length} entri</span>
        </div>
        {onRefresh && (
          <button
            onClick={onRefresh}
            disabled={loading}
            className="text-zinc-500 hover:text-zinc-300 transition disabled:opacity-50"
            title="Refresh log"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        )}
      </div>

      {/* Filter Pills */}
      <div className="flex flex-wrap gap-1.5">
        <button
          onClick={() => setFilterAction('all')}
          className={`text-[10px] font-bold px-2 py-1 rounded-full border transition ${
            filterAction === 'all'
              ? 'bg-zinc-700 border-zinc-600 text-white'
              : 'bg-transparent border-zinc-800 text-zinc-500 hover:text-zinc-300'
          }`}
        >
          Semua ({logs.length})
        </button>
        {(Object.keys(ACTION_CONFIG) as ActivityAction[]).map((action) => {
          if (!actionCounts[action]) return null;
          const cfg = ACTION_CONFIG[action];
          return (
            <button
              key={action}
              onClick={() => setFilterAction(action)}
              className={`text-[10px] font-bold px-2 py-1 rounded-full border transition flex items-center gap-1 ${
                filterAction === action
                  ? `${cfg.color} border-current/30`
                  : 'bg-transparent border-zinc-800 text-zinc-500 hover:text-zinc-300'
              }`}
            >
              {cfg.icon}
              {cfg.label} ({actionCounts[action]})
            </button>
          );
        })}
      </div>

      {/* Log Entries */}
      {filtered.length === 0 ? (
        <div className="text-center py-10">
          <Activity className="w-8 h-8 text-zinc-700 mx-auto mb-2" />
          <p className="text-xs text-zinc-600">Belum ada aktivitas tercatat.</p>
        </div>
      ) : (
        <div className="space-y-1 max-h-[420px] overflow-y-auto custom-scrollbar pr-1">
          {filtered.map((log) => {
            const cfg = ACTION_CONFIG[log.action] ?? ACTION_CONFIG.login;
            return (
              <div
                key={log.id}
                className="flex items-start gap-3 p-2.5 rounded-xl bg-zinc-900/50 hover:bg-zinc-900 transition"
              >
                <span className={`p-1.5 rounded-lg shrink-0 ${cfg.color}`}>{cfg.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-white truncate">
                      {log.workerName ?? 'Unknown'}
                    </span>
                    <span className="text-[10px] text-zinc-600 whitespace-nowrap shrink-0">
                      {formatTimeAgo(log.createdAt)}
                    </span>
                  </div>
                  <div className="text-[10px] text-zinc-500 mt-0.5">
                    {cfg.label}{log.detail ? ` — ${log.detail}` : ''}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
