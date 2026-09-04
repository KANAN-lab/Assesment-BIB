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
  FileText,
} from 'lucide-react';
import { SopModule, SopSlide } from '../types/sop';
import { formatGoogleDriveImageUrl } from '../lib/googleDriveService';

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

  // Interactive Simulator States
  const [simSuccess, setSimSuccess] = useState(false);
  const [simHint, setSimHint] = useState<string | null>(null);
  const [simShake, setSimShake] = useState(false);

  // Spot-the-Mistake States
  const [spotFound, setSpotFound] = useState(false);
  const [spotTimer, setSpotTimer] = useState(25);
  const [spotRevealed, setSpotRevealed] = useState(false);

  // Audio Voiceover (TTS) Persistent Mode & Engine Refs
  const [voiceoverMode, setVoiceoverMode] = useState(false);
  const heartbeatIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(Date.now());
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const activeUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  const fallbackSlides: SopSlide[] = [
    {
      id: 'slide-fb-1',
      slideNumber: 1,
      slideType: 'step_instruction',
      title: module.title || 'Modul Standar Operasional',
      subtitle: module.description || 'Pelajari panduan keselamatan operasional',
      content: module.description || 'Patuhi seluruh rambu dan standar keselamatan kerja K3 selama bertugas di area gudang.',
      steps: [
        {
          stepNumber: 1,
          title: 'Patuhi Prosedur K3',
          description: 'Gunakan APD lengkap dan pastikan area kerja dalam kondisi aman sebelum memulai shift.',
          keyHighlight: 'Safety First',
        }
      ]
    }
  ];

  const effectiveSlides: SopSlide[] = (module.slides && module.slides.length > 0) ? module.slides : fallbackSlides;
  const totalSlides = effectiveSlides.length;
  const currentSlide: SopSlide = effectiveSlides[currentSlideIndex] || effectiveSlides[0] || fallbackSlides[0];
  const isLastSlide = currentSlideIndex === totalSlides - 1;

  // Stop current speech playback and clean heartbeat timer
  const stopSpeech = useCallback(() => {
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = null;
    }
    if (synthRef.current) {
      synthRef.current.cancel();
    }
    activeUtteranceRef.current = null;
    setIsSpeaking(false);
  }, []);

  // Speak speech synthesis for a given slide
  const speakSlide = useCallback((slide: SopSlide) => {
    if (!synthRef.current || !('speechSynthesis' in window)) return;

    stopSpeech();

    if (synthRef.current.paused) {
      synthRef.current.resume();
    }

    // Susun teks narasi lengkap dengan fallback komprehensif jika audioNarrationText belum diisi manual
    let textToRead = slide.audioNarrationText?.trim();
    if (!textToRead) {
      textToRead = `${slide.title}. `;
      if (slide.subtitle) {
        textToRead += `${slide.subtitle}. `;
      }
      if (slide.slideType === 'step_instruction' && slide.steps && slide.steps.length > 0) {
        textToRead += slide.steps
          .map((st) => `Langkah ${st.stepNumber}: ${st.title}. ${st.description}.${st.keyHighlight ? ` Tips penting: ${st.keyHighlight}.` : ''}`)
          .join(' ');
      } else if (slide.slideType === 'dos_and_donts' && slide.dosAndDonts && slide.dosAndDonts.length > 0) {
        textToRead += slide.dosAndDonts
          .map((dd) => `Praktik benar: ${dd.doTitle}. ${dd.doText}. Larangan keras: ${dd.dontTitle}. ${dd.dontText}.`)
          .join(' ');
      } else if (slide.slideType === 'safety_alert') {
        textToRead += `Peringatan keselamatan ${slide.alertLevel || 'kritis'}: ${slide.content || ''}. `;
        if (slide.steps && slide.steps.length > 0) {
          textToRead += slide.steps.map((st) => `${st.title}: ${st.description}.`).join(' ');
        }
      } else if (slide.slideType === 'quiz_checkpoint' && slide.quiz) {
        textToRead += `Pertanyaan evaluasi kuis: ${slide.quiz.question}.`;
      } else if (slide.slideType === 'interactive_simulator' && slide.simulatorConfig) {
        textToRead += `Instruksi simulasi: ${slide.simulatorConfig.taskInstruction}. ${slide.simulatorConfig.hintText || ''}`;
      } else if (slide.slideType === 'spot_the_mistake' && slide.spotMistakeConfig) {
        textToRead += `Tantangan Hazard Hunt: ${slide.spotMistakeConfig.challengePrompt}. Temukan letak bahaya pada foto.`;
      } else if (slide.content) {
        textToRead += slide.content;
      }
    }

    if (!textToRead.trim()) return;

    const utterance = new SpeechSynthesisUtterance(textToRead);
    utterance.lang = 'id-ID';
    utterance.rate = 1.0;
    utterance.pitch = 1.0;

    // Pilih suara bahasa Indonesia jika tersedia agar tidak beraksen asing
    const voices = synthRef.current.getVoices();
    const idVoice = voices.find(
      (v) =>
        v.lang === 'id-ID' ||
        v.lang.toLowerCase().startsWith('id') ||
        v.name.toLowerCase().includes('indonesia') ||
        v.name.toLowerCase().includes('bahasa')
    );
    if (idVoice) {
      utterance.voice = idVoice;
    }

    // Simpan di ref agar tidak di-garbage collect oleh engine V8 Chrome
    activeUtteranceRef.current = utterance;

    utterance.onend = () => {
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
        heartbeatIntervalRef.current = null;
      }
      activeUtteranceRef.current = null;
      setIsSpeaking(false);
    };

    utterance.onerror = () => {
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
        heartbeatIntervalRef.current = null;
      }
      activeUtteranceRef.current = null;
      setIsSpeaking(false);
    };

    // Jeda 60ms untuk memastikan event cancel terdahulu selesai oleh audio pipeline browser
    setTimeout(() => {
      if (synthRef.current) {
        synthRef.current.speak(utterance);
        setIsSpeaking(true);

        // Heartbeat interval untuk mengatasi bug Chromium di mana utterance panjang freeze setelah 10-15s
        if (heartbeatIntervalRef.current) clearInterval(heartbeatIntervalRef.current);
        heartbeatIntervalRef.current = setInterval(() => {
          if (!window.speechSynthesis || !window.speechSynthesis.speaking) {
            if (heartbeatIntervalRef.current) {
              clearInterval(heartbeatIntervalRef.current);
              heartbeatIntervalRef.current = null;
            }
          } else {
            window.speechSynthesis.pause();
            window.speechSynthesis.resume();
          }
        }, 10000);
      }
    }, 60);
  }, [stopSpeech]);

  // Initialize Speech Synthesis with voice listener
  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      synthRef.current = window.speechSynthesis;
      setTtsSupported(true);

      const handleVoices = () => {
        if (synthRef.current) {
          synthRef.current.getVoices();
        }
      };
      handleVoices();
      window.speechSynthesis.addEventListener('voiceschanged', handleVoices);

      return () => {
        window.speechSynthesis.removeEventListener('voiceschanged', handleVoices);
        stopSpeech();
      };
    }
  }, [stopSpeech]);

  // Anti-speedrun timer reset on slide change & auto-narration on slide change
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

    // Stop speaking when changing slide, and auto-narrate if voiceover mode is active
    stopSpeech();
    let speakTimer: ReturnType<typeof setTimeout> | null = null;
    if (voiceoverMode) {
      speakTimer = setTimeout(() => {
        speakSlide(currentSlide);
      }, 150);
    }

    // Reset slide-specific interactive states
    setActiveHotspotId(null);
    setExpandedFaqIndex(null);
    setShowAiExplainer(false);
    setAiAnswer(null);
    setSimSuccess(false);
    setSimHint(null);
    setSimShake(false);
    setSpotFound(false);
    setSpotRevealed(false);
    setSpotTimer(currentSlide.spotMistakeConfig?.timeLimitSeconds || 25);

    return () => {
      clearInterval(interval);
      if (speakTimer) clearTimeout(speakTimer);
    };
  }, [currentSlideIndex, isAlreadyCompleted, currentSlide, voiceoverMode, stopSpeech, speakSlide]);

  // Spot-the-mistake countdown timer
  useEffect(() => {
    if (currentSlide.slideType !== 'spot_the_mistake' || spotFound || spotRevealed) return;

    const timer = setInterval(() => {
      setSpotTimer((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setSpotRevealed(true); // Auto-reveal when time expires
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [currentSlide, spotFound, spotRevealed]);

  // Handle Simulator Screen Click
  const handleSimulatorScreenClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (simSuccess || !currentSlide.simulatorConfig) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = ((e.clientX - rect.left) / rect.width) * 100;
    const clickY = ((e.clientY - rect.top) / rect.height) * 100;

    const cfg = currentSlide.simulatorConfig;
    const isHit =
      clickX >= cfg.targetXPercent &&
      clickX <= cfg.targetXPercent + cfg.targetWidthPercent &&
      clickY >= cfg.targetYPercent &&
      clickY <= cfg.targetYPercent + cfg.targetHeightPercent;

    if (isHit) {
      setSimSuccess(true);
      setSimHint(null);
      import('canvas-confetti').then(({ default: confetti }) => {
        confetti({ particleCount: 50, spread: 60, origin: { y: 0.6 } });
      }).catch(() => {});

      // Auto advance after brief celebration if not last slide
      if (!isLastSlide) {
        setTimeout(() => {
          setCurrentSlideIndex((prev) => Math.min(totalSlides - 1, prev + 1));
        }, 1200);
      }
    } else {
      setSimShake(true);
      setSimHint(cfg.hintText || 'Bukan di area ini! Perhatikan petunjuk tugas di atas.');
      setTimeout(() => setSimShake(false), 600);
    }
  };

  // Handle Spot-the-Mistake Click
  const handleSpotMistakeClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (spotFound || !currentSlide.spotMistakeConfig) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = ((e.clientX - rect.left) / rect.width) * 100;
    const clickY = ((e.clientY - rect.top) / rect.height) * 100;

    const cfg = currentSlide.spotMistakeConfig;
    const distance = Math.sqrt(
      Math.pow(clickX - cfg.targetXPercent, 2) + Math.pow(clickY - cfg.targetYPercent, 2)
    );

    if (distance <= (cfg.toleranceRadiusPercent || 15)) {
      setSpotFound(true);
      setSpotRevealed(true);
      import('canvas-confetti').then(({ default: confetti }) => {
        confetti({ particleCount: 60, spread: 70, origin: { y: 0.6 } });
      }).catch(() => {});
    }
  };

  // Handle Text-to-Speech Toggle
  const toggleSpeech = useCallback(() => {
    if (!synthRef.current || !ttsSupported) return;

    if (voiceoverMode || isSpeaking) {
      setVoiceoverMode(false);
      stopSpeech();
    } else {
      setVoiceoverMode(true);
      speakSlide(currentSlide);
    }
  }, [voiceoverMode, isSpeaking, stopSpeech, speakSlide, currentSlide, ttsSupported]);

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
            {effectiveSlides.map((slide, idx) => (
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
          <div className="flex items-center justify-between pb-3 border-b border-zinc-800 text-xs gap-2">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <span className="font-mono text-[10px] font-bold bg-purple-950/80 text-purple-300 px-2 py-0.5 rounded border border-purple-800/60 shrink-0">
                {module.code}
              </span>
              <span className="text-zinc-400 font-semibold truncate">
                {module.title}
              </span>
              {isAlreadyCompleted && (
                <span className="hidden sm:inline-flex items-center gap-1 text-[10px] bg-emerald-950/80 text-emerald-300 px-2 py-0.5 rounded border border-emerald-800/60 font-bold shrink-0">
                  <Check className="w-3 h-3" /> Sudah Selesai
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {/* TTS Voiceover Button */}
              {ttsSupported && (
                <button
                  onClick={toggleSpeech}
                  className={`p-1.5 rounded-lg border text-xs transition flex items-center gap-1.5 ${
                    isSpeaking
                      ? 'bg-purple-600/30 text-purple-300 border-purple-500 animate-pulse'
                      : voiceoverMode
                      ? 'bg-purple-950/60 text-purple-300 border-purple-700 hover:bg-purple-900/50'
                      : 'bg-zinc-800/80 text-zinc-400 border-zinc-700 hover:text-white'
                  }`}
                  title={
                    voiceoverMode
                      ? 'Matikan Mode Narasi Suara Voiceover'
                      : 'Nyalakan Narasi Suara Voiceover Otomatis (TTS)'
                  }
                >
                  {isSpeaking ? (
                    <Volume2 className="w-4 h-4 text-purple-400" />
                  ) : voiceoverMode ? (
                    <Volume2 className="w-4 h-4 text-purple-400" />
                  ) : (
                    <VolumeX className="w-4 h-4" />
                  )}
                  <span className="hidden sm:inline text-[11px] font-semibold">
                    {isSpeaking ? 'Bersuara...' : voiceoverMode ? 'Narasi ON' : 'Suara'}
                  </span>
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
              Slide {currentSlideIndex + 1} dari {totalSlides} • {currentSlide?.slideType ? currentSlide.slideType.replace('_', ' ').toUpperCase() : 'PANDUAN'}
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

          {/* ─── FORMAT 4: interactive_hotspot (Canvas Overlay + Cards) ─── */}
          {currentSlide.slideType === 'interactive_hotspot' && currentSlide.hotspots && (
            <div className="space-y-3">
              {currentSlide.imageUrl && (
                <div className="w-full bg-zinc-950/80 border border-zinc-800 rounded-2xl p-2 flex items-center justify-center overflow-hidden min-h-[260px] max-h-[550px] shadow-xl">
                  <div className="relative inline-block max-w-full select-none rounded-xl overflow-hidden shadow-2xl">
                    <img
                      src={formatGoogleDriveImageUrl(currentSlide.imageUrl)}
                      alt={currentSlide.title}
                      className="max-h-[500px] w-auto max-w-full block object-contain pointer-events-none"
                      onError={(e) => {
                        const target = e.currentTarget as HTMLImageElement;
                        target.src = 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=1200&q=80';
                      }}
                    />
                    {currentSlide.hotspots.map((hs) => (
                      <button
                        key={hs.id}
                        onClick={() => setActiveHotspotId(activeHotspotId === hs.id ? null : hs.id)}
                        style={{ left: `${hs.xPercent}%`, top: `${hs.yPercent}%` }}
                        className={`absolute -translate-x-1/2 -translate-y-1/2 z-20 flex items-center justify-center p-1.5 rounded-full transition-all duration-300 shadow-lg cursor-pointer ${
                          activeHotspotId === hs.id
                            ? 'bg-purple-500 ring-4 ring-purple-400/50 scale-125'
                            : hs.status === 'critical'
                            ? 'bg-rose-500 hover:scale-110 animate-bounce'
                            : hs.status === 'check'
                            ? 'bg-amber-500 hover:scale-110 animate-pulse'
                            : 'bg-emerald-500 hover:scale-110'
                        }`}
                      >
                        <span className="w-2.5 h-2.5 rounded-full bg-white block" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

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

          {/* ─── FORMAT 6: interactive_simulator (WMS / App Guided Click) ─── */}
          {currentSlide.slideType === 'interactive_simulator' && currentSlide.simulatorConfig && (
            <div className={`space-y-3 ${simShake ? 'animate-[shake_0.4s_ease-in-out]' : ''}`}>
              <style>{`
                @keyframes shake {
                  0%, 100% { transform: translateX(0); }
                  20%, 60% { transform: translateX(-8px); }
                  40%, 80% { transform: translateX(8px); }
                }
              `}</style>
              
              {/* Task Instruction Banner */}
              <div className={`p-3 rounded-xl border flex items-center justify-between gap-3 transition-all ${
                simSuccess
                  ? 'bg-emerald-950/40 border-emerald-500 text-emerald-300'
                  : 'bg-indigo-950/30 border-indigo-500/40 text-indigo-200'
              }`}>
                <div className="flex items-center gap-2 text-xs font-bold">
                  <span className="p-1 rounded bg-indigo-500/20 text-indigo-400 shrink-0">🎮 SIMULATOR</span>
                  <span>{currentSlide.simulatorConfig.taskInstruction}</span>
                </div>
                {simSuccess ? (
                  <span className="px-2.5 py-1 rounded-full bg-emerald-500 text-black text-[10px] font-black uppercase tracking-wider animate-bounce">
                    ✓ Sukses
                  </span>
                ) : (
                  <span className="text-[10px] text-zinc-400 hidden sm:inline">
                    Klik tombol yang tepat di layar
                  </span>
                )}
              </div>

              {/* Interactive Screenshot Click Canvas */}
              <div className="w-full bg-zinc-950/90 border border-zinc-800 rounded-2xl p-2.5 flex items-center justify-center overflow-hidden min-h-[280px] max-h-[620px] shadow-2xl">
                <div
                  onClick={handleSimulatorScreenClick}
                  className="relative inline-block max-w-full cursor-crosshair select-none rounded-xl overflow-hidden shadow-2xl group transition-all"
                >
                  <img
                    src={formatGoogleDriveImageUrl(currentSlide.imageUrl) || 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=1200&q=80'}
                    alt="WMS Simulation Screen"
                    className="max-h-[560px] w-auto max-w-full block pointer-events-none object-contain"
                    onError={(e) => {
                      const target = e.currentTarget as HTMLImageElement;
                      target.src = 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=1200&q=80';
                    }}
                  />

                  {/* Target Hit Box (With Pulsing Guide) */}
                  <div
                    style={{
                      left: `${currentSlide.simulatorConfig.targetXPercent}%`,
                      top: `${currentSlide.simulatorConfig.targetYPercent}%`,
                      width: `${currentSlide.simulatorConfig.targetWidthPercent}%`,
                      height: `${currentSlide.simulatorConfig.targetHeightPercent}%`,
                    }}
                    className={`absolute z-20 rounded-xl border-2 transition-all flex items-center justify-center p-1 pointer-events-none ${
                      simSuccess
                        ? 'border-emerald-400 bg-emerald-500/30 shadow-[0_0_25px_rgba(16,185,129,0.7)] scale-105'
                        : 'border-emerald-400/80 bg-emerald-500/15 animate-pulse shadow-[0_0_15px_rgba(16,185,129,0.3)]'
                    }`}
                  >
                    <span className="text-[10px] font-black text-emerald-300 bg-black/80 px-2 py-0.5 rounded shadow">
                      {simSuccess ? '✓ TEPAT!' : (currentSlide.simulatorConfig.highlightLabel || 'KLIK DI SINI')}
                    </span>
                  </div>

                  {/* Success Overlay Banner */}
                  {simSuccess && (
                    <div className="absolute inset-0 bg-emerald-950/40 backdrop-blur-[2px] z-30 flex flex-col items-center justify-center p-4 text-center animate-fade-in pointer-events-none">
                      <div className="w-12 h-12 rounded-full bg-emerald-500 text-black flex items-center justify-center font-black text-xl mb-2 shadow-xl animate-bounce">
                        ✓
                      </div>
                      <h4 className="text-sm font-black text-white mb-1">
                        {currentSlide.simulatorConfig.successMessage || 'Langkah Berhasil Diselesaikan!'}
                      </h4>
                      <p className="text-xs text-emerald-300">Beralih ke langkah berikutnya...</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Error / Hint Feedback Toast */}
              {simHint && !simSuccess && (
                <div className="p-3 bg-rose-950/50 border border-rose-500/40 rounded-xl text-xs text-rose-300 flex items-center gap-2 animate-fade-in">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
                  <span>{simHint}</span>
                </div>
              )}
            </div>
          )}

          {/* ─── FORMAT 7: spot_the_mistake (Hazard Hunt / Anomaly Game) ─── */}
          {currentSlide.slideType === 'spot_the_mistake' && currentSlide.spotMistakeConfig && (
            <div className="space-y-3">
              {/* Challenge Header & Timer */}
              <div className="p-3 rounded-xl border border-amber-500/30 bg-amber-950/20 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-xs font-bold text-amber-200">
                  <span className="p-1 rounded bg-amber-500/20 text-amber-400 shrink-0">🔍 HAZARD HUNT</span>
                  <span>{currentSlide.spotMistakeConfig.challengePrompt}</span>
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-zinc-900 border border-zinc-700 text-xs font-mono font-black text-white shrink-0">
                  <Clock className={`w-3.5 h-3.5 ${spotTimer <= 5 ? 'text-rose-500 animate-spin' : 'text-amber-400'}`} />
                  <span className={spotTimer <= 5 ? 'text-rose-400 font-black' : ''}>{spotTimer}s</span>
                </div>
              </div>

              {/* Photo Anomaly Click Area */}
              <div className="w-full bg-zinc-950/90 border border-zinc-800 rounded-2xl p-2.5 flex items-center justify-center overflow-hidden min-h-[280px] max-h-[620px] shadow-2xl">
                <div
                  onClick={handleSpotMistakeClick}
                  className="relative inline-block max-w-full cursor-crosshair select-none rounded-xl overflow-hidden shadow-2xl group transition-all"
                >
                  <img
                    src={formatGoogleDriveImageUrl(currentSlide.imageUrl) || 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=1200&q=80'}
                    alt="Spot the mistake field photo"
                    className="max-h-[560px] w-auto max-w-full block pointer-events-none object-contain"
                    onError={(e) => {
                      const target = e.currentTarget as HTMLImageElement;
                      target.src = 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=1200&q=80';
                    }}
                  />

                  {/* Revealed Hazard Highlight */}
                  {spotRevealed && (
                    <div
                      style={{
                        left: `${currentSlide.spotMistakeConfig.targetXPercent}%`,
                        top: `${currentSlide.spotMistakeConfig.targetYPercent}%`,
                        width: `${(currentSlide.spotMistakeConfig.toleranceRadiusPercent || 15) * 2}%`,
                        height: `${(currentSlide.spotMistakeConfig.toleranceRadiusPercent || 15) * 2}%`,
                      }}
                      className="absolute -translate-x-1/2 -translate-y-1/2 z-20 pointer-events-none animate-fade-in flex items-center justify-center"
                    >
                      <div className="w-full h-full rounded-full border-4 border-rose-500 bg-rose-500/30 animate-pulse shadow-[0_0_30px_rgba(244,63,94,0.8)] flex items-center justify-center">
                        <span className="text-xl">⚠️</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Result Explanation Card */}
              {spotRevealed ? (
                <div className={`p-4 rounded-xl border space-y-2 animate-fade-in text-xs ${
                  spotFound
                    ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-200'
                    : 'bg-rose-950/30 border-rose-500/40 text-rose-200'
                }`}>
                  <div className="flex items-center gap-2 font-bold">
                    {spotFound ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <AlertTriangle className="w-4 h-4 text-rose-400" />}
                    <span>{spotFound ? 'Kejelian Luar Biasa! Titik Anomali Ditemukan' : 'Waktu Habis! Ini Titik Bahayanya:'}</span>
                  </div>
                  <h5 className="font-bold text-white text-xs">
                    ⚠️ {currentSlide.spotMistakeConfig.hazardName}
                  </h5>
                  <p className="text-[11px] text-zinc-300 leading-relaxed">
                    {currentSlide.spotMistakeConfig.explanation}
                  </p>
                </div>
              ) : (
                <p className="text-[11px] text-zinc-400 text-center italic">
                  💡 Ketuk langsung titik bahaya / kesalahan pada foto di atas sebelum waktu habis.
                </p>
              )}
            </div>
          )}

          {/* ─── FORMAT 8: document_reader (PDF / Presentation Smart Viewer) ─── */}
          {currentSlide.slideType === 'document_reader' && (
            <div className="space-y-3 bg-zinc-900 border border-zinc-800 rounded-xl p-4">
              <div className="flex items-center justify-between text-xs pb-2 border-b border-zinc-800">
                <span className="font-bold text-white flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-blue-400" />
                  {currentSlide.documentConfig?.fileName || 'Dokumen SOP Resmi'}
                </span>
                {currentSlide.documentConfig?.currentPage && (
                  <span className="text-zinc-400 text-[10px]">
                    Hal {currentSlide.documentConfig.currentPage} / {currentSlide.documentConfig.totalPdfPages || 1}
                  </span>
                )}
              </div>

              {currentSlide.imageUrl && (
                <div className="rounded-xl overflow-hidden border border-zinc-800 bg-zinc-950">
                  <img
                    src={formatGoogleDriveImageUrl(currentSlide.imageUrl)}
                    alt="Document page"
                    className="w-full object-contain max-h-80 mx-auto"
                    onError={(e) => {
                      const target = e.currentTarget as HTMLImageElement;
                      target.src = 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=1200&q=80';
                    }}
                  />
                </div>
              )}

              {currentSlide.content && (
                <div className="p-3 bg-zinc-950 rounded-lg text-xs text-zinc-300 leading-relaxed border border-zinc-800">
                  <strong className="text-white block mb-1">Poin Kunci Dokumen:</strong>
                  {currentSlide.content}
                </div>
              )}
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
