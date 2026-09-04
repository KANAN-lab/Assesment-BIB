import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Sparkles, ShieldCheck, Zap, Award, BookOpen, ChevronRight, Check, X } from 'lucide-react';

interface OnboardingModalProps {
  workerName: string;
  onClose: () => void;
}

const STEPS = [
  {
    icon: <Zap className="w-8 h-8 text-emerald-400" />,
    title: '1. Kuis Safety Harian (+50 Poin)',
    desc: 'Asah pengetahuan K3 Anda setiap hari. Soal disesuaikan khusus dengan divisi & role Anda menggunakan teknologi Gappy AI.',
    badge: 'Kuis Harian',
    color: 'border-emerald-500/30 bg-emerald-950/30',
  },
  {
    icon: <ShieldCheck className="w-8 h-8 text-cyan-400" />,
    title: '2. Pre-Shift Checklist (+30 Poin)',
    desc: 'Lakukan verifikasi kelayakan peralatan & APD sebelum memulai shift kerja untuk menjaga keselamatan Anda dan tim.',
    badge: 'Checklist K3',
    color: 'border-cyan-500/30 bg-cyan-950/30',
  },
  {
    icon: <Award className="w-8 h-8 text-amber-400" />,
    title: '3. Kumpulkan Poin & Naikkan Tier',
    desc: 'Tingkatkan skor BIB (Behavior, Integrity, Benchmark) Anda dari Novice Operational hingga Legendary Champion dan tukarkan poin dengan Reward eksklusif.',
    badge: 'Poin & Rewards',
    color: 'border-amber-500/30 bg-amber-950/30',
  },
  {
    icon: <BookOpen className="w-8 h-8 text-purple-400" />,
    title: '4. Akses SOP K3 & Lapor Insiden',
    desc: 'Gunakan tombol Perpustakaan SOP K3 untuk membaca panduan standar dan laporkan kondisi/insiden tidak aman secara instan ke Supervisor.',
    badge: 'Fitur Utama',
    color: 'border-purple-500/30 bg-purple-950/30',
  },
];

export const OnboardingModal: React.FC<OnboardingModalProps> = ({ workerName, onClose }) => {
  const [currentStep, setCurrentStep] = useState(0);

  const nextStep = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep((s) => s + 1);
    } else {
      onClose();
    }
  };

  const step = STEPS[currentStep];

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] overflow-y-auto bg-black/90 backdrop-blur-xl p-4 sm:p-6 flex items-center justify-center min-h-screen animate-fade-in"
    >
      <div
        className="relative w-full max-w-md max-h-[82vh] sm:max-h-[85vh] m-auto card-elevated p-6 border border-emerald-500/30 text-center flex flex-col items-center overflow-y-auto custom-scrollbar"
        onClick={(e) => e.stopPropagation()}
      >
        
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-zinc-500 hover:text-zinc-300 transition"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Step Counter Pills */}
        <div className="flex items-center gap-1.5 mb-6">
          {STEPS.map((_, idx) => (
            <div
              key={idx}
              className={`h-1.5 rounded-full transition-all ${
                idx === currentStep ? 'w-6 bg-emerald-400' : 'w-1.5 bg-zinc-800'
              }`}
            />
          ))}
        </div>

        {/* Step Icon */}
        <div className={`p-4 rounded-2xl border mb-4 ${step.color}`}>
          {step.icon}
        </div>

        <span className="text-[10px] font-black text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full uppercase mb-2">
          {step.badge}
        </span>

        <h3 className="text-base font-black text-white mb-2">{step.title}</h3>
        <p className="text-xs text-zinc-400 leading-relaxed mb-6 px-2">{step.desc}</p>

        {/* Action Button */}
        <button
          onClick={nextStep}
          className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl transition flex items-center justify-center gap-2"
        >
          {currentStep === STEPS.length - 1 ? (
            <>
              <Check className="w-4 h-4" /> Mulai Gunakan Aplikasi
            </>
          ) : (
            <>
              Lanjut ({currentStep + 1}/{STEPS.length}) <ChevronRight className="w-4 h-4" />
            </>
          )}
        </button>

      </div>
    </div>,
    document.body
  );
};
