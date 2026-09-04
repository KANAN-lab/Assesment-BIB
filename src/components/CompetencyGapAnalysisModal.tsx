import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, CartesianGrid, Cell
} from 'recharts';
import {
  X,
  BarChart3,
  AlertTriangle,
  ShieldCheck,
  Download,
  Award,
  Zap,
  Users,
  CheckCircle2,
  Loader2
} from 'lucide-react';
import { WorkerProfile } from '../types/assessment';
import { matrixEngine } from '../domain/CompetencyMatrixEngine';
import { RoleEntity } from '../domain/RoleEntity';
import { TrainingAssignmentService, TrainingAssignmentResult } from '../domain/TrainingAssignmentService';
import { SwalService } from '../domain/SwalService';

interface CompetencyGapAnalysisModalProps {
  isOpen: boolean;
  onClose: () => void;
  workers: WorkerProfile[];
}

export const CompetencyGapAnalysisModal: React.FC<CompetencyGapAnalysisModalProps> = ({
  isOpen,
  onClose,
  workers,
}) => {
  const [selectedDiv, setSelectedDiv] = useState<string>('Semua');
  const [selectedCatForAssignment, setSelectedCatForAssignment] = useState<string | null>(null);
  const [isAssigning, setIsAssigning] = useState(false);
  const [assignmentResult, setAssignmentResult] = useState<TrainingAssignmentResult | null>(null);

  // Filter operational workers
  const opWorkers = useMemo(() => {
    return workers.filter(
      (w) => RoleEntity.isOperationalWorker(w.role) && w.division.toUpperCase() !== 'SYSTEM'
    );
  }, [workers]);

  const availableDivisions = useMemo(() => {
    const set = new Set<string>();
    opWorkers.forEach((w) => set.add(w.division));
    return Array.from(set);
  }, [opWorkers]);

  const filteredWorkers = useMemo(() => {
    if (selectedDiv === 'Semua') return opWorkers;
    return opWorkers.filter((w) => w.division === selectedDiv);
  }, [opWorkers, selectedDiv]);

  // Aggregate Category Gap Data across filtered workers
  const gapData = useMemo(() => {
    const catScores: Record<string, { auditedSum: number; maxSum: number; count: number }> = {};

    for (const w of filteredWorkers) {
      const summaries = matrixEngine.calculateCategorySummaries(
        w.role,
        w.competencyAuditScores || {},
        w.bibScores.totalScore
      );

      for (const s of summaries) {
        if (!catScores[s.category]) {
          catScores[s.category] = { auditedSum: 0, maxSum: 0, count: 0 };
        }
        catScores[s.category].auditedSum += s.auditedScore;
        catScores[s.category].maxSum += s.maxScore;
        catScores[s.category].count += 1;
      }
    }

    return Object.entries(catScores).map(([cat, val]) => {
      const targetPct = 100;
      const actualPct = val.maxSum > 0 ? Math.round((val.auditedSum / val.maxSum) * 100) : 0;
      const gapPct = Math.max(0, targetPct - actualPct);

      return {
        category: cat,
        targetPct,
        actualPct,
        gapPct,
        auditedSum: Math.round(val.auditedSum * 10) / 10,
        maxSum: val.maxSum,
        itemCount: val.count,
        needTraining: gapPct >= 25,
      };
    }).sort((a, b) => b.gapPct - a.gapPct);
  }, [filteredWorkers]);

  React.useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      setAssignmentResult(null);
      setSelectedCatForAssignment(null);
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const handleConfirmAssignment = async () => {
    if (!selectedCatForAssignment || filteredWorkers.length === 0) return;
    setIsAssigning(true);
    try {
      const result = await TrainingAssignmentService.assignGapTraining({
        category: selectedCatForAssignment,
        division: selectedDiv,
        targetWorkers: filteredWorkers,
        assignedBy: 'Supervisor Logistik & HSE',
      });
      setAssignmentResult(result);
      setSelectedCatForAssignment(null);
    } catch (err: any) {
      SwalService.error('Gagal Menugaskan Training', err.message || 'Gagal menugaskan training.');
    } finally {
      setIsAssigning(false);
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] overflow-y-auto bg-black/90 backdrop-blur-xl p-4 sm:p-6 flex items-center justify-center min-h-screen animate-fade-in"
    >
      <div
        className="relative w-full max-w-5xl max-h-[88vh] sm:max-h-[90vh] m-auto bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Header */}
        <div className="p-5 border-b border-zinc-800 flex items-center justify-between bg-zinc-950/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Analisis Kesenjangan Kompetensi (Gap Analysis)</h2>
              <p className="text-xs text-zinc-400 mt-0.5">
                Perbandingan Target Standar Kompetensi vs pencapaian audit aktual tim operasional
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Division Filter */}
            <select
              value={selectedDiv}
              onChange={(e) => setSelectedDiv(e.target.value)}
              className="bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500 font-medium"
            >
              <option value="Semua">Semua Divisi ({opWorkers.length} Staf)</option>
              {availableDivisions.map((div) => (
                <option key={div} value={div}>{div}</option>
              ))}
            </select>

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center text-zinc-400 hover:text-white transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1 custom-scrollbar">
          
          {/* Success Banner if Training Assigned */}
          {assignmentResult && (
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-start gap-3 animate-fade-in">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <div className="font-bold text-sm text-white">
                  Berhasil Menugaskan Re-Training K3!
                </div>
                <p className="mt-0.5 text-zinc-300">
                  Modul <strong>{assignmentResult.moduleTitle}</strong> ({assignmentResult.moduleCode}) telah ditugaskan kepada <strong>{assignmentResult.assignedCount} personel</strong> di Divisi {selectedDiv}.
                </p>
                <div className="mt-1 text-[11px] text-emerald-400 font-mono">
                  Batas Waktu Penyelesaian: {assignmentResult.deadlineDate} · Notifikasi telah dikirimkan ke dashboard pekerja.
                </div>
              </div>
              <button
                type="button"
                onClick={() => setAssignmentResult(null)}
                className="text-zinc-500 hover:text-white"
              >
                ✕
              </button>
            </div>
          )}

          {/* Visual Bar Chart Comparison */}
          <div className="card p-4 space-y-3">
            <div className="flex items-center justify-between text-xs font-bold text-white">
              <span>Grafik Perbandingan Ketercapaian Kompetensi (%)</span>
              <span className="text-zinc-400 font-normal">Target Required: 100%</span>
            </div>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={gapData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                  <XAxis dataKey="category" tick={{ fill: '#a1a1aa', fontSize: 10 }} />
                  <YAxis domain={[0, 100]} tick={{ fill: '#a1a1aa', fontSize: 10 }} />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-zinc-950 border border-zinc-800 p-2.5 rounded-xl text-xs shadow-xl space-y-1">
                            <div className="font-bold text-white">{data.category}</div>
                            <div className="text-emerald-400">Audited Actual: {data.actualPct}%</div>
                            <div className="text-rose-400">Competency Gap: {data.gapPct}%</div>
                            <div className="text-zinc-400 text-[10px]">
                              Total Skor: {data.auditedSum} / {data.maxSum}
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar dataKey="actualPct" name="Pencapaian Audit (%)" radius={[6, 6, 0, 0]}>
                    {gapData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.actualPct >= 80 ? '#10b981' : entry.actualPct >= 65 ? '#f59e0b' : '#ef4444'}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Detailed Category Gap Breakdown Grid */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              Prioritas Modul Pelatihan & Re-Sertifikasi K3
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {gapData.map((item) => (
                <div key={item.category} className="bg-zinc-950 p-4 rounded-xl border border-zinc-800 flex flex-col justify-between">
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div>
                        <div className="font-bold text-white text-xs">{item.category}</div>
                        <div className="text-[10px] text-zinc-500">{item.itemCount} Item Modul Uji</div>
                      </div>
                      {item.needTraining ? (
                        <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20 flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" /> Re-Training K3
                        </span>
                      ) : (
                        <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                          <ShieldCheck className="w-3 h-3" /> Terpenuhi
                        </span>
                      )}
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-baseline justify-between text-xs">
                        <span className="text-zinc-400 text-[10px]">Capaian Actual vs Gap</span>
                        <span className="font-bold text-white">{item.actualPct}% <span className="text-rose-400 font-normal">(-{item.gapPct}%)</span></span>
                      </div>
                      <div className="w-full bg-zinc-900 rounded-full h-2 overflow-hidden flex">
                        <div className="bg-emerald-500 h-full transition-all" style={{ width: `${item.actualPct}%` }} />
                        <div className="bg-rose-500/50 h-full transition-all" style={{ width: `${item.gapPct}%` }} />
                      </div>
                    </div>
                  </div>

                  {/* Operational Action Button for Training Assignment */}
                  {item.needTraining && (
                    <button
                      type="button"
                      onClick={() => setSelectedCatForAssignment(item.category)}
                      className="mt-3 w-full py-2 px-3 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-sm"
                    >
                      <Zap className="w-3.5 h-3.5 text-amber-400" />
                      <span>Tugaskan Re-Training ({filteredWorkers.length} Personel)</span>
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Confirmation Modal Overlay */}
        {selectedCatForAssignment && (
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm p-6 flex items-center justify-center z-50 animate-fade-in">
            <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-6 max-w-md w-full space-y-4 shadow-2xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                  <Zap className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">Konfirmasi Penugasan Re-Training</h4>
                  <p className="text-xs text-zinc-400">Modul K3 Kategori: {selectedCatForAssignment}</p>
                </div>
              </div>

              <div className="p-3 bg-zinc-950 rounded-xl border border-zinc-800 space-y-2 text-xs text-zinc-300">
                <div className="flex items-center justify-between">
                  <span className="text-zinc-500">Divisi Target:</span>
                  <strong className="text-white">{selectedDiv}</strong>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-zinc-500">Jumlah Personel:</span>
                  <strong className="text-cyan-400">{filteredWorkers.length} Pekerja</strong>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-zinc-500">Tenggat Waktu:</span>
                  <strong className="text-amber-300">7 Hari Sejak Ditugaskan</strong>
                </div>
                <div className="text-[11px] text-zinc-400 pt-1 border-t border-zinc-800/80">
                  Sistem akan mengirimkan notifikasi tugas prioritas tinggi ke dashboard masing-masing staf operasional.
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-1">
                <button
                  type="button"
                  disabled={isAssigning}
                  onClick={() => setSelectedCatForAssignment(null)}
                  className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-bold rounded-xl transition"
                >
                  Batal
                </button>
                <button
                  type="button"
                  disabled={isAssigning}
                  onClick={handleConfirmAssignment}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5 shadow-lg shadow-amber-950 disabled:opacity-50"
                >
                  {isAssigning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                  <span>Kirim Penugasan Sekarang</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="p-4 border-t border-zinc-800 bg-zinc-950/60 flex items-center justify-between text-xs">
          <div className="text-zinc-500 text-[11px]">
            Menampilkan data gap analisis untuk {filteredWorkers.length} personel operasional ({selectedDiv}).
          </div>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-bold transition"
          >
            Tutup
          </button>
        </div>

      </div>
    </div>,
    document.body
  );
};
