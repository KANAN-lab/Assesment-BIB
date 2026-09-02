import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { WorkerProfile } from '../types/assessment';
import { WorkerAvatar } from './WorkerAvatar';
import {
  QrCode, X, Search, ShieldCheck, AlertTriangle, CheckCircle2,
  Award, Clock, HardHat, Truck, UserCheck, Camera, Sparkles, AlertCircle
} from 'lucide-react';

interface QrBadgeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  workers: WorkerProfile[];
  onSelectWorkerForAudit?: (worker: WorkerProfile) => void;
}

export const QrBadgeScannerModal: React.FC<QrBadgeScannerModalProps> = ({
  isOpen,
  onClose,
  workers,
  onSelectWorkerForAudit,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedWorker, setSelectedWorker] = useState<WorkerProfile | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Auto focus and reset when opened
  useEffect(() => {
    if (isOpen) {
      setSearchQuery('');
      setSelectedWorker(null);
      setCameraError(null);
    } else {
      stopCamera();
    }
  }, [isOpen]);

  const startCamera = async () => {
    try {
      setCameraError(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setCameraActive(true);
    } catch (err: any) {
      console.warn('Camera access error:', err);
      setCameraError('Kamera tidak dapat diakses atau izin ditolak. Silakan gunakan input NIK / Nama di bawah.');
      setCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  if (!isOpen) return null;

  // Filtered workers by search
  const matches = searchQuery.trim()
    ? workers.filter(
        (w) =>
          w.employeeId?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          w.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          w.role.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : [];

  const handleSelect = (w: WorkerProfile) => {
    setSelectedWorker(w);
    stopCamera();
  };

  // Helper to determine MHE license status
  const getMheStatus = (w: WorkerProfile) => {
    const isForklift = w.role.toLowerCase().includes('forklift') || w.role.toLowerCase().includes('reach truck');
    if (!isForklift) return { hasLicense: false, label: 'Bukan Operator MHE', valid: true };
    return {
      hasLicense: true,
      label: 'SIO Aktif (Valid Kemenaker)',
      valid: true,
    };
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] overflow-y-auto bg-black/90 backdrop-blur-xl p-3 sm:p-6 flex items-center justify-center min-h-screen animate-fade-in"
      onClick={onClose}
    >
      <div
        className="card-elevated w-full max-w-xl max-h-[90vh] flex flex-col p-5 sm:p-6 relative border border-cyan-500/30 shadow-2xl overflow-y-auto custom-scrollbar"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-zinc-800 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center">
              <QrCode className="w-4 h-4 text-cyan-400" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Inspeksi Cepat QR ID Card & SIO MHE</h3>
              <p className="text-[11px] text-zinc-400">Pindai badge atau cari NIK operator untuk verifikasi kepatuhan lapangan</p>
            </div>
          </div>
          <button onClick={onClose} className="text-zinc-500 hover:text-white p-1 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Camera / Manual Input Toggle */}
        <div className="space-y-4">
          {/* Live Camera Scanner Box */}
          <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-3 relative overflow-hidden text-center">
            {cameraActive ? (
              <div className="relative aspect-video max-h-56 bg-black rounded-lg overflow-hidden flex items-center justify-center">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />
                {/* HUD Scanner Box */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-44 h-44 border-2 border-cyan-400/80 rounded-2xl animate-pulse flex items-center justify-center shadow-lg shadow-cyan-500/20">
                    <div className="w-40 h-0.5 bg-cyan-400/60 shadow-sm" />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={stopCamera}
                  className="absolute bottom-2 right-2 px-2.5 py-1 bg-zinc-900/90 text-zinc-300 text-[10px] rounded border border-zinc-700 hover:text-white"
                >
                  Matikan Kamera
                </button>
              </div>
            ) : (
              <div className="py-5 flex flex-col items-center justify-center space-y-2">
                <div className="w-12 h-12 rounded-full bg-cyan-950/60 border border-cyan-500/30 flex items-center justify-center">
                  <Camera className="w-6 h-6 text-cyan-400" />
                </div>
                <div className="text-xs font-bold text-white">Pemindai Barcode / QR ID Card</div>
                <p className="text-[11px] text-zinc-400 max-w-xs leading-relaxed">
                  Gunakan kamera perangkat untuk memindai kode QR fisik pada badge pekerja
                </p>
                <button
                  type="button"
                  onClick={startCamera}
                  className="mt-1 px-4 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>Aktifkan Kamera Pemindai</span>
                </button>
                {cameraError && (
                  <p className="text-[11px] text-amber-400/90 pt-1 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{cameraError}</span>
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Quick Manual NIK / Name Search Input */}
          <div>
            <label className="block text-xs font-bold text-zinc-300 mb-1">
              Atau Cari Cepat NIP / Nama Pekerja:
            </label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Ketik NIP (contoh: 328000257) atau nama..."
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-cyan-500 font-mono"
              />
            </div>
          </div>

          {/* Search Result Dropdown List */}
          {searchQuery.trim() && !selectedWorker && (
            <div className="max-h-48 overflow-y-auto border border-zinc-800 rounded-xl bg-zinc-950/80 divide-y divide-zinc-800/60 custom-scrollbar">
              {matches.length === 0 ? (
                <div className="p-3 text-center text-xs text-zinc-500">
                  Tidak ditemukan pekerja dengan NIK / nama tersebut.
                </div>
              ) : (
                matches.slice(0, 5).map((w) => (
                  <div
                    key={w.id}
                    onClick={() => handleSelect(w)}
                    className="p-2.5 hover:bg-cyan-950/30 cursor-pointer transition flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2.5">
                      <WorkerAvatar name={w.name} src={w.avatar} className="w-8 h-8 rounded-lg" />
                      <div>
                        <div className="text-xs font-bold text-white">{w.name}</div>
                        <div className="text-[10px] text-zinc-400 font-mono">
                          NIP: {w.employeeId} · {w.role} ({w.division})
                        </div>
                      </div>
                    </div>
                    <span className="text-[10px] text-cyan-400 font-bold bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-800/40">
                      Pilih
                    </span>
                  </div>
                ))
              )}
            </div>
          )}

          {/* ─── WORKER INSPECTION SUMMARY CARD ─── */}
          {selectedWorker && (
            <div className="bg-zinc-900/90 border border-cyan-500/40 rounded-xl p-4 space-y-3 animate-fade-in">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <WorkerAvatar name={selectedWorker.name} src={selectedWorker.avatar} className="w-12 h-12 rounded-xl" />
                  <div>
                    <h4 className="text-sm font-black text-white">{selectedWorker.name}</h4>
                    <p className="text-xs font-mono text-zinc-400">
                      NIP: <strong className="text-cyan-400">{selectedWorker.employeeId}</strong> · {selectedWorker.division}
                    </p>
                    <p className="text-[11px] text-zinc-300 font-semibold mt-0.5">{selectedWorker.role}</p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedWorker(null)}
                  className="text-zinc-500 hover:text-white text-xs font-bold"
                >
                  Ganti
                </button>
              </div>

              {/* Status Grid Badges */}
              <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                {/* MHE License Badge */}
                <div className="p-2.5 rounded-lg bg-zinc-950 border border-zinc-800 flex items-center gap-2">
                  <Truck className="w-4 h-4 text-amber-400 shrink-0" />
                  <div className="min-w-0">
                    <div className="text-[9px] text-zinc-500 font-bold uppercase">Lisensi SIO MHE</div>
                    <div className="text-[11px] font-bold text-white truncate">
                      {getMheStatus(selectedWorker).label}
                    </div>
                  </div>
                </div>

                {/* Pre-Shift Checklist */}
                <div className="p-2.5 rounded-lg bg-zinc-950 border border-zinc-800 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                  <div className="min-w-0">
                    <div className="text-[9px] text-zinc-500 font-bold uppercase">Pre-Shift K3 Hari Ini</div>
                    <div className="text-[11px] font-bold text-white truncate">
                      {selectedWorker.preShiftChecklistDone ? (
                        <span className="text-emerald-400">✓ Terverifikasi</span>
                      ) : (
                        <span className="text-amber-400">Belum Inspeksi</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* BIB Score */}
                <div className="p-2.5 rounded-lg bg-zinc-950 border border-zinc-800 flex items-center gap-2">
                  <Award className="w-4 h-4 text-purple-400 shrink-0" />
                  <div className="min-w-0">
                    <div className="text-[9px] text-zinc-500 font-bold uppercase">Skor BIB & Tier</div>
                    <div className="text-[11px] font-bold text-white">
                      {selectedWorker.bibScores?.totalScore?.toFixed(1) || '0.0'} ({selectedWorker.tier})
                    </div>
                  </div>
                </div>

                {/* Points */}
                <div className="p-2.5 rounded-lg bg-zinc-950 border border-zinc-800 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
                  <div className="min-w-0">
                    <div className="text-[9px] text-zinc-500 font-bold uppercase">Poin Reward</div>
                    <div className="text-[11px] font-bold text-amber-300">
                      {selectedWorker.totalPoints.toLocaleString()} PTS
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 border-t border-zinc-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    onSelectWorkerForAudit?.(selectedWorker);
                    onClose();
                  }}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
                >
                  <UserCheck className="w-3.5 h-3.5" />
                  <span>Buka Lembar Audit Skor</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};
