import React, { useState, useEffect } from 'react';
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
  Sparkles,
  Zap,
  DollarSign,
  HeartHandshake,
  HelpCircle,
  Search,
  CheckSquare
} from 'lucide-react';
import { KaizenService } from '../lib/kaizenService';
import { fetchIncidentReports, fetchRedemptionHistory } from '../lib/supabaseService';
import { HandoverManager } from '../lib/handoverService';
import { KudoService } from '../lib/kudoService';
import { KaizenSuggestionEntity, KaizenCategory, KaizenStatus } from '../types/kaizen';
import { IncidentReport, RewardHistory } from '../types/assessment';
import { ShiftHandoverEntity } from '../types/handover';
import { KudoEntity } from '../types/kudos';

interface WorkerHistoryCenterModalProps {
  isOpen: boolean;
  onClose: () => void;
  workerId: string;
  workerName: string;
  initialTab?: 'kaizen' | 'incidents' | 'handovers' | 'kudos' | 'rewards';
}

const INCIDENT_STATUS_META: Record<string, { label: string; cls: string }> = {
  open: { label: 'Terbuka', cls: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
  investigating: { label: 'Investigasi', cls: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' },
  resolved: { label: 'Resolved', cls: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
  closed: { label: 'Ditutup', cls: 'bg-zinc-800 text-zinc-400 border-zinc-700' }
};

export function WorkerHistoryCenterModal({
  isOpen,
  onClose,
  workerId,
  workerName,
  initialTab = 'kaizen'
}: WorkerHistoryCenterModalProps) {
  const [activeTab, setActiveTab] = useState<'kaizen' | 'incidents' | 'handovers' | 'kudos' | 'rewards'>(initialTab);
  const [loading, setLoading] = useState(false);

  // Data states
  const [kaizens, setKaizens] = useState<KaizenSuggestionEntity[]>([]);
  const [incidents, setIncidents] = useState<IncidentReport[]>([]);
  const [handovers, setHandovers] = useState<ShiftHandoverEntity[]>([]);
  const [kudos, setKudos] = useState<KudoEntity[]>([]);
  const [rewards, setRewards] = useState<RewardHistory[]>([]);

  const loadTabData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'kaizen') {
        const data = await KaizenService.getSuggestionsByWorker(workerId);
        setKaizens(data);
      } else if (activeTab === 'incidents') {
        const data = await fetchIncidentReports(workerId);
        setIncidents(data);
      } else if (activeTab === 'handovers') {
        const data = await HandoverManager.getHandoverHistory(50);
        // filter for this worker (either authored or acknowledged)
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
    { key: 'kaizen', label: 'Ide Kaizen', icon: Lightbulb, count: kaizens.length },
    { key: 'incidents', label: 'Insiden K3', icon: ShieldAlert, count: incidents.length },
    { key: 'handovers', label: 'Serah Terima', icon: ArrowRightLeft, count: handovers.length },
    { key: 'kudos', label: 'Kudo Apresiasi', icon: Award, count: kudos.length },
    { key: 'rewards', label: 'Klaim Reward', icon: ShoppingBag, count: rewards.length },
  ] as const;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl max-h-[92vh] flex flex-col bg-zinc-950 border border-zinc-800 rounded-3xl shadow-2xl overflow-hidden">
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
                Arsip terpadu: Ide Kaizen, Laporan Insiden, Serah Terima, Kudo, & Reward.
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

              {/* TAB 2: INCIDENTS */}
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

              {/* TAB 3: HANDOVERS */}
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

              {/* TAB 4: KUDOS */}
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

              {/* TAB 5: REWARDS */}
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
    </div>
  );
}
