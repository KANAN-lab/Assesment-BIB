// src/components/SopSlideshowModal.tsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  ChevronLeft,
  ChevronRight,
  Volume2,
  VolumeX,
  ShieldAlert,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  HelpCircle,
  Sparkles,
  Bot,
  Layers,
  Award,
  BookOpen,
  Info,
  Clock,
  RotateCcw,
  Check,
} from 'lucide-react';
import { SopModule, SopSlide } from '../types/sop';

interface SopSlideshowModalProps {
  module: SopModule;
  isAlreadyCompleted?: boolean;
  workerId: string;
  onClose: () => void;
  onComplete: (sopId: string, timeSpentSeconds: number, quizScore: number) => Promise<void> | void;
}

export const SopSlideshowModal: React.FC<SopSlideshowModalProps> = ({
  module,
  isAlreadyCompleted = false,
  workerId: _workerId,
  onClose,
  onComplete,
}) => {
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [speedrunTimer, setSpeedrunTimer] = useState(3);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [ttsSupported, setTtsSupported] = useState(false);
  const [selectedQuizOption, setSelectedQuizOption] = useState<number | null>(null);
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [quizError, setQuizError] = useState(false);
  const [activeHotspotId, setActiveHotspotId] = useState<string | null>(null);
  const [expandedFaqIndex, setExpandedFaqIndex] = useState<number | null>(null);
  const [showAiExplainer, setShowAiExplainer] = useState(false);
  const [aiQuestion, setAiQuestion] = useState('');
  const [aiAnswer, setAiAnswer] = useState<string | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);

  const startTimeRef = useRef<number>(Date.now());
  const synthRef = useRef<SpeechSynthesis | null>(null);

  const totalSlides = module.slides.length;
  const currentSlide: SopSlide = module.slides[currentSlideIndex] || module.slides[0];
  const isLastSlide = currentSlideIndex === totalSlides - 1;

  // Initialize Speech Synthesis
  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      synthRef.current = window.speechSynthesis;
      setTtsSupported(true);
    }
    return () => {
      if (synthRef.current) {
        synthRef.current.cancel();
      }
    };
  }, []);

  // Anti-speedrun timer reset on slide change
  useEffect(() => {
    setSpeedrunTimer(isAlreadyCompleted ? 0 : 3);
    const interval = setInterval(() => {
      setSpeedrunTimer((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    // Stop speaking when changing slide
    if (synthRef.current) {
      synthRef.current.cancel();
      setIsSpeaking(false);
    }

    // Reset slide-specific interactive states
    setActiveHotspotId(null);
    setExpandedFaqIndex(null);
    setShowAiExplainer(false);
    setAiAnswer(null);

    return () => clearInterval(interval);
  }, [currentSlideIndex, isAlreadyCompleted]);

  // Handle Text-to-Speech
  const toggleSpeech = useCallback(() => {
    if (!synthRef.current || !ttsSupported) return;

    if (isSpeaking) {
      synthRef.current.cancel();
      setIsSpeaking(false);
      return;
    }

    const textToRead =
      currentSlide.audioNarrationText ||
      `${currentSlide.title}. ${currentSlide.subtitle || ''}. ${currentSlide.content || ''}`;

    const utterance = new SpeechSynthesisUtterance(textToRead);
    utterance.lang = 'id-ID';
    utterance.rate = 1.0;
    utterance.pitch = 1.0;

    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    synthRef.current.cancel();
    synthRef.current.speak(utterance);
    setIsSpeaking(true);
  }, [currentSlide, isSpeaking, ttsSupported]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'Space') {
        if (speedrunTimer === 0 && !isLastSlide) {
          setCurrentSlideIndex((prev) => Math.min(totalSlides - 1, prev + 1));
        }
      } else if (e.key === 'ArrowLeft') {
        setCurrentSlideIndex((prev) => Math.max(0, prev - 1));
      } else if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [speedrunTimer, isLastSlide, totalSlides, onClose]);

  // Handle Next / Previous
  const handleNext = () => {
    if (speedrunTimer > 0) return;
    if (currentSlideIndex < totalSlides - 1) {
      setCurrentSlideIndex((prev) => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentSlideIndex > 0) {
      setCurrentSlideIndex((prev) => prev - 1);
    }
  };

  // Handle Quiz selection
  const handleSelectOption = (idx: number) => {
    if (quizSubmitted && !quizError) return;
    setSelectedQuizOption(idx);
    setQuizError(false);
  };

  const handleVerifyQuiz = () => {
    if (selectedQuizOption === null || !currentSlide.quiz) return;
    const isCorrect = selectedQuizOption === currentSlide.quiz.correctAnswerIndex;

    setQuizSubmitted(true);
    if (isCorrect) {
      setQuizError(false);
      import('canvas-confetti').then(({ default: confetti }) => {
        confetti({ particleCount: 60, spread: 60, origin: { y: 0.7 } });
      }).catch(() => {});
    } else {
      setQuizError(true);
    }
  };

  // Handle Completion
  const handleFinalCompletion = async () => {
    if (isCompleting) return;
    setIsCompleting(true);
    const timeSpent = Math.max(30, Math.round((Date.now() - startTimeRef.current) / 1000));
    try {
      await onComplete(module.id, timeSpent, 100);
      onClose();
    } catch (err) {
      console.error('Error completing SOP:', err);
    } finally {
      setIsCompleting(false);
    }
  };

  // Ask Gappy AI helper
  const handleAskGappy = () => {
    if (!aiQuestion.trim()) return;
    setIsAiLoading(true);
    setTimeout(() => {
      setAiAnswer(
        `Berdasarkan kaidah ${module.code} (${currentSlide.title}): Hal ini wajib mengutamakan batas aman operasional. Pastikan koordinasi visual dengan pengawas dan patuhi marka keselamatan lantai gudang.`
      );
      setIsAiLoading(false);
    }, 700);
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] overflow-y-auto bg-black/90 backdrop-blur-xl p-3 sm:p-6 flex items-center justify-center min-h-screen animate-fade-in">
      <div className="card-elevated w-full max-w-3xl min-h-[580px] max-h-[92vh] flex flex-col justify-between p-4 sm:p-6 relative border border-zinc-700/80 shadow-2xl overflow-y-auto custom-scrollbar">
        
        {/* ─── 1. TOP HEADER: Story-Bar & Module Info ─── */}
        <div>
          {/* Segmented Story Progress Bar */}
          <div className="flex items-center gap-1.5 mb-3">
            {module.slides.map((slide, idx) => (
              <div
                key={slide.id || idx}
                onClick={() => isAlreadyCompleted && setCurrentSlideIndex(idx)}
                className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                  idx < currentSlideIndex
                    ? 'bg-emerald-500'
                    : idx === currentSlideIndex
                    ? 'bg-purple-500 shadow-sm shadow-purple-500/50'
                    : 'bg-zinc-800'
                } ${isAlreadyCompleted ? 'cursor-pointer hover:opacity-80' : ''}`}
                title={`Slide ${idx + 1}: ${slide.title}`}
              />
            ))}
          </div>

          {/* Header Action Row */}
          <div className="flex items-center justify-between pb-3 border-b border-zinc-800 text-xs">
            <div className="flex items-center gap-2">
              <span className="font-mono text-[10px] font-bold bg-purple-950/80 text-purple-300 px-2 py-0.5 rounded border border-purple-800/60">
                {module.code}
              </span>
              <span className="text-zinc-400 font-semibold truncate max-w-[200px] sm:max-w-sm">
                {module.title}
              </span>
              {isAlreadyCompleted && (
                <span className="hidden sm:inline-flex items-center gap-1 text-[10px] bg-emerald-950/80 text-emerald-300 px-2 py-0.5 rounded border border-emerald-800/60 font-bold">
                  <Check className="w-3 h-3" /> Sudah Selesai
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {/* TTS Voiceover Button */}
              {ttsSupported && (
                <button
                  onClick={toggleSpeech}
                  className={`p-1.5 rounded-lg border text-xs transition flex items-center gap-1 ${
                    isSpeaking
                      ? 'bg-purple-600/30 text-purple-300 border-purple-500 animate-pulse'
                      : 'bg-zinc-800/80 text-zinc-400 border-zinc-700 hover:text-white'
                  }`}
                  title={isSpeaking ? 'Matikan Suara Narasi' : 'Dengarkan Narasi Suara (TTS)'}
                >
                  {isSpeaking ? <Volume2 className="w-4 h-4 text-purple-400" /> : <VolumeX className="w-4 h-4" />}
                  <span className="hidden sm:inline text-[11px] font-semibold">{isSpeaking ? 'Bersuara...' : 'Suara'}</span>
                </button>
              )}

              {/* Close Button */}
              <button
                onClick={onClose}
                className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* ─── 2. MAIN SLIDE CONTENT BODY ─── */}
        <div className="my-auto py-4 animate-fade-in space-y-4">
          
          {/* Slide Category & Number Badge */}
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-wider font-bold text-zinc-400 bg-zinc-900 px-2.5 py-1 rounded-md border border-zinc-800">
              Slide {currentSlideIndex + 1} dari {totalSlides} • {currentSlide.slideType.replace('_', ' ').toUpperCase()}
            </span>
            <div className="flex items-center gap-1 text-[11px] text-amber-400 font-bold">
              <Award className="w-3.5 h-3.5" />
              <span>+{module.pointsReward} PTS</span>
            </div>
          </div>

          {/* Slide Title & Subtitle */}
          <div>
            <h3 className="text-base sm:text-lg font-black text-white leading-snug">
              {currentSlide.title}
            </h3>
            {currentSlide.subtitle && (
              <p className="text-xs text-zinc-400 mt-0.5 leading-relaxed">
                {currentSlide.subtitle}
              </p>
            )}
          </div>

          {/* ─── FORMAT 1: step_instruction ─── */}
          {currentSlide.slideType === 'step_instruction' && currentSlide.steps && (
            <div className="space-y-2.5">
              {currentSlide.steps.map((st) => (
                <div
                  key={st.stepNumber}
                  className="bg-zinc-900/90 border border-zinc-800 rounded-xl p-3.5 flex items-start gap-3 hover:border-zinc-700 transition"
                >
                  <div className="w-6 h-6 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-mono font-black text-xs flex items-center justify-center shrink-0 mt-0.5">
                    {st.stepNumber}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-xs font-bold text-white mb-0.5">{st.title}</h4>
                    <p className="text-[11px] text-zinc-400 leading-relaxed">{st.description}</p>
                    {st.keyHighlight && (
                      <div className="mt-1.5 inline-block text-[10px] font-semibold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/40">
                        💡 {st.keyHighlight}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ─── FORMAT 2: dos_and_donts ─── */}
          {currentSlide.slideType === 'dos_and_donts' && currentSlide.dosAndDonts && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {currentSlide.dosAndDonts.map((dd, idx) => (
                <React.Fragment key={idx}>
                  {/* DO Column */}
                  <div className="bg-emerald-950/20 border border-emerald-500/30 rounded-xl p-3.5 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-1.5 text-emerald-400 font-black text-xs uppercase tracking-wider mb-2">
                        <CheckCircle2 className="w-4 h-4 shrink-0" />
                        <span>DO — Praktik Benar</span>
                      </div>
                      <h4 className="text-xs font-bold text-white mb-1">{dd.doTitle}</h4>
                      <p className="text-[11px] text-zinc-300 leading-relaxed">{dd.doText}</p>
                    </div>
                    {dd.doTip && (
                      <div className="mt-2 text-[10px] text-emerald-300/80 bg-emerald-900/30 px-2 py-1 rounded">
                        ✓ Tip: {dd.doTip}
                      </div>
                    )}
                  </div>

                  {/* DONT Column */}
                  <div className="bg-rose-950/20 border border-rose-500/30 rounded-xl p-3.5 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-1.5 text-rose-400 font-black text-xs uppercase tracking-wider mb-2">
                        <XCircle className="w-4 h-4 shrink-0" />
                        <span>DON'T — Dilarang</span>
                      </div>
                      <h4 className="text-xs font-bold text-white mb-1">{dd.dontTitle}</h4>
                      <p className="text-[11px] text-zinc-300 leading-relaxed">{dd.dontText}</p>
                    </div>
                    {dd.dontWarning && (
                      <div className="mt-2 text-[10px] text-rose-300/80 bg-rose-900/30 px-2 py-1 rounded">
                        ⚠️ Bahaya: {dd.dontWarning}
                      </div>
                    )}
                  </div>
                </React.Fragment>
              ))}
            </div>
          )}

          {/* ─── FORMAT 3: safety_alert ─── */}
          {currentSlide.slideType === 'safety_alert' && (
            <div className="bg-amber-950/20 border border-amber-500/40 rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-2 text-amber-400 font-black text-xs uppercase tracking-wider">
                <ShieldAlert className="w-5 h-5 shrink-0 text-amber-400 animate-pulse" />
                <span>GOLDEN SAFETY RULE — WAJIB DIPATUHI</span>
              </div>
              <p className="text-xs text-zinc-200 leading-relaxed">{currentSlide.content}</p>
              {currentSlide.steps && (
                <div className="space-y-2 pt-2 border-t border-amber-500/20">
                  {currentSlide.steps.map((st) => (
                    <div key={st.stepNumber} className="flex items-start gap-2 text-xs">
                      <span className="font-bold text-amber-400 shrink-0">#{st.stepNumber}</span>
                      <div>
                        <strong className="text-white">{st.title}: </strong>
                        <span className="text-zinc-300">{st.description}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ─── FORMAT 4: interactive_hotspot ─── */}
          {currentSlide.slideType === 'interactive_hotspot' && currentSlide.hotspots && (
            <div className="space-y-3">
              <p className="text-xs text-zinc-400">{currentSlide.content}</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {currentSlide.hotspots.map((hs) => (
                  <div
                    key={hs.id}
                    onClick={() => setActiveHotspotId(activeHotspotId === hs.id ? null : hs.id)}
                    className={`cursor-pointer rounded-xl p-3 border transition ${
                      activeHotspotId === hs.id
                        ? 'bg-purple-950/40 border-purple-500 shadow-md shadow-purple-900/30'
                        : 'bg-zinc-900 border-zinc-800 hover:border-zinc-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-zinc-800 text-zinc-300">
                        {hs.label}
                      </span>
                      <span className={`w-2 h-2 rounded-full ${hs.status === 'critical' ? 'bg-rose-500' : hs.status === 'check' ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                    </div>
                    <p className="text-[11px] text-zinc-400">{hs.description}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ─── FORMAT 5: decision_tree ─── */}
          {currentSlide.slideType === 'decision_tree' && currentSlide.decisionNodes && (
            <div className="space-y-2.5">
              {currentSlide.decisionNodes.map((dn, idx) => (
                <div key={idx} className="bg-zinc-900 border border-zinc-800 rounded-xl p-3.5 space-y-1.5">
                  <div className="flex items-center gap-1.5 text-xs text-amber-300 font-bold">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                    <span>Kondisi: "{dn.condition}"</span>
                  </div>
                  <div className="pl-5 text-[11px] text-zinc-300 leading-relaxed">
                    <strong className="text-white">Tindakan Wajib: </strong> {dn.actionRequired}
                  </div>
                  {dn.isEscalateToSupervisor && (
                    <div className="pl-5 text-[10px] font-bold text-rose-400">
                      🚨 Wajib eskalasi & lapor ke Supervisor Lapangan.
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* ─── FORMAT 9: quiz_checkpoint ─── */}
          {currentSlide.slideType === 'quiz_checkpoint' && currentSlide.quiz && (
            <div className="space-y-3 bg-zinc-900/90 border border-zinc-800 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-purple-400 bg-purple-950/60 px-2 py-0.5 rounded border border-purple-800/40 flex items-center gap-1">
                  <HelpCircle className="w-3 h-3" /> Checkpoint Pemahaman
                </span>
                <span className="text-[10px] text-zinc-500">Pilih 1 jawaban benar</span>
              </div>

              <h4 className="text-xs sm:text-sm font-bold text-white leading-snug">
                {currentSlide.quiz.question}
              </h4>

              <div className="space-y-2 pt-1">
                {currentSlide.quiz.options.map((opt, idx) => {
                  const isSelected = selectedQuizOption === idx;
                  const isCorrect = idx === currentSlide.quiz?.correctAnswerIndex;
                  let btnStyle = 'bg-zinc-900 border-zinc-700 text-zinc-300 hover:border-zinc-500';

                  if (quizSubmitted) {
                    if (isCorrect) {
                      btnStyle = 'bg-emerald-950/60 border-emerald-500 text-emerald-200 font-bold';
                    } else if (isSelected && !isCorrect) {
                      btnStyle = 'bg-rose-950/60 border-rose-500 text-rose-200 line-through';
                    }
                  } else if (isSelected) {
                    btnStyle = 'bg-purple-950/50 border-purple-500 text-purple-200 font-bold';
                  }

                  return (
                    <button
                      key={idx}
                      onClick={() => handleSelectOption(idx)}
                      disabled={quizSubmitted && !quizError}
                      className={`w-full text-left p-3 rounded-xl border text-xs transition flex items-start gap-2.5 ${btnStyle}`}
                    >
                      <span className="w-5 h-5 rounded-full bg-zinc-800 font-mono font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                        {String.fromCharCode(65 + idx)}
                      </span>
                      <span className="flex-1 leading-relaxed">{opt}</span>
                    </button>
                  );
                })}
              </div>

              {/* Quiz Action & Feedback */}
              {!quizSubmitted ? (
                <button
                  onClick={handleVerifyQuiz}
                  disabled={selectedQuizOption === null}
                  className="w-full mt-2 py-2.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white font-bold rounded-xl text-xs transition shadow-lg shadow-purple-900/30"
                >
                  Verifikasi Jawaban
                </button>
              ) : quizError ? (
                <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl space-y-2 text-xs">
                  <div className="flex items-center gap-1.5 text-rose-300 font-bold">
                    <XCircle className="w-4 h-4 shrink-0" />
                    <span>Jawaban belum tepat. Silakan telaah kembali materi slide.</span>
                  </div>
                  <button
                    onClick={() => {
                      setQuizSubmitted(false);
                      setSelectedQuizOption(null);
                    }}
                    className="px-3 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg text-xs font-semibold flex items-center gap-1"
                  >
                    <RotateCcw className="w-3 h-3" /> Coba Jawab Lagi
                  </button>
                </div>
              ) : (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl space-y-1.5 text-xs animate-fade-in">
                  <div className="flex items-center gap-1.5 text-emerald-300 font-bold">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>Jawaban Benar! Anda memahami SOP ini dengan baik.</span>
                  </div>
                  <p className="text-[11px] text-zinc-300 leading-relaxed">
                    {currentSlide.quiz.explanation}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* ─── FORMAT DEFAULT / TEXT FALLBACK ─── */}
          {!['step_instruction', 'dos_and_donts', 'safety_alert', 'interactive_hotspot', 'decision_tree', 'quiz_checkpoint'].includes(currentSlide.slideType) && (
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 text-xs text-zinc-300 leading-relaxed">
              {currentSlide.content}
            </div>
          )}
        </div>

        {/* ─── 3. BOTTOM FOOTER & NAVIGATION ─── */}
        <div className="pt-3 border-t border-zinc-800 space-y-2">
          
          {/* AI Helper Trigger Bar */}
          <div className="flex items-center justify-between text-xs">
            <button
              onClick={() => setShowAiExplainer(!showAiExplainer)}
              className="text-[11px] text-purple-400 hover:text-purple-300 flex items-center gap-1 font-semibold transition"
            >
              <Bot className="w-3.5 h-3.5" />
              <span>{showAiExplainer ? 'Tutup Tanya Gappy' : 'Tanya Gappy tentang SOP ini'}</span>
            </button>
            <span className="text-[10px] text-zinc-500">
              Navigasi: Tombol panah keyboard <kbd className="px-1 py-0.5 bg-zinc-800 rounded text-[9px]">←</kbd> <kbd className="px-1 py-0.5 bg-zinc-800 rounded text-[9px]">→</kbd>
            </span>
          </div>

          {/* AI Explainer Box */}
          {showAiExplainer && (
            <div className="p-3 bg-purple-950/30 border border-purple-500/30 rounded-xl space-y-2 animate-fade-in text-xs">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={aiQuestion}
                  onChange={(e) => setAiQuestion(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAskGappy()}
                  placeholder="Ketik pertanyaan terkait SOP ini..."
                  className="flex-1 bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-purple-500"
                />
                <button
                  onClick={handleAskGappy}
                  disabled={isAiLoading || !aiQuestion.trim()}
                  className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-bold transition flex items-center gap-1 shrink-0"
                >
                  <Sparkles className="w-3 h-3" />
                  <span>Tanya</span>
                </button>
              </div>
              {isAiLoading && (
                <div className="text-[11px] text-purple-300 flex items-center gap-1.5">
                  <span className="animate-spin">⏳</span> Gappy AI sedang menganalisis dokumen SOP...
                </div>
              )}
              {aiAnswer && (
                <div className="p-2 bg-zinc-900/80 rounded border border-purple-800/40 text-[11px] text-zinc-200">
                  <strong>Gappy: </strong> {aiAnswer}
                </div>
              )}
            </div>
          )}

          {/* Prev / Next & Complete Buttons */}
          <div className="flex items-center justify-between gap-3 pt-1">
            {/* Prev Button */}
            <button
              onClick={handlePrev}
              disabled={currentSlideIndex === 0}
              className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-30 disabled:pointer-events-none text-zinc-300 font-semibold rounded-xl text-xs transition flex items-center gap-1.5"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Sebelumnya</span>
            </button>

            {/* Next / Complete Button */}
            {isLastSlide ? (
              <button
                onClick={handleFinalCompletion}
                disabled={
                  (currentSlide.slideType === 'quiz_checkpoint' && (!quizSubmitted || quizError)) || isCompleting
                }
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:pointer-events-none text-white font-bold rounded-xl text-xs transition shadow-lg shadow-emerald-900/40 flex items-center gap-1.5"
              >
                <Award className="w-4 h-4" />
                <span>{isCompleting ? 'Menyimpan...' : 'Selesaikan & Klaim +50 PTS'}</span>
              </button>
            ) : (
              <button
                onClick={handleNext}
                disabled={speedrunTimer > 0}
                className={`px-5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                  speedrunTimer > 0
                    ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                    : 'bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-900/40'
                }`}
              >
                {speedrunTimer > 0 ? (
                  <>
                    <Clock className="w-3.5 h-3.5 animate-spin" />
                    <span>Membaca ({speedrunTimer}s)</span>
                  </>
                ) : (
                  <>
                    <span>Selanjutnya</span>
                    <ChevronRight className="w-4 h-4" />
                  </>
                )}
              </button>
            )}
          </div>
        </div>

      </div>
    </div>,
    document.body
  );
};
