import React, { useState } from 'react';
import {
  ShieldAlert,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  User,
  MapPin,
  ArrowRight,
  Sparkles,
  FileText,
  Search,
  LayoutGrid,
  ListFilter
} from 'lucide-react';
import { IncidentReport } from '../types/assessment';
import { NotificationEngine } from '../domain/NotificationEngine';

interface SupervisorIncidentKanbanProps {
  incidents: IncidentReport[];
  loading: boolean;
  onUpdateStatus: (incidentId: string, newStatus: IncidentReport['status']) => Promise<void>;
  updatingIncidentId?: string | null;
  onSelectIncident?: (incident: IncidentReport) => void;
}

const KANBAN_COLUMNS: {
  key: IncidentReport['status'];
  title: string;
  badgeCls: string;
  iconColor: string;
  desc: string;
}[] = [
  {
    key: 'open',
    title: 'Open (Menunggu Validasi)',
    badgeCls: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
    iconColor: 'text-rose-400',
    desc: 'Laporan baru dari worker. Poin +50 pending.',
  },
  {
    key: 'investigating',
    title: 'Sedang Investigasi',
    badgeCls: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30',
    iconColor: 'text-indigo-400',
    desc: 'Insiden valid terverifikasi. Poin +50 diberikan.',
  },
  {
    key: 'resolved',
    title: 'Resolved / CAPA OK',
    badgeCls: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    iconColor: 'text-emerald-400',
    desc: 'Tindakan korektif selesai.',
  },
  {
    key: 'closed',
    title: 'Closed (Resmi Ditutup)',
    badgeCls: 'bg-zinc-800 text-zinc-400 border-zinc-700',
    iconColor: 'text-zinc-400',
    desc: 'Arsip resmi K3.',
  },
];

