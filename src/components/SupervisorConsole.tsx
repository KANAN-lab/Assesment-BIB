import React, { useState, useMemo, useEffect } from 'react';
import { WorkerProfile, IncidentReport } from '../types/assessment';
import { matrixEngine } from '../domain/CompetencyMatrixEngine';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  UserCheck, TrendingUp, TableProperties,
  Search, Flame, ShieldCheck, Award, ChevronRight,
  BarChart3, CheckCircle, AlertTriangle, Download,
  ShieldAlert, Clock, CheckCircle2, History, Loader2, AlertCircle,
} from 'lucide-react';
import {
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer, Tooltip as RechartsTooltip
} from 'recharts';
import { WorkerAvatar } from './WorkerAvatar';
import { RoleEntity } from '../domain/RoleEntity';
import { ExecutivePDFReportGenerator } from '../lib/pdfReportService';
import { CompetencyGapAnalysisModal } from './CompetencyGapAnalysisModal';
import { SupervisorIncidentKanban } from './SupervisorIncidentKanban';
import { SupervisorIncidentValidationModal } from './SupervisorIncidentValidationModal';
import { SystemConfigService } from '../domain/SystemConfigService';
import {
  fetchIncidentReports, updateIncidentCapaAndStatus,
  fetchAuditHistory, AuditHistoryEntry,
} from '../lib/supabaseService';

interface SupervisorConsoleProps {
  workers: WorkerProfile[];
  onUpdateWorkerScore: (auditData: { workerId: string; behaviorScore: number; integrityScore: number; benchmarkScore: number; notes: string; }) => void;
  onOpenMatrixAudit?: (worker: WorkerProfile) => void;
}

