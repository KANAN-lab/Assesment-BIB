export type KudoCategory = 'Kerja Aman' | 'Bantuan Hebat' | 'Team Player' | 'Inisiatif';

export type KudoReactionType = 'clap' | 'muscle' | 'star';

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
