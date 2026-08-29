import React from 'react';
import {
  Flame, Zap, Coins, Trophy, BookOpen, Brain,
  ShieldCheck, CheckCircle2, Award, Lock,
} from 'lucide-react';
import type { WorkerBadge, Badge } from '../types/assessment';

interface BadgeShowcaseProps {
  workerBadges: WorkerBadge[];
  allBadges: Badge[];
}

const ICON_MAP: Record<string, React.ReactNode> = {
  flame:          <Flame className="w-5 h-5" />,
  zap:            <Zap className="w-5 h-5" />,
  coins:          <Coins className="w-5 h-5" />,
  trophy:         <Trophy className="w-5 h-5" />,
  'book-open':    <BookOpen className="w-5 h-5" />,
  brain:          <Brain className="w-5 h-5" />,
  'shield-check': <ShieldCheck className="w-5 h-5" />,
  'check-circle': <CheckCircle2 className="w-5 h-5" />,
  award:          <Award className="w-5 h-5" />,
};

const COLOR_MAP: Record<string, string> = {
  orange:  'text-orange-400 bg-orange-500/10 border-orange-500/30',
  yellow:  'text-yellow-400 bg-yellow-500/10 border-yellow-500/30',
  amber:   'text-amber-400  bg-amber-500/10  border-amber-500/30',
  gold:    'text-yellow-300 bg-yellow-400/10 border-yellow-400/30',
  cyan:    'text-cyan-400   bg-cyan-500/10   border-cyan-500/30',
  violet:  'text-violet-400 bg-violet-500/10 border-violet-500/30',
  emerald: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
  green:   'text-green-400  bg-green-500/10  border-green-500/30',
};

const LOCKED_STYLE = 'text-zinc-600 bg-zinc-800/50 border-zinc-700/30';

const BadgeCard: React.FC<{ badge: Badge; earned: boolean; awardedAt?: string }> = ({
  badge, earned, awardedAt,
}) => {
  const colorClass = earned ? (COLOR_MAP[badge.color] ?? COLOR_MAP.amber) : LOCKED_STYLE;
  const icon = ICON_MAP[badge.icon] ?? <Award className="w-5 h-5" />;

  return (
    <div
      className={`relative flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-all ${colorClass} ${
        earned ? 'opacity-100' : 'opacity-40'
      }`}
      title={earned ? `Diraih: ${awardedAt ? new Date(awardedAt).toLocaleDateString('id-ID') : ''}` : `Terkunci: ${badge.description}`}
    >
      {!earned && (
        <Lock className="w-3 h-3 text-zinc-600 absolute top-1.5 right-1.5" />
      )}
      <div className={`p-1.5 rounded-lg ${earned ? '' : 'grayscale'}`}>{icon}</div>
      <span className="text-[10px] font-bold text-center leading-tight line-clamp-2">{badge.name}</span>
      {earned && (
        <span className="text-[9px] text-zinc-500 font-mono">
          {awardedAt ? new Date(awardedAt).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' }) : ''}
        </span>
      )}
    </div>
  );
};

export const BadgeShowcase: React.FC<BadgeShowcaseProps> = ({ workerBadges, allBadges }) => {
  const earnedMap = new Map(workerBadges.map((wb) => [wb.badgeId, wb.awardedAt]));
  const earnedCount = workerBadges.length;
  const totalCount = allBadges.length;

  return (
    <div className="card-elevated p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Award className="w-4 h-4 text-amber-400" />
          <h3 className="text-sm font-black text-white">Badge & Pencapaian</h3>
        </div>
        <span className="text-xs font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full">
          {earnedCount}/{totalCount}
        </span>
      </div>

      {earnedCount === 0 && (
        <p className="text-xs text-zinc-500 text-center py-2">
          Belum ada badge. Selesaikan kuis & checklist untuk meraih badge pertamamu!
        </p>
      )}

      <div className="grid grid-cols-4 gap-2">
        {allBadges.map((badge) => (
          <BadgeCard
            key={badge.id}
            badge={badge}
            earned={earnedMap.has(badge.id)}
            awardedAt={earnedMap.get(badge.id)}
          />
        ))}
      </div>
    </div>
  );
};
