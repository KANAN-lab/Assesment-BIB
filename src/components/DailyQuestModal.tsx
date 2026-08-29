import React, { useState, useEffect } from 'react';
import {
  X,
  CheckCircle2,
  AlertCircle,
  Zap,
  Award,
  Sparkles,
  Loader2,
  ShieldAlert,
  Timer,
  Lock,
  Play,
} from 'lucide-react';
import { QuizQuestion } from '../types/assessment';
import { generateDailyQuiz } from '../lib/geminiService';

interface DailyQuestModalProps {
  quizzes?: QuizQuestion[];
  workerDivision?: string;
  workerRole?: string;
  workerId?: string;
  workerName?: string;
  workerTier?: string;
  onClose: () => void;
  onCompleteQuiz: (pointsEarned: number) => void;
}

export const DailyQuestModal: React.FC<DailyQuestModalProps> = ({
  quizzes: initialQuizzes,
  workerDivision = 'Gudang Logistik',
  workerRole = 'Operator',
  workerId,
  workerName,
  workerTier,
  onClose,
  onCompleteQuiz,
}) => {
  const [activeQuizzes, setActiveQuizzes] = useState<QuizQuestion[]>(initialQuizzes || []);
  const [loadingAI, setLoadingAI] = useState<boolean>(!initialQuizzes || initialQuizzes.length === 0);
  const [isAiGenerated, setIsAiGenerated] = useState<boolean>(false);

  // Anti-Cheat & Quiz Flow States
  const [isStarted, setIsStarted] = useState<boolean>(false);
  const [isAntiCheatViolated, setIsAntiCheatViolated] = useState<boolean>(false);
  const [timeLeft, setTimeLeft] = useState<number>(15);

  const [currentQuizIndex, setCurrentQuizIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isAnswerSubmitted, setIsAnswerSubmitted] = useState(false);
  const [totalPointsEarned, setTotalPointsEarned] = useState(0);
  const [isFinished, setIsFinished] = useState(false);

  useEffect(() => {
    if (initialQuizzes && initialQuizzes.length > 0) {
      setActiveQuizzes(initialQuizzes);
      setLoadingAI(false);
      return;
    }

    const loadAiQuiz = async () => {
      setLoadingAI(true);
      try {
        const generated = await generateDailyQuiz(
          workerDivision,
          workerRole,
          workerId,
          workerName,
          workerTier
        );
        setActiveQuizzes(generated);
        setIsAiGenerated(generated.length > 0);
      } catch (err) {
        console.warn('Gagal memuat kuis AI:', err);
      } finally {
        setLoadingAI(false);
      }
    };

    loadAiQuiz();
  }, [initialQuizzes, workerDivision, workerRole, workerId, workerName, workerTier]);

  // ─── 1. Anti-Cheat Detection: VisibilityChange, Blur & BeforeUnload ────────
  useEffect(() => {
    if (
      !isStarted ||
      isFinished ||
      isAntiCheatViolated ||
      loadingAI ||
      activeQuizzes.length === 0
    ) {
      return;
    }

    const handleVisibilityChange = () => {
      if (document.hidden) {
        console.warn('🚨 [Anti-Cheat] Terdeteksi document.hidden (berpindah tab/halaman). Kuis di-void!');
        setIsAntiCheatViolated(true);
      }
    };

    const handleBlur = () => {
      console.warn('🚨 [Anti-Cheat] Terdeteksi window blur (kehilangan fokus browser). Kuis di-void!');
      setIsAntiCheatViolated(true);
    };

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleBlur);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isStarted, isFinished, isAntiCheatViolated, loadingAI, activeQuizzes.length]);

  // ─── 2. Countdown Timer Engine (15s Per Question) ──────────────────────────
  useEffect(() => {
    if (
      !isStarted ||
      isFinished ||
      isAntiCheatViolated ||
      loadingAI ||
      isAnswerSubmitted ||
      activeQuizzes.length === 0
    ) {
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setIsAnswerSubmitted(true);
          setTimeout(() => {
            handleNextQuestionAuto();
          }, 1200);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [
    isStarted,
    isFinished,
    isAntiCheatViolated,
    loadingAI,
    isAnswerSubmitted,
    currentQuizIndex,
    activeQuizzes.length,
  ]);

  useEffect(() => {
    if (isStarted && !isFinished) {
      setTimeLeft(15);
    }
  }, [currentQuizIndex, isStarted]);

  const activeQuiz = activeQuizzes[currentQuizIndex];

  const handleSelectOption = (index: number) => {
    if (isAnswerSubmitted) return;
    setSelectedOption(index);
  };

  const handleSubmitAnswer = () => {
    if (selectedOption === null || !activeQuiz) return;
    setIsAnswerSubmitted(true);

    if (selectedOption === activeQuiz.correctAnswerIndex) {
      setTotalPointsEarned((prev) => prev + activeQuiz.pointsReward);
    }
  };

  const handleNextQuestionAuto = () => {
    setCurrentQuizIndex((prev) => {
      if (prev < activeQuizzes.length - 1) {
        setSelectedOption(null);
        setIsAnswerSubmitted(false);
        return prev + 1;
      } else {
        setIsFinished(true);
        return prev;
      }
    });
  };

  const handleClaimPoints = () => {
    onCompleteQuiz(totalPointsEarned);
    onClose();
  };

  const handleFinishViolatedQuiz = () => {
    onCompleteQuiz(0);
    onClose();
  };

  const timerPercentage = Math.max(0, Math.min(100, (timeLeft / 15) * 100));
  let timerBarColor = 'bg-emerald-500';
  if (timeLeft < 5) {
    timerBarColor = 'bg-rose-500 animate-pulse';
  } else if (timeLeft < 8) {
    timerBarColor = 'bg-amber-500';
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/85 backdrop-blur-sm animate-fade-in">
      <div className="card-elevated w-full max-w-lg p-6 relative min-h-[400px] flex flex-col justify-between overflow-hidden">
        <button
          onClick={isStarted && !isFinished && !isAntiCheatViolated ? handleFinishViolatedQuiz : onClose}
          className="absolute top-4 right-4 text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-zinc-800 transition z-10"
        >
          <X className="w-5 h-5" />
        </button>

        {loadingAI ? (
          <div className="flex flex-col items-center justify-center my-auto py-12 text-center">
            <div className="w-14 h-14 rounded-full bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center mb-4">
              <Sparkles className="w-7 h-7 text-indigo-400 animate-pulse" />
            </div>
            <h3 className="text-sm font-bold text-white mb-1 flex items-center gap-2">
              <Loader2 className="w-4 h-4 text-indigo-400 animate-spin" />
              Menyiapkan Soal Kuis Keselamatan...
            </h3>
            <p className="text-xs text-zinc-400 max-w-xs">
              Gappy AI sedang menyusun soal K3 & SOP logistik khusus divisi {workerDivision}.
            </p>
          </div>
        ) : activeQuizzes.length === 0 ? (
          <div className="flex flex-col items-center justify-center my-auto py-8 text-center">
            <div className="w-14 h-14 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mb-4">
              <AlertCircle className="w-7 h-7 text-amber-400" />
            </div>
            <h3 className="text-sm font-bold text-white mb-1">
              Kuis Safety Harian Belum Tersedia
            </h3>
            <p className="text-xs text-zinc-400 max-w-sm mb-6 leading-relaxed">
              Sistem Gappy AI sedang tidak dapat dijangkau atau belum memuat soal kuis harian untuk Anda saat ini.
            </p>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold text-xs rounded-xl transition border border-zinc-700"
            >
              Tutup
            </button>
          </div>
        ) : isAntiCheatViolated ? (
          <div className="flex flex-col items-center justify-center my-auto py-6 text-center animate-fade-in">
            <div className="w-16 h-16 rounded-full bg-rose-500/10 border border-rose-500/30 flex items-center justify-center mb-4">
              <ShieldAlert className="w-8 h-8 text-rose-500 animate-pulse" />
            </div>
            <span className="inline-block bg-rose-500/15 border border-rose-500/30 text-rose-400 text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full mb-2">
              Anti-Cheat Security Violation
            </span>
            <h3 className="text-base font-extrabold text-white mb-2">
              Kuis Gugur (Void): Terdeteksi Perpindahan Tab / Fokus
            </h3>
            <p className="text-xs text-zinc-400 max-w-sm mb-6 leading-relaxed">
              Sistem mendeteksi Anda berpindah tab atau meninggalkan halaman. Sesuai integritas, kuis dinyatakan gugur (0 Poin).
            </p>
            <button
              onClick={handleFinishViolatedQuiz}
              className="w-full py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl transition shadow-lg shadow-rose-950/40"
            >
              Saya Mengerti & Selesaikan Sesi
            </button>
          </div>
        ) : !isStarted ? (
          <div className="flex flex-col justify-between my-auto py-2">
            <div className="text-center mb-5">
              <div className="w-12 h-12 bg-indigo-500/10 rounded-full border border-indigo-500/30 flex items-center justify-center mx-auto mb-3">
                <Lock className="w-6 h-6 text-indigo-400" />
              </div>
              <h3 className="text-base font-black text-white mb-1">
                Aturan Integritas Kuis & Proteksi Anti-Cheat
              </h3>
              <p className="text-xs text-zinc-400">
                Kuis K3 harian khusus untuk **{workerName || 'Pekerja'}** ({workerRole}).
              </p>
            </div>
            <div className="space-y-2.5 mb-6">
              <div className="p-3 bg-zinc-900/80 border border-zinc-800 rounded-xl flex items-start gap-3">
                <Timer className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-white">Timer 15 Detik Per Soal</h4>
                  <p className="text-[11px] text-zinc-400">Waktu terbatas untuk menguji respon cepat Anda.</p>
                </div>
              </div>
              <div className="p-3 bg-zinc-900/80 border border-zinc-800 rounded-xl flex items-start gap-3">
                <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-white">Dilarang Berpindah Tab</h4>
                  <p className="text-[11px] text-zinc-400">Kuis otomatis gugur (0 Poin) jika Anda meninggalkan halaman.</p>
                </div>
              </div>
            </div>
            <button
              onClick={() => setIsStarted(true)}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl transition flex items-center justify-center gap-2"
            >
              <Play className="w-4 h-4 fill-white" />
              Saya Mengerti, Mulai Kuis Sekarang
            </button>
          </div>
        ) : !isFinished && activeQuiz ? (
          <div>
            <div className="flex items-center justify-between text-xs font-semibold mb-2">
              <div className="flex items-center gap-2 text-emerald-400">
                <Zap className="w-4 h-4 text-amber-400 fill-amber-400" />
                <span>Gappy Safety Quest</span>
              </div>
              {isAiGenerated && (
                <span className="flex items-center gap-1 bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 text-[10px] font-bold px-2 py-0.5 rounded-full">
                  <Sparkles className="w-3 h-3 text-indigo-400" />
                  Gappy AI
                </span>
              )}
            </div>
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="text-zinc-400 font-medium">
                Soal {currentQuizIndex + 1} dari {activeQuizzes.length}
              </span>
              <div
                className={`flex items-center gap-1.5 font-mono font-bold text-xs px-2.5 py-1 rounded-md border ${
                  timeLeft < 5 ? 'bg-rose-500/15 border-rose-500/40 text-rose-400 animate-pulse' : 'bg-zinc-900 border-zinc-800 text-zinc-300'
                }`}
              >
                <Timer className="w-3.5 h-3.5" />
                <span>{timeLeft}s</span>
              </div>
            </div>
            <div className="w-full bg-zinc-900 rounded-full h-1.5 mb-4 overflow-hidden border border-zinc-800/60">
              <div
                className={`h-full transition-all duration-1000 ease-linear ${timerBarColor}`}
                style={{ width: `${timerPercentage}%` }}
              />
            </div>
            <h3 className="text-base font-bold text-white mb-3">{activeQuiz.question}</h3>
            <div className="space-y-2 mb-5">
              {activeQuiz.options.map((option, idx) => {
                let btnStyle = 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:border-zinc-700 hover:bg-zinc-800';
                if (selectedOption === idx) btnStyle = 'bg-emerald-600/20 border-emerald-500 text-emerald-200';
                if (isAnswerSubmitted) {
                  if (idx === activeQuiz.correctAnswerIndex) btnStyle = 'bg-emerald-600/30 border-emerald-500 text-emerald-200 font-bold';
                  else if (selectedOption === idx) btnStyle = 'bg-rose-600/30 border-rose-500 text-rose-200';
                }
                return (
                  <button key={idx} onClick={() => handleSelectOption(idx)} disabled={isAnswerSubmitted} className={`w-full text-left p-3 rounded-xl border text-xs ${btnStyle}`}>
                    {option}
                  </button>
                );
              })}
            </div>
            {isAnswerSubmitted && (
              <div className="p-3 bg-zinc-900 border border-zinc-800 rounded-xl mb-4 text-xs">
                <div className="font-bold text-white mb-1">
                  {selectedOption === activeQuiz.correctAnswerIndex ? <span className="text-emerald-400">✓ Benar! (+{activeQuiz.pointsReward})</span> : selectedOption === null ? <span className="text-amber-400">⏱️ Waktu Habis</span> : <span className="text-rose-400">✕ Kurang Tepat</span>}
                </div>
                <p className="text-[11px] text-zinc-400">{activeQuiz.explanation}</p>
              </div>
            )}
            <div className="flex justify-end pt-2">
              {!isAnswerSubmitted ? (
                <button onClick={handleSubmitAnswer} disabled={selectedOption === null} className="px-5 py-2 bg-emerald-600 disabled:opacity-50 text-white font-bold text-xs rounded-xl">Jawab</button>
              ) : (
                <button onClick={handleNextQuestionAuto} className="px-5 py-2 bg-emerald-600 text-white font-bold text-xs rounded-xl">Berikutnya</button>
              )}
            </div>
          </div>
        ) : (
          <div className="text-center py-4 my-auto">
            <div className="w-14 h-14 bg-emerald-500/10 rounded-full border border-emerald-500/30 flex items-center justify-center mx-auto mb-3">
              <Award className="w-7 h-7 text-emerald-400" />
            </div>
            <h3 className="text-lg font-black text-white mb-1">Kuis Selesai!</h3>
            <div className="bg-zinc-900 border border-emerald-500/30 p-4 rounded-xl mb-6">
              <div className="text-2xl font-black text-emerald-400">+{totalPointsEarned} PTS</div>
            </div>
            <button onClick={handleClaimPoints} className="w-full py-2.5 bg-emerald-600 text-white font-bold text-xs rounded-xl">Klaim & Tutup</button>
          </div>
        )}
      </div>
    </div>
  );
};
