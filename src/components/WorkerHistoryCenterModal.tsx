import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  History,
  Lightbulb,
  ShieldAlert,
  ArrowRightLeft,
  Award,
  ShoppingBag,
  RefreshCw,
  Clock,
  CheckCircle2,
  AlertCircle,
  AlertOctagon,
  Sparkles,
  Zap,
  DollarSign,
  HeartHandshake,
  HelpCircle,
  Search,
  CheckSquare,
  FileText,
  Printer,
  BookOpen,
  Calendar,
  MapPin,
  UserCheck,
  Download,
  Coins,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  Filter,
} from 'lucide-react';
import { KaizenService } from '../lib/kaizenService';
import { fetchIncidentReports, fetchRedemptionHistory } from '../lib/supabaseService';
import { HandoverManager } from '../lib/handoverService';
import { KudoService } from '../lib/kudoService';
import {
  DisciplinaryService,
  VIOLATION_META,
  CATEGORY_META,
} from '../lib/disciplinaryService';
import { fetchAllSopModules, fetchWorkerSopProgress } from '../lib/sopService';
import { supabase } from '../lib/supabaseClient';
import { KaizenSuggestionEntity, KaizenCategory, KaizenStatus } from '../types/kaizen';
import { IncidentReport, RewardHistory } from '../types/assessment';
import { ShiftHandoverEntity } from '../types/handover';
import { KudoEntity } from '../types/kudos';
import { DisciplinaryActionEntity, SanctionStatus } from '../types/disciplinary';
import { SopModule, WorkerSopProgress } from '../types/sop';

export interface PointMutationEntry {
  id: string;
  date: string;
  title: string;
  description: string;
  amount: number; // Positif (+) untuk perolehan, Negatif (-) untuk potongan
  category: string;
  source: 'disciplinary' | 'rewards' | 'sop' | 'kaizen' | 'kudos' | 'activity';
  badge: string;
  badgeCls: string;
  docRef?: string;
}

interface WorkerHistoryCenterModalProps {
  isOpen: boolean;
  onClose: () => void;
  workerId: string;
  workerName: string;
  initialTab?: 'ledger' | 'kaizen' | 'incidents' | 'disciplinary' | 'handovers' | 'kudos' | 'rewards' | 'sop';
}

