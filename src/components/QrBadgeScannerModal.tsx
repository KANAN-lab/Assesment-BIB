import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { WorkerProfile } from '../types/assessment';
import { WorkerAvatar } from './WorkerAvatar';
import { LicenseService } from '../lib/licenseService';
import { MheLicenseEntity } from '../types/license';
import {
  QrCode, X, Search, ShieldCheck, AlertTriangle, CheckCircle2,
  Award, Clock, HardHat, Truck, UserCheck, Camera, Sparkles, AlertCircle,
  ExternalLink, RefreshCw
} from 'lucide-react';

interface QrBadgeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  workers: WorkerProfile[];
  onSelectWorkerForAudit?: (worker: WorkerProfile) => void;
  onSelectWorkerOnly?: (worker: WorkerProfile) => void;
}

export const QrBadgeScannerModal: React.FC<QrBadgeScannerModalProps> = ({
  isOpen,
  onClose,
  workers,
  onSelectWorkerForAudit,
  onSelectWorkerOnly,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedWorker, setSelectedWorker] = useState<WorkerProfile | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [licensesSyncing, setLicensesSyncing] = useState(false);
  const [, setLicenseRevision] = useState(0);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const qrScannerRef = useRef<any>(null);
  const scanIntervalRef = useRef<number | null>(null);

  const stopCamera = useCallback(() => {
    if (qrScannerRef.current) {
      try {
        qrScannerRef.current.stop();
        qrScannerRef.current.destroy();
      } catch {}
      qrScannerRef.current = null;
    }
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  }, []);

  const handleDetectedCode = useCallback(
    (code: string) => {
      if (!code) return;
      const clean = code
        .trim()
        .replace(/^(nip|nik|id)\s*[:\-]\s*/i, '')
        .trim()
        .toLowerCase();
      const found = workers.find(
        (w) =>
          (w.employeeId && w.employeeId.trim().toLowerCase() === clean) ||
          w.id.trim().toLowerCase() === clean ||
          w.name.trim().toLowerCase() === clean
      );
      if (found) {
        setSelectedWorker(found);
        stopCamera();
      }
    },
    [workers, stopCamera]
  );

  const startBarcodeDetection = useCallback(() => {
    if ('BarcodeDetector' in window) {
      try {
        const detector = new (window as any).BarcodeDetector({
          formats: ['qr_code', 'code_128', 'ean_13', 'code_39'],
        });

        scanIntervalRef.current = window.setInterval(async () => {
          if (!videoRef.current || videoRef.current.readyState < 2) return;
          try {
            const barcodes = await detector.detect(videoRef.current);
            if (barcodes.length > 0) {
              const raw = barcodes[0].rawValue;
              if (raw) handleDetectedCode(raw);
            }
          } catch {
            // Frame detection error, skip silently
          }
        }, 300);
      } catch (e) {
        console.warn('BarcodeDetector error, fallback active:', e);
      }
    }
  }, [handleDetectedCode]);

  const startCamera = async () => {
    try {
      setCameraError(null);
      // 1. First set camera active so DOM video node mounts
      setCameraActive(true);
      await new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
      );

      // 2. Request camera stream
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }

      // 3. Initiate scanning engine: BarcodeDetector API or qr-scanner fallback
      if ('BarcodeDetector' in window) {
        startBarcodeDetection();
      } else {
        const { default: QrScanner } = await import('qr-scanner');
        if (videoRef.current) {
          const scanner = new QrScanner(
            videoRef.current,
            (result) => {
              const val = result.data;
              if (val) handleDetectedCode(val);
            },
            {
              preferredCamera: 'environment',
              returnDetailedScanResult: true,
              highlightScanRegion: false,
              highlightCodeOutline: false,
              maxScansPerSecond: 5,
            }
          );
          qrScannerRef.current = scanner;
          await scanner.start();
        }
      }
    } catch (err: any) {
      console.warn('Camera access error:', err);
      setCameraError('Kamera tidak dapat diakses atau izin ditolak. Silakan gunakan input NIK / Nama di bawah.');
      stopCamera();
    }
  };

  // Auto focus, reset, scroll lock, sync live SIO licenses, and Escape key listener when opened
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          onClose();
        }
      };
      const handleLicenseUpdate = () => {
        setLicenseRevision((v) => v + 1);
      };
      window.addEventListener('keydown', handleKeyDown);
      window.addEventListener('gappy_licenses_updated', handleLicenseUpdate);

      setSearchQuery('');
      setSelectedWorker(null);
      setCameraError(null);

      // Background sync dari Supabase mhe_licenses agar verifikasi lapangan selalu akurat lintas perangkat
      setLicensesSyncing(true);
      LicenseService.fetchLicensesFromSupabase()
        .then(() => setLicenseRevision((v) => v + 1))
        .catch(() => {})
        .finally(() => setLicensesSyncing(false));

      return () => {
        document.body.style.overflow = 'unset';
        window.removeEventListener('keydown', handleKeyDown);
        window.removeEventListener('gappy_licenses_updated', handleLicenseUpdate);
      };
    } else {
      document.body.style.overflow = 'unset';
      stopCamera();
    }
    return () => {
      document.body.style.overflow = 'unset';
      stopCamera();
    };
  }, [isOpen, onClose, stopCamera]);

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

  // Real-time SIO MHE license compliance verification via LicenseService (Supabase-backed cache)
  const getMheStatus = (w: WorkerProfile): {
    state: 'active' | 'expiring_soon' | 'expired' | 'missing' | 'not_required';
    label: string;
    sublabel?: string;
    license?: MheLicenseEntity;
    isMheRole: boolean;
  } => {
    const r = (w.role || '').toLowerCase();
    const isMheRole =
      r.includes('forklift') ||
      r.includes('reach truck') ||
      r.includes('timbangan') ||
      r.includes('mhe') ||
      r.includes('stacker');

    const license = LicenseService.getLicenseByWorkerId(w.id, w.employeeId);

    if (license) {
      if (license.status === 'expired') {
        const overdueDays = Math.abs(license.daysRemaining || 0);
        return {
          state: 'expired',
          label: `SIO Kedaluwarsa (${overdueDays}h lalu)`,
          sublabel: `${license.licenseType} · ${license.licenseNumber}`,
          license,
          isMheRole,
        };
      }
      if (license.status === 'expiring_soon') {
        return {
          state: 'expiring_soon',
          label: `Segera Habis (H-${license.daysRemaining})`,
          sublabel: `${license.licenseType} · ${license.licenseNumber}`,
          license,
          isMheRole,
        };
      }
      return {
        state: 'active',
        label: `SIO Aktif (H-${license.daysRemaining})`,
        sublabel: `${license.licenseType} · ${license.licenseNumber}`,
        license,
        isMheRole,
      };
    }

    if (isMheRole) {
      return {
        state: 'missing',
        label: 'Belum Memiliki SIO',
        sublabel: 'Wajib SIO Kemenaker sebelum operasi',
        isMheRole: true,
      };
    }

    return {
      state: 'not_required',
      label: 'Bukan Operator MHE',
      sublabel: 'Tidak membutuhkan SIO alat berat',
      isMheRole: false,
    };
  };

  const selectedMheStatus = selectedWorker ? getMheStatus(selectedWorker) : null;

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] overflow-y-auto bg-black/90 backdrop-blur-xl p-3 sm:p-6 flex items-center justify-center min-h-screen animate-fade-in"
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
                  ref={(el) => {
                    videoRef.current = el;
                    if (el && streamRef.current && el.srcObject !== streamRef.current) {
                      el.srcObject = streamRef.current;
                      el.play().catch(() => {});
                    }
                  }}
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
          {selectedWorker && selectedMheStatus && (
            <div
              className={`bg-zinc-900/90 border rounded-xl p-4 space-y-3 animate-fade-in ${
                selectedMheStatus.state === 'expired' || selectedMheStatus.state === 'missing'
                  ? 'border-rose-500/60 shadow-lg shadow-rose-950/30'
                  : selectedMheStatus.state === 'expiring_soon'
                  ? 'border-amber-500/50'
                  : 'border-cyan-500/40'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3 min-w-0">
                  <WorkerAvatar name={selectedWorker.name} src={selectedWorker.avatar} className="w-12 h-12 rounded-xl shrink-0" />
                  <div className="min-w-0">
                    <h4 className="text-sm font-black text-white truncate">{selectedWorker.name}</h4>
                    <p className="text-xs font-mono text-zinc-400">
                      NIP: <strong className="text-cyan-400">{selectedWorker.employeeId}</strong> · {selectedWorker.division}
                    </p>
                    <p className="text-[11px] text-zinc-300 font-semibold mt-0.5 truncate">{selectedWorker.role}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {licensesSyncing && (
                    <span className="text-[10px] text-cyan-400 flex items-center gap-1" title="Menyinkronkan data SIO dari server">
                      <RefreshCw className="w-3 h-3 animate-spin" />
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => setSelectedWorker(null)}
                    className="text-zinc-500 hover:text-white text-xs font-bold"
                  >
                    Ganti
                  </button>
                </div>
              </div>

              {/* K3 Non-Compliance Alert Banner untuk Operator MHE tanpa SIO aktif */}
              {(selectedMheStatus.state === 'expired' || selectedMheStatus.state === 'missing') && (
                <div className="p-2.5 rounded-xl bg-rose-500/15 border border-rose-500/40 flex items-start gap-2 text-rose-200">
                  <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <div className="text-[11px] leading-snug">
                    <div className="font-black text-rose-300 uppercase tracking-wide">
                      Peringatan K3: Tidak Layak Operasi MHE
                    </div>
                    <p className="text-rose-200/90 mt-0.5">
                      {selectedMheStatus.state === 'expired'
                        ? 'Lisensi SIO operator telah melewati masa berlaku. Hentikan pengoperasian unit hingga perpanjangan diverifikasi HSE.'
                        : 'Operator MHE belum memiliki catatan SIO Kemenaker di sistem. Wajib unggah berkas SIO terlebih dahulu.'}
                    </p>
                  </div>
                </div>
              )}

              {/* Status Grid Badges */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-1">
                {/* MHE License Badge (Live Supabase-Synced Compliance) */}
                <div
                  className={`p-2.5 rounded-lg border flex items-start gap-2 ${
                    selectedMheStatus.state === 'active'
                      ? 'bg-emerald-950/30 border-emerald-500/30'
                      : selectedMheStatus.state === 'expiring_soon'
                      ? 'bg-amber-950/30 border-amber-500/40'
                      : selectedMheStatus.state === 'expired' || selectedMheStatus.state === 'missing'
                      ? 'bg-rose-950/40 border-rose-500/40'
                      : 'bg-zinc-950 border-zinc-800'
                  }`}
                >
                  <Truck
                    className={`w-4 h-4 shrink-0 mt-0.5 ${
                      selectedMheStatus.state === 'active'
                        ? 'text-emerald-400'
                        : selectedMheStatus.state === 'expiring_soon'
                        ? 'text-amber-400'
                        : selectedMheStatus.state === 'expired' || selectedMheStatus.state === 'missing'
                        ? 'text-rose-400'
                        : 'text-zinc-500'
                    }`}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-[9px] text-zinc-500 font-bold uppercase">Lisensi SIO MHE</span>
                      {selectedMheStatus.license?.documentUrl && (
                        <a
                          href={selectedMheStatus.license.documentUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[9px] font-bold text-cyan-400 hover:text-cyan-300 inline-flex items-center gap-0.5 shrink-0"
                          title="Lihat dokumen bukti SIO"
                        >
                          <span>Berkas</span>
                          <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      )}
                    </div>
                    <div
                      className={`text-[11px] font-bold truncate ${
                        selectedMheStatus.state === 'active'
                          ? 'text-emerald-300'
                          : selectedMheStatus.state === 'expiring_soon'
                          ? 'text-amber-300'
                          : selectedMheStatus.state === 'expired' || selectedMheStatus.state === 'missing'
                          ? 'text-rose-300'
                          : 'text-zinc-300'
                      }`}
                    >
                      {selectedMheStatus.label}
                    </div>
                    {selectedMheStatus.sublabel && (
                      <div className="text-[10px] text-zinc-400 truncate mt-0.5" title={selectedMheStatus.sublabel}>
                        {selectedMheStatus.sublabel}
                      </div>
                    )}
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
              <div className="pt-3 border-t border-zinc-800 flex items-center justify-end gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => {
                    onSelectWorkerOnly?.(selectedWorker);
                    onClose();
                  }}
                  className="px-3 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-xl text-xs font-bold transition flex items-center gap-1.5 border border-zinc-700"
                >
                  <UserCheck className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Pilih Pekerja</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    onSelectWorkerForAudit?.(selectedWorker);
                    onClose();
                  }}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-md shadow-purple-950/50"
                >
                  <Award className="w-3.5 h-3.5" />
                  <span>Mulai Audit Matriks</span>
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