const SEVERITY_META: Record<IncidentReport['severity'], { label: string; cls: string }> = {
  low:      { label: 'Rendah',   cls: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
  medium:   { label: 'Sedang',   cls: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
  high:     { label: 'Tinggi',   cls: 'bg-orange-500/10 text-orange-400 border-orange-500/20' },
  critical: { label: 'Kritis',   cls: 'bg-rose-500/10 text-rose-400 border-rose-500/20' },
};

const TYPE_LABELS: Record<string, string> = {
  near_miss: 'Hampir Celaka (Near Miss)',
  injury: 'Kecelakaan / Cedera',
  property_damage: 'Kerusakan Properti',
  unsafe_condition: 'Kondisi Tidak Aman',
  other: 'Lainnya',
};

export const SupervisorIncidentKanban: React.FC<SupervisorIncidentKanbanProps> = ({
  incidents,
  loading,
  onUpdateStatus,
  updatingIncidentId,
  onSelectIncident,
}) => {
  const [search, setSearch] = useState('');
  const [selectedSeverity, setSelectedSeverity] = useState('all');

  const filteredIncidents = incidents.filter((inc) => {
    const q = search.toLowerCase();
    const matchesQuery =
      inc.description.toLowerCase().includes(q) ||
      inc.location.toLowerCase().includes(q) ||
      (inc.workerName && inc.workerName.toLowerCase().includes(q)) ||
      inc.workerId.toLowerCase().includes(q);
    const matchesSev = selectedSeverity === 'all' || inc.severity === selectedSeverity;
    return matchesQuery && matchesSev;
  });

  const handleMoveStatus = async (inc: IncidentReport, nextStatus: IncidentReport['status']) => {
    await onUpdateStatus(inc.id, nextStatus);

    // Kirim notifikasi ke Worker saat Supervisor memvalidasi insiden (misal dari open -> investigating/resolved)
    if (inc.status === 'open' && nextStatus !== 'open') {
      NotificationEngine.addNotification({
        recipientId: inc.workerId,
        recipientRole: 'worker',
        title: '🎉 Laporan Insiden K3 Disetujui!',
        message: `Laporan insiden Anda di ${inc.location} telah disetujui Supervisor. Poin +50 PTS telah ditambahkan ke dompet Anda!`,
        type: 'incident',
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-7 h-7 text-emerald-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-1 w-full sm:w-auto">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-2.5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari nama, lokasi, deskripsi..."
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-8 pr-3 py-2 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <select
            value={selectedSeverity}
            onChange={(e) => setSelectedSeverity(e.target.value)}
            className="bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 font-semibold"
          >
            <option value="all">Semua Keparahan</option>
            <option value="critical">🔴 Kritis</option>
            <option value="high">🟠 Tinggi</option>
            <option value="medium">🟡 Sedang</option>
            <option value="low">🟢 Rendah</option>
          </select>
        </div>

        <div className="text-xs text-zinc-500 flex items-center gap-1.5 shrink-0">
          <LayoutGrid className="w-4 h-4 text-emerald-400" />
          <span className="font-bold text-zinc-300">Kanban Lifecycle Insiden ({incidents.length})</span>
        </div>
      </div>

      {/* Kanban Board Grid (4 Columns) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5 items-start">
        {KANBAN_COLUMNS.map((col) => {
          const colIncidents = filteredIncidents.filter((inc) => inc.status === col.key);

          return (
            <div key={col.key} className="bg-zinc-950/80 border border-zinc-800/80 rounded-2xl p-3 space-y-3 flex flex-col min-h-[420px]">
              {/* Column Header */}
              <div className="flex items-center justify-between border-b border-zinc-800/80 pb-2.5">
                <div>
                  <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full ${col.key === 'open' ? 'bg-rose-500' : col.key === 'investigating' ? 'bg-indigo-400' : col.key === 'resolved' ? 'bg-emerald-400' : 'bg-zinc-500'}`} />
                    {col.title}
                  </h4>
                  <p className="text-[10px] text-zinc-500 mt-0.5">{col.desc}</p>
                </div>
                <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${col.badgeCls}`}>
                  {colIncidents.length}
                </span>
              </div>

              {/* Cards List */}
              <div className="space-y-2.5 flex-1 overflow-y-auto pr-0.5 custom-scrollbar">
                {colIncidents.length === 0 ? (
                  <div className="text-center py-10 text-[11px] text-zinc-600 border border-dashed border-zinc-800/60 rounded-xl">
                    Kosong
                  </div>
                ) : (
                  colIncidents.map((inc) => {
                    const sevMeta = SEVERITY_META[inc.severity] ?? SEVERITY_META.low;
                    const isUpdating = updatingIncidentId === inc.id;

                    return (
                      <div
                        key={inc.id}
                        onClick={() => onSelectIncident?.(inc)}
                        className="bg-zinc-900/90 hover:bg-zinc-900 border border-zinc-800 hover:border-zinc-700 rounded-xl p-3 space-y-2.5 transition shadow-sm cursor-pointer group"
                      >
                        {/* Header Badge */}
                        <div className="flex items-start justify-between gap-2">
                          <span className="text-[11px] font-bold text-white group-hover:text-emerald-400 transition leading-tight">
                            {TYPE_LABELS[inc.incidentType] ?? inc.incidentType}
                          </span>
                          <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded border shrink-0 ${sevMeta.cls}`}>
                            {sevMeta.label}
                          </span>
                        </div>

                        {/* Worker & Location */}
                        <div className="text-[11px] text-zinc-400 space-y-0.5">
                          <div className="flex items-center gap-1 font-semibold text-zinc-300">
                            <User className="w-3 h-3 text-zinc-500" />
                            <span className="truncate">{inc.workerName ?? inc.workerId}</span>
                          </div>
                          <div className="flex items-center gap-1 text-[10px] text-zinc-500">
                            <MapPin className="w-3 h-3 text-zinc-600" />
                            <span className="truncate">{inc.location}</span>
                          </div>
                        </div>

                        {/* Description */}
                        <p className="text-[11px] text-zinc-400 line-clamp-2 leading-snug">
                          {inc.description}
                        </p>

                        {/* Status Validation Alert */}
                        {inc.status === 'open' && (
                          <div className="bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[10px] p-1.5 rounded-lg flex items-center gap-1 font-semibold">
                            <Clock className="w-3 h-3 text-amber-400 shrink-0" />
                            <span>Poin +50 PTS Worker Pending</span>
                          </div>
                        )}

                        {/* Photo Thumbnail if exists */}
                        {inc.photoUrl && (
                          <div className="relative rounded-lg overflow-hidden border border-zinc-800 h-16 bg-zinc-950">
                            <img
                              src={inc.photoUrl}
                              alt="Bukti Insiden"
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                e.currentTarget.src = 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=800&auto=format&fit=crop&q=80';
                              }}
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end justify-between p-1 text-[9px] text-zinc-300 font-bold">
                              <span>Bukti Terlampir</span>
                              <span className="text-emerald-400 font-mono">Klik → Lihat Foto</span>
                            </div>
                          </div>
                        )}

                        {/* Action Move Buttons */}
                        <div className="pt-2 border-t border-zinc-800/80 flex items-center justify-between gap-1">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onSelectIncident?.(inc);
                            }}
                            className="px-2 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 text-[10px] font-bold rounded-lg transition flex items-center gap-1"
                          >
                            <FileText className="w-3 h-3 text-cyan-400" />
                            Detail & CAPA
                          </button>

                          {col.key === 'open' && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (onSelectIncident) {
                                  onSelectIncident(inc);
                                } else {
                                  handleMoveStatus(inc, 'investigating');
                                }
                              }}
                              disabled={isUpdating}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[10px] rounded-lg transition flex items-center gap-1 disabled:opacity-50"
                            >
                              {isUpdating ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
                              Validasi (+50 PTS)
                            </button>
                          )}

                          {col.key === 'investigating' && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleMoveStatus(inc, 'resolved');
                              }}
                              disabled={isUpdating}
                              className="px-2 py-1 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-[10px] rounded-lg transition flex items-center gap-1 disabled:opacity-50"
                            >
                              {isUpdating ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
                              Resolved CAPA
                            </button>
                          )}

                          {col.key === 'resolved' && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleMoveStatus(inc, 'closed');
                              }}
                              disabled={isUpdating}
                              className="px-2 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold text-[10px] rounded-lg transition flex items-center gap-1 border border-zinc-700 disabled:opacity-50"
                            >
                              {isUpdating ? <Loader2 className="w-3 h-3 animate-spin" /> : <ArrowRight className="w-3 h-3" />}
                              Tutup Insiden
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
