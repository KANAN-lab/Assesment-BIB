import React, { useState, useEffect, useMemo } from 'react';
import {
  GraduationCap,
  Search,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Bell,
  RefreshCw,
  BookOpen,
  User,
  Calendar,
  Layers,
  Filter
} from 'lucide-react';
import { TrainingAssignmentService, TrainingAssignmentRecord } from '../domain/TrainingAssignmentService';
import { WorkerProfile } from '../types/assessment';
import { NotificationEngine } from '../domain/NotificationEngine';
import { supabase } from '../lib/supabaseClient';

interface TrainingMonitoringPanelProps {
  workers?: WorkerProfile[];
  currentUserName?: string;
}

export const TrainingMonitoringPanel: React.FC<TrainingMonitoringPanelProps> = ({
  workers = [],
  currentUserName = 'Supervisor Logistik',
}) => {
  const [assignments, setAssignments] = useState<TrainingAssignmentRecord[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'completed' | 'overdue'>('all');
  const [divisionFilter, setDivisionFilter] = useState<string>('all');
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);

  const loadAssignments = () => {
    const list = TrainingAssignmentService.getAssignments();
    setAssignments(list);
  };

  const syncFromCloud = async () => {
    setIsSyncing(true);
    try {
      const list = await TrainingAssignmentService.fetchFromSupabase();
      setAssignments(list);
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    loadAssignments();
    syncFromCloud();

    const handleUpdate = () => {
      loadAssignments();
    };

    window.addEventListener('bib_training_assignments_updated', handleUpdate);

    const channel = supabase
      .channel('realtime_training_monitoring_panel')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'system_settings',
          filter: `key=eq.${TrainingAssignmentService.CLOUD_SETTINGS_KEY}`,
        },
        () => {
          TrainingAssignmentService.fetchFromSupabase()
            .then(setAssignments)
            .catch(() => {});
        }
      )
      .subscribe();

    return () => {
      window.removeEventListener('bib_training_assignments_updated', handleUpdate);
      supabase.removeChannel(channel);
    };
  }, []);

  const showNotification = (msg: string) => {
    setActionFeedback(msg);
    setTimeout(() => setActionFeedback(null), 3500);
  };

  // Helper untuk parsing deadline apakah sudah terlewat
  const checkIsOverdue = (assignment: TrainingAssignmentRecord): boolean => {
    if (assignment.isCompleted) return false;
    // Format deadlineDate bisa string atau timestamp
    try {
      const assignedTime = new Date(assignment.assignedAt).getTime();
      const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
      return Date.now() > assignedTime + sevenDaysMs;
    } catch {
      return false;
    }
  };

  // Metric Tiles Summary
  const stats = useMemo(() => {
    const total = assignments.length;
    const completed = assignments.filter((a) => a.isCompleted).length;
    const active = assignments.filter((a) => !a.isCompleted).length;
    const overdue = assignments.filter((a) => checkIsOverdue(a)).length;
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 100;
    return { total, completed, active, overdue, completionRate };
  }, [assignments]);

  // Unique Divisions
  const divisions = useMemo(() => {
    const set = new Set<string>();
    assignments.forEach((a) => {
      if (a.division) set.add(a.division);
    });
    return Array.from(set);
  }, [assignments]);

  // Filtered Assignments
  const filteredAssignments = useMemo(() => {
    return assignments.filter((a) => {
      const isOverdue = checkIsOverdue(a);

      // Status filter
      if (statusFilter === 'active' && a.isCompleted) return false;
      if (statusFilter === 'completed' && !a.isCompleted) return false;
      if (statusFilter === 'overdue' && !isOverdue) return false;

      // Division filter
      if (divisionFilter !== 'all' && a.division !== divisionFilter) return false;

      // Search query
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchWorker = (a.workerName || '').toLowerCase().includes(q) || (a.workerId || '').toLowerCase().includes(q);
        const matchModule = (a.moduleTitle || '').toLowerCase().includes(q) || (a.moduleCode || '').toLowerCase().includes(q);
        const matchCategory = (a.category || '').toLowerCase().includes(q);
        return matchWorker || matchModule || matchCategory;
      }

      return true;
    });
  }, [assignments, statusFilter, divisionFilter, search]);

  // Reminder Action
  const handleSendReminder = (item: TrainingAssignmentRecord) => {
    NotificationEngine.addNotification({
      recipientId: item.workerId,
      recipientRole: 'worker',
      title: `⏰ Pengingat Re-Training K3: ${item.moduleCode}`,
      message: `Peringatan: Re-Training modul ${item.moduleTitle} ditugaskan sampai ${item.deadlineDate}. Segera selesaikan sebelum batas waktu berakhir.`,
      type: 'audit',
    });
    showNotification(`Notifikasi pengingat terkirim ke ${item.workerName || 'Pekerja'}.`);
  };

  // Mark Completed Manually
  const handleMarkCompleted = (item: TrainingAssignmentRecord) => {
    const success = TrainingAssignmentService.markAssignmentCompleted(
      item.workerId,
      item.moduleCode,
      item.workerName
    );
    if (success) {
      loadAssignments();
      showNotification(`Modul ${item.moduleCode} berhasil ditandai selesai untuk ${item.workerName}.`);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Feedback banner */}
      {actionFeedback && (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{actionFeedback}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="card-elevated p-5 sm:p-6 border border-emerald-500/30 bg-gradient-to-br from-emerald-950/30 via-zinc-950 to-zinc-900 shadow-xl relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0 shadow-lg">
              <GraduationCap className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-white tracking-tight">
                  Monitoring & Rekap Penugasan Re-Training SOP
                </h2>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  BIB Engine
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-0.5">
                Pemantauan penugasan modul perbaikan gap kompetensi otomatis pasca-audit K3 & operasional logistik.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={syncFromCloud}
            disabled={isSyncing}
            className="px-3 py-2 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-60 text-zinc-300 rounded-xl text-xs font-bold transition flex items-center gap-1.5 self-start sm:self-center shrink-0 border border-zinc-700"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-emerald-400' : ''}`} />
            <span>{isSyncing ? 'Menyinkronkan...' : 'Segarkan Cloud'}</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Tiles */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800">
          <div className="text-[10px] uppercase font-bold text-zinc-500 mb-1">Total Penugasan</div>
          <div className="text-2xl font-black text-white">{stats.total}</div>
          <p className="text-[10px] text-zinc-500 mt-1">Dikeluarkan oleh sistem/audit</p>
        </div>

        <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800">
          <div className="text-[10px] uppercase font-bold text-amber-500 mb-1">Sedang Berjalan</div>
          <div className="text-2xl font-black text-amber-400">{stats.active}</div>
          <p className="text-[10px] text-zinc-500 mt-1">Tugas dalam proses belajar</p>
        </div>

        <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800">
          <div className="text-[10px] uppercase font-bold text-emerald-500 mb-1">Selesai Dituntaskan</div>
          <div className="text-2xl font-black text-emerald-400">{stats.completed}</div>
          <p className="text-[10px] text-emerald-500/80 mt-1">{stats.completionRate}% Tingkat Kepatuhan</p>
        </div>

        <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800">
          <div className="text-[10px] uppercase font-bold text-rose-500 mb-1">Lewat Tenggat (Overdue)</div>
          <div className="text-2xl font-black text-rose-400">{stats.overdue}</div>
          <p className="text-[10px] text-rose-500/80 mt-1">Perlu tindakan/briefing langsung</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-zinc-950 p-3.5 rounded-xl border border-zinc-800">
        <div className="flex items-center gap-2 flex-1">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-2.5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari pekerja, NIP, atau modul..."
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-8 pr-3 py-2 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Division Filter */}
          {divisions.length > 0 && (
            <select
              value={divisionFilter}
              onChange={(e) => setDivisionFilter(e.target.value)}
              className="bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
            >
              <option value="all">Semua Divisi</option>
              {divisions.map((d) => (
                <option key={d} value={d}>
                  Divisi {d}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Status Filter Buttons */}
        <div className="flex items-center gap-1 bg-zinc-900 p-1 rounded-xl border border-zinc-800 self-start sm:self-center">
          {[
            { id: 'all', label: 'Semua' },
            { id: 'active', label: 'Aktif' },
            { id: 'completed', label: 'Selesai' },
            { id: 'overdue', label: 'Overdue' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setStatusFilter(tab.id as any)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                statusFilter === tab.id
                  ? 'bg-emerald-600 text-white shadow'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Assignment Table / List */}
      <div className="bg-zinc-950 rounded-xl border border-zinc-800 overflow-hidden">
        {filteredAssignments.length === 0 ? (
          <div className="text-center py-16 text-xs text-zinc-500">
            <GraduationCap className="w-8 h-8 text-zinc-700 mx-auto mb-2 opacity-50" />
            <p>Tidak ada catatan penugasan re-training yang sesuai dengan filter.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-zinc-800/80 bg-zinc-900/60 text-[10px] uppercase font-bold text-zinc-400 tracking-wider">
                  <th className="py-3 px-4">Pekerja</th>
                  <th className="py-3 px-4">Divisi</th>
                  <th className="py-3 px-4">Modul Penugasan</th>
                  <th className="py-3 px-4">Kategori & Gap</th>
                  <th className="py-3 px-4">Tenggat Waktu</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60 text-xs">
                {filteredAssignments.map((item) => {
                  const isOverdue = checkIsOverdue(item);

                  return (
                    <tr key={item.id} className="hover:bg-zinc-900/40 transition">
                      <td className="py-3 px-4">
                        <div className="font-bold text-white flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-emerald-400" />
                          <span>{item.workerName || item.workerId}</span>
                        </div>
                        <div className="text-[10px] font-mono text-zinc-500">ID: {item.workerId}</div>
                      </td>

                      <td className="py-3 px-4">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-300">
                          {item.division || 'WRM'}
                        </span>
                      </td>

                      <td className="py-3 px-4 max-w-xs">
                        <div className="font-semibold text-zinc-200 line-clamp-1">{item.moduleTitle}</div>
                        <span className="text-[10px] font-mono font-bold text-cyan-400">{item.moduleCode}</span>
                      </td>

                      <td className="py-3 px-4">
                        <span className="font-bold text-zinc-300 block">{item.category}</span>
                        {item.gapPercentage !== undefined && (
                          <span className="text-[10px] text-rose-400 font-semibold">
                            Gap Skor: {item.gapPercentage}%
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1 text-zinc-300 text-xs font-semibold">
                          <Calendar className="w-3 h-3 text-zinc-500" />
                          <span>{item.deadlineDate}</span>
                        </div>
                        <div className="text-[10px] text-zinc-500">
                          Ditugaskan: {new Date(item.assignedAt).toLocaleDateString('id-ID')}
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        {item.isCompleted ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            <CheckCircle2 className="w-3 h-3" /> Selesai
                          </span>
                        ) : isOverdue ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/30 animate-pulse">
                            <AlertTriangle className="w-3 h-3" /> Overdue
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-300 border border-amber-500/20">
                            <Clock className="w-3 h-3" /> Dalam Proses
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {!item.isCompleted && (
                            <>
                              <button
                                type="button"
                                onClick={() => handleSendReminder(item)}
                                className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-amber-400 border border-zinc-700 transition"
                                title="Kirim Notifikasi Pengingat ke Akun Pekerja"
                              >
                                <Bell className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleMarkCompleted(item)}
                                className="px-2 py-1 bg-emerald-600/80 hover:bg-emerald-500 text-white text-[10px] font-bold rounded-lg transition"
                                title="Tandai Selesai (Jika Telah Dibriefing Manual)"
                              >
                                Verifikasi
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
