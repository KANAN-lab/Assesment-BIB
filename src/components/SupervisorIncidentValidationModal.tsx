import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  CheckCircle2,
  XCircle,
  X,
  Loader2,
  User,
  MapPin,
  Clock,
  FileText,
  AlertTriangle,
  Award,
  Download,
  ExternalLink,
  ImageIcon,
  Sparkles
} from 'lucide-react';
import { IncidentReport, WorkerProfile } from '../types/assessment';
import { NotificationEngine } from '../domain/NotificationEngine';
import { SystemConfigService } from '../domain/SystemConfigService';
import { IncidentManager } from '../domain/IncidentManager';
import { IncidentEntity } from '../domain/IncidentEntity';
import { updateIncidentCapaAndStatus } from '../lib/supabaseService';
import { ExecutivePDFReportGenerator } from '../lib/pdfReportService';
import { GDRIVE_FOLDER_URL } from '../lib/googleDriveService';

import { createPortal } from 'react-dom';

interface SupervisorIncidentValidationModalProps {
  incident: IncidentReport;
  workers: WorkerProfile[];
  onClose: () => void;
  onSuccess: () => void;
}

export const SupervisorIncidentValidationModal: React.FC<SupervisorIncidentValidationModalProps> = ({
  incident,
  workers,
  onClose,
  onSuccess,
}) => {
  const [status, setStatus] = useState<IncidentReport['status']>(
    incident.status === 'open' ? 'investigating' : incident.status
  );
  const [rootCause, setRootCause] = useState(incident.rootCause || '');
  const [correctiveAction, setCorrectiveAction] = useState(incident.correctiveAction || '');
  const [assignedPic, setAssignedPic] = useState(incident.assignedPic || 'Supervisor HSEQ');
  const [dueDate, setDueDate] = useState(
    incident.dueDate || new Date(Date.now() + 86400000 * 3).toISOString().slice(0, 10)
  );
  const [resolutionNote, setResolutionNote] = useState(incident.resolutionNote || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reporterWorker = workers.find((w) => w.id === incident.workerId || w.employeeId === incident.workerId);

  const handleValidateAndSave = async (approved: boolean) => {
    setLoading(true);
    setError(null);

    try {
      await IncidentManager.validateAndApplyCapa({
        incidentId: incident.id,
        workerId: incident.workerId,
        location: incident.location,
        incidentType: incident.incidentType,
        approved,
        rootCause,
        correctiveAction,
        assignedPic,
        dueDate,
        resolutionNote,
        validatorName: 'Supervisor HSEQ',
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Gagal menyimpan validasi insiden.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  const cfg = SystemConfigService.getConfig();
  const rewardPointsDisplay = (incident.incidentType === 'near_miss' || (incident as any).type === 'near_miss')
    ? cfg.nearMissRewardPoints
    : cfg.incidentValidRewardPoints;

  const displayPhotoUrl =
    incident.photoUrl || 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=800&auto=format&fit=crop&q=80';

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] overflow-y-auto bg-black/90 backdrop-blur-xl p-4 sm:p-6 flex items-center justify-center min-h-screen animate-fade-in"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-5xl max-h-[82vh] sm:max-h-[85vh] m-auto bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden border-orange-500/30"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-950/80 relative z-10 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-500/10 border border-orange-500/30 flex items-center justify-center shrink-0">
              <ShieldAlert className="w-5 h-5 text-orange-400" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base font-bold text-white">Validasi Insiden K3 & Form Action Plan (CAPA)</h3>
                <span className="text-[10px] font-mono font-bold px-2.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 uppercase">
                  STATUS: {incident.status}
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-0.5">
                Pengawasan & Verifikasi Poin Reward (+{rewardPointsDisplay} PTS) Pelapor
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-white p-2 rounded-xl hover:bg-zinc-800 transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 2-Column Responsive Body Grid */}
        <div className="p-6 overflow-y-auto flex-1 min-h-0 custom-scrollbar grid grid-cols-1 lg:grid-cols-12 gap-6 bg-zinc-950/40">
          
          {/* LEFT COLUMN: Incident Details & Photo Evidence (5 cols) */}
          <div className="lg:col-span-5 space-y-4">
            {/* Reporter Card */}
            <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800 space-y-3">
              <div className="flex items-center justify-between border-b border-zinc-800/80 pb-2.5">
                <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">Identitas Pelapor</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  {reporterWorker?.division || 'WRM/WFG'}
                </span>
              </div>

              <div className="space-y-1">
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <User className="w-4 h-4 text-emerald-400" />
                  {incident.workerName || reporterWorker?.name || incident.workerId}
                </h4>
                {reporterWorker && (
                  <p className="text-[11px] font-mono text-zinc-400">
                    NIP: {reporterWorker.employeeId} · Role: {reporterWorker.role}
                  </p>
                )}
              </div>

              <div className="pt-2 border-t border-zinc-800/60 text-xs text-zinc-400 space-y-1.5">
                <div className="flex items-center gap-2">
                  <MapPin className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                  <span>Lokasi: <strong className="text-white">{incident.location}</strong></span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                  <span>Waktu: <strong className="text-white">{new Date(incident.occurredAt).toLocaleString('id-ID')}</strong></span>
                </div>
              </div>
            </div>

            {/* Incident Description */}
            <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800 space-y-2">
              <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider block">Kronologi Kejadian</span>
              <p className="text-xs text-zinc-300 leading-relaxed bg-zinc-900/80 p-3 rounded-xl border border-zinc-800/80 font-normal">
                "{incident.description}"
              </p>
            </div>

            {/* Photo Evidence Box */}
            <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider flex items-center gap-1.5">
                  <ImageIcon className="w-3.5 h-3.5 text-orange-400" /> Bukti Foto Terlampir
                </span>
                <a
                  href={GDRIVE_FOLDER_URL}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[10px] font-bold text-cyan-400 hover:text-cyan-300 flex items-center gap-1 transition"
                >
                  <ExternalLink className="w-3 h-3" /> GDrive Folder
                </a>
              </div>

              <div className="relative rounded-xl overflow-hidden border border-zinc-800 bg-black max-h-56 flex items-center justify-center group">
                <img
                  src={displayPhotoUrl}
                  alt="Bukti Foto Insiden K3"
                  className="w-full max-h-56 object-cover transition-transform duration-300 group-hover:scale-105"
                  onError={(e) => {
                    e.currentTarget.src =
                      'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=800&auto=format&fit=crop&q=80';
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent flex items-end justify-between p-2 text-[10px] text-white font-bold">
                  <span>Bukti Lapangan HD</span>
                  <span className="text-emerald-400 font-mono">Tersimpan Permanen</span>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: Validation Form & CAPA (7 cols) */}
          <div className="lg:col-span-7 space-y-4">
            {error && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{error}</span>
              </div>
            )}

            {/* Reward Points Banner */}
            <div className="bg-amber-500/10 border border-amber-500/30 p-3.5 rounded-xl flex items-start gap-3 text-xs">
              <Award className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <strong className="block text-amber-300 font-bold text-xs mb-0.5">
                  Aturan Poin Reward Laporan Valid (+50 PTS):
                </strong>
                <p className="text-amber-200/90 text-[11px] leading-relaxed">
                  Insiden yang diverifikasi <strong className="text-emerald-400">VALID / DISETUJUI</strong> akan mentransfer <strong className="text-emerald-400">+50 PTS Reward</strong> langsung ke akun poin worker pelapor.
                </p>
              </div>
            </div>

            {/* Form Fields */}
            <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800 space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1">Status Penanganan Insiden</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as IncidentReport['status'])}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 font-bold"
                >
                  <option value="investigating">INVESTIGATING (Sedang Diinvestigasi Tim K3)</option>
                  <option value="resolved">RESOLVED (Tindakan Korektif Selesai)</option>
                  <option value="closed">CLOSED (Insiden Resmi Ditutup)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1">
                  Akar Masalah (Root Cause / 5-Why Analysis)
                </label>
                <textarea
                  rows={2}
                  value={rootCause}
                  onChange={(e) => setRootCause(e.target.value)}
                  placeholder="Jelaskan analisis penyebab utama timbulnya insiden keselamatan ini..."
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-xl p-2.5 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1">
                  Rencana Tindakan Korektif & Pencegahan (CAPA)
                </label>
                <textarea
                  rows={2}
                  value={correctiveAction}
                  onChange={(e) => setCorrectiveAction(e.target.value)}
                  placeholder="Jelaskan tindakan perbaikan perbaikan konkret yang harus dijalankan..."
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-xl p-2.5 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-zinc-300 mb-1">PIC Penanggung Jawab</label>
                  <input
                    type="text"
                    value={assignedPic}
                    onChange={(e) => setAssignedPic(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-300 mb-1">Target Selesai (Due Date)</label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Fixed Actions Footer */}
        <div className="flex items-center justify-between gap-3 px-6 py-4 border-t border-zinc-800 bg-zinc-950 shrink-0">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => ExecutivePDFReportGenerator.exportIncidentReportPDF(incident, reporterWorker)}
              className="px-3.5 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold text-xs rounded-xl transition flex items-center gap-1.5 border border-zinc-700 shadow-sm"
              title="Cetak Formulir Berita Acara Pemeriksaan (BAP) Resmi K3"
            >
              <Download className="w-4 h-4 text-emerald-400" />
              Cetak BAP Resmi K3 (PDF)
            </button>

            <a
              href={GDRIVE_FOLDER_URL}
              target="_blank"
              rel="noreferrer"
              className="hidden sm:flex items-center gap-1.5 px-3 py-2 bg-cyan-950/40 hover:bg-cyan-900/60 text-cyan-300 border border-cyan-500/30 text-xs font-bold rounded-xl transition"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Google Drive
            </a>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              disabled={loading}
              onClick={() => handleValidateAndSave(false)}
              className="px-4 py-2 bg-rose-950/70 hover:bg-rose-900 text-rose-300 border border-rose-500/30 font-bold text-xs rounded-xl transition flex items-center gap-1.5 disabled:opacity-50"
            >
              <XCircle className="w-4 h-4 text-rose-400" />
              Tolak / Tidak Valid
            </button>

            <button
              type="button"
              disabled={loading}
              onClick={() => handleValidateAndSave(true)}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl transition flex items-center gap-1.5 shadow-lg shadow-emerald-950 disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <CheckCircle2 className="w-4 h-4" />
              )}
              Setujui & Validasi (+50 PTS)
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
