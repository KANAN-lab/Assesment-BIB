export type KudoCategory = 'Kerja Aman' | 'Bantuan Hebat' | 'Team Player' | 'Inisiatif';

export interface KudoEntity {
  id: string;
  sender_id: string;
  receiver_id: string;
  category: KudoCategory;
  message?: string;
  points_awarded?: number;
  created_at: string;
  // Metadata opsional yang diisi dari JOIN query
  sender_name?: string;
  sender_avatar?: string;
  receiver_name?: string;
  receiver_avatar?: string;
}
