import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  ShieldAlert, Search, Download, ExternalLink, Camera, FileText,
  Clock, CheckCircle2, ChevronRight, Edit3, X, Loader2
} from 'lucide-react';
import { IncidentReport } from '../../types/assessment';
import {
  fetchIncidentReports,
  updateIncidentStatus,
  updateIncidentCapaAndStatus,
  exportIncidentsCSV
} from '../../lib/supabaseService';
import { ExecutivePDFReportGenerator } from '../../lib/pdfReportService';

interface AdminIncidentPanelProps {
  showToast: (msg: string) => void;
}

export const AdminIncidentPanel: React.FC<AdminIncidentPanelProps> = ({ showToast }) => {
  const [incidents, setIncidents] = useState<IncidentReport[]>([]);
  const [incidentsLoading, setIncidentsLoading] = useState(false);

  // Search & Filters
  const [incidentSearchQuery, setIncidentSearchQuery] = useState('');
  const [incidentSeverityFilter, setIncidentSeverityFilter] = useState<string>('all');
  const [incidentStatusFilter, setIncidentStatusFilter] = useState<string>('all');

  // Photo viewer modal
  const [viewingIncidentPhoto, setViewingIncidentPhoto] = useState<{
    url: string;
    title: string;
    subtitle: string;
    sizes?: string;
  } | null>(null);

  // CAPA Follow-Up Modal
  const [selectedCapaIncident, setSelectedCapaIncident] = useState<IncidentReport | null>(null);
  const [capaRootCause, setCapaRootCause] = useState('');
  const [capaCorrectiveAction, setCapaCorrectiveAction] = useState('');
  const [capaAssignedPic, setCapaAssignedPic] = useState('');
  const [capaDueDate, setCapaDueDate] = useState('');
  const [capaStatus, setCapaStatus] = useState<IncidentReport['status']>('investigating');
  const [capaNote, setCapaNote] = useState('');
  const [isSubmittingCapa, setIsSubmittingCapa] = useState(false);

  const loadIncidents = async () => {
    setIncidentsLoading(true);
    try {
      const data = await fetchIncidentReports();
      setIncidents(data);
    } catch (e) {
      console.warn('Gagal memuat insiden:', e);
    } finally {
      setIncidentsLoading(false);
    }
  };

  useEffect(() => {
    loadIncidents();
  }, []);

  const filteredIncidents = useMemo(() => {
    return incidents.filter((inc) => {
      const matchSearch =
        !incidentSearchQuery.trim() ||
        (inc.description || '').toLowerCase().includes(incidentSearchQuery.toLowerCase()) ||
        (inc.location || '').toLowerCase().includes(incidentSearchQuery.toLowerCase()) ||
        (inc.workerName || '').toLowerCase().includes(incidentSearchQuery.toLowerCase());

      const matchSeverity = incidentSeverityFilter === 'all' || inc.severity === incidentSeverityFilter;
      const matchStatus = incidentStatusFilter === 'all' || inc.status === incidentStatusFilter;

      return matchSearch && matchSeverity && matchStatus;
    });
  }, [incidents, incidentSearchQuery, incidentSeverityFilter, incidentStatusFilter]);

  const handleOpenCapaModal = (inc: IncidentReport) => {
    setSelectedCapaIncident(inc);
    setCapaStatus(inc.status);
    setCapaRootCause(inc.rootCause || '');
    setCapaCorrectiveAction(inc.correctiveAction || '');
    setCapaAssignedPic(inc.assignedPic || '');
    setCapaDueDate(inc.dueDate || new Date().toISOString().slice(0, 10));
    setCapaNote('');
  };

  const handleSaveCapa = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCapaIncident) return;
    setIsSubmittingCapa(true);
    try {
      const res = await updateIncidentCapaAndStatus(selectedCapaIncident.id, {
        status: capaStatus,
        rootCause: capaRootCause.trim(),
        correctiveAction: capaCorrectiveAction.trim(),
        assignedPic: capaAssignedPic.trim(),
        dueDate: capaDueDate,
        resolutionNote: capaNote.trim(),
        updatedBy: 'System Administrator',
      });
      if (res.pointsAwarded) {
        showToast('Tindakan Korektif CAPA Berhasil Diperbarui! +50 Poin Reward ditambahkan ke akun pelapor.');
      } else {
        showToast('Tindakan Korektif CAPA & Status Insiden K3 Berhasil Diperbarui!');
      }
      setSelectedCapaIncident(null);
      await loadIncidents();
    } catch (err: any) {
      showToast(`Gagal update CAPA: ${err.message}`);
    } finally {
      setIsSubmittingCapa(false);
    }
  };

  const handleUpdateStatus = async (id: string, status: IncidentReport['status']) => {
    try {
      await updateIncidentStatus(id, status);
      setIncidents((prev) => prev.map((i) => (i.id === id ? { ...i, status } : i)));
      showToast(`Status insiden diperbarui: ${status}`);
    } catch (err: any) {
      showToast(`Gagal update status: ${err.message}`);
    }
  };

  return (
    <div className="card p-5 space-y-4">
      {/* Header & Filter Toolbar */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3 border-b border-zinc-800 pb-3">
        <div>
          <h3 className="text-xs font-black text-white flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-orange-400" />
            Modul Kontrol & Follow-Up Laporan Insiden K3 ({filteredIncidents.length} dari {incidents.length})
          </h3>
          <p className="text-[11px] text-zinc-400 mt-0.5">
            Pengelolaan Tindakan Korektif (CAPA), Log Riwayat Penanganan, dan Cetak Berita Acara Resmi PDF
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap w-full lg:w-auto">
          <div className="relative flex-1 sm:w-48">
            <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-2.5" />
            <input
              type="text"
              value={incidentSearchQuery}
              onChange={(e) => setIncidentSearchQuery(e.target.value)}
              placeholder="Cari lokasi, deskripsi..."
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-orange-500"
            />
          </div>

          <select
            value={incidentSeverityFilter}
            onChange={(e) => setIncidentSeverityFilter(e.target.value)}
            className="bg-zinc-950 border border-zinc-800 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-orange-500 font-semibold"
          >
            <option value="all">Semua Keparahan</option>
            <option value="critical">Kritis (Critical)</option>
            <option value="high">Tinggi (High)</option>
            <option value="medium">Sedang (Medium)</option>
            <option value="low">Rendah (Low)</option>
          </select>

          <select
            value={incidentStatusFilter}
            onChange={(e) => setIncidentStatusFilter(e.target.value)}
            className="bg-zinc-950 border border-zinc-800 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-orange-500 font-semibold"
          >
            <option value="all">Semua Status</option>
            <option value="open">Open</option>
            <option value="investigating">Investigating</option>
            <option value="resolved">Resolved</option>
            <option value="closed">Closed</option>
          </select>

          <button
            type="button"
            onClick={() => exportIncidentsCSV(filteredIncidents)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 rounded-xl text-xs font-bold transition"
            title="Ekspor seluruh laporan insiden ke CSV"
          >
            <Download className="w-3.5 h-3.5 text-orange-400" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {incidentsLoading && <p className="text-xs text-zinc-500 text-center py-6">Memuat laporan insiden...</p>}

      {!incidentsLoading && filteredIncidents.length === 0 && (
        <div className="text-center py-10 text-zinc-500 text-xs border border-zinc-800 rounded-xl bg-zinc-950/40">
          Tidak ada laporan insiden K3 yang sesuai dengan filter.
        </div>
      )}

      {/* Incidents List */}
      <div className="space-y-3 max-h-[600px] overflow-y-auto custom-scrollbar pr-1">
        {filteredIncidents.map((inc) => (
          <div key={inc.id} className="p-4 rounded-xl bg-zinc-900/80 border border-zinc-800 space-y-3">
            {/* Header Row */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                  <span
                    className={`text-[9px] font-black px-2 py-0.5 rounded uppercase ${
                      inc.severity === 'critical'
                        ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                        : inc.severity === 'high'
                        ? 'bg-orange-500/20 text-orange-300 border border-orange-500/30'
                        : inc.severity === 'medium'
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        : 'bg-zinc-800 text-zinc-400 border border-zinc-700'
                    }`}
                  >
                    {inc.severity}
                  </span>

                  <span
                    className={`text-[9px] font-bold px-2 py-0.5 rounded uppercase ${
                      inc.status === 'open'
                        ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                        : inc.status === 'investigating'
                        ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                        : inc.status === 'resolved'
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : 'bg-zinc-800 text-zinc-400 border border-zinc-700'
                    }`}
                  >
                    {inc.status}
                  </span>

                  <span className="text-xs font-bold text-white flex items-center gap-1">
                    👤 {inc.workerName ?? inc.workerId}
                  </span>
                </div>

                <p className="text-xs text-zinc-300 font-medium leading-relaxed">{inc.description}</p>

                <div className="flex items-center gap-3 mt-2 flex-wrap text-[10px]">
                  <span className="text-zinc-400">
                    📍 {inc.location} · {new Date(inc.occurredAt).toLocaleString('id-ID')}
                  </span>

                  <a
                    href="https://drive.google.com/drive/folders/16p6cnEb7o6zOF2jFcPm3z7Md-Utntrkr"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-purple-400 hover:text-purple-300 font-bold bg-purple-950/60 border border-purple-500/30 px-2 py-0.5 rounded flex items-center gap-1 transition"
                  >
                    <span>Folder Drive K3</span>
                    <ExternalLink className="w-2.5 h-2.5" />
                  </a>

                  {inc.photoUrl && (
                    <button
                      type="button"
                      onClick={() =>
                        setViewingIncidentPhoto({
                          url: inc.photoUrl!,
                          title: `Bukti Foto: ${inc.location}`,
                          subtitle: `Pelapor: ${inc.workerName || inc.workerId} · ${new Date(inc.occurredAt).toLocaleDateString('id-ID')}`,
                        })
                      }
                      className="text-orange-400 hover:text-orange-300 font-bold bg-orange-950/60 border border-orange-500/30 px-2 py-0.5 rounded flex items-center gap-1 transition"
                    >
                      <Camera className="w-3 h-3" />
                      <span>Lihat Foto Bukti</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 flex-col sm:flex-row shrink-0">
                <select
                  value={inc.status}
                  onChange={(e) => handleUpdateStatus(inc.id, e.target.value as IncidentReport['status'])}
                  className="bg-zinc-950 border border-zinc-700 text-zinc-200 text-xs rounded-lg px-2 py-1 focus:outline-none focus:border-orange-500 font-semibold"
                >
                  <option value="open">Open</option>
                  <option value="investigating">Investigating</option>
                  <option value="resolved">Resolved</option>
                  <option value="closed">Closed</option>
                </select>

                <button
                  type="button"
                  onClick={() => handleOpenCapaModal(inc)}
                  className="px-3 py-1 bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-500/40 rounded-lg text-xs font-bold transition flex items-center gap-1"
                >
                  <Edit3 className="w-3 h-3" />
                  <span>Form CAPA</span>
                </button>

                <button
                  type="button"
                  onClick={() => ExecutivePDFReportGenerator.exportIncidentReportPDF(inc)}
                  className="px-3 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 rounded-lg text-xs font-bold transition flex items-center gap-1"
                >
                  <FileText className="w-3 h-3 text-orange-400" />
                  <span>Cetak BAP</span>
                </button>
              </div>
            </div>

            {/* CAPA Follow-Up Card Detail */}
            {(inc.rootCause || inc.correctiveAction || inc.assignedPic) && (
              <div className="bg-zinc-950 p-3 rounded-xl border border-zinc-800/80 text-xs space-y-1.5 text-zinc-300">
                <div className="text-[10px] font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Rencana Tindakan Korektif & Investigasi (CAPA)
                </div>
                {inc.rootCause && (
                  <div>
                    <span className="text-zinc-500 font-semibold">Akar Masalah: </span>
                    {inc.rootCause}
                  </div>
                )}
                {inc.correctiveAction && (
                  <div>
                    <span className="text-zinc-500 font-semibold">Tindakan Korektif: </span>
                    {inc.correctiveAction}
                  </div>
                )}
                <div className="flex items-center gap-4 text-[11px] text-zinc-400 pt-1">
                  {inc.assignedPic && <div>PIC: <strong className="text-white">{inc.assignedPic}</strong></div>}
                  {inc.dueDate && <div>Target: <strong className="text-amber-400">{inc.dueDate}</strong></div>}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* ─── MODAL FOLLOW-UP CAPA ─── */}
      {selectedCapaIncident && createPortal(
        <div
          className="fixed inset-0 z-[9999] overflow-y-auto bg-black/90 backdrop-blur-xl p-4 sm:p-6 flex items-center justify-center min-h-screen animate-fade-in"
          onClick={() => setSelectedCapaIncident(null)}
        >
          <div
            className="relative w-full max-w-lg m-auto card-elevated p-5 border border-amber-500/30 space-y-4 overflow-y-auto custom-scrollbar"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-2.5">
                <Edit3 className="w-5 h-5 text-amber-400" />
                <div>
                  <h3 className="text-sm font-black text-white">Investigasi & Form CAPA K3</h3>
                  <p className="text-[11px] text-zinc-400">
                    Pelapor: {selectedCapaIncident.workerName || selectedCapaIncident.workerId} · Lokasi: {selectedCapaIncident.location}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedCapaIncident(null)}
                className="text-zinc-500 hover:text-white p-1 rounded-lg hover:bg-zinc-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCapa} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1">Status Laporan Insiden</label>
                <select
                  value={capaStatus}
                  onChange={(e) => setCapaStatus(e.target.value as IncidentReport['status'])}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500 font-bold"
                >
                  <option value="open">OPEN (Belum Ditangani)</option>
                  <option value="investigating">INVESTIGATING (Sedang Diinvestigasi)</option>
                  <option value="resolved">RESOLVED (Tindakan Korektif Selesai)</option>
                  <option value="closed">CLOSED (Insiden Ditutup Resmi)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1">Akar Masalah (Root Cause / 5-Why)</label>
                <textarea
                  rows={2}
                  value={capaRootCause}
                  onChange={(e) => setCapaRootCause(e.target.value)}
                  placeholder="Contoh: Oli bocor dari unit forklift karena seal pecah..."
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-2.5 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1">Rencana Tindakan Korektif (CAPA)</label>
                <textarea
                  rows={2}
                  value={capaCorrectiveAction}
                  onChange={(e) => setCapaCorrectiveAction(e.target.value)}
                  placeholder="Contoh: Penggantian hydraulic seal, pembersihan dengan absorbant..."
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-2.5 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-zinc-300 mb-1">PIC Penanggung Jawab</label>
                  <input
                    type="text"
                    value={capaAssignedPic}
                    onChange={(e) => setCapaAssignedPic(e.target.value)}
                    placeholder="Nama Supervisor / Teknisi"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-300 mb-1">Target Selesai (Due Date)</label>
                  <input
                    type="date"
                    value={capaDueDate}
                    onChange={(e) => setCapaDueDate(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1">Catatan Resolusi / Log Penanganan</label>
                <input
                  type="text"
                  value={capaNote}
                  onChange={(e) => setCapaNote(e.target.value)}
                  placeholder="Catatan singkat..."
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setSelectedCapaIncident(null)}
                  className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold text-xs rounded-xl transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingCapa}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs rounded-xl transition flex items-center gap-1.5"
                >
                  {isSubmittingCapa && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Simpan Form CAPA</span>
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* ─── MODAL LIGHTBOX FOTO BUKTI ─── */}
      {viewingIncidentPhoto && createPortal(
        <div
          className="fixed inset-0 z-[9999] overflow-y-auto bg-black/90 backdrop-blur-xl p-4 sm:p-6 flex items-center justify-center min-h-screen animate-fade-in"
          onClick={() => setViewingIncidentPhoto(null)}
        >
          <div
            className="relative w-full max-w-2xl max-h-[85vh] m-auto card-elevated p-5 border border-orange-500/30 space-y-4 overflow-y-auto custom-scrollbar"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-2.5">
                <ShieldAlert className="w-5 h-5 text-orange-400" />
                <div>
                  <h3 className="text-sm font-black text-white">{viewingIncidentPhoto.title}</h3>
                  <p className="text-[11px] text-zinc-400">{viewingIncidentPhoto.subtitle}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setViewingIncidentPhoto(null)}
                className="text-zinc-500 hover:text-white p-1 rounded-lg hover:bg-zinc-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-zinc-950 p-2 rounded-xl border border-zinc-800 flex flex-col items-center justify-center min-h-[300px]">
              <img
                src={viewingIncidentPhoto.url}
                alt="Foto Bukti Insiden K3"
                className="max-h-[60vh] max-w-full object-contain rounded-lg shadow-2xl border border-zinc-800"
              />
            </div>

            <div className="flex items-center justify-between text-xs text-zinc-400 pt-2 border-t border-zinc-800">
              <span className="text-zinc-500">Pratinjau Foto Bukti Terlampir</span>
              <div className="flex items-center gap-2">
                <a
                  href={viewingIncidentPhoto.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs rounded-xl transition flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Buka Asli</span>
                </a>
                <button
                  type="button"
                  onClick={() => setViewingIncidentPhoto(null)}
                  className="px-4 py-1.5 bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs rounded-xl transition"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
