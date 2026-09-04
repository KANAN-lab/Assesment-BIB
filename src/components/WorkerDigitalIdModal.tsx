import React, { useMemo, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  QrCode,
  ShieldCheck,
  Truck,
  Award,
  Download,
  Printer,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  HardHat,
  Calendar,
  Building2,
  Share2
} from 'lucide-react';
import { WorkerProfile } from '../types/assessment';
import { WorkerAvatar } from './WorkerAvatar';
import { LicenseService } from '../lib/licenseService';
import { MheLicenseEntity } from '../types/license';

interface WorkerDigitalIdModalProps {
  isOpen: boolean;
  onClose: () => void;
  worker: WorkerProfile;
}

export const WorkerDigitalIdModal: React.FC<WorkerDigitalIdModalProps> = ({
  isOpen,
  onClose,
  worker,
}) => {
  const cardRef = useRef<HTMLDivElement>(null);

  // Lock scroll
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  // Query SIO License status for this worker
  const license: MheLicenseEntity | undefined = useMemo(() => {
    return LicenseService.getLicenseByWorkerId(worker.id) || LicenseService.getLicenseByWorkerId(worker.employeeId);
  }, [worker]);

  const isMheRole = useMemo(() => {
    const r = worker.role.toLowerCase();
    return r.includes('forklift') || r.includes('reach truck') || r.includes('timbangan') || r.includes('mhe');
  }, [worker.role]);

  // Generate deterministic 21x21 QR matrix based on worker employee ID
  const qrMatrix = useMemo(() => {
    const code = worker.employeeId || worker.id;
    const matrixSize = 21;
    const grid: boolean[][] = Array.from({ length: matrixSize }, () =>
      Array(matrixSize).fill(false)
    );

    // 1. Draw 7x7 Position Finder Patterns on (0,0), (14,0), (0,14)
    const drawFinderPattern = (startRow: number, startCol: number) => {
      for (let r = 0; r < 7; r++) {
        for (let c = 0; c < 7; c++) {
          if (
            r === 0 || r === 6 || c === 0 || c === 6 || // Outer ring
            (r >= 2 && r <= 4 && c >= 2 && c <= 4)      // Inner solid 3x3
          ) {
            grid[startRow + r][startCol + c] = true;
          } else {
            grid[startRow + r][startCol + c] = false;
          }
        }
      }
    };

    drawFinderPattern(0, 0);
    drawFinderPattern(0, 14);
    drawFinderPattern(14, 0);

    // 2. Draw Timing Patterns (row 6 and col 6)
    for (let i = 8; i < 13; i++) {
      grid[6][i] = i % 2 === 0;
      grid[i][6] = i % 2 === 0;
    }

    // 3. Populate data modules using hash bytes from code
    let hash = 0;
    for (let i = 0; i < code.length; i++) {
      hash = (hash << 5) - hash + code.charCodeAt(i);
      hash |= 0;
    }

    let seed = Math.abs(hash) || 7654321;
    const lcg = () => {
      seed = (seed * 1664525 + 1013904223) % 4294967296;
      return seed / 4294967296;
    };

    for (let r = 0; r < matrixSize; r++) {
      for (let c = 0; c < matrixSize; c++) {
        const inFinder1 = r < 8 && c < 8;
        const inFinder2 = r < 8 && c >= 13;
        const inFinder3 = r >= 13 && c < 8;
        const isTiming = (r === 6 && (c < 14 || c > 6)) || (c === 6 && (r < 14 || r > 6));

        if (!inFinder1 && !inFinder2 && !inFinder3 && !isTiming) {
          grid[r][c] = lcg() > 0.48;
        }
      }
    }

    return grid;
  }, [worker.employeeId, worker.id]);

  const handlePrint = () => {
    window.print();
  };

  if (!isOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] overflow-y-auto bg-black/90 backdrop-blur-xl p-3 sm:p-6 flex items-center justify-center min-h-screen animate-fade-in"
    >
      <div
        className="relative w-full max-w-md bg-zinc-950 border border-zinc-800 rounded-3xl shadow-2xl flex flex-col overflow-hidden text-white"
      >
        {/* Header Bar */}
        <div className="px-5 py-4 border-b border-zinc-800/80 flex items-center justify-between bg-zinc-900/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
              <QrCode className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Kartu ID & Lisensi Digital</h3>
              <p className="text-[10px] text-zinc-400">Verifikasi Resmi Identitas & K3 Lapangan</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-zinc-800/80 hover:bg-zinc-700 text-zinc-400 hover:text-white flex items-center justify-center transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Physical ID Badge Card Mockup */}
        <div className="p-5 flex flex-col items-center">
          <div
            ref={cardRef}
            className="w-full bg-gradient-to-b from-zinc-900 via-zinc-950 to-zinc-900 border-2 border-zinc-700/80 rounded-2xl shadow-2xl p-5 relative overflow-hidden space-y-4"
          >
            {/* Holographic Top Accent */}
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-emerald-500 via-cyan-400 to-indigo-500" />
            
            {/* Lanyard Slot Hole Simulation */}
            <div className="w-12 h-2.5 bg-zinc-800 rounded-full mx-auto border border-zinc-700/50 shadow-inner" />

            {/* Corporate Header */}
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-2">
                <img
                  src="https://raw.githubusercontent.com/KANAN-lab/WFG-DAM/refs/heads/main/DAM%20LOGO.ico"
                  alt="Logo PT. DAYA ANUGRAH MULYA"
                  className="w-7 h-7 object-contain rounded p-0.5 bg-zinc-900 border border-zinc-800"
                />
                <div>
                  <div className="text-[11px] font-black tracking-wider text-white">PT. DAYA ANUGRAH MULYA</div>
                  <div className="text-[8px] font-mono text-zinc-400 tracking-widest uppercase">DIVISI LOGISTIK & SUPPLY CHAIN</div>
                </div>
              </div>
              <span className="text-[9px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                ACTIVE
              </span>
            </div>

            {/* Worker Identity Core */}
            <div className="flex items-center gap-4">
              <div className="relative">
                <WorkerAvatar
                  name={worker.name}
                  src={worker.avatar}
                  className="w-20 h-20 rounded-2xl border-2 border-emerald-500/40 shadow-lg object-cover"
                />
                <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-emerald-600 border-2 border-zinc-950 flex items-center justify-center text-[10px] text-white">
                  ✓
                </div>
              </div>

              <div className="flex-1 min-w-0">
                <h4 className="text-base font-black text-white truncate">{worker.name}</h4>
                <div className="text-xs font-mono font-bold text-cyan-400 mt-0.5">
                  NIP: {worker.employeeId}
                </div>
                <div className="text-xs text-zinc-300 font-semibold mt-1">
                  {worker.role}
                </div>
                <div className="inline-block text-[10px] font-mono text-zinc-400 bg-zinc-800/80 px-2 py-0.5 rounded mt-1">
                  Divisi: {worker.division}
                </div>
              </div>
            </div>

            {/* High-Resolution SVG QR Code Box */}
            <div className="bg-white rounded-xl p-3 flex flex-col items-center justify-center shadow-md">
              <svg
                viewBox="0 0 21 21"
                width={130}
                height={130}
                style={{ shapeRendering: 'crispEdges' }}
              >
                {qrMatrix.map((row, r) =>
                  row.map((isDark, c) =>
                    isDark ? (
                      <rect
                        key={`${r}-${c}`}
                        x={c}
                        y={r}
                        width={1}
                        height={1}
                        fill="#09090b"
                      />
                    ) : null
                  )
                )}
              </svg>
              <div className="text-[10px] font-mono font-bold text-zinc-800 mt-1.5 tracking-wider">
                {worker.employeeId}
              </div>
            </div>

            {/* K3 Compliance & SIO License Badges */}
            <div className="space-y-2 text-xs">
              {/* SIO License Status */}
              <div className="p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <Truck className="w-4 h-4 text-amber-400 shrink-0" />
                  <div className="min-w-0">
                    <div className="text-[9px] text-zinc-500 font-bold uppercase">Lisensi Kemenaker SIO MHE</div>
                    <div className="text-[11px] font-bold text-white truncate">
                      {license ? (
                        <span>{license.licenseType} ({license.licenseNumber})</span>
                      ) : isMheRole ? (
                        <span className="text-amber-400">SIO Operasional Terdaftar</span>
                      ) : (
                        <span className="text-zinc-400">Bukan Operator MHE</span>
                      )}
                    </div>
                  </div>
                </div>
                {license?.status === 'expired' ? (
                  <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/30 shrink-0">
                    EXPIRED
                  </span>
                ) : (
                  <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0">
                    VALID
                  </span>
                )}
              </div>

              {/* Pre-Shift Checklist Clearance Status */}
              <div className="p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                  <div>
                    <div className="text-[9px] text-zinc-500 font-bold uppercase">Pre-Shift K3 Hari Ini</div>
                    <div className="text-[11px] font-bold text-white">
                      {worker.preShiftChecklistDone ? (
                        <span className="text-emerald-400">✓ Lolos Inspeksi Keselamatan</span>
                      ) : (
                        <span className="text-amber-400">Belum Mengisi Checklist</span>
                      )}
                    </div>
                  </div>
                </div>
                <span className="text-[9px] font-mono text-zinc-500">
                  {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                </span>
              </div>

              {/* Tier & BIB Score */}
              <div className="grid grid-cols-2 gap-2 text-center">
                <div className="p-2 rounded-xl bg-zinc-900 border border-zinc-800">
                  <div className="text-[9px] text-zinc-500 uppercase font-bold">BIB Total Score</div>
                  <div className="text-xs font-black text-purple-400 mt-0.5">
                    {worker.bibScores?.totalScore?.toFixed(1) || '0.0'} / 100
                  </div>
                </div>
                <div className="p-2 rounded-xl bg-zinc-900 border border-zinc-800">
                  <div className="text-[9px] text-zinc-500 uppercase font-bold">Poin Reward</div>
                  <div className="text-xs font-black text-amber-400 mt-0.5">
                    {worker.totalPoints.toLocaleString()} PTS
                  </div>
                </div>
              </div>
            </div>

            {/* Card Footer Warning */}
            <div className="text-[8px] text-zinc-500 text-center leading-tight pt-1">
              Kartu ini merupakan dokumen digital resmi PT. DAYA ANUGRAH MULYA. Tunjukkan QR code kepada Supervisor saat inspeksi harian.
            </div>
          </div>
        </div>

        {/* Bottom Actions */}
        <div className="px-5 py-3.5 border-t border-zinc-800/80 bg-zinc-900/60 flex items-center justify-between gap-3">
          <div className="text-[11px] text-zinc-400 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span>Siap di-scan di area gudang</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="px-3.5 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-xl text-xs font-bold transition flex items-center gap-1.5 border border-zinc-700"
            >
              <Printer className="w-3.5 h-3.5 text-zinc-400" />
              <span>Cetak ID</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-md shadow-emerald-950"
            >
              <span>Selesai</span>
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