const INCIDENT_STATUS_META: Record<string, { label: string; cls: string }> = {
  open: { label: 'Terbuka', cls: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
  investigating: { label: 'Investigasi', cls: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' },
  resolved: { label: 'Resolved', cls: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
  closed: { label: 'Ditutup', cls: 'bg-zinc-800 text-zinc-400 border-zinc-700' }
};

const SANCTION_STATUS_META: Record<SanctionStatus, { label: string; cls: string }> = {
  active: { label: 'Sanksi Aktif', cls: 'bg-rose-500/10 text-rose-400 border-rose-500/30' },
  in_retraining: { label: 'Wajib Retraining SOP', cls: 'bg-amber-500/10 text-amber-400 border-amber-500/30' },
  resolved: { label: 'Tuntas & Selesai', cls: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' },
  appealed: { label: 'Dalam Banding', cls: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30' },
};

export function WorkerHistoryCenterModal({
  isOpen,
  onClose,
  workerId,
  workerName,
  initialTab = 'ledger'
}: WorkerHistoryCenterModalProps) {
  const [activeTab, setActiveTab] = useState<'ledger' | 'kaizen' | 'incidents' | 'disciplinary' | 'handovers' | 'kudos' | 'rewards' | 'sop'>(initialTab);
  const [loading, setLoading] = useState(false);

  // Data states
  const [ledgerEntries, setLedgerEntries] = useState<PointMutationEntry[]>([]);
  const [ledgerFilter, setLedgerFilter] = useState<'all' | 'income' | 'expense'>('all');
  const [kaizens, setKaizens] = useState<KaizenSuggestionEntity[]>([]);
  const [incidents, setIncidents] = useState<IncidentReport[]>([]);
  const [disciplinaryActions, setDisciplinaryActions] = useState<DisciplinaryActionEntity[]>([]);
  const [handovers, setHandovers] = useState<ShiftHandoverEntity[]>([]);
  const [kudos, setKudos] = useState<KudoEntity[]>([]);
  const [rewards, setRewards] = useState<RewardHistory[]>([]);
  const [completedSops, setCompletedSops] = useState<{ sop: SopModule; progress: WorkerSopProgress }[]>([]);

  // Update activeTab jika prop initialTab berganti saat modal dibuka
  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab, isOpen]);

  const loadTabData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'ledger') {
        const entries: PointMutationEntry[] = [];

        // 1. Sanksi Disiplin K3 (- PTS)
        const discData = DisciplinaryService.getActionsByWorkerId(workerId);
        setDisciplinaryActions(discData);
        discData.forEach((action) => {
          if (action.pointDeduction && action.pointDeduction > 0) {
            const levelMeta = VIOLATION_META[action.violationLevel];
            const catMeta = CATEGORY_META[action.violationCategory];
            entries.push({
              id: `disc_${action.id}`,
              date: action.incidentDate || action.issuedAt,
              title: `Penalti Sanksi: ${levelMeta?.label || 'Sanksi K3'}`,
              description: action.description || catMeta?.label || 'Pelanggaran Operasional K3',
              amount: -Math.abs(action.pointDeduction),
              category: 'Disiplin & Sanksi K3',
              source: 'disciplinary',
              badge: levelMeta?.label || 'Sanksi K3',
              badgeCls: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
              docRef: action.documentRefNumber,
            });
          }
        });

        // 2. Klaim Katalog Reward (- PTS)
        const rewData = await fetchRedemptionHistory(workerId);
        setRewards(rewData);
        rewData.forEach((r) => {
          if (r.pointsSpent && r.pointsSpent > 0) {
            const isCancelled = r.status === 'cancelled';
            entries.push({
              id: `rew_${r.id}`,
              date: r.redeemedAt,
              title: isCancelled ? `Klaim Reward (Dibatalkan): ${r.itemTitle}` : `Klaim Reward: ${r.itemTitle}`,
              description: `Kode: ${r.redemptionCode} · Status: ${
                isCancelled ? 'Dibatalkan (Poin Dikembalikan)' : r.status === 'completed' ? 'Selesai' : 'Diproses'
              }`,
              amount: isCancelled ? 0 : -Math.abs(r.pointsSpent),
              category: 'Penukaran Reward',
              source: 'rewards',
              badge: isCancelled ? 'Dibatalkan' : 'Katalog Reward',
              badgeCls: isCancelled
                ? 'bg-zinc-800 text-zinc-400 border-zinc-700'
                : 'bg-rose-500/10 text-rose-400 border-rose-500/30',
              docRef: r.redemptionCode,
            });
          }
        });

        // 3. Modul SOP K3 Selesai (+ PTS)
        const [allMods, progMap] = await Promise.all([
          fetchAllSopModules(),
          fetchWorkerSopProgress(workerId),
        ]);
        const completed = allMods
          .filter((m) => progMap[m.id]?.isCompleted)
          .map((m) => ({ sop: m, progress: progMap[m.id] }));
        setCompletedSops(completed);
        completed.forEach(({ sop: m, progress: p }) => {
          entries.push({
            id: `sop_${m.id}`,
            date: p.completedAt || new Date().toISOString(),
            title: `Selesai Modul SOP: ${m.title}`,
            description: `Kode: ${m.code} · ${m.category} · Kuis: ${p.quizScore || 100}%`,
            amount: +(m.pointsReward || 50),
            category: 'Pustaka SOP K3',
            source: 'sop',
            badge: 'SOP Deck',
            badgeCls: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
            docRef: m.code,
          });
        });

        // 4. Inovasi Kaizen Disetujui (+ PTS)
        const kzData = await KaizenService.getSuggestionsByWorker(workerId);
        setKaizens(kzData);
        kzData.forEach((item) => {
          if ((item.status === 'Approved' || item.status === 'Implemented') && item.reward_points > 0) {
            entries.push({
              id: `kz_${item.id}`,
              date: item.created_at,
              title: `Reward Kaizen: ${item.title}`,
              description: `Kategori: ${item.category} · ${item.reviewer_feedback || 'Disetujui Supervisor'}`,
              amount: +item.reward_points,
              category: 'Inovasi Kaizen',
              source: 'kaizen',
              badge: 'Kaizen Disetujui',
              badgeCls: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
            });
          }
        });

        // 5. Kudo Diterima (+ PTS)
        const kdData = await KudoService.getRecentKudos(50);
        const receivedKudos = kdData.filter((k) => k.receiver_id === workerId);
        setKudos(receivedKudos);
        receivedKudos.forEach((k) => {
          entries.push({
            id: `kd_${k.id}`,
            date: k.created_at,
            title: `Kudo dari ${k.sender_name || 'Rekan Kerja'}`,
            description: `"${k.message}" · Kategori: ${k.category}`,
            amount: +(k.points_awarded || 10),
            category: 'Kudo Apresiasi',
            source: 'kudos',
            badge: 'Kudo Apresiasi',
            badgeCls: 'bg-sky-500/10 text-sky-400 border-sky-500/30',
          });
        });

        // 6. Activity Log (Kuis Harian, Pre-Shift Checklist, SIO Mandiri)
        try {
          const { data: actLogs } = await supabase
            .from('activity_log')
            .select('*')
            .eq('worker_id', workerId)
            .order('created_at', { ascending: false })
            .limit(40);

          if (actLogs) {
            actLogs.forEach((l: any) => {
              const act = String(l.action || '');
              if (act.includes('quiz') || act.includes('checklist') || act.includes('sio') || act.includes('refund') || act.includes('expired') || act.includes('audit_5s')) {
                let pts = 0;
                let title = 'Aktivitas Kepatuhan Operasional';
                let category = 'Kepatuhan Operasional';
                let badge = 'Daily Ops';
                let badgeCls = 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30';

                const plusMatch = String(l.detail || '').match(/\+(\d+)\s*PTS/i);
                const minusMatch = String(l.detail || '').match(/-(\d+)\s*PTS/i);

                if (act.includes('quiz')) {
                  pts = plusMatch ? parseInt(plusMatch[1], 10) : 50;
                  title = 'Kuis Keselamatan K3 Harian';
                  badge = 'Kuis K3';
                  badgeCls = 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30';
                } else if (act.includes('checklist')) {
                  pts = plusMatch ? parseInt(plusMatch[1], 10) : 30;
                  title = 'Pre-Shift Inspection Checklist';
                  badge = 'Checklist K3';
                  badgeCls = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
                } else if (act.includes('audit_5s')) {
                  pts = plusMatch ? parseInt(plusMatch[1], 10) : 100;
                  title = 'Insentif PIC Wilayah Audit 5S/5R';
                  category = 'Audit 5S/5R';
                  badge = 'Insentif 5S';
                  badgeCls = 'bg-amber-500/10 text-amber-400 border-amber-500/30';
                } else if (act.includes('sio')) {
                  pts = plusMatch ? parseInt(plusMatch[1], 10) : 100;
                  title = 'Reward Unggah Sertifikasi SIO Mandiri';
                  category = 'Lisensi & Sertifikasi';
                  badge = 'SIO / MHE';
                  badgeCls = 'bg-blue-500/10 text-blue-400 border-blue-500/30';
                } else if (act.includes('refund')) {
                  pts = plusMatch ? parseInt(plusMatch[1], 10) : 25;
                  const isSafetyPatrol = String(l.detail || '').toLowerCase().includes('safety patrol');
                  title = isSafetyPatrol ? 'Reward Temuan Gemba Walk Safety Patrol' : 'Pemulihan Poin (Sanksi K3 Dibatalkan)';
                  category = isSafetyPatrol ? 'Safety Patrol K3' : 'Pemulihan Disiplin K3';
                  badge = isSafetyPatrol ? 'Safety Patrol' : 'Poin Dipulihkan';
                  badgeCls = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
                } else if (act.includes('expired')) {
                  pts = minusMatch ? -parseInt(minusMatch[1], 10) : -25;
                  title = 'Kedaluwarsa Poin Berkala (Liabilitas Stok)';
                  category = 'Siklus Poin Bulanan';
                  badge = 'Poin Hangus';
                  badgeCls = 'bg-rose-500/10 text-rose-400 border-rose-500/30';
                }

                if (pts !== 0) {
                  entries.push({
                    id: `act_${l.id}`,
                    date: l.created_at,
                    title,
                    description: l.detail || 'Kepatuhan Operasional Lapangan',
                    amount: pts,
                    category,
                    source: 'activity',
                    badge,
                    badgeCls,
                  });
                }
              }
            });
          }
        } catch {
          // Fallback offline
        }

        // Urutkan mutasi dari yang paling baru
        entries.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setLedgerEntries(entries);
      } else if (activeTab === 'kaizen') {
        const data = await KaizenService.getSuggestionsByWorker(workerId);
        setKaizens(data);
      } else if (activeTab === 'sop') {
        const [allMods, progMap] = await Promise.all([
          fetchAllSopModules(),
          fetchWorkerSopProgress(workerId),
        ]);
        const completed = allMods
          .filter((m) => progMap[m.id]?.isCompleted)
          .map((m) => ({ sop: m, progress: progMap[m.id] }));
        setCompletedSops(completed);
      } else if (activeTab === 'incidents') {
        const data = await fetchIncidentReports(workerId);
        setIncidents(data);
      } else if (activeTab === 'disciplinary') {
        const data = DisciplinaryService.getActionsByWorkerId(workerId);
        setDisciplinaryActions(data);
      } else if (activeTab === 'handovers') {
        const data = await HandoverManager.getHandoverHistory(50);
        setHandovers(data.filter(h => h.author_id === workerId || h.acknowledged_by === workerId));
      } else if (activeTab === 'kudos') {
        const data = await KudoService.getRecentKudos(50);
        setKudos(data.filter(k => k.sender_id === workerId || k.receiver_id === workerId));
      } else if (activeTab === 'rewards') {
        const data = await fetchRedemptionHistory(workerId);
        setRewards(data);
      }
    } catch (err) {
      console.error('Error loading history data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadTabData();
    }
  }, [isOpen, activeTab, workerId]);

  if (!isOpen) return null;

  const tabs = [
    { key: 'ledger', label: 'Buku Kas Poin', icon: Coins, count: ledgerEntries.length },
    { key: 'kaizen', label: 'Ide Kaizen', icon: Lightbulb, count: kaizens.length },
    { key: 'sop', label: 'SOP & K3 Academy', icon: BookOpen, count: completedSops.length },
    { key: 'incidents', label: 'Insiden K3', icon: ShieldAlert, count: incidents.length },
    { key: 'disciplinary', label: 'Catatan SP & Sanksi', icon: AlertOctagon, count: disciplinaryActions.length },
    { key: 'handovers', label: 'Serah Terima', icon: ArrowRightLeft, count: handovers.length },
    { key: 'kudos', label: 'Kudo Apresiasi', icon: Award, count: kudos.length },
    { key: 'rewards', label: 'Klaim Reward', icon: ShoppingBag, count: rewards.length },
  ] as const;

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] overflow-y-auto bg-black/90 backdrop-blur-xl p-3 sm:p-6 flex items-center justify-center min-h-screen animate-fade-in"
    >
      <div
        className="relative w-full max-w-3xl max-h-[88vh] sm:max-h-[90vh] m-auto flex flex-col bg-zinc-950 border border-zinc-800 rounded-3xl shadow-2xl overflow-hidden"
      >
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                Pusat Riwayat & Arsip Saya
              </h2>
              <p className="text-xs text-zinc-400">
                Arsip terpadu: Ide Kaizen, Laporan Insiden, Catatan SP & Sanksi, Serah Terima, Kudo, & Reward.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={loadTabData}
              disabled={loading}
              className="p-2 text-zinc-400 hover:text-white rounded-xl hover:bg-zinc-800 transition"
              title="Refresh Data"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-indigo-400' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-zinc-400 hover:text-white rounded-xl hover:bg-zinc-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation (Horizontal Scrollable on Mobile) */}
        <div className="flex bg-zinc-900/90 border-b border-zinc-800 p-1.5 overflow-x-auto gap-1 custom-scrollbar">
          {tabs.map((t) => {
            const Icon = t.icon;
            const isActive = activeTab === t.key;
            return (
              <button
                key={t.key}
                onClick={() => setActiveTab(t.key)}
                className={`py-2 px-3 rounded-xl text-xs font-bold transition shrink-0 flex items-center gap-2 ${
                  isActive
                    ? 'bg-zinc-800 text-white shadow-sm border border-zinc-700'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-indigo-400' : 'text-zinc-500'}`} />
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-3 custom-scrollbar">
          {loading ? (
            <div className="py-20 text-center text-zinc-500 space-y-2">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto text-indigo-400" />
              <p className="text-xs">Memuat arsip riwayat...</p>
            </div>
          ) : (
            <>
              {/* TAB 0: BUKU KAS & MUTASI POIN TERPADU */}
              {activeTab === 'ledger' && (
                <div className="space-y-4 animate-fade-in">
                  {/* Summary Metric Header Strip */}
                  {(() => {
                    const totalEarned = ledgerEntries
                      .filter((e) => e.amount > 0)
                      .reduce((acc, e) => acc + e.amount, 0);
                    const totalDeducted = ledgerEntries
                      .filter((e) => e.amount < 0)
                      .reduce((acc, e) => acc + Math.abs(e.amount), 0);
                    const netPoints = totalEarned - totalDeducted;
                    const incomeCount = ledgerEntries.filter((e) => e.amount > 0).length;
                    const expenseCount = ledgerEntries.filter((e) => e.amount < 0).length;

                    const filteredEntries = ledgerEntries.filter((e) => {
                      if (ledgerFilter === 'income') return e.amount > 0;
                      if (ledgerFilter === 'expense') return e.amount < 0;
                      return true;
                    });

                    return (
                      <>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                          {/* Total Masuk */}
                          <div className="bg-zinc-900/90 border border-emerald-500/30 rounded-2xl p-3.5 relative overflow-hidden">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">Total Poin Masuk</span>
                              <div className="w-6 h-6 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                                <TrendingUp className="w-3.5 h-3.5" />
                              </div>
                            </div>
                            <div className="text-xl font-black text-emerald-400 mt-1">
                              +{totalEarned.toLocaleString()} <span className="text-xs text-emerald-500 font-normal">PTS</span>
                            </div>
                            <span className="text-[10px] text-zinc-500 block mt-0.5">{incomeCount} Transaksi reward</span>
                          </div>

                          {/* Total Keluar / Potongan */}
                          <div className="bg-zinc-900/90 border border-rose-500/30 rounded-2xl p-3.5 relative overflow-hidden">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">Total Terpotong / Klaim</span>
                              <div className="w-6 h-6 rounded-lg bg-rose-500/20 text-rose-400 flex items-center justify-center">
                                <TrendingDown className="w-3.5 h-3.5" />
                              </div>
                            </div>
                            <div className="text-xl font-black text-rose-400 mt-1">
                              -{totalDeducted.toLocaleString()} <span className="text-xs text-rose-500 font-normal">PTS</span>
                            </div>
                            <span className="text-[10px] text-zinc-500 block mt-0.5">{expenseCount} Sanksi / belanja</span>
                          </div>

                          {/* Net Akumulasi Mutasi */}
                          <div className="bg-zinc-900/90 border border-amber-500/30 rounded-2xl p-3.5 relative overflow-hidden">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">Akumulasi Bersih</span>
                              <div className="w-6 h-6 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center">
                                <Coins className="w-3.5 h-3.5" />
                              </div>
                            </div>
                            <div className={`text-xl font-black mt-1 ${netPoints >= 0 ? 'text-amber-300' : 'text-rose-400'}`}>
                              {netPoints >= 0 ? `+${netPoints.toLocaleString()}` : netPoints.toLocaleString()} <span className="text-xs text-zinc-400 font-normal">PTS</span>
                            </div>
                            <span className="text-[10px] text-zinc-500 block mt-0.5">Selisih arus kas poin</span>
                          </div>
                        </div>

                        {/* Filter Bar */}
                        <div className="flex items-center justify-between gap-2 pt-1 border-t border-zinc-800/80">
                          <div className="flex items-center gap-1.5 overflow-x-auto">
                            <button
                              onClick={() => setLedgerFilter('all')}
                              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                                ledgerFilter === 'all'
                                  ? 'bg-zinc-800 text-white border border-zinc-700 shadow-sm'
                                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-850'
                              }`}
                            >
                              <span>Semua</span>
                              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-zinc-700/80 text-zinc-300">
                                {ledgerEntries.length}
                              </span>
                            </button>
                            <button
                              onClick={() => setLedgerFilter('income')}
                              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                                ledgerFilter === 'income'
                                  ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-500/40 shadow-sm'
                                  : 'text-zinc-400 hover:text-emerald-400 hover:bg-emerald-950/20'
                              }`}
                            >
                              <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400" />
                              <span>Pemasukan (+)</span>
                              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-900/60 text-emerald-300">
                                {incomeCount}
                              </span>
                            </button>
                            <button
                              onClick={() => setLedgerFilter('expense')}
                              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                                ledgerFilter === 'expense'
                                  ? 'bg-rose-950/60 text-rose-300 border border-rose-500/40 shadow-sm'
                                  : 'text-zinc-400 hover:text-rose-400 hover:bg-rose-950/20'
                              }`}
                            >
                              <ArrowDownRight className="w-3.5 h-3.5 text-rose-400" />
                              <span>Pengurangan (-)</span>
                              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-rose-900/60 text-rose-300">
                                {expenseCount}
                              </span>
                            </button>
                          </div>

                          <span className="text-[10px] text-zinc-500 hidden sm:inline">
                            Diurutkan dari transaksi terbaru
                          </span>
                        </div>

                        {/* List Mutasi Poin */}
                        {filteredEntries.length === 0 ? (
                          <div className="py-16 text-center text-zinc-500 space-y-2.5 bg-zinc-900/40 rounded-2xl border border-zinc-800/80">
                            <Coins className="w-10 h-10 mx-auto text-zinc-700 opacity-60" />
                            <p className="text-sm font-bold text-zinc-400">Belum Ada Riwayat Mutasi Poin</p>
                            <p className="text-xs text-zinc-500 max-w-sm mx-auto">
                              {ledgerFilter === 'income'
                                ? 'Belum ada perolehan poin dari kuis, SOP, atau inovasi.'
                                : ledgerFilter === 'expense'
                                ? 'Tidak ada catatan pemotongan poin atau penukaran reward.'
                                : 'Selesaikan kuis, pelajari modul SOP, atau ajukan kaizen untuk mengumpulkan poin!'}
                            </p>
                          </div>
                        ) : (
                          <div className="space-y-2.5">
                            {filteredEntries.map((item) => {
                              const isPositive = item.amount > 0;
                              const dateObj = new Date(item.date);
                              const formattedDate = !isNaN(dateObj.getTime())
                                ? dateObj.toLocaleDateString('id-ID', {
                                    day: 'numeric',
                                    month: 'short',
                                    year: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })
                                : item.date;

                              return (
                                <div
                                  key={item.id}
                                  className="bg-zinc-900/70 border border-zinc-800 rounded-2xl p-3.5 sm:p-4 hover:border-zinc-700 transition flex items-start justify-between gap-3 shadow-sm"
                                >
                                  {/* Left: Icon & Details */}
                                  <div className="flex items-start gap-3 min-w-0 flex-1">
                                    <div
                                      className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 border ${
                                        isPositive
                                          ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                                          : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
                                      }`}
                                    >
                                      {isPositive ? (
                                        <ArrowUpRight className="w-4 h-4" />
                                      ) : (
                                        <ArrowDownRight className="w-4 h-4" />
                                      )}
                                    </div>

                                    <div className="min-w-0 space-y-1">
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <h4 className="font-bold text-xs sm:text-sm text-white truncate">
                                          {item.title}
                                        </h4>
                                        <span
                                          className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${item.badgeCls}`}
                                        >
                                          {item.badge}
                                        </span>
                                        {item.docRef && (
                                          <span className="text-[9px] font-mono text-zinc-500 bg-zinc-800/80 px-1.5 py-0.5 rounded">
                                            {item.docRef}
                                          </span>
                                        )}
                                      </div>

                                      <p className="text-[11px] text-zinc-400 leading-relaxed line-clamp-2">
                                        {item.description}
                                      </p>

                                      <div className="flex items-center gap-2 text-[10px] text-zinc-500 font-mono">
                                        <Clock className="w-3 h-3 text-zinc-600" />
                                        <span>{formattedDate}</span>
                                        <span>·</span>
                                        <span className="font-sans text-zinc-400">{item.category}</span>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Right: Amount Badge */}
                                  <div className="text-right shrink-0">
                                    <span
                                      className={`text-sm sm:text-base font-black flex items-center gap-0.5 justify-end ${
                                        isPositive ? 'text-emerald-400' : 'text-rose-400'
                                      }`}
                                    >
                                      {isPositive ? `+${item.amount}` : item.amount} PTS
                                    </span>
                                    <span className="text-[10px] text-zinc-500 block">
                                      {isPositive ? 'Reward Masuk' : 'Potongan / Klaim'}
                                    </span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </>
                    );
                  })()}
                </div>
              )}

              {/* TAB 1: KAIZEN */}
              {activeTab === 'kaizen' && (
                <div className="space-y-3">
                  {kaizens.length === 0 ? (
                    <div className="py-16 text-center text-zinc-500 space-y-2">
                      <Lightbulb className="w-10 h-10 mx-auto text-zinc-700 opacity-60" />
                      <p className="text-sm font-bold text-zinc-400">Belum Ada Ide Kaizen</p>
                      <p className="text-xs text-zinc-500">Ajukan ide perbaikan kerja Anda melalui menu "Kaizen Inovasi".</p>
                    </div>
                  ) : (
                    kaizens.map((item) => (
                      <div key={item.id} className="bg-zinc-900/70 border border-zinc-800 rounded-2xl p-4 space-y-2.5">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                          <div>
                            <span className="text-[10px] text-zinc-500 block">
                              {new Date(item.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })} · {item.category}
                            </span>
                            <h4 className="font-bold text-sm text-white">{item.title}</h4>
                          </div>
                          <div className="flex items-center gap-1.5 self-start sm:self-auto">
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black border ${
                              item.status === 'Approved' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                              item.status === 'Under Review' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                              item.status === 'Implemented' ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' :
                              item.status === 'Rejected' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' :
                              'bg-blue-500/10 text-blue-400 border-blue-500/20'
                            }`}>
                              {item.status}
                            </span>
                            {item.reward_points > 0 && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                +{item.reward_points} PTS
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                          <div className="p-2.5 bg-black/30 rounded-xl border border-rose-950/40">
                            <span className="text-[10px] font-bold text-rose-400 block mb-0.5">Masalah:</span>
                            <p className="text-zinc-300 line-clamp-3">{item.current_condition}</p>
                          </div>
                          <div className="p-2.5 bg-black/30 rounded-xl border border-emerald-950/40">
                            <span className="text-[10px] font-bold text-emerald-400 block mb-0.5">Usulan Solusi:</span>
                            <p className="text-zinc-300 line-clamp-3">{item.proposed_solution}</p>
                          </div>
                        </div>

                        {item.reviewer_feedback && (
                          <div className="p-2.5 bg-indigo-950/30 border border-indigo-500/30 rounded-xl text-xs text-indigo-200">
                            <strong>Catatan Reviewer:</strong> {item.reviewer_feedback}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* TAB: SOP & K3 ACADEMY */}
              {activeTab === 'sop' && (
                <div className="space-y-4">
                  {/* Summary Metric Header */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-3">
                      <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block">Modul Selesai</span>
                      <div className="text-lg font-black text-emerald-400 mt-0.5 flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        <span>{completedSops.length} Decks</span>
                      </div>
                      <span className="text-[10px] text-zinc-400">Terakreditasi K3</span>
                    </div>

                    <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-3">
                      <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block">Total Poin Diraih</span>
                      <div className="text-lg font-black text-amber-300 mt-0.5 flex items-center gap-1">
                        <Award className="w-4 h-4 text-amber-400" />
                        <span>+{completedSops.reduce((acc, c) => acc + (c.sop.pointsReward || 50), 0)} PTS</span>
                      </div>
                      <span className="text-[10px] text-amber-400/80">Klaim Terverifikasi</span>
                    </div>

                    <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-3">
                      <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block">Benchmark Boost</span>
                      <div className="text-lg font-black text-purple-300 mt-0.5 flex items-center gap-1">
                        <Sparkles className="w-4 h-4 text-purple-400" />
                        <span>+{(completedSops.length * 2.5).toFixed(1)} BIB</span>
                      </div>
                      <span className="text-[10px] text-purple-400/80">Pilar Kompetensi</span>
                    </div>

                    <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-3">
                      <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block">Rata-Rata Kuis</span>
                      <div className="text-lg font-black text-cyan-300 mt-0.5 flex items-center gap-1">
                        <CheckSquare className="w-4 h-4 text-cyan-400" />
                        <span>
                          {completedSops.length > 0
                            ? Math.round(
                                completedSops.reduce((acc, c) => acc + (c.progress.quizScore || 100), 0) /
                                  completedSops.length
                              )
                            : 0}%
                        </span>
                      </div>
                      <span className="text-[10px] text-cyan-400/80">Evaluasi Pemahaman</span>
                    </div>
                  </div>

                  {completedSops.length === 0 ? (
                    <div className="py-16 text-center text-zinc-500 space-y-2.5 bg-zinc-900/40 rounded-2xl border border-zinc-800/80">
                      <BookOpen className="w-10 h-10 mx-auto text-zinc-700 opacity-60" />
                      <p className="text-sm font-bold text-zinc-400">Belum Ada Modul SOP yang Diselesaikan</p>
                      <p className="text-xs text-zinc-500 max-w-sm mx-auto">
                        Buka menu <strong className="text-zinc-300">Pustaka SOP</strong> di dashboard untuk mempelajari standar keselamatan kerja operasional dan klaim reward <strong>+50 PTS</strong> per modul!
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {completedSops.map(({ sop, progress }) => (
                        <div
                          key={sop.id}
                          className="bg-zinc-900/70 border border-zinc-800 rounded-2xl p-4 space-y-3 hover:border-zinc-700 transition"
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-mono text-[10px] font-bold text-zinc-400 bg-zinc-800/80 px-2 py-0.5 rounded border border-zinc-700">
                                  {sop.code}
                                </span>
                                <span className="text-[10px] font-bold text-purple-300 bg-purple-950/60 px-2 py-0.5 rounded border border-purple-800/60">
                                  {sop.category}
                                </span>
                                {sop.isMandatory && (
                                  <span className="text-[10px] font-black text-amber-300 bg-amber-950/80 px-2 py-0.5 rounded border border-amber-800/80 uppercase">
                                    Wajib K3
                                  </span>
                                )}
                                <span className="text-[10px] font-black text-emerald-300 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800/80 flex items-center gap-1">
                                  <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                                  Tuntas
                                </span>
                              </div>
                              <h4 className="font-bold text-sm text-white">{sop.title}</h4>
                            </div>

                            <div className="flex items-center gap-2 sm:text-right">
                              <div className="text-right">
                                <span className="text-xs font-black text-amber-400 flex items-center gap-1 sm:justify-end">
                                  <Award className="w-3.5 h-3.5 text-amber-400" />
                                  +{sop.pointsReward || 50} PTS
                                </span>
                                <span className="text-[10px] text-zinc-500 block">
                                  {progress.completedAt
                                    ? new Date(progress.completedAt).toLocaleDateString('id-ID', {
                                        day: 'numeric',
                                        month: 'short',
                                        year: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit',
                                      })
                                    : 'Terverifikasi'}
                                </span>
                              </div>
                            </div>
                          </div>

                          <p className="text-xs text-zinc-400 line-clamp-2 leading-relaxed">
                            {sop.description}
                          </p>

                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-2 border-t border-zinc-800/80 text-[11px] text-zinc-400">
                            <div className="flex items-center gap-1.5">
                              <Clock className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                              <span>Waktu: {Math.max(1, Math.round(progress.timeSpentSeconds / 60))} menit</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <CheckSquare className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                              <span>Kuis: {progress.quizScore || 100}/100</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <BookOpen className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                              <span>Materi: {sop.slides?.length || 1} Slide</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: INCIDENTS */}
              {activeTab === 'incidents' && (
                <div className="space-y-3">
                  {incidents.length === 0 ? (
                    <div className="py-16 text-center text-zinc-500 space-y-2">
                      <ShieldAlert className="w-10 h-10 mx-auto text-zinc-700 opacity-60" />
                      <p className="text-sm font-bold text-zinc-400">Tidak Ada Laporan Insiden</p>
                      <p className="text-xs text-zinc-500">Anda belum pernah mencatat laporan bahaya atau insiden K3.</p>
                    </div>
                  ) : (
                    incidents.map((inc) => (
                      <div key={inc.id} className="bg-zinc-900/70 border border-zinc-800 rounded-2xl p-4 space-y-2">
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="text-[10px] text-zinc-500 block">
                              {new Date(inc.occurredAt || inc.createdAt).toLocaleDateString('id-ID')} · Lokasi: {inc.location}
                            </span>
                            <h4 className="font-bold text-sm text-white">{inc.description}</h4>
                          </div>
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black border ${
                            INCIDENT_STATUS_META[inc.status]?.cls || 'bg-zinc-800 text-zinc-400'
                          }`}>
                            {INCIDENT_STATUS_META[inc.status]?.label || inc.status}
                          </span>
                        </div>
                        {inc.correctiveAction && (
                          <div className="p-2.5 bg-emerald-950/20 border border-emerald-500/30 rounded-xl text-xs text-emerald-300">
                            <strong>Tindakan Perbaikan (CAPA):</strong> {inc.correctiveAction}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* TAB 3: CATATAN PEMBINAAN & SANKSI (SP) */}
              {activeTab === 'disciplinary' && (
                <div className="space-y-3">
                  {disciplinaryActions.length === 0 ? (
                    <div className="py-16 text-center text-zinc-500 space-y-2">
                      <CheckCircle2 className="w-10 h-10 mx-auto text-emerald-500 opacity-80" />
                      <p className="text-sm font-bold text-white">Catatan Disiplin K3 Bersih</p>
                      <p className="text-xs text-zinc-400">
                        Luar biasa! Anda tidak memiliki catatan pelanggaran, konseling, ataupun Surat Peringatan (SP). Pertahankan zero incident & budaya K3!
                      </p>
                    </div>
                  ) : (
                    disciplinaryActions.map((action) => {
                      const levelMeta = VIOLATION_META[action.violationLevel];
                      const catMeta = CATEGORY_META[action.violationCategory];
                      const statusMeta = SANCTION_STATUS_META[action.status];

                      return (
                        <div
                          key={action.id}
                          className="bg-zinc-900/80 border border-rose-500/20 rounded-2xl p-4 sm:p-5 space-y-3.5 shadow-lg relative overflow-hidden"
                        >
                          {/* Top Accent Strip */}
                          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-rose-500 via-amber-500 to-rose-500" />

                          {/* Header Bar */}
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-800 pb-3">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-lg">{catMeta?.icon || '⚠️'}</span>
                                <h4 className="font-bold text-sm text-white">{levelMeta?.label || 'Sanksi K3'}</h4>
                              </div>
                              <div className="flex items-center gap-2 mt-1 text-[11px] text-zinc-400 font-mono">
                                <span className="text-zinc-500">No. SK:</span>
                                <span className="font-bold text-zinc-200">{action.documentRefNumber}</span>
                                <span>·</span>
                                <span className="text-zinc-500">Diterbitkan:</span>
                                <span className="text-zinc-300">{action.incidentDate}</span>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 self-start sm:self-auto">
                              <span className={`px-2.5 py-1 rounded-xl text-[10px] font-black border ${statusMeta?.cls || 'bg-zinc-800 text-zinc-400'}`}>
                                {statusMeta?.label || action.status}
                              </span>
                              {action.pointDeduction > 0 && (
                                <span className="px-2.5 py-1 rounded-xl text-[10px] font-black bg-rose-500/10 text-rose-400 border border-rose-500/30">
                                  -{action.pointDeduction} PTS
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Info Grid */}
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs bg-zinc-950/60 p-3 rounded-xl border border-zinc-800/80">
                            <div>
                              <span className="text-[10px] text-zinc-500 block">Kategori Pelanggaran:</span>
                              <span className="font-semibold text-zinc-200">{catMeta?.label || action.violationCategory}</span>
                            </div>
                            <div>
                              <span className="text-[10px] text-zinc-500 block">Lokasi Kejadian:</span>
                              <span className="font-semibold text-zinc-200">{action.location || '-'}</span>
                            </div>
                            <div>
                              <span className="text-[10px] text-zinc-500 block">Masa Berlaku SK:</span>
                              <span className="font-semibold text-amber-400">s/d {action.expiryDate}</span>
                            </div>
                          </div>

                          {/* Deskripsi & Komitmen */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                            <div className="p-3 bg-zinc-950/80 rounded-xl border border-zinc-800 space-y-1">
                              <span className="text-[10px] font-bold text-rose-400 uppercase tracking-wider block">
                                Kronologi & Uraian Pelanggaran:
                              </span>
                              <p className="text-zinc-300 leading-relaxed whitespace-pre-wrap">{action.description}</p>
                            </div>

                            <div className="p-3 bg-zinc-950/80 rounded-xl border border-zinc-800 space-y-1">
                              <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block">
                                Komitmen Perbaikan (Action Plan):
                              </span>
                              <p className="text-zinc-300 leading-relaxed whitespace-pre-wrap">
                                {action.actionPlan || 'Wajib mematuhi SOP K3 dan tidak mengulangi pelanggaran serupa.'}
                              </p>
                            </div>
                          </div>

                          {/* Mandatory Retraining Section */}
                          {action.mandatoryRetrainingSopId && (
                            <div className="p-3 bg-amber-950/20 border border-amber-500/30 rounded-xl space-y-1.5 text-xs">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-1.5 font-bold text-amber-300">
                                  <BookOpen className="w-4 h-4" />
                                  <span>Mandatory Retraining SOP Wajib:</span>
                                </div>
                                <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black border ${
                                  action.isRetrainingCompleted
                                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                                    : 'bg-amber-500/20 text-amber-300 border-amber-500/30 animate-pulse'
                                }`}>
                                  {action.isRetrainingCompleted ? '✓ Retraining Selesai' : '⏳ Wajib Remedial SOP'}
                                </span>
                              </div>
                              <p className="text-zinc-300 font-semibold">
                                {action.mandatoryRetrainingSopTitle || 'Modul Standar Operasional K3'}
                              </p>
                              {action.resolutionNotes && (
                                <p className="text-[11px] text-zinc-400 border-t border-amber-500/20 pt-1 mt-1">
                                  <strong className="text-zinc-300">Catatan Evaluasi:</strong> {action.resolutionNotes}
                                </p>
                              )}
                            </div>
                          )}

                          {/* Footer Actions */}
                          <div className="flex items-center justify-between pt-2 border-t border-zinc-800/80">
                            <span className="text-[10px] text-zinc-500">
                              Diterbitkan oleh: <strong className="text-zinc-400">{action.issuedBy}</strong>
                            </span>

                            <button
                              onClick={() => DisciplinaryService.generateWarningLetterPDF(action)}
                              className="px-3.5 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 hover:text-white border border-zinc-700 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
                              title="Unduh Lembar Resmi Surat Peringatan / Berita Acara PDF"
                            >
                              <Download className="w-3.5 h-3.5 text-teal-400" />
                              <span>Unduh Berkas Surat (PDF)</span>
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}

              {/* TAB 4: HANDOVERS */}
              {activeTab === 'handovers' && (
                <div className="space-y-3">
                  {handovers.length === 0 ? (
                    <div className="py-16 text-center text-zinc-500 space-y-2">
                      <ArrowRightLeft className="w-10 h-10 mx-auto text-zinc-700 opacity-60" />
                      <p className="text-sm font-bold text-zinc-400">Belum Ada Catatan Serah Terima</p>
                      <p className="text-xs text-zinc-500">Catatan pergantian shift Anda akan tercatat di sini.</p>
                    </div>
                  ) : (
                    handovers.map((h) => (
                      <div key={h.id} className="bg-zinc-900/70 border border-zinc-800 rounded-2xl p-4 space-y-2">
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="text-[10px] text-indigo-400 font-bold block">
                              Shift {h.shift_type} · {h.handover_category}
                            </span>
                            <p className="text-xs text-zinc-200 mt-1 whitespace-pre-wrap">{h.notes}</p>
                          </div>
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-zinc-800 text-zinc-400 border border-zinc-700">
                            {h.status}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* TAB 5: KUDOS */}
              {activeTab === 'kudos' && (
                <div className="space-y-3">
                  {kudos.length === 0 ? (
                    <div className="py-16 text-center text-zinc-500 space-y-2">
                      <Award className="w-10 h-10 mx-auto text-zinc-700 opacity-60" />
                      <p className="text-sm font-bold text-zinc-400">Belum Ada Kudo Apresiasi</p>
                      <p className="text-xs text-zinc-500">Kirim atau terima kudo apresiasi bersama rekan kerja Anda!</p>
                    </div>
                  ) : (
                    kudos.map((k) => {
                      const isReceiver = k.receiver_id === workerId;
                      return (
                        <div key={k.id} className="bg-zinc-900/70 border border-zinc-800 rounded-2xl p-4 space-y-1.5">
                          <div className="flex justify-between items-center text-xs">
                            <span className="font-bold text-white">
                              {isReceiver ? `Diterima dari ${k.sender_name || 'Rekan'}` : `Dikirim ke ${k.receiver_name || 'Rekan'}`}
                            </span>
                            <span className="text-amber-400 font-black text-[11px]">+{k.points_awarded ?? 10} PTS</span>
                          </div>
                          <p className="text-xs text-zinc-300 italic">"{k.message}"</p>
                          <span className="text-[10px] text-zinc-500 block">Kategori: {k.category}</span>
                        </div>
                      );
                    })
                  )}
                </div>
              )}

              {/* TAB 6: REWARDS */}
              {activeTab === 'rewards' && (
                <div className="space-y-3">
                  {rewards.length === 0 ? (
                    <div className="py-16 text-center text-zinc-500 space-y-2">
                      <ShoppingBag className="w-10 h-10 mx-auto text-zinc-700 opacity-60" />
                      <p className="text-sm font-bold text-zinc-400">Belum Ada Riwayat Penukaran</p>
                      <p className="text-xs text-zinc-500">Kumpulkan poin prestasi dan tukarkan dengan reward katalog!</p>
                    </div>
                  ) : (
                    rewards.map((r) => (
                      <div key={r.id} className="bg-zinc-900/70 border border-zinc-800 rounded-2xl p-4 flex items-center justify-between">
                        <div>
                          <h4 className="font-bold text-xs sm:text-sm text-white">{r.itemTitle}</h4>
                          <p className="text-[10px] text-zinc-500">Kode: {r.redemptionCode} · {new Date(r.redeemedAt).toLocaleDateString('id-ID')}</p>
                        </div>
                        <div className="text-right">
                          <span className="text-xs font-bold text-rose-400 block">-{r.pointsSpent} PTS</span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            r.status === 'completed' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'
                          }`}>
                            {r.status === 'completed' ? 'Selesai' : 'Pending'}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
