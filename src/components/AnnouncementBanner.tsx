import React, { useEffect, useState } from 'react';
import { Megaphone, X, AlertTriangle, Info, ChevronLeft, ChevronRight } from 'lucide-react';
import type { Announcement } from '../types/assessment';

interface AnnouncementBannerProps {
  announcements: Announcement[];
}

const PRIORITY_CONFIG = {
  urgent: {
    bg: 'bg-rose-950/70 border-rose-500/50',
    icon: <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />,
    label: 'text-rose-300',
    badge: 'bg-rose-500/20 text-rose-300 border border-rose-500/30',
    badgeText: 'URGENT',
  },
  normal: {
    bg: 'bg-zinc-900/80 border-zinc-700/50',
    icon: <Megaphone className="w-4 h-4 text-amber-400 shrink-0" />,
    label: 'text-zinc-200',
    badge: 'bg-amber-500/15 text-amber-300 border border-amber-500/30',
    badgeText: 'INFO',
  },
  info: {
    bg: 'bg-sky-950/60 border-sky-600/40',
    icon: <Info className="w-4 h-4 text-sky-400 shrink-0" />,
    label: 'text-sky-200',
    badge: 'bg-sky-500/15 text-sky-300 border border-sky-500/30',
    badgeText: 'INFORMASI',
  },
} as const;

export const AnnouncementBanner: React.FC<AnnouncementBannerProps> = ({ announcements }) => {
  const [index, setIndex] = useState(0);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  const visible = announcements.filter((a) => !dismissed.has(a.id));

  useEffect(() => {
    if (visible.length <= 1) return;
    const timer = setInterval(() => {
      setIndex((i) => (i + 1) % visible.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [visible.length]);

  if (visible.length === 0) return null;

  const current = visible[Math.min(index, visible.length - 1)];
  const cfg = (current && PRIORITY_CONFIG[current.priority as keyof typeof PRIORITY_CONFIG]) || PRIORITY_CONFIG.normal;

  const dismiss = () => {
    setDismissed((prev) => new Set([...prev, current.id]));
    setIndex(0);
  };

  return (
    <div className={`rounded-xl border px-4 py-3 mb-4 flex items-start gap-3 ${cfg.bg} animate-fade-in`}>
      {cfg.icon}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className={`text-[10px] font-black px-1.5 py-0.5 rounded ${cfg.badge}`}>
            {cfg.badgeText}
          </span>
          <span className={`text-xs font-bold truncate ${cfg.label}`}>{current.title}</span>
        </div>
        <p className="text-xs text-zinc-400 leading-relaxed">{current.content}</p>
      </div>

      {/* Nav dots & controls */}
      <div className="flex flex-col items-end gap-1 shrink-0">
        <button onClick={dismiss} className="text-zinc-600 hover:text-zinc-400 transition">
          <X className="w-3.5 h-3.5" />
        </button>
        {visible.length > 1 && (
          <div className="flex items-center gap-1 mt-1">
            <button
              onClick={() => setIndex((i) => (i - 1 + visible.length) % visible.length)}
              className="text-zinc-600 hover:text-zinc-400 transition"
            >
              <ChevronLeft className="w-3 h-3" />
            </button>
            <span className="text-[9px] text-zinc-600">{index + 1}/{visible.length}</span>
            <button
              onClick={() => setIndex((i) => (i + 1) % visible.length)}
              className="text-zinc-600 hover:text-zinc-400 transition"
            >
              <ChevronRight className="w-3 h-3" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
