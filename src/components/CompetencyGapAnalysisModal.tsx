import React, { useState, useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, CartesianGrid, Cell
} from 'recharts';
import { X, BarChart3, AlertTriangle, ShieldCheck, Download, Award } from 'lucide-react';
import { WorkerProfile } from '../types/assessment';
import { matrixEngine } from '../domain/CompetencyMatrixEngine';
import { RoleEntity } from '../domain/RoleEntity';

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
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] overflow-y-auto bg-black/90 backdrop-blur-xl p-4 sm:p-6 flex items-center justify-center min-h-screen animate-fade-in"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-5xl max-h-[82vh] sm:max-h-[85vh] m-auto bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden"
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
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-zinc-800 bg-zinc-950/60 flex items-center justify-between text-xs">
          <div className="text-zinc-500 text-[11px]">
            Menampilkan data gap analisis untuk {filteredWorkers.length} personel operasional.
          </div>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-bold transition"
          >
            Tutup
          </button>
        </div>

      </div>
    </div>
  );
};
