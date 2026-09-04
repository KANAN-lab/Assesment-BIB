import React, { useEffect, useState } from 'react';
import { X, ShieldAlert, Loader2, AlertCircle, CheckCircle2, Clock, Search } from 'lucide-react';
import { IncidentReport } from '../types/assessment';
import { fetchIncidentReports } from '../lib/supabaseService';

interface WorkerIncidentHistoryProps {
  workerId: string;
  workerName: string;
  onClose: () => void;
}

const SEVERITY_META: Record<string, { label: string; cls: string }> = {
  low:      { label: 'Rendah',   cls: 'bg-zinc-800 text-zinc-400 border-zinc-700' },
  medium:   { label: 'Sedang',   cls: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
  high:     { label: 'Tinggi',   cls: 'bg-orange-500/10 text-orange-400 border-orange-500/20' },
  critical: { label: 'Kritis',   cls: 'bg-rose-500/10 text-rose-400 border-rose-500/20' },
};

const STATUS_META: Record<string, { label: string; cls: string; Icon: React.FC<{ className?: string }> }> = {
  open:          { label: 'Terbuka',    cls: 'bg-amber-500/10 text-amber-400 border-amber-500/20',   Icon: AlertCircle },
  investigating: { label: 'Investigasi', cls: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20', Icon: Clock },
  resolved:      { label: 'Resolved',   cls: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20', Icon: CheckCircle2 },
  closed:        { label: 'Ditutup',    cls: 'bg-zinc-700/50 text-zinc-400 border-zinc-700', Icon: CheckCircle2 },
};

const TYPE_LABELS: Record<string, string> = {
  near_miss:       'Near-Miss',
  injury:          'Cedera',
  property_damage: 'Kerusakan Properti',
  unsafe_condition:'Kondisi Tidak Aman',
  other:           'Lainnya',
};

export const WorkerIncidentHistory: React.FC<WorkerIncidentHistoryProps> = ({
  workerId,
  workerName,
  onClose,
}) => {
  const [incidents, setIncidents] = useState<IncidentReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchIncidentReports(workerId)
      .then(setIncidents)
      .catch(() => setIncidents([]))
      .finally(() => setLoading(false));
  }, [workerId]);

  const filtered = incidents.filter((inc) => {
    const q = search.toLowerCase();
    return (
      !q ||
      inc.location.toLowerCase().includes(q) ||
      inc.description.toLowerCase().includes(q) ||
      TYPE_LABELS[inc.incidentType]?.toLowerCase().includes(q)
    );
  });

  React.useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  return (
    <div
      className="fixed inset-0 z-[9999] overflow-y-auto bg-black/90 backdrop-blur-xl p-4 sm:p-6 flex items-center justify-center min-h-screen animate-fade-in"
    >
      <div
        className="relative w-full max-w-3xl max-h-[82vh] sm:max-h-[85vh] m-auto bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
          <div>
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-orange-400" />
              Riwayat Laporan Insiden Saya
            </h2>
            <p className="text-[11px] text-zinc-500 mt-0.5">{workerName} · {incidents.length} laporan total</p>
          </div>
          <button onClick={onClose} className="text-zinc-500 hover:text-white transition p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search */}
        <div className="px-5 pt-4 pb-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-2.5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari lokasi, deskripsi, jenis..."
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-8 pr-3 py-2 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500"
            />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 pb-5 space-y-2.5 custom-scrollbar">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 text-zinc-500 animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12">
              <ShieldAlert className="w-8 h-8 text-zinc-700 mx-auto mb-2" />
              <p className="text-zinc-500 text-sm">{incidents.length === 0 ? 'Belum ada laporan insiden.' : 'Tidak ada hasil pencarian.'}</p>
              <p className="text-zinc-600 text-xs mt-1">Laporan insiden baru bisa dibuat dari dashboard utama.</p>
            </div>
          ) : (
            filtered.map((inc) => {
              const sevMeta = SEVERITY_META[inc.severity] ?? SEVERITY_META.low;
              const statusMeta = STATUS_META[inc.status] ?? STATUS_META.open;
              const StatusIcon = statusMeta.Icon;
              return (
                <div key={inc.id} className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 space-y-2.5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold text-white">
                          {TYPE_LABELS[inc.incidentType] ?? inc.incidentType}
                        </span>
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${sevMeta.cls}`}>
                          {sevMeta.label}
                        </span>
                      </div>
                      <p className="text-[11px] text-zinc-400 mt-0.5">📍 {inc.location}</p>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-1 rounded-lg border flex items-center gap-1 shrink-0 ${statusMeta.cls}`}>
                      <StatusIcon className="w-3 h-3" />
                      {statusMeta.label}
                    </span>
                  </div>

                  <p className="text-[11px] text-zinc-400 leading-relaxed line-clamp-2">{inc.description}</p>

                  {/* Points Validation Status Badge */}
                  <div className="flex items-center gap-2">
                    {inc.status === 'open' ? (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center gap-1">
                        ⏳ +50 PTS Pending (Menunggu Validasi Supervisor)
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                        ✅ +50 PTS Terverifikasi Valid (Poin Ditambahkan)
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-3 text-[10px] text-zinc-600 border-t border-zinc-800/60 pt-2">
                    <span>Kejadian: {new Date(inc.occurredAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                    <span>·</span>
                    <span>Dilaporkan: {new Date(inc.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                    {inc.resolvedAt && (
                      <>
                        <span>·</span>
                        <span className="text-emerald-500">Selesai: {new Date(inc.resolvedAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                      </>
                    )}
                  </div>

                  {inc.resolutionNote && (
                    <div className="text-[10px] text-emerald-400/80 bg-emerald-500/5 border border-emerald-500/20 rounded-lg px-3 py-2">
                      <span className="font-bold">Catatan Resolusi: </span>{inc.resolutionNote}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
