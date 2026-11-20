export type KudoCategory = 'Kerja Aman' | 'Bantuan Hebat' | 'Team Player' | 'Inisiatif';

export type KudoReactionType = 'clap' | 'muscle' | 'star';

export type CulturalValueTag =
  | '#SafetyFirst'
  | '#SolidTeamwork'
  | '#QuickResponse'
  | '#ZeroMistake'
  | '#ContinuousImprovement';

export interface CulturalTagMeta {
  tag: CulturalValueTag;
  label: string;
  icon: string;
  color: string;
  description: string;
}

export const CULTURAL_TAGS: CulturalTagMeta[] = [
  {
    tag: '#SafetyFirst',
    label: 'Safety First',
    icon: '🛡️',
    color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    description: 'Keselamatan & K3 nomor satu',
  },
  {
    tag: '#SolidTeamwork',
    label: 'Solid Teamwork',
    icon: '🤝',
    color: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30',
    description: 'Kekompakan regu & gotong-royong',
  },
  {
    tag: '#QuickResponse',
    label: 'Quick Response',
    icon: '⚡',
    color: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
    description: 'Tanggap & sigap atasi kendala',
  },
  {
    tag: '#ZeroMistake',
    label: 'Zero Mistake',
    icon: '🎯',
    color: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
    description: 'Akurasi tinggi & tanpa salah kirim',
  },
  {
    tag: '#ContinuousImprovement',
    label: 'Kaizen Spirit',
    icon: '💡',
    color: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30',
    description: 'Perbaikan mutu & ide kreatif',
  },
];

export interface KudoReactionSummary {
  clap: number;
  muscle: number;
  star: number;
  userReactions: KudoReactionType[];
}

export interface KudoQuickTag {
  id: string;
  category: KudoCategory;
  text: string;
  icon?: string;
}

export interface KudoEntity {
  id: string;
  sender_id: string;
  receiver_id: string;
  category: KudoCategory;
  message?: string;
  points_awarded?: number;
  created_at: string;
  is_pinned?: boolean;
  pinned_by?: string;
  // Metadata opsional yang diisi dari JOIN query
  sender_name?: string;
  sender_avatar?: string;
  sender_division?: string;
  receiver_name?: string;
  receiver_avatar?: string;
  receiver_division?: string;
  reactions?: KudoReactionSummary;
}
