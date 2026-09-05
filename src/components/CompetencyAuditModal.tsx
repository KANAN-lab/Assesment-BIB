import React, { useState, useMemo, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { WorkerProfile, CompetencyItem, ScoringRule } from '../types/assessment';
import { matrixEngine } from '../domain/CompetencyMatrixEngine';
import { SystemConfigService } from '../domain/SystemConfigService';
import { X, Save, AlertCircle, CheckCircle2, Info, HelpCircle, TableProperties, Filter } from 'lucide-react';
import { WorkerAvatar } from './WorkerAvatar';

interface CompetencyAuditModalProps {
  worker: WorkerProfile;
  initialScores: Record<string, number>;
  onClose: () => void;
  onSaveScores: (
    scores: Record<string, number>,
    calculatedBehavior: number,
    calculatedBenchmark: number
  ) => void;
}

export const CompetencyAuditModal: React.FC<CompetencyAuditModalProps> = ({
  worker,
  initialScores,
  onClose,
  onSaveScores,
}) => {
  const competencyItems: CompetencyItem[] = matrixEngine.getItems();
  const scoringRules: ScoringRule[] = matrixEngine.getRules();
  const closeBtnRef = useRef<HTMLButtonElement>(null);

  // Local scores state
  const [scores, setScores] = useState<Record<string, number>>(initialScores || {});
  const [selectedType, setSelectedType] = useState<string>('All');
  const [showRulesGuide, setShowRulesGuide] = useState<boolean>(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [saving, setSaving] = useState<boolean>(false);

  // Normalize role string to match matrix column names — delegated to OOP engine
  const roleColumnKey = useMemo(
    () => matrixEngine.resolveRoleColumnKey(worker.role),
    [worker.role]
  );

  // Unique competency types for filter
  const competencyTypes = useMemo(() => {
    const types = Array.from(new Set(competencyItems.map((item) => item.type)));
    return ['All', ...types];
  }, [competencyItems]);

  // Filtered items
  const filteredItems = useMemo(() => {
    if (selectedType === 'All') return competencyItems;
    return competencyItems.filter((item) => item.type === selectedType);
  }, [competencyItems, selectedType]);

  // Calculate totals and max scores for current worker role
  const { totalAuditedScore, totalMaxPossibleScore, percentage } = useMemo(() => {
    let auditedSum = 0;
    let maxSum = 0;

    for (const item of competencyItems) {
      const maxForRole = item.maxScores[roleColumnKey] ?? 0;
      if (maxForRole > 0) {
        maxSum += maxForRole;
        auditedSum += scores[item.id] ?? 0;
      }
    }

    const pct = maxSum > 0 ? Math.round((auditedSum / maxSum) * 100) : 0;
    return { totalAuditedScore: auditedSum, totalMaxPossibleScore: maxSum, percentage: pct };
  }, [competencyItems, roleColumnKey, scores]);

  // Handle score change with strict max value validation rule
  const handleScoreChange = (itemId: string, valStr: string, maxAllowed: number) => {
    setValidationError(null);
    const numVal = parseFloat(valStr);

    if (isNaN(numVal) || numVal < 0) {
      setScores((prev) => ({ ...prev, [itemId]: 0 }));
      return;
    }

    if (numVal > maxAllowed) {
      setValidationError(`Nilai untuk item ini maksimal ${maxAllowed} untuk peran ${roleColumnKey}`);
      setScores((prev) => ({ ...prev, [itemId]: maxAllowed }));
      return;
    }

    setScores((prev) => ({ ...prev, [itemId]: numVal }));
  };

  // Handle Save
  const handleSave = () => {
    setSaving(true);
    const behaviorVal = Math.min(100, Math.max(60, Math.round(percentage)));
    const benchmarkVal = Math.min(100, Math.max(60, Math.round(percentage * 0.95 + 4)));

    setTimeout(() => {
      onSaveScores(scores, behaviorVal, benchmarkVal);
      setSaving(false);
      onClose();
    }, 300);
  };

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    const timer = setTimeout(() => {
      closeBtnRef.current?.focus();
    }, 50);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      clearTimeout(timer);
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] overflow-y-auto bg-black/90 backdrop-blur-xl p-4 sm:p-6 flex items-center justify-center min-h-screen animate-fade-in"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-5xl max-h-[88vh] sm:max-h-[90vh] m-auto bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-scale-up"
        onClick={(e) => e.stopPropagation()}
      >

        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-950/80 relative z-10">
          <div className="flex items-center gap-3">
            <WorkerAvatar
              src={worker.avatar}
              name={worker.name}
              className="w-10 h-10 rounded-xl ring-1 ring-zinc-700"
            />
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white">{worker.name}</h2>
                <span className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-bold px-2 py-0.5 rounded-md">
                  {roleColumnKey}
                </span>
              </div>
              <p className="text-xs text-zinc-400">
                NIP: {worker.employeeId} · {worker.division} · Matrix Evaluation
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowRulesGuide(!showRulesGuide)}
              className="px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-bold text-zinc-300 flex items-center gap-1.5 transition border border-zinc-700"
            >
              <HelpCircle className="w-3.5 h-3.5 text-cyan-400" />
              <span className="hidden sm:inline">Acuan Rules</span>
            </button>

            <button
              ref={closeBtnRef}
              onClick={onClose}
              className="p-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white transition focus:outline-none focus:ring-2 focus:ring-emerald-400"
              aria-label="Tutup modal"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Audit Cooldown & Governance Policy Banner */}
        <div className="bg-indigo-950/40 border-b border-indigo-500/20 px-6 py-2.5 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-indigo-300">
            <Info className="w-4 h-4 text-indigo-400 shrink-0" />
            <span>
              <strong className="text-white font-bold">Kebijakan Frekuensi Penilaian Admin:</strong> Audit rutin disarankan <strong className="text-emerald-400">{SystemConfigService.getConfig().auditFrequencyLabel}</strong> per staf (Dikonfigurasi Administrator).
            </span>
          </div>
          <span className="text-[10px] font-mono text-indigo-300 font-bold bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20 shrink-0">
            {SystemConfigService.getConfig().auditFrequencyLabel}
          </span>
        </div>

        {/* Score Summary Banner */}
        <div className="px-6 py-3 bg-zinc-950 border-b border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-3 relative z-10">
          <div className="flex items-center gap-6">
            <div>
              <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold block">Total Audited Score</span>
              <span className="text-base font-black text-emerald-400">
                {totalAuditedScore} <span className="text-xs font-normal text-zinc-500">/ {totalMaxPossibleScore} Max</span>
              </span>
            </div>

            <div className="h-6 w-px bg-zinc-800 hidden sm:block" />

            <div>
              <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold block">Pencapaian Matrix</span>
              <span className="text-base font-black text-white">
                {percentage}%
              </span>
            </div>
          </div>

          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full sm:w-auto px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl transition flex items-center justify-center gap-1.5"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Menyimpan…' : 'Simpan Audit Matrix'}</span>
          </button>
        </div>

        {/* Validation error alert */}
        {validationError && (
          <div className="bg-rose-950/80 border-b border-rose-500/30 px-6 py-2 text-rose-300 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{validationError}</span>
            </div>
            <button onClick={() => setValidationError(null)} className="text-rose-400 font-bold">✕</button>
          </div>
        )}

        {/* Rules guide expansion panel */}
        {showRulesGuide && (
          <div className="bg-zinc-950/95 border-b border-zinc-800 p-4 animate-fade-in relative z-20 shadow-xl">
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-zinc-800/80">
              <div className="flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-cyan-400" />
                <h4 className="font-bold text-xs text-white uppercase tracking-wider">Acuan Penilaian Matrix (Level 1 – 5)</h4>
              </div>
              <button
                onClick={() => setShowRulesGuide(false)}
                className="text-[11px] text-zinc-400 hover:text-white flex items-center gap-1 font-semibold transition"
              >
                Tutup Acuan ✕
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
              {scoringRules.map((rule) => {
                const colorMap: Record<number, { border: string; badge: string; text: string }> = {
                  1: { border: 'border-zinc-800', badge: 'bg-zinc-800 text-zinc-300', text: 'text-zinc-400' },
                  2: { border: 'border-blue-900/40', badge: 'bg-blue-950 text-blue-400', text: 'text-blue-300' },
                  3: { border: 'border-amber-900/40', badge: 'bg-amber-950 text-amber-400', text: 'text-amber-300' },
                  4: { border: 'border-indigo-900/40', badge: 'bg-indigo-950 text-indigo-400', text: 'text-indigo-300' },
                  5: { border: 'border-emerald-900/40', badge: 'bg-emerald-950 text-emerald-400', text: 'text-emerald-300' },
                };
                const style = colorMap[rule.level] || colorMap[1];
                const lines = rule.description.replace(/\\n/g, '\n').split('\n').map((s) => s.trim()).filter(Boolean);

                return (
                  <div key={rule.level} className={`p-3 rounded-xl bg-zinc-900/90 border ${style.border} flex flex-col justify-between`}>
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-md ${style.badge}`}>
                          Level {rule.level}
                        </span>
                        <span className="text-[11px] font-bold text-white">{rule.name}</span>
                      </div>
                      <div className="space-y-1 mt-1">
                        {lines.map((lineText, idx) => (
                          <p key={idx} className="text-[11px] text-zinc-300 leading-snug">
                            {lineText}
                          </p>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Filter Bar */}
        <div className="px-6 py-3 bg-zinc-900 border-b border-zinc-800 flex items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
            <span className="text-xs font-bold text-zinc-400 flex items-center gap-1 shrink-0 mr-1">
              <Filter className="w-3.5 h-3.5 text-zinc-500" /> Filter:
            </span>
            {competencyTypes.map((type) => (
              <button
                key={type}
                onClick={() => setSelectedType(type)}
                className={`px-3 py-1 rounded-md text-[11px] font-bold whitespace-nowrap transition ${
                  selectedType === type
                    ? 'bg-emerald-600 text-white'
                    : 'bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-700'
                }`}
              >
                {type}
              </button>
            ))}
          </div>
          <span className="text-[11px] text-zinc-500 shrink-0 hidden sm:inline">
            Menampilkan {filteredItems.length} item
          </span>
        </div>

        {/* Item List Form */}
        <div className="p-6 overflow-y-auto space-y-3 flex-1 min-h-0 custom-scrollbar bg-zinc-950/40">
          {filteredItems.map((item, idx) => {
            const maxForRole = item.maxScores[roleColumnKey] ?? 0;
            const currentScore = scores[item.id] ?? 0;
            const isRelevant = maxForRole > 0;

            return (
              <div
                key={item.id}
                className={`p-4 rounded-xl border transition ${
                  isRelevant
                    ? 'bg-zinc-900 border-zinc-800'
                    : 'bg-zinc-950/40 border-zinc-900 opacity-60'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  
                  {/* Item Description */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="text-[10px] font-bold px-2 py-0.5 bg-zinc-800 text-emerald-400 rounded border border-zinc-700 uppercase">
                        {item.type}
                      </span>
                      <span className="text-[10px] text-zinc-400 font-semibold">{item.category}</span>
                      <span className="text-[10px] text-zinc-500 font-mono">#{idx + 1}</span>
                    </div>

                    <h4 className="font-bold text-white text-xs leading-snug">{item.title}</h4>
                    <p className="text-[11px] text-zinc-400 mt-1 leading-relaxed">{item.definition}</p>
                  </div>

                  {/* Input Score Field */}
                  <div className="shrink-0 flex items-center gap-3 border-t sm:border-t-0 pt-2 sm:pt-0 border-zinc-800">
                    <div className="text-right">
                      <div className="text-[10px] text-zinc-500 font-bold">Maks Peran</div>
                      <div className="text-xs font-black text-amber-400 font-mono">{maxForRole} Poin</div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <input
                        type="number"
                        min="0"
                        max={maxForRole}
                        step="0.5"
                        disabled={!isRelevant}
                        value={currentScore}
                        onChange={(e) => handleScoreChange(item.id, e.target.value, maxForRole)}
                        className={`w-16 px-2.5 py-1.5 text-center font-bold text-xs font-mono rounded-xl border transition focus:outline-none ${
                          !isRelevant
                            ? 'bg-zinc-950 border-zinc-900 text-zinc-600 cursor-not-allowed'
                            : currentScore > maxForRole
                            ? 'bg-rose-950 border-rose-500 text-rose-300'
                            : 'bg-zinc-950 border-zinc-700 text-white focus:border-emerald-500'
                        }`}
                      />
                      <span className="text-xs text-zinc-500 font-bold">/ {maxForRole}</span>
                    </div>
                  </div>

                </div>
              </div>
            );
          })}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 bg-zinc-950 border-t border-zinc-800 flex items-center justify-between text-xs text-zinc-500">
          <span>Acuan evaluasi berdasarkan MATRIX KOMPETENSI.xlsx</span>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl transition"
          >
            {saving ? 'Menyimpan…' : 'Simpan Perubahan'}
          </button>
        </div>

      </div>
    </div>,
    document.body
  );
};
