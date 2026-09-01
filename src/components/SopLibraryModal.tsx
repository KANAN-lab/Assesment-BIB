// src/components/SopLibraryModal.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Search,
  BookOpen,
  Award,
  Clock,
  CheckCircle2,
  AlertCircle,
  Truck,
  Flame,
  Scale,
  Boxes,
  Sparkles,
  ShieldCheck,
  Play,
  Check,
} from 'lucide-react';
import { SopModule, SopCategory, WorkerSopProgress } from '../types/sop';
import {
  fetchAllSopModules,
  fetchWorkerSopProgress,
  completeSopModule,
  calculateSopCompliance,
} from '../lib/sopService';
import { SopSlideshowModal } from './SopSlideshowModal';

interface SopLibraryModalProps {
  workerId: string;
  workerName: string;
  workerDivision?: string;
  workerRole?: string;
  onClose: () => void;
  onRewardEarned?: (points: number, message: string) => void;
}

export const SopLibraryModal: React.FC<SopLibraryModalProps> = ({
  workerId,
  workerName: _workerName,
  workerDivision,
  workerRole,
  onClose,
  onRewardEarned,
}) => {
  const [modules, setModules] = useState<SopModule[]>([]);
  const [progressMap, setProgressMap] = useState<Record<string, WorkerSopProgress>>({});
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Semua');
  const [filterMandatoryOnly, setFilterMandatoryOnly] = useState(false);
  const [activeReadingModule, setActiveReadingModule] = useState<SopModule | null>(null);

  // Load SOP modules & worker progress
  const loadData = async () => {
    setLoading(true);
    try {
      const [mods, prog] = await Promise.all([
        fetchAllSopModules(workerDivision, workerRole),
        fetchWorkerSopProgress(workerId),
      ]);
      setModules(mods);
      setProgressMap(prog);
    } catch (err) {
      console.error('Gagal memuat katalog SOP:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [workerId, workerDivision, workerRole]);

  // Handle completion callback from slideshow reader
  const handleCompleteModule = async (sopId: string, timeSpentSeconds: number, quizScore: number) => {
    try {
      const res = await completeSopModule(workerId, sopId, timeSpentSeconds, quizScore);
      // Refresh progress
      const updatedProg = await fetchWorkerSopProgress(workerId);
      setProgressMap(updatedProg);

      if (res.pointsAdded > 0 && onRewardEarned) {
        onRewardEarned(res.pointsAdded, res.message);
      }
    } catch (e) {
      console.error('Gagal mencatat penyelesaian SOP:', e);
    }
  };

  // Filtered module list
  const filteredModules = useMemo(() => {
    return modules.filter((m) => {
      const matchesSearch =
        m.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.description.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesCategory =
        selectedCategory === 'Semua' || m.category === selectedCategory;

      const matchesMandatory = !filterMandatoryOnly || m.isMandatory;

      return matchesSearch && matchesCategory && matchesMandatory;
    });
  }, [modules, searchQuery, selectedCategory, filterMandatoryOnly]);

  // Compliance metrics
  const compliance = useMemo(() => {
    return calculateSopCompliance(modules, progressMap);
  }, [modules, progressMap]);

  // Category Icon helper
  const getCategoryIcon = (category: SopCategory) => {
    switch (category) {
      case 'Operasional MHE':
        return <Truck className="w-4 h-4 text-amber-400" />;
      case 'K3 & Safety':
        return <Flame className="w-4 h-4 text-rose-400" />;
      case 'Inbound & Timbangan':
        return <Scale className="w-4 h-4 text-cyan-400" />;
      case 'Warehouse & Staging':
        return <Boxes className="w-4 h-4 text-emerald-400" />;
      case '5S & Continuous Improvement':
        return <Sparkles className="w-4 h-4 text-purple-400" />;
      case 'Outbound & Ekspedisi':
        return <ShieldCheck className="w-4 h-4 text-blue-400" />;
      default:
        return <BookOpen className="w-4 h-4 text-zinc-400" />;
    }
  };

  const CATEGORIES = [
    'Semua',
    'Operasional MHE',
    'Warehouse & Staging',
    'K3 & Safety',
    'Inbound & Timbangan',
    '5S & Continuous Improvement',
    'Outbound & Ekspedisi',
  ];

  return createPortal(
    <div className="fixed inset-0 z-[9998] overflow-y-auto bg-black/85 backdrop-blur-md p-3 sm:p-6 flex items-center justify-center min-h-screen animate-fade-in">
      <div className="card-elevated w-full max-w-5xl max-h-[92vh] flex flex-col p-4 sm:p-6 relative border border-zinc-700/80 shadow-2xl overflow-y-auto custom-scrollbar">
        
        {/* ─── 1. TOP HEADER ─── */}
        <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-purple-600/20 border border-purple-500/30 flex items-center justify-center text-purple-400">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                Pustaka SOP Micro-Deck & K3 Academy
                <span className="text-[10px] bg-purple-950 text-purple-300 font-bold px-2 py-0.5 rounded border border-purple-800/60">
                  Interactive Decks
                </span>
              </h2>
              <p className="text-[11px] text-zinc-400 mt-0.5">
                Pelajari standar operasional & kaidah K3 dalam slide mikro 3 menit dan klaim <strong>+50 PTS</strong> per modul
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ─── 2. STATS OVERVIEW TILES ─── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 my-4">
          <div className="bg-zinc-900/90 border border-zinc-800 rounded-xl p-3">
            <div className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Total Modul</div>
            <div className="text-lg font-black text-white mt-0.5">{compliance.totalModules} Decks</div>
            <div className="text-[10px] text-zinc-400">Tersedia untuk peran Anda</div>
          </div>

          <div className="bg-zinc-900/90 border border-zinc-800 rounded-xl p-3">
            <div className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Sudah Selesai</div>
            <div className="text-lg font-black text-emerald-400 mt-0.5">
              {compliance.completedCount} / {compliance.totalModules}
            </div>
            <div className="text-[10px] text-emerald-300">
              {Math.round((compliance.completedCount / Math.max(1, compliance.totalModules)) * 100)}% Terselesaikan
            </div>
          </div>

          <div className="bg-zinc-900/90 border border-zinc-800 rounded-xl p-3">
            <div className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Kepatuhan Wajib</div>
            <div className="text-lg font-black text-purple-400 mt-0.5">
              {Math.round(compliance.mandatoryCompletedRatio * 100)}%
            </div>
            <div className="text-[10px] text-purple-300">Mandatory compliance</div>
          </div>

          <div className="bg-zinc-900/90 border border-zinc-800 rounded-xl p-3">
            <div className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Total Poin Diraih</div>
            <div className="text-lg font-black text-amber-300 mt-0.5 flex items-center gap-1">
              <Award className="w-4 h-4 text-amber-400" />
              <span>+{compliance.totalPointsEarnedFromSop} PTS</span>
            </div>
            <div className="text-[10px] text-amber-400/80">+2.5 Benchmark Score/SOP</div>
          </div>
        </div>

        {/* ─── 3. SEARCH & CATEGORY FILTER ─── */}
        <div className="space-y-3 mb-4">
          <div className="flex flex-col sm:flex-row items-center gap-2.5">
            {/* Search Input */}
            <div className="relative flex-1 w-full">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari kode SOP, judul, atau kata kunci instruksi..."
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500"
              />
            </div>

            {/* Filter Wajib Checkbox */}
            <button
              onClick={() => setFilterMandatoryOnly(!filterMandatoryOnly)}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 ${
                filterMandatoryOnly
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  : 'bg-zinc-900 text-zinc-400 border border-zinc-800 hover:text-white'
              }`}
            >
              <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
              <span>Hanya Wajib Baca ({modules.filter((m) => m.isMandatory).length})</span>
            </button>
          </div>

          {/* Category Pill Filters */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 custom-scrollbar">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition flex items-center gap-1.5 ${
                  selectedCategory === cat
                    ? 'bg-purple-600 text-white shadow-md shadow-purple-900/40'
                    : 'bg-zinc-900 text-zinc-400 border border-zinc-800 hover:text-white'
                }`}
              >
                <span>{cat}</span>
              </button>
            ))}
          </div>
        </div>

        {/* ─── 4. MODULE CARD GRID ─── */}
        <div className="flex-1 overflow-y-auto custom-scrollbar pr-1">
          {loading ? (
            <div className="text-center py-16 text-xs text-zinc-500">
              <span className="animate-spin inline-block mr-2">⏳</span> Memuat katalog modul SOP...
            </div>
          ) : filteredModules.length === 0 ? (
            <div className="text-center py-14 text-xs text-zinc-500 bg-zinc-950/40 rounded-xl border border-zinc-800">
              Tidak ada modul SOP yang cocok dengan filter pencarian Anda.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {filteredModules.map((item) => {
                const prog = progressMap[item.id];
                const isCompleted = prog?.isCompleted;

                return (
                  <div
                    key={item.id}
                    className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-4 flex flex-col justify-between relative hover:border-zinc-700 transition group"
                  >
                    {/* Top Badges */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-1.5">
                          {getCategoryIcon(item.category)}
                          <span className="font-mono text-[10px] font-bold text-zinc-400">
                            {item.code}
                          </span>
                        </div>

                        <div className="flex items-center gap-1">
                          {item.isMandatory && (
                            <span className="bg-amber-950/80 text-amber-300 text-[9px] font-black px-1.5 py-0.5 rounded border border-amber-800/60 uppercase">
                              Wajib
                            </span>
                          )}
                          {isCompleted ? (
                            <span className="bg-emerald-950/80 text-emerald-300 text-[9px] font-black px-1.5 py-0.5 rounded border border-emerald-800/60 flex items-center gap-0.5">
                              <Check className="w-2.5 h-2.5" /> Selesai
                            </span>
                          ) : (
                            <span className="bg-zinc-800 text-zinc-400 text-[9px] font-bold px-1.5 py-0.5 rounded">
                              {item.slides.length} Slide
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Title & Description */}
                      <h4 className="font-bold text-white text-xs mb-1.5 leading-snug group-hover:text-purple-300 transition">
                        {item.title}
                      </h4>
                      <p className="text-[11px] text-zinc-400 line-clamp-2 leading-relaxed mb-3">
                        {item.description}
                      </p>
                    </div>

                    {/* Footer Info & Read Button */}
                    <div className="pt-2 border-t border-zinc-800/80">
                      <div className="flex items-center justify-between text-[10px] text-zinc-400 mb-2.5">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-zinc-500" />
                          ~{item.estimatedMinutes} menit baca
                        </span>
                        <span className="font-bold text-amber-400 flex items-center gap-0.5">
                          <Award className="w-3 h-3" />
                          +{item.pointsReward} PTS
                        </span>
                      </div>

                      <button
                        onClick={() => setActiveReadingModule(item)}
                        className={`w-full py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-md ${
                          isCompleted
                            ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700'
                            : 'bg-purple-600 hover:bg-purple-500 text-white shadow-purple-900/30'
                        }`}
                      >
                        {isCompleted ? (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Buka Ulang Deck</span>
                          </>
                        ) : (
                          <>
                            <Play className="w-3.5 h-3.5 fill-current" />
                            <span>Buka & Pelajari Deck</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>

      {/* ─── 5. ACTIVE SLIDESHOW READER MODAL ─── */}
      {activeReadingModule && (
        <SopSlideshowModal
          module={activeReadingModule}
          isAlreadyCompleted={progressMap[activeReadingModule.id]?.isCompleted}
          workerId={workerId}
          onClose={() => setActiveReadingModule(null)}
          onComplete={handleCompleteModule}
        />
      )}
    </div>,
    document.body
  );
};
