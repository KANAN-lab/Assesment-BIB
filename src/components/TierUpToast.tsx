import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { TrendingUp, Star, X } from 'lucide-react';
import type { TierType } from '../types/assessment';

interface TierUpToastProps {
  oldTier: TierType;
  newTier: TierType;
  pointsAwarded: number;
  onDismiss: () => void;
}

const TIER_CONFIG: Record<TierType, { bg: string; border: string; badge: string; icon: string }> = {
  'Novice Operational': { bg: 'bg-zinc-800', border: 'border-zinc-600', badge: 'tier-novice', icon: '🔰' },
  'Pro Specialist':     { bg: 'bg-indigo-900/40', border: 'border-indigo-500/50', badge: 'tier-pro', icon: '⚡' },
  'Elite Logistician':  { bg: 'bg-emerald-900/40', border: 'border-emerald-500/50', badge: 'tier-elite', icon: '🏆' },
  'Legendary Champion': { bg: 'bg-amber-900/40', border: 'border-amber-500/50', badge: 'tier-legendary', icon: '👑' },
};

export const TierUpToast: React.FC<TierUpToastProps> = ({ oldTier, newTier, pointsAwarded, onDismiss }) => {
  const config = TIER_CONFIG[newTier] ?? TIER_CONFIG['Novice Operational'];

  useEffect(() => {
    // Confetti burst
    confetti({
      particleCount: 120,
      spread: 80,
      origin: { x: 0.5, y: 0.8 },
      colors: ['#f59e0b', '#10b981', '#6366f1', '#fff'],
    });

    const timer = setTimeout(onDismiss, 6000);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  return (
    <div
      className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] w-full max-w-sm
        ${config.bg} border ${config.border}
        rounded-2xl shadow-2xl px-5 py-4
        animate-[slideUp_0.4s_ease-out]`}
      style={{ animation: 'slideUp 0.4s ease-out' }}
    >
      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateX(-50%) translateY(40px); }
          to   { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
      `}</style>

      <button
        onClick={onDismiss}
        className="absolute top-3 right-3 text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-zinc-700 transition"
      >
        <X className="w-4 h-4" />
      </button>

      <div className="flex items-center gap-3">
        <div className="text-3xl shrink-0">{config.icon}</div>
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <TrendingUp className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="text-sm font-black text-white">TIER NAIK!</span>
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] text-zinc-400 line-through">{oldTier}</span>
            <span className="text-zinc-500 text-xs">→</span>
            <span className={`text-xs font-black px-2 py-0.5 rounded ${config.badge}`}>{newTier}</span>
          </div>
          <div className="flex items-center gap-1 mt-1">
            <Star className="w-3 h-3 text-amber-400" />
            <span className="text-[11px] text-amber-400 font-bold">+{pointsAwarded} poin diperoleh</span>
          </div>
        </div>
      </div>
    </div>
  );
};
