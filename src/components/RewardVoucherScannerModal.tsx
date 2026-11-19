import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  QrCode, X, Search, Camera, AlertCircle,
  CheckCircle2, ShoppingBag, User, Hash, Calendar, Coins,
  PackageCheck, Clock, ScanLine
} from 'lucide-react';
import { AdminRedemptionRecord } from '../lib/supabaseService';
import { formatIndonesianDateTime, formatIndonesianDate } from '../lib/dateUtils';

interface RewardVoucherScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  allRedemptions: AdminRedemptionRecord[];
  onFulfill: (log: AdminRedemptionRecord) => void;
}

export const RewardVoucherScannerModal: React.FC<RewardVoucherScannerModalProps> = ({
  isOpen,
  onClose,
  allRedemptions,
  onFulfill,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [matchedRedemption, setMatchedRedemption] = useState<AdminRedemptionRecord | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanIntervalRef = useRef<number | null>(null);
  const qrScannerRef = useRef<any>(null);
  const lookupRef = useRef<(code: string) => void>(() => {});
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      setSearchQuery('');
      setMatchedRedemption(null);
      setScanError(null);
      setCameraError(null);
      setTimeout(() => inputRef.current?.focus(), 200);

      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') onClose();
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => {
        document.body.style.overflow = 'unset';
        window.removeEventListener('keydown', handleKeyDown);
        stopCamera();
      };
    } else {
      document.body.style.overflow = 'unset';
      stopCamera();
    }
  }, [isOpen, onClose]);

  // Lookup redemption by code
  const lookupRedemption = useCallback((code: string) => {
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) {
      setMatchedRedemption(null);
      setScanError(null);
      return;
    }

    const match = allRedemptions.find(
      (r) => r.redemptionCode.toUpperCase() === trimmed
    );

    if (match) {
      setMatchedRedemption(match);
      setScanError(null);
      stopCamera();
    } else {
      setMatchedRedemption(null);
      setScanError(`Kode voucher "${trimmed}" tidak ditemukan dalam sistem.`);
    }
  }, [allRedemptions]);

  lookupRef.current = lookupRedemption;

  // Pilih pemindai: BarcodeDetector bawaan browser (Chrome/Android),
  // atau library qr-scanner sebagai fallback (iOS Safari/Chrome iOS, Firefox, dll.)
  const startCamera = async () => {
    setCameraError(null);
    if ('BarcodeDetector' in window) {
      await startNativeCamera();
    } else {
      await startFallbackCamera();
    }
  };

  // Fallback untuk browser tanpa BarcodeDetector (termasuk semua browser di iOS)
  const startFallbackCamera = async () => {
    try {
      const { default: QrScanner } = await import('qr-scanner');
      // Tampilkan area video SEBELUM kamera dinyalakan: iOS tidak memutar <video> yang display:none
      setCameraActive(true);
      await new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
      );
      if (!videoRef.current) {
        stopCamera();
        return;
      }
      const scanner = new QrScanner(
        videoRef.current,
        (result) => {
          const rawValue = result.data;
          if (rawValue) {
            setSearchQuery(rawValue);
            lookupRef.current(rawValue);
          }
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
      setIsScanning(true);
    } catch (err: any) {
      console.warn('Camera access error:', err);
      const detail = err?.name || err?.message || String(err);
      setCameraError(`Kamera tidak dapat diakses atau izin ditolak (${detail}). Gunakan input kode voucher secara manual di bawah.`);
      stopCamera();
    }
  };

  // Pemindai native menggunakan BarcodeDetector API
  const startNativeCamera = async () => {
    try {
      setCameraError(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraActive(true);
      startBarcodeDetection();
    } catch (err: any) {
      console.warn('Camera access error:', err);
      setCameraError('Kamera tidak dapat diakses atau izin ditolak. Gunakan input kode voucher secara manual di bawah.');
      setCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (qrScannerRef.current) {
      qrScannerRef.current.stop();
      qrScannerRef.current.destroy();
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
    setCameraActive(false);
    setIsScanning(false);
  };

  const startBarcodeDetection = () => {
    // Use BarcodeDetector API if available (Chrome 83+, Edge 83+)
    if ('BarcodeDetector' in window) {
      const detector = new (window as any).BarcodeDetector({ formats: ['qr_code'] });
      setIsScanning(true);

      scanIntervalRef.current = window.setInterval(async () => {
        if (!videoRef.current || videoRef.current.readyState < 2) return;
        try {
          const barcodes = await detector.detect(videoRef.current);
          if (barcodes.length > 0) {
            const rawValue = barcodes[0].rawValue;
            if (rawValue) {
              setSearchQuery(rawValue);
              lookupRef.current(rawValue);
            }
          }
        } catch {
          // Frame detection error, skip silently
        }
      }, 350);
    }
  };

  const handleManualSearch = () => {
    lookupRedemption(searchQuery);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      lookupRedemption(searchQuery);
    }
  };

  if (!isOpen) return null;

  const getStatusInfo = (redemption: AdminRedemptionRecord) => {
    if (redemption.status === 'completed') {
      return { label: 'Sudah Diserahkan', color: 'emerald', icon: PackageCheck };
    }
    if (redemption.status === 'cancelled') {
      return { label: 'Dibatalkan (Poin Direfund)', color: 'rose', icon: X };
    }
    // Check expiry
    if (redemption.expiryDate) {
      const expiry = new Date(redemption.expiryDate);
      if (expiry < new Date()) {
        return { label: 'Kedaluwarsa', color: 'amber', icon: Clock };
      }
    }
    return { label: 'Menunggu Penyerahan', color: 'cyan', icon: Clock };
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] overflow-y-auto bg-black/90 backdrop-blur-xl p-3 sm:p-6 flex items-center justify-center min-h-screen animate-fade-in"
      onClick={onClose}
    >
      <div
        className="card-elevated w-full max-w-lg max-h-[92vh] flex flex-col p-5 sm:p-6 relative border border-cyan-500/30 shadow-2xl overflow-y-auto custom-scrollbar"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-zinc-800 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center">
              <QrCode className="w-4.5 h-4.5 text-cyan-400" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Scan Voucher Reward — Serah Terima Cepat</h3>
              <p className="text-[11px] text-zinc-400">Pindai QR atau ketik kode voucher pekerja untuk verifikasi & penyerahan hadiah</p>
            </div>
          </div>
          <button onClick={onClose} className="text-zinc-500 hover:text-white p-1 rounded-lg transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Camera Scanner Box */}
        <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-3 relative overflow-hidden text-center mb-4">
          {/* <video> selalu ter-render agar videoRef tersedia sebelum stream dipasang */}
            <div className={cameraActive ? 'relative aspect-video max-h-52 bg-black rounded-lg overflow-hidden flex items-center justify-center' : 'hidden'}>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
              {/* Scanner HUD Overlay */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-44 h-44 border-2 border-cyan-400/80 rounded-2xl flex items-center justify-center shadow-lg shadow-cyan-500/20">
                  {isScanning && (
                    <div className="w-40 h-0.5 bg-cyan-400/60 shadow-sm animate-pulse" />
                  )}
                </div>
              </div>
              {isScanning && (
                <div className="absolute bottom-2 left-2 px-2 py-1 bg-black/70 rounded-lg text-[10px] text-cyan-300 font-bold flex items-center gap-1.5">
                  <ScanLine className="w-3 h-3 animate-bounce" />
                  <span>Memindai kode QR voucher...</span>
                </div>
              )}
              <button
                type="button"
                onClick={stopCamera}
                className="absolute bottom-2 right-2 px-2.5 py-1 bg-zinc-900/90 text-zinc-300 text-[10px] rounded border border-zinc-700 hover:text-white transition"
              >
                Matikan Kamera
              </button>
            </div>
          {!cameraActive && (
            <div className="py-5 flex flex-col items-center justify-center space-y-2">
              <div className="w-12 h-12 rounded-full bg-cyan-950/60 border border-cyan-500/30 flex items-center justify-center">
                <Camera className="w-6 h-6 text-cyan-400" />
              </div>
              <div className="text-xs font-bold text-white">Pemindai QR Voucher Reward</div>
              <p className="text-[11px] text-zinc-400 max-w-xs leading-relaxed">
                Arahkan kamera ke QR Code voucher pada layar HP pekerja untuk verifikasi instan
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
                <p className="text-[11px] text-amber-400/90 pt-1 flex items-start gap-1 max-w-xs text-left">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  <span>{cameraError}</span>
                </p>
              )}
            </div>
          )}
        </div>

        {/* Manual Code Input */}
        <div className="mb-4">
          <label className="block text-xs font-bold text-zinc-300 mb-1.5">
            Atau Masukkan Kode Voucher Manual:
          </label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-2.5" />
              <input
                ref={inputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setScanError(null);
                  setMatchedRedemption(null);
                }}
                onKeyDown={handleKeyPress}
                placeholder="Ketik kode voucher, cth: RW-SEM-A1B2"
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-cyan-500 font-mono tracking-wide"
                autoComplete="off"
                spellCheck={false}
              />
            </div>
            <button
              type="button"
              onClick={handleManualSearch}
              disabled={!searchQuery.trim()}
              className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
            >
              <Search className="w-3.5 h-3.5" />
              <span>Cari</span>
            </button>
          </div>
        </div>

        {/* Error State */}
        {scanError && (
          <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-start gap-2 text-rose-300 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{scanError}</span>
          </div>
        )}

        {/* Matched Redemption Result Card */}
        {matchedRedemption && (() => {
          const statusInfo = getStatusInfo(matchedRedemption);
          const StatusIcon = statusInfo.icon;
          const isPending = matchedRedemption.status !== 'completed' && matchedRedemption.status !== 'cancelled';
          const isExpired = matchedRedemption.expiryDate
            ? new Date(matchedRedemption.expiryDate) < new Date()
            : false;
          const canFulfill = isPending && !isExpired;

          return (
            <div className="bg-zinc-900/90 border border-zinc-800 rounded-xl p-4 space-y-3.5 animate-fade-in">
              {/* Status Badge */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs font-bold text-white">Voucher Ditemukan</span>
                </div>
                <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-lg border ${
                  statusInfo.color === 'emerald'
                    ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                    : statusInfo.color === 'rose'
                    ? 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                    : statusInfo.color === 'amber'
                    ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                    : 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30'
                }`}>
                  <StatusIcon className="w-3 h-3 inline mr-1" />
                  {statusInfo.label}
                </span>
              </div>

              {/* Detail Grid */}
              <div className="grid grid-cols-2 gap-2.5">
                <div className="bg-zinc-950 p-2.5 rounded-lg border border-zinc-800">
                  <div className="flex items-center gap-1.5 text-zinc-500 mb-1">
                    <ShoppingBag className="w-3 h-3" />
                    <span className="text-[10px] font-bold uppercase">Item Reward</span>
                  </div>
                  <div className="text-xs font-bold text-white leading-tight">{matchedRedemption.itemTitle}</div>
                </div>

                <div className="bg-zinc-950 p-2.5 rounded-lg border border-zinc-800">
                  <div className="flex items-center gap-1.5 text-zinc-500 mb-1">
                    <Coins className="w-3 h-3" />
                    <span className="text-[10px] font-bold uppercase">Poin Ditukar</span>
                  </div>
                  <div className="text-xs font-black text-amber-400">{matchedRedemption.pointsSpent} PTS</div>
                </div>

                <div className="bg-zinc-950 p-2.5 rounded-lg border border-zinc-800">
                  <div className="flex items-center gap-1.5 text-zinc-500 mb-1">
                    <User className="w-3 h-3" />
                    <span className="text-[10px] font-bold uppercase">Penerima</span>
                  </div>
                  <div className="text-xs font-bold text-white">{matchedRedemption.workerName || '-'}</div>
                  <div className="text-[10px] text-zinc-500">{matchedRedemption.workerDivision || '-'}</div>
                </div>

                <div className="bg-zinc-950 p-2.5 rounded-lg border border-zinc-800">
                  <div className="flex items-center gap-1.5 text-zinc-500 mb-1">
                    <Hash className="w-3 h-3" />
                    <span className="text-[10px] font-bold uppercase">NIK / NIP</span>
                  </div>
                  <div className="text-xs font-mono font-bold text-white">{matchedRedemption.workerEmployeeId || '-'}</div>
                </div>

                <div className="bg-zinc-950 p-2.5 rounded-lg border border-zinc-800">
                  <div className="flex items-center gap-1.5 text-zinc-500 mb-1">
                    <QrCode className="w-3 h-3" />
                    <span className="text-[10px] font-bold uppercase">Kode Voucher</span>
                  </div>
                  <div className="text-xs font-mono font-black text-emerald-400 tracking-wider">{matchedRedemption.redemptionCode}</div>
                </div>

                <div className="bg-zinc-950 p-2.5 rounded-lg border border-zinc-800">
                  <div className="flex items-center gap-1.5 text-zinc-500 mb-1">
                    <Calendar className="w-3 h-3" />
                    <span className="text-[10px] font-bold uppercase">Waktu Penukaran</span>
                  </div>
                  <div className="text-xs font-bold text-white">{formatIndonesianDateTime(matchedRedemption.redeemedAt)}</div>
                </div>
              </div>

              {/* Expiry Info */}
              {matchedRedemption.expiryDate && (
                <div className={`text-[11px] px-3 py-1.5 rounded-lg border flex items-center gap-1.5 ${
                  isExpired
                    ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                    : 'bg-zinc-800/50 text-zinc-400 border-zinc-800'
                }`}>
                  <Clock className="w-3 h-3 shrink-0" />
                  <span>
                    Berlaku sampai: {formatIndonesianDate(matchedRedemption.expiryDate, true)}
                    {isExpired && ' — KEDALUWARSA'}
                  </span>
                </div>
              )}

              {/* Fulfilled Info */}
              {matchedRedemption.status === 'completed' && matchedRedemption.fulfilledAt && (
                <div className="text-[11px] px-3 py-1.5 rounded-lg border bg-emerald-500/10 text-emerald-400 border-emerald-500/20 flex items-center gap-1.5">
                  <PackageCheck className="w-3 h-3 shrink-0" />
                  <span>
                    Sudah diserahkan pada {formatIndonesianDateTime(matchedRedemption.fulfilledAt)}
                    {matchedRedemption.fulfilledByName ? ` oleh ${matchedRedemption.fulfilledByName}` : ''}
                  </span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-2 pt-1">
                {canFulfill ? (
                  <button
                    type="button"
                    onClick={() => {
                      onFulfill(matchedRedemption);
                      onClose();
                    }}
                    className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black transition shadow-lg shadow-emerald-950/50 flex items-center justify-center gap-1.5"
                  >
                    <PackageCheck className="w-4 h-4" />
                    <span>Lanjut Serah Terima & Tanda Tangan</span>
                  </button>
                ) : (
                  <div className="flex-1 py-2.5 bg-zinc-800 text-zinc-500 rounded-xl text-xs font-bold text-center cursor-not-allowed">
                    {matchedRedemption.status === 'completed'
                      ? 'Voucher ini sudah diserahkan sebelumnya'
                      : matchedRedemption.status === 'cancelled'
                      ? 'Voucher ini sudah dibatalkan & poin dikembalikan'
                      : 'Voucher sudah kedaluwarsa'}
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setMatchedRedemption(null);
                    setSearchQuery('');
                    setScanError(null);
                    setTimeout(() => inputRef.current?.focus(), 100);
                  }}
                  className="px-3 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl text-xs font-bold transition border border-zinc-700"
                >
                  Scan Lagi
                </button>
              </div>
            </div>
          );
        })()}

        {/* Hint */}
        {!matchedRedemption && !scanError && (
          <div className="text-center py-4 text-zinc-600 text-[11px] leading-relaxed">
            <QrCode className="w-8 h-8 mx-auto mb-2 text-zinc-700" />
            <p>Pindai QR Code pada layar HP pekerja atau ketik kode voucher (cth: <code className="text-cyan-500 font-mono">RW-SEM-A1B2</code>) untuk memverifikasi dan menyerahkan hadiah.</p>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};
