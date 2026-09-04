import React, { useEffect } from 'react';
import { TrendingUp, Star, X } from 'lucide-react';
import type { TierType } from '../types/assessment';
import { SystemConfigService } from '../domain/SystemConfigService';

interface TierUpToastProps {
  oldTier: TierType;
  newTier: TierType;
  pointsAwarded: number;
  onDismiss: () => void;
}

export const TierUpToast: React.FC<TierUpToastProps> = ({ oldTier, newTier, pointsAwarded, onDismiss }) => {
  const dynamicTier = SystemConfigService.getTierByName(newTier);
  const icon = dynamicTier?.icon || '🏆';
  const badgeColor = dynamicTier?.badgeColor || '#fbbf24';
  const badgeBg = dynamicTier?.badgeBg || `${badgeColor}1a`;
  const badgeBorder = dynamicTier?.badgeBorder || `${badgeColor}40`;

  useEffect(() => {
    // Dynamic import confetti — only loaded when tier-up event fires
    import('canvas-confetti').then(({ default: confetti }) => {
      confetti({
        particleCount: 120,
        spread: 80,
        origin: { x: 0.5, y: 0.8 },
        colors: [badgeColor, '#10b981', '#6366f1', '#fff'],
      });
    });

    const timer = setTimeout(onDismiss, 6000);
    return () => clearTimeout(timer);
  }, [onDismiss, badgeColor]);

  return (
    <div
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] w-full max-w-sm rounded-2xl shadow-2xl px-5 py-4 animate-[slideUp_0.4s_ease-out] backdrop-blur-md"
      style={{
        animation: 'slideUp 0.4s ease-out',
        backgroundColor: 'rgba(24, 24, 27, 0.95)',
        border: `1px solid ${badgeBorder}`,
        boxShadow: `0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 0 20px ${badgeColor}20`,
      }}
    >
      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateX(-50%) translateY(40px); }
          to   { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
      `}</style>

      <button
        onClick={onDismiss}
        className="absolute top-3 right-3 text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-zinc-800 transition"
      >
        <X className="w-4 h-4" />
      </button>

      <div className="flex items-center gap-3">
        <div className="text-3xl shrink-0">{icon}</div>
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <TrendingUp className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="text-sm font-black text-white">TIER NAIK!</span>
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] text-zinc-400 line-through">{oldTier}</span>
            <span className="text-zinc-500 text-xs">→</span>
            <span
              className="text-xs font-black px-2 py-0.5 rounded"
              style={{
                color: badgeColor,
                backgroundColor: badgeBg,
                border: `1px solid ${badgeBorder}`,
              }}
            >
              {newTier}
            </span>
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