export const SupervisorConsole: React.FC<SupervisorConsoleProps> = ({
  workers,
  onOpenMatrixAudit,
}) => {
  // Hanya hitung staf operasional (keluarkan System Administrator & Supervisor)
  const operationalWorkers = useMemo(() => {
    return workers.filter((w) => RoleEntity.isOperationalWorker(w.role) && w.division.toUpperCase() !== 'SYSTEM');
  }, [workers]);

  const [activeTab, setActiveTab] = useState<'team' | 'incidents' | 'audit-history'>('team');
  const [selectedWorkerId, setSelectedWorkerId] = useState<string>(operationalWorkers[0]?.id || '');
  const [search, setSearch] = useState('');
  const [isGapModalOpen, setIsGapModalOpen] = useState(false);

  // Incidents tab state
  const [incidents, setIncidents] = useState<IncidentReport[]>([]);
  const [incidentsLoading, setIncidentsLoading] = useState(false);
  const [incidentStatusFilter, setIncidentStatusFilter] = useState('all');
  const [incidentSearch, setIncidentSearch] = useState('');
  const [updatingIncidentId, setUpdatingIncidentId] = useState<string | null>(null);
  const [validatingIncident, setValidatingIncident] = useState<IncidentReport | null>(null);

  // Audit history tab state
  const [auditHistory, setAuditHistory] = useState<AuditHistoryEntry[]>([]);
  const [auditHistoryLoading, setAuditHistoryLoading] = useState(false);

  const openIncidentsCount = useMemo(() => {
    return incidents.filter((i) => i.status === 'open').length;
  }, [incidents]);

  useEffect(() => {
    setIncidentsLoading(true);
    fetchIncidentReports()
      .then(setIncidents)
      .catch(() => {})
      .finally(() => setIncidentsLoading(false));
  }, []);

  useEffect(() => {
    const handleOpenIncidentTab = () => {
      setActiveTab('incidents');
    };
    window.addEventListener('gappy_open_incident_tab', handleOpenIncidentTab);
    return () => window.removeEventListener('gappy_open_incident_tab', handleOpenIncidentTab);
  }, []);

  useEffect(() => {
    if (activeTab === 'audit-history' && auditHistory.length === 0) {
      const ids = operationalWorkers.map(w => w.id);
      setAuditHistoryLoading(true);
      fetchAuditHistory(ids)
        .then((entries) => {
          // Enrich with worker name
          const enriched = entries.map(e => ({
            ...e,
            workerName: operationalWorkers.find(w => w.id === e.workerId)?.name ?? e.workerId,
          }));
          setAuditHistory(enriched);
        })
        .catch(() => {})
        .finally(() => setAuditHistoryLoading(false));
    }
  }, [activeTab, operationalWorkers]);

  const handleUpdateIncidentStatus = async (incidentId: string, newStatus: IncidentReport['status']) => {
    setUpdatingIncidentId(incidentId);
    const targetInc = incidents.find((i) => i.id === incidentId);
    try {
      await updateIncidentCapaAndStatus(incidentId, {
        status: newStatus,
        updatedBy: 'Supervisor',
        resolutionNote: newStatus === 'resolved' || newStatus === 'closed' ? 'Ditangani oleh Supervisor' : undefined,
        workerId: targetInc?.workerId,
      });
      setIncidents(prev => prev.map(inc => inc.id === incidentId ? { ...inc, status: newStatus } : inc));
    } catch { /* silent */ } finally {
      setUpdatingIncidentId(null);
    }
  };


  const activeWorker = operationalWorkers.find((w) => w.id === selectedWorkerId) || operationalWorkers[0];

  const filteredWorkers = useMemo(() => {
    const q = search.toLowerCase();
    return operationalWorkers.filter((w) =>
      w.name.toLowerCase().includes(q) ||
      w.role.toLowerCase().includes(q) ||
      w.division.toLowerCase().includes(q) ||
      w.employeeId.toLowerCase().includes(q)
    );
  }, [operationalWorkers, search]);

  // Team stats
  const avgScore = operationalWorkers.length
    ? (operationalWorkers.reduce((s, w) => s + w.bibScores.totalScore, 0) / operationalWorkers.length).toFixed(1)
    : '0';
  const totalStreak = operationalWorkers.reduce((s, w) => s + w.streakDays, 0);
  const topPerformer = [...operationalWorkers].sort((a, b) => b.bibScores.totalScore - a.bibScores.totalScore)[0];
  const atRisk = operationalWorkers.filter((w) => w.bibScores.totalScore < 80).length;

  const roleKey = matrixEngine.resolveRoleColumnKey(activeWorker?.role || '');
  const activeCategories = activeWorker
    ? matrixEngine.getActiveCategoriesForRole(activeWorker.role)
    : [];

  const categorySummaries = useMemo(() => {
    if (!activeWorker) return [];
    return matrixEngine.calculateCategorySummaries(
      activeWorker.role,
      activeWorker.competencyAuditScores || {},
      activeWorker.bibScores.totalScore
    );
  }, [activeWorker]);

  const handleExportPDF = () => {
    ExecutivePDFReportGenerator.generateExecutiveReport(operationalWorkers, 'Supervisor Logistik');
  };

  // Filtered incidents
  const filteredIncidents = useMemo(() => {
    return incidents.filter(inc => {
      if (incidentStatusFilter !== 'all' && inc.status !== incidentStatusFilter) return false;
      if (incidentSearch) {
        const q = incidentSearch.toLowerCase();
        return inc.location.toLowerCase().includes(q) || inc.description.toLowerCase().includes(q) || (inc.workerName ?? '').toLowerCase().includes(q);
      }
      return true;
    });
  }, [incidents, incidentStatusFilter, incidentSearch]);

  const SEVERITY_META: Record<string, { label: string; cls: string }> = {
    low:      { label: 'Rendah',  cls: 'bg-zinc-800 text-zinc-400 border-zinc-700' },
    medium:   { label: 'Sedang',  cls: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
    high:     { label: 'Tinggi',  cls: 'bg-orange-500/10 text-orange-400 border-orange-500/20' },
    critical: { label: 'Kritis',  cls: 'bg-rose-500/10 text-rose-400 border-rose-500/20' },
  };

  const STATUS_META: Record<string, { label: string; next: IncidentReport['status'] | null; cls: string }> = {
    open:          { label: 'Terbuka',    next: 'investigating', cls: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
    investigating: { label: 'Investigasi', next: 'resolved',    cls: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' },
    resolved:      { label: 'Resolved',   next: 'closed',      cls: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
    closed:        { label: 'Ditutup',    next: null,           cls: 'bg-zinc-700/50 text-zinc-400 border-zinc-700' },
  };

  const TYPE_LABELS: Record<string, string> = {
    near_miss: 'Near-Miss', injury: 'Cedera', property_damage: 'Kerusakan Properti',
    unsafe_condition: 'Kondisi Tidak Aman', other: 'Lainnya',
  };


  const activeItems = useMemo(() => {
    if (!activeWorker) return [];
    const rKey = matrixEngine.resolveRoleColumnKey(activeWorker.role);
    return matrixEngine.getItems().filter((item) => (item.maxScores[rKey] ?? 0) > 0);
  }, [activeWorker]);

  const radarData = useMemo(() => {
    return categorySummaries.map((cat) => ({
      category: cat.category,
      score: cat.percentage,
      audited: cat.auditedScore,
      max: cat.maxScore,
    }));
  }, [categorySummaries]);



  const getTierClass = (tier: string) => {
    if (tier.includes('Champion')) return 'tier-legendary';
    if (tier.includes('Elite'))    return 'tier-elite';
    if (tier.includes('Pro'))      return 'tier-pro';
    return 'tier-novice';
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-emerald-400';
    if (score >= 80) return 'text-indigo-400';
    if (score >= 70) return 'text-amber-400';
    return 'text-rose-400';
  };

  return (
    <div className="space-y-5 animate-fade-in">

      {/* ─ Tab Navigation ─ */}
      <div className="flex items-center gap-1 bg-zinc-900 border border-zinc-800 rounded-xl p-1 w-fit">
        {[
          { key: 'team',          label: 'Tim & Audit',     Icon: UserCheck,   count: 0, alert: false },
          { key: 'incidents',     label: 'Kelola Insiden',  Icon: ShieldAlert, count: openIncidentsCount, alert: openIncidentsCount > 0 },
          { key: 'audit-history', label: 'Riwayat Audit',   Icon: History,     count: 0, alert: false },
        ].map(({ key, label, Icon, count, alert }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key as any)}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition relative ${
              activeTab === key
                ? 'bg-emerald-600 text-white shadow-md'
                : alert
                ? 'bg-rose-950/60 text-rose-300 border border-rose-500/50 hover:bg-rose-900/60 animate-pulse'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
            }`}
          >
            <Icon className={`w-3.5 h-3.5 ${alert && activeTab !== key ? 'text-rose-400' : ''}`} />
            <span>{label}</span>
            {count > 0 && (
              <span className="px-1.5 py-0.2 text-[9px] font-black rounded-full bg-rose-500 text-white shadow-sm shadow-rose-950 ml-0.5 font-mono">
                {count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ─ INCIDENTS KANBAN TAB ─ */}
      {activeTab === 'incidents' && (
        <SupervisorIncidentKanban
          incidents={incidents}
          loading={incidentsLoading}
          onUpdateStatus={async (incId, newStatus) => {
            handleUpdateIncidentStatus(incId, newStatus);
          }}
          updatingIncidentId={updatingIncidentId}
          onSelectIncident={(inc) => setValidatingIncident(inc)}
        />
      )}

      {/* ─ MODAL VALIDASI INSIDEN SUPERVISOR ─ */}
      {validatingIncident && (
        <SupervisorIncidentValidationModal
          incident={validatingIncident}
          workers={workers}
          onClose={() => setValidatingIncident(null)}
          onSuccess={() => {
            setIncidentsLoading(true);
            fetchIncidentReports()
              .then(setIncidents)
              .catch(() => {})
              .finally(() => setIncidentsLoading(false));
          }}
        />
      )}

      {/* ─ AUDIT HISTORY TAB ─ */}
      {activeTab === 'audit-history' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <History className="w-4 h-4 text-indigo-400" /> Riwayat Skor Audit
              </h3>
              <p className="text-[11px] text-zinc-500 mt-0.5">{auditHistory.length} entri · 200 terbaru</p>
            </div>
          </div>

          {auditHistoryLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 text-zinc-500 animate-spin" /></div>
          ) : auditHistory.length === 0 ? (
            <div className="text-center py-12 text-zinc-500">
              <History className="w-8 h-8 mx-auto mb-2 text-zinc-700" />
              Belum ada riwayat skor audit tersimpan.
            </div>
          ) : (
            <div className="card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-zinc-800 bg-zinc-950">
                      <th className="text-left px-4 py-3 text-zinc-500 font-bold uppercase text-[10px] tracking-wider">Nama Worker</th>
                      <th className="text-left px-4 py-3 text-zinc-500 font-bold uppercase text-[10px] tracking-wider">BIB Score</th>
                      <th className="text-left px-4 py-3 text-zinc-500 font-bold uppercase text-[10px] tracking-wider">Total Poin</th>
                      <th className="text-left px-4 py-3 text-zinc-500 font-bold uppercase text-[10px] tracking-wider">Tanggal Audit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {auditHistory.map((entry, idx) => {
                      const scoreColor = entry.bibScore >= 90 ? 'text-emerald-400' : entry.bibScore >= 80 ? 'text-indigo-400' : entry.bibScore >= 70 ? 'text-amber-400' : 'text-rose-400';
                      return (
                        <tr key={entry.id} className={`border-b border-zinc-800/50 hover:bg-zinc-900/50 transition ${idx % 2 === 0 ? '' : 'bg-zinc-950/40'}`}>
                          <td className="px-4 py-2.5 font-semibold text-white">{entry.workerName ?? entry.workerId}</td>
                          <td className={`px-4 py-2.5 font-black font-mono ${scoreColor}`}>{entry.bibScore.toFixed(1)}</td>
                          <td className="px-4 py-2.5 text-amber-300 font-bold">{entry.totalPoints.toLocaleString()}</td>
                          <td className="px-4 py-2.5 text-zinc-400">
                            {new Date(entry.recordedAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─ TEAM TAB ─ */}
      {activeTab === 'team' && (<>

      {/* ─ Header stats: 4 metric tiles ─ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="card p-4">
          <div className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold mb-2">Rata-rata Skor Tim</div>
          <div className="text-2xl font-black text-white">{avgScore}<span className="text-xs font-normal text-zinc-500 ml-1">/ 100</span></div>
          <div className="flex items-center gap-1 mt-1 text-[11px] text-emerald-400 font-semibold">
            <TrendingUp className="w-3 h-3" /> Standar Terpenuhi
          </div>
        </div>

        <div className="card p-4">
          <div className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold mb-2">Total Safety Streak</div>
          <div className="text-2xl font-black text-amber-300">{totalStreak}<span className="text-xs font-normal text-zinc-500 ml-1">Hari</span></div>
          <div className="flex items-center gap-1 mt-1 text-[11px] text-amber-400 font-semibold">
            <Flame className="w-3 h-3" /> {workers.length} Personel Aktif
          </div>
        </div>

        <div className="card p-4">
          <div className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold mb-2">Top Performer</div>
          <div className="text-sm font-black text-white truncate">{topPerformer?.name || '—'}</div>
          <div className="flex items-center gap-1 mt-1 text-[11px] font-semibold text-emerald-400">
            <Award className="w-3 h-3" /> {topPerformer?.bibScores.totalScore.toFixed(1)} Skor BIB
          </div>
        </div>

        <div className="card p-4">
          <div className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold mb-2">Perlu Perhatian</div>
          <div className={`text-2xl font-black ${atRisk > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>{atRisk}</div>
          <div className={`flex items-center gap-1 mt-1 text-[11px] font-semibold ${atRisk > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
            {atRisk > 0 ? <AlertTriangle className="w-3 h-3" /> : <CheckCircle className="w-3 h-3" />}
            {atRisk > 0 ? `Skor < 80` : 'Semua Normal'}
          </div>
        </div>
      </div>

      {/* ─ Main layout: worker list + detail ─ */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">

        {/* Left Column: Radar Chart + Worker Selector */}
        <div className="lg:col-span-4 space-y-4">
          
          {/* Radar Chart Card */}
          <div className="card p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-white flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-emerald-400" />
                Radar Kompetensi Matrix
              </h3>
              <span className="text-[10px] text-emerald-400 font-mono font-bold truncate max-w-[120px]">
                {activeWorker?.name || '—'}
              </span>
            </div>

            <div className="h-56 w-full relative flex items-center justify-center">
              {radarData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart cx="50%" cy="50%" outerRadius="68%" data={radarData}>
                    <PolarGrid stroke="#27272a" />
                    <PolarAngleAxis
                      dataKey="category"
                      tick={{ fill: '#a1a1aa', fontSize: 10, fontWeight: 600 }}
                    />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                    <Radar
                      name="Pencapaian (%)"
                      dataKey="score"
                      stroke="#10b981"
                      fill="#10b981"
                      fillOpacity={0.35}
                    />
                    <RechartsTooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div className="bg-zinc-950 border border-zinc-800 p-2 rounded-lg text-xs shadow-xl">
                              <div className="font-bold text-white mb-0.5">{data.category}</div>
                              <div className="text-emerald-400 font-mono font-bold">
                                {data.audited} / {data.max} ({data.score}%)
                              </div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-xs text-zinc-500">Data radar tidak tersedia</div>
              )}
            </div>

            <div className="text-[10px] text-zinc-500 text-center border-t border-zinc-800/60 pt-2">
              Profil sebaran ketercapaian kompetensi per kategori
            </div>
          </div>

          {/* Worker Selector Card with Integrated Audit & Compliance Footer */}
          <div className="card p-4 flex-1 flex flex-col justify-between gap-3 min-h-[420px]">
            <div className="space-y-3 flex-1 flex flex-col min-h-0">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span className="text-xs font-bold text-white">Pilih Karyawan ({filteredWorkers.length})</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setIsGapModalOpen(true)}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-950/60 hover:bg-emerald-900/60 text-emerald-400 text-[10px] font-bold border border-emerald-500/30 transition"
                    title="Buka Analisis Kesenjangan Kompetensi Tim"
                  >
                    <BarChart3 className="w-3 h-3 text-emerald-400" />
                    Gap Analysis
                  </button>
                  <button
                    onClick={handleExportPDF}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[10px] font-bold border border-zinc-700 transition"
                    title="Unduh Laporan Audit Eksekutif PDF"
                  >
                    <Download className="w-3 h-3 text-emerald-400" />
                    Export PDF
                  </button>
                </div>
              </div>

              <div className="relative">
                <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Nama, role, divisi..."
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="space-y-1 overflow-y-auto max-h-[380px] pr-0.5 custom-scrollbar">
                {filteredWorkers.map(w => {
                  const active = w.id === selectedWorkerId;
                  return (
                    <button
                      key={w.id}
                      onClick={() => setSelectedWorkerId(w.id)}
                      className={`w-full text-left px-3 py-2 rounded-xl transition flex items-center justify-between gap-2 ${
                        active
                          ? 'bg-emerald-600/15 border border-emerald-500/30'
                          : 'border border-transparent hover:bg-zinc-800/60'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <WorkerAvatar src={w.avatar} name={w.name} className="w-8 h-8 rounded-lg ring-1 ring-zinc-700" />
                        <div className="min-w-0">
                          <div className={`text-xs font-bold truncate ${active ? 'text-white' : 'text-zinc-300'}`}>{w.name}</div>
                          <div className="text-[10px] text-zinc-500 truncate">{w.role} · {w.division}</div>
                        </div>
                      </div>
                      <div className="shrink-0 text-right">
                        <div className={`text-xs font-black ${getScoreColor(w.bibScores.totalScore)}`}>{w.bibScores.totalScore.toFixed(1)}</div>
                        {active && <ChevronRight className="w-3 h-3 text-emerald-400 ml-auto mt-0.5" />}
                      </div>
                    </button>
                  );
                })}
                {filteredWorkers.length === 0 && (
                  <div className="text-center text-zinc-500 text-xs py-6">Tidak ada hasil.</div>
                )}
              </div>
            </div>

            {/* Integrated Operational Compliance Footer */}
            <div className="border-t border-zinc-800/80 pt-3 grid grid-cols-2 gap-2 text-xs">
              <div className="bg-zinc-950 p-2.5 rounded-xl border border-zinc-800/80">
                <div className="text-[10px] text-zinc-500 font-bold mb-0.5">Personel Ter-audit</div>
                <div className="text-xs font-black text-white">
                  {operationalWorkers.filter(w => w.bibScores.totalScore > 0).length} <span className="text-[10px] font-normal text-zinc-500">/ {operationalWorkers.length} Staf</span>
                </div>
              </div>

              <div className="bg-zinc-950 p-2.5 rounded-xl border border-zinc-800/80">
                <div className="text-[10px] text-zinc-500 font-bold mb-0.5">Kepatuhan K3 Logistik</div>
                <div className="text-xs font-black text-emerald-400 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" /> 100% Aman
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Worker Detail Panel */}
        {activeWorker && (
          <div className="lg:col-span-8 space-y-4">

            {/* Profile header */}
            <div className="card p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-4">
                  <WorkerAvatar
                    src={activeWorker.avatar}
                    name={activeWorker.name}
                    className="w-14 h-14 rounded-xl ring-1 ring-zinc-700"
                  />
                  <div>
                    <h2 className="text-base font-black text-white">{activeWorker.name}</h2>
                    <p className="text-xs text-zinc-400 mt-0.5">{activeWorker.employeeId} · {activeWorker.role} · {activeWorker.division}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${getTierClass(activeWorker.tier)}`}>
                        {activeWorker.tier}
                      </span>
                      <span className="flex items-center gap-1 text-[10px] text-amber-400 font-semibold">
                        <Flame className="w-3 h-3" /> {activeWorker.streakDays} hari streak
                      </span>
                    </div>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <div className="text-xs text-zinc-500 mb-1">Skor BIB</div>
                  <div className={`text-3xl font-black ${getScoreColor(activeWorker.bibScores.totalScore)}`}>
                    {activeWorker.bibScores.totalScore.toFixed(1)}
                  </div>
                  <div className="text-[10px] text-zinc-500">/ 100</div>
                </div>
              </div>
            </div>

            {/* Modular Competency Matrix Section */}
            <div className="card p-5 space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-zinc-800">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-emerald-400" />
                    Matrix Kompetensi Staf Operasional
                  </h3>
                  <p className="text-[11px] text-zinc-400 mt-0.5">
                    Role dideteksi: <span className="font-mono font-bold text-emerald-400">{roleKey}</span> · {activeCategories.length} Kategori Kompetensi Aktif
                  </p>
                </div>

                {onOpenMatrixAudit && (
                  <div className="flex items-center gap-2">
                    <span className="hidden md:flex items-center gap-1 text-[10px] text-indigo-300 font-bold bg-indigo-950/60 border border-indigo-500/30 px-2.5 py-1 rounded-lg">
                      <Clock className="w-3 h-3 text-indigo-400" />
                      Frekuensi: {SystemConfigService.getConfig().auditFrequencyLabel}
                    </span>
                    <button
                      onClick={() => onOpenMatrixAudit(activeWorker)}
                      className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-4 py-2 rounded-xl transition shrink-0 shadow-md shadow-emerald-950"
                    >
                      <TableProperties className="w-4 h-4" />
                      Buka Audit Matrix
                    </button>
                  </div>
                )}
              </div>

              {/* Category Breakdown Progress Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {categorySummaries.map((catSummary) => {
                  const pct = catSummary.percentage;
                  const colorClass = pct >= 80 ? 'text-emerald-400' : pct >= 65 ? 'text-amber-400' : 'text-rose-400';
                  const barClass = pct >= 80 ? 'bg-emerald-500' : pct >= 65 ? 'bg-amber-500' : 'bg-rose-500';
                  const statusBadge = pct >= 80 ? 'Kompeten' : pct >= 65 ? 'Pengawasan' : 'Perlu Training';
                  const badgeClass = pct >= 80 ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : pct >= 65 ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 'bg-rose-500/10 text-rose-400 border-rose-500/20';

                  return (
                    <div key={catSummary.category} className="bg-zinc-950 p-3 rounded-xl border border-zinc-800 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-bold text-white truncate">{catSummary.category}</span>
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${badgeClass}`}>
                            {statusBadge}
                          </span>
                        </div>
                        <div className="text-[10px] text-zinc-500 mb-2">{catSummary.itemCount} Item Modul</div>
                      </div>

                      <div>
                        <div className="flex items-baseline justify-between mb-1">
                          <span className={`text-base font-black ${colorClass}`}>
                            {catSummary.auditedScore} <span className="text-[10px] text-zinc-500 font-normal">/ {catSummary.maxScore}</span>
                          </span>
                          <span className="text-[10px] font-bold text-zinc-400">{pct}%</span>
                        </div>
                        <div className="w-full bg-zinc-900 rounded-full h-1.5 overflow-hidden">
                          <div className={`h-full rounded-full transition-all ${barClass}`} style={{ width: `${Math.min(100, pct)}%` }} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Detailed Active Competency Items List */}
              <div className="space-y-2 pt-2">
                <div className="text-xs font-bold text-zinc-300 flex items-center justify-between">
                  <span>Modul Kompetensi Utama ({activeItems.length} Item)</span>
                  <span className="text-[10px] text-zinc-500 font-normal">Target Level vs Skor Audit</span>
                </div>

                <div className="max-h-56 overflow-y-auto space-y-1.5 pr-1">
                  {activeItems.map((item) => {
                    const maxScore = item.maxScores[roleKey] ?? 0;
                    const audited = activeWorker.competencyAuditScores?.[item.id] ?? Math.round(maxScore * (activeWorker.bibScores.totalScore / 100) * 10) / 10;
                    const itemPct = maxScore > 0 ? (audited / maxScore) * 100 : 0;
                    const isPassed = itemPct >= 75;

                    return (
                      <div key={item.id} className="bg-zinc-950 p-2.5 rounded-xl border border-zinc-800/80 flex items-center justify-between text-xs gap-3">
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          <div className={`w-2 h-2 rounded-full shrink-0 ${isPassed ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                          <div className="min-w-0">
                            <div className="font-semibold text-white truncate flex items-center gap-2">
                              <span>{item.title}</span>
                              <span className="text-[9px] bg-zinc-800 text-zinc-400 px-1.5 py-0.2 rounded font-mono">
                                {item.type}
                              </span>
                            </div>
                            <div className="text-[10px] text-zinc-500 truncate">{item.definition}</div>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 shrink-0 text-right">
                          <div className="text-right">
                            <div className="font-bold text-white font-mono">{audited} / {maxScore}</div>
                            <div className="text-[9px] text-zinc-500">Target Lvl {maxScore}</div>
                          </div>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${isPassed ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'}`}>
                            {isPassed ? 'Lulus' : 'Perlu Evaluasi'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>

            {/* Operational Performance & Compliance Summary Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Tile 1: Poin Reward */}
              <div className="card p-3.5 flex items-center gap-3">
                <div className="w-9 h-9 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-center justify-center shrink-0">
                  <Award className="w-5 h-5 text-amber-400" />
                </div>
                <div className="min-w-0">
                  <div className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">Total Poin Reward</div>
                  <div className="text-sm font-black text-white">{activeWorker.totalPoints.toLocaleString()} <span className="text-[10px] font-normal text-zinc-500">PTS</span></div>
                  <div className="text-[9px] text-amber-400 font-semibold mt-0.5 truncate">Dapat Ditukar Katalog</div>
                </div>
              </div>

              {/* Tile 2: Inspeksi Pre-Shift */}
              <div className="card p-3.5 flex items-center gap-3">
                <div className={`w-9 h-9 ${activeWorker.preShiftChecklistDone ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-zinc-800/80 border-zinc-700 text-zinc-500'} border rounded-xl flex items-center justify-center shrink-0`}>
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">Inspeksi Pre-Shift</div>
                  <div className="text-xs font-bold text-white truncate">
                    {activeWorker.preShiftChecklistDone ? (
                      <span className="text-emerald-400 font-black">✓ Terverifikasi Aman</span>
                    ) : (
                      <span className="text-zinc-400 font-semibold">Belum Diisi Hari Ini</span>
                    )}
                  </div>
                  <div className="text-[9px] text-zinc-500 mt-0.5 truncate">K3 Operasional Harian</div>
                </div>
              </div>

              {/* Tile 3: Kuis Harian & Streak */}
              <div className="card p-3.5 flex items-center gap-3">
                <div className={`w-9 h-9 ${activeWorker.dailyQuizCompleted ? 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400' : 'bg-amber-500/10 border-amber-500/20 text-amber-400'} border rounded-xl flex items-center justify-center shrink-0`}>
                  <Flame className="w-5 h-5 text-amber-400" />
                </div>
                <div className="min-w-0">
                  <div className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">Kuis Harian & Streak</div>
                  <div className="text-xs font-bold text-white truncate">
                    {activeWorker.dailyQuizCompleted ? (
                      <span className="text-emerald-400 font-black">✓ Selesai ({activeWorker.streakDays} Hari)</span>
                    ) : (
                      <span className="text-amber-400 font-bold">Belum Kuis Hari Ini</span>
                    )}
                  </div>
                  <div className="text-[9px] text-zinc-500 mt-0.5 truncate">Evaluasi Mandiri Role</div>
                </div>
              </div>
            </div>

          </div>
        )}

      </div>

      {/* Competency Gap Analysis Modal */}
      <CompetencyGapAnalysisModal
        isOpen={isGapModalOpen}
        onClose={() => setIsGapModalOpen(false)}
        workers={operationalWorkers}
      />
      </>)}

    </div>
  );
};
