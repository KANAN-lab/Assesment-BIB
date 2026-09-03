import React, { useState, useEffect, useMemo } from 'react';
import {
  ShieldAlert, Plus, Search, Filter, AlertTriangle, CheckCircle2,
  Clock, Download, Camera, User, FileText, X, ArrowRight, Loader2,
  ChevronDown, AlertOctagon, CheckCircle, Flame
} from 'lucide-react';
import { WorkerProfile } from '../types/assessment';
import {
  SafetyPatrolRecord,
  PatrolStatus,
  PatrolSeverity,
  SEVERITY_CONFIG,
  FINDING_TYPE_CONFIG,
  WAREHOUSE_PATROL_ZONES
} from '../types/safetyPatrol';
import { SafetyPatrolService } from '../domain/SafetyPatrolService';
import { SafetyPatrolModal } from './SafetyPatrolModal';

interface SafetyPatrolKanbanProps {
  workers: WorkerProfile[];
  currentSupervisorName?: string;
  currentSupervisorId?: string;
  showToast: (msg: string) => void;
}

export const SafetyPatrolKanban: React.FC<SafetyPatrolKanbanProps> = ({
  workers,
  currentSupervisorName = 'Supervisor Logistik',
  currentSupervisorId = 'sup-default',
  showToast,
}) => {
  const [records, setRecords] = useState<SafetyPatrolRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedZoneFilter, setSelectedZoneFilter] = useState('all');
  const [selectedSeverityFilter, setSelectedSeverityFilter] = useState('all');
  const [urgentOnly, setUrgentOnly] = useState(false);

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [previewPhoto, setPreviewPhoto] = useState<string | null>(null);

  // Resolution Notes Modal
  const [resolvingRecord, setResolvingRecord] = useState<SafetyPatrolRecord | null>(null);
  const [resolutionInput, setResolutionInput] = useState('');
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  const loadRecords = async () => {
    setLoading(true);
    try {
      const data = await SafetyPatrolService.getAllPatrols();
      setRecords(data);
    } catch (err) {
      console.warn('Gagal memuat safety patrol data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRecords();
  }, []);

  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      const matchSearch =
        r.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.zoneName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (r.assignedPicName && r.assignedPicName.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchZone = selectedZoneFilter === 'all' || r.zoneId === selectedZoneFilter;
      const matchSeverity = selectedSeverityFilter === 'all' || r.severity === selectedSeverityFilter;

      const isCriticalOrHigh = r.severity === 'Critical' || r.severity === 'High';
      const matchUrgent = !urgentOnly || (r.status !== 'Resolved' && isCriticalOrHigh);

      return matchSearch && matchZone && matchSeverity && matchUrgent;
    });
  }, [records, searchQuery, selectedZoneFilter, selectedSeverityFilter, urgentOnly]);

  const openList = useMemo(() => filteredRecords.filter((r) => r.status === 'Open'), [filteredRecords]);
  const inProgressList = useMemo(() => filteredRecords.filter((r) => r.status === 'In Progress'), [filteredRecords]);
  const resolvedList = useMemo(() => filteredRecords.filter((r) => r.status === 'Resolved'), [filteredRecords]);

  // Metrics
  const criticalCount = useMemo(() => {
    return records.filter((r) => r.status !== 'Resolved' && (r.severity === 'Critical' || r.severity === 'High')).length;
  }, [records]);

  const resolvedCount = useMemo(() => {
    return records.filter((r) => r.status === 'Resolved').length;
  }, [records]);

  const goodPracticeCount = useMemo(() => {
    return records.filter((r) => r.findingType === 'Good Practice').length;
  }, [records]);

  const handleStatusChange = async (record: SafetyPatrolRecord, newStatus: PatrolStatus) => {
    if (newStatus === 'Resolved') {
      setResolvingRecord(record);
      setResolutionInput(record.resolutionNotes || '');
      return;
    }

    setIsUpdatingStatus(true);
    try {
      await SafetyPatrolService.updatePatrolStatus(record.id, newStatus);
      showToast(`Status temuan diubah ke: ${newStatus}`);
      await loadRecords();
    } catch (e: any) {
      showToast(`Gagal update status: ${e.message}`);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleConfirmResolve = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resolvingRecord) return;

    setIsUpdatingStatus(true);
    try {
      const res = await SafetyPatrolService.updatePatrolStatus(
        resolvingRecord.id,
        'Resolved',
        resolutionInput.trim() || 'Telah diverifikasi selesai oleh supervisor lapangan.',
        currentSupervisorName
      );

      if (res.pointsAwarded) {
        showToast('Temuan berhasil diselesaikan! +25 Poin Integritas diberikan kepada PIC penanggung jawab.');
      } else {
        showToast('Temuan berhasil diselesaikan & diverifikasi aman.');
      }

      setResolvingRecord(null);
      await loadRecords();
    } catch (err: any) {
      showToast(`Gagal menyelesaikan temuan: ${err.message}`);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const renderCard = (record: SafetyPatrolRecord) => {
    const sev = SEVERITY_CONFIG[record.severity];
    const findType = FINDING_TYPE_CONFIG[record.findingType];

    return (
      <div
        key={record.id}
        className={`bg-zinc-900/90 rounded-xl p-3.5 border ${sev.borderClass} space-y-3 shadow-md hover:border-zinc-700 transition relative`}
      >
        {/* Header Tags */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${sev.badgeClass}`}>
            {record.severity}
          </span>
          <span className={`text-[9px] font-semibold px-2 py-0.5 rounded border ${findType.badgeClass}`}>
            {record.findingType}
          </span>
        </div>

        {/* Zone & Description */}
        <div>
          <div className="text-[11px] font-bold text-orange-400 flex items-center gap-1">
            <ShieldAlert className="w-3 h-3 shrink-0" />
            <span className="truncate">{record.zoneName}</span>
          </div>
          <p className="text-xs text-zinc-200 mt-1 leading-relaxed line-clamp-3">
            {record.description}
          </p>
        </div>

        {/* Photo thumbnail */}
        {record.photoUrl && (
          <div
            onClick={() => setPreviewPhoto(record.photoUrl!)}
            className="relative cursor-pointer rounded-lg overflow-hidden border border-zinc-800 h-24 bg-zinc-950 group"
          >
            <img
              src={record.photoUrl}
              alt="Bukti Temuan Patroli"
              className="w-full h-full object-cover group-hover:scale-105 transition"
            />
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition text-[11px] text-white font-bold gap-1">
              <Camera className="w-3.5 h-3.5" />
              <span>Perbesar Foto</span>
            </div>
          </div>
        )}

        {/* Metadata: PIC & Due Date */}
        <div className="pt-2 border-t border-zinc-800 text-[11px] space-y-1 text-zinc-400">
          {record.assignedPicName && (
            <div className="flex items-center justify-between">
              <span className="text-zinc-500">PIC:</span>
              <span className="text-white font-bold truncate">{record.assignedPicName}</span>
            </div>
          )}
          {record.dueDate && (
            <div className="flex items-center justify-between">
              <span className="text-zinc-500">Batas Waktu:</span>
              <span className="text-amber-400 font-mono font-bold">{record.dueDate}</span>
            </div>
          )}
          {record.resolutionNotes && (
            <div className="p-2 bg-zinc-950 rounded-lg border border-zinc-800 text-[10px] text-emerald-300">
              <strong className="block text-zinc-400">Tindakan Korektif:</strong>
              {record.resolutionNotes}
            </div>
          )}
        </div>

        {/* Action Toolbar */}
        <div className="flex items-center justify-between gap-1.5 pt-2 border-t border-zinc-800">
          <button
            type="button"
            onClick={() => SafetyPatrolService.exportPatrolBapPdf(record)}
            className="p-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 rounded-lg text-[11px] font-bold transition flex items-center gap-1"
            title="Cetak Berita Acara Temuan Patroli (PDF)"
          >
            <Download className="w-3.5 h-3.5 text-orange-400" />
            <span>PDF BAP</span>
          </button>

          {/* Quick status progress selector */}
          <select
            value={record.status}
            onChange={(e) => handleStatusChange(record, e.target.value as PatrolStatus)}
            className="bg-zinc-950 border border-zinc-700 text-zinc-200 text-xs rounded-lg px-2 py-1 focus:outline-none focus:border-orange-500 font-semibold"
          >
            <option value="Open">Open</option>
            <option value="In Progress">In Progress</option>
            <option value="Resolved">Resolved (Selesai)</option>
          </select>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4 animate-fade-in">
      {/* 1. Header Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-zinc-900/90 border border-zinc-800 p-4 rounded-xl flex items-center justify-between">
          <div>
            <div className="text-[10px] text-zinc-400 font-semibold uppercase tracking-wider">Total Temuan Patroli</div>
            <div className="text-xl font-black text-white mt-0.5">{records.length} Kasus</div>
            <div className="text-[10px] text-zinc-500 mt-0.5">Gemba Walk Lapangan</div>
          </div>
          <div className="w-10 h-10 bg-orange-500/10 border border-orange-500/20 rounded-xl flex items-center justify-center text-orange-400">
            <ShieldAlert className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-zinc-900/90 border border-zinc-800 p-4 rounded-xl flex items-center justify-between">
          <div>
            <div className="text-[10px] text-zinc-400 font-semibold uppercase tracking-wider">Kritis / Urgent (&lt;24 Jam)</div>
            <div className="text-xl font-black text-rose-400 mt-0.5">{criticalCount} Temuan</div>
            <div className="text-[10px] text-rose-400/80 mt-0.5">Perlu Tindakan Segera</div>
          </div>
          <div className="w-10 h-10 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-center justify-center text-rose-400">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-zinc-900/90 border border-zinc-800 p-4 rounded-xl flex items-center justify-between">
          <div>
            <div className="text-[10px] text-zinc-400 font-semibold uppercase tracking-wider">Telah Diselesaikan</div>
            <div className="text-xl font-black text-emerald-400 mt-0.5">{resolvedCount} Selesai</div>
            <div className="text-[10px] text-emerald-400/80 mt-0.5">Tindakan Korektif Valid</div>
          </div>
          <div className="w-10 h-10 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center justify-center text-emerald-400">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-zinc-900/90 border border-zinc-800 p-4 rounded-xl flex items-center justify-between">
          <div>
            <div className="text-[10px] text-zinc-400 font-semibold uppercase tracking-wider">Good Practice Positif</div>
            <div className="text-xl font-black text-cyan-400 mt-0.5">{goodPracticeCount} Apresiasi</div>
            <div className="text-[10px] text-cyan-400/80 mt-0.5">Kepatuhan K3 Prima</div>
          </div>
          <div className="w-10 h-10 bg-cyan-500/10 border border-cyan-500/20 rounded-xl flex items-center justify-center text-cyan-400">
            <CheckCircle className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* 2. Toolbar & Filters */}
      <div className="card p-4 space-y-3">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3">
          <div>
            <h3 className="text-xs font-black text-white flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-orange-400" />
              Papan Kontrol Gemba Walk & Quick Safety Patrol
            </h3>
            <p className="text-[11px] text-zinc-400 mt-0.5">
              Inspeksi keliling 5-menit supervisor untuk mendeteksi tindakan & kondisi tidak aman di seluruh gudang
            </p>
          </div>

          <button
            type="button"
            onClick={() => setIsCreateModalOpen(true)}
            className="px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-lg shadow-orange-950/40 shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>+ Inspeksi Gemba Walk Baru</span>
          </button>
        </div>

        {/* Filter Bar */}
        <div className="flex items-center gap-2 flex-wrap pt-2 border-t border-zinc-800">
          <div className="relative flex-1 min-w-44">
            <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari temuan, area, atau PIC..."
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-orange-500"
            />
          </div>

          <select
            value={selectedZoneFilter}
            onChange={(e) => setSelectedZoneFilter(e.target.value)}
            className="bg-zinc-950 border border-zinc-800 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-orange-500"
          >
            <option value="all">Semua Zona Gudang</option>
            {WAREHOUSE_PATROL_ZONES.map((z) => (
              <option key={z.id} value={z.id}>{z.name}</option>
            ))}
          </select>

          <select
            value={selectedSeverityFilter}
            onChange={(e) => setSelectedSeverityFilter(e.target.value)}
            className="bg-zinc-950 border border-zinc-800 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-orange-500 font-semibold"
          >
            <option value="all">Semua Keparahan</option>
            <option value="Critical">Critical</option>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </select>

          <button
            type="button"
            onClick={() => setUrgentOnly(!urgentOnly)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              urgentOnly
                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                : 'bg-zinc-900 text-zinc-400 border border-zinc-800 hover:text-white'
            }`}
          >
            <Flame className="w-3.5 h-3.5 text-rose-400" />
            <span>Kritis &lt;24 Jam</span>
          </button>
        </div>
      </div>

      {/* 3. Kanban 3-Column Board */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Kolom 1: OPEN */}
        <div className="bg-zinc-950/60 rounded-2xl p-4 border border-zinc-800 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                1. Temuan Baru (Open)
              </h4>
            </div>
            <span className="bg-zinc-900 text-zinc-400 text-[10px] font-mono font-bold px-2 py-0.5 rounded border border-zinc-800">
              {openList.length}
            </span>
          </div>

          <div className="space-y-3 min-h-[300px] max-h-[650px] overflow-y-auto custom-scrollbar pr-1">
            {openList.length === 0 ? (
              <div className="text-center py-12 text-zinc-600 text-xs">Tidak ada temuan status Open.</div>
            ) : (
              openList.map(renderCard)
            )}
          </div>
        </div>

        {/* Kolom 2: IN PROGRESS */}
        <div className="bg-zinc-950/60 rounded-2xl p-4 border border-zinc-800 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                2. Tindak Lanjut (In Progress)
              </h4>
            </div>
            <span className="bg-zinc-900 text-zinc-400 text-[10px] font-mono font-bold px-2 py-0.5 rounded border border-zinc-800">
              {inProgressList.length}
            </span>
          </div>

          <div className="space-y-3 min-h-[300px] max-h-[650px] overflow-y-auto custom-scrollbar pr-1">
            {inProgressList.length === 0 ? (
              <div className="text-center py-12 text-zinc-600 text-xs">Tidak ada temuan dalam pengerjaan.</div>
            ) : (
              inProgressList.map(renderCard)
            )}
          </div>
        </div>

        {/* Kolom 3: RESOLVED */}
        <div className="bg-zinc-950/60 rounded-2xl p-4 border border-zinc-800 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                3. Terverifikasi Selesai (Resolved)
              </h4>
            </div>
            <span className="bg-zinc-900 text-zinc-400 text-[10px] font-mono font-bold px-2 py-0.5 rounded border border-zinc-800">
              {resolvedList.length}
            </span>
          </div>

          <div className="space-y-3 min-h-[300px] max-h-[650px] overflow-y-auto custom-scrollbar pr-1">
            {resolvedList.length === 0 ? (
              <div className="text-center py-12 text-zinc-600 text-xs">Belum ada temuan yang diselesaikan.</div>
            ) : (
              resolvedList.map(renderCard)
            )}
          </div>
        </div>
      </div>

      {/* Modal Buat Inspeksi Patroli Baru */}
      {isCreateModalOpen && (
        <SafetyPatrolModal
          workers={workers}
          currentSupervisorName={currentSupervisorName}
          currentSupervisorId={currentSupervisorId}
          onClose={() => setIsCreateModalOpen(false)}
          onSuccess={(newRecord) => {
            showToast(`Temuan Gemba Walk di ${newRecord.zoneName} berhasil dicatat!`);
            loadRecords();
          }}
        />
      )}

      {/* Modal Foto Full Lightbox */}
      {previewPhoto && (
        <div
          className="fixed inset-0 z-[9999] overflow-y-auto bg-black/95 backdrop-blur-xl p-4 flex items-center justify-center min-h-screen animate-fade-in"
          onClick={() => setPreviewPhoto(null)}
        >
          <div className="relative max-w-3xl max-h-[85vh] m-auto space-y-3 text-center" onClick={(e) => e.stopPropagation()}>
            <img
              src={previewPhoto}
              alt="Foto Bukti Gemba Walk"
              className="max-h-[75vh] max-w-full object-contain rounded-2xl shadow-2xl border border-zinc-800 mx-auto"
            />
            <button
              type="button"
              onClick={() => setPreviewPhoto(null)}
              className="px-5 py-2 bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs rounded-xl transition"
            >
              Tutup Pratinjau
            </button>
          </div>
        </div>
      )}

      {/* Modal Resolusi & Catatan Tindakan Perbaikan */}
      {resolvingRecord && (
        <div
          className="fixed inset-0 z-[9999] overflow-y-auto bg-black/90 backdrop-blur-xl p-4 sm:p-6 flex items-center justify-center min-h-screen animate-fade-in"
          onClick={() => setResolvingRecord(null)}
        >
          <div
            className="relative w-full max-w-md m-auto card-elevated p-6 space-y-4 border border-emerald-500/40"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                <h3 className="text-sm font-bold text-white">Verifikasi Selesai (Resolve Temuan)</h3>
              </div>
              <button
                type="button"
                onClick={() => setResolvingRecord(null)}
                className="text-zinc-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-zinc-900 p-3 rounded-xl border border-zinc-800 text-xs space-y-1">
              <div className="font-bold text-white">{resolvingRecord.zoneName}</div>
              <p className="text-zinc-400 text-[11px] line-clamp-2">{resolvingRecord.description}</p>
            </div>

            <form onSubmit={handleConfirmResolve} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1">
                  Catatan Tindakan Korektif / Bukti Perbaikan *
                </label>
                <textarea
                  rows={3}
                  value={resolutionInput}
                  onChange={(e) => setResolutionInput(e.target.value)}
                  placeholder="Contoh: Oli telah dibersihkan dan dipasang absorbent pad; seal hidrolik forklift telah diganti..."
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-emerald-500 resize-none"
                  required
                />
              </div>

              <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs text-emerald-300 flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                <span>
                  Bila temuan ini memiliki PIC pekerja yang ditugaskan, menyelesaikan temuan tepat waktu akan mengganjar <strong>+25 Poin Integritas</strong> secara otomatis.
                </span>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setResolvingRecord(null)}
                  className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-bold rounded-xl transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isUpdatingStatus}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition flex items-center gap-2"
                >
                  {isUpdatingStatus ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                  <span>Tandai Selesai & Validasi</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
