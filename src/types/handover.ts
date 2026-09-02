export type ShiftType = 'Pagi' | 'Siang' | 'Malam';
export type HandoverCategory = 'MHE & Peralatan' | 'Operasional & Target' | 'Kebersihan & 5R' | 'Kebersihan & 5S' | 'Administrasi & Dokumen' | 'Infrastruktur Gudang' | 'K3 & Insiden' | 'Lainnya';
export type ConditionStatus = 'Aman' | 'Perlu Perhatian' | 'Urgent';
export type HandoverStatus = 'Tertunda' | 'Proses' | 'Selesai';

export interface ShiftHandoverEntity {
  id: string;
  shift_date: string;
  shift_type: ShiftType;
  author_id: string;
  next_supervisor_id: string | null;
  handover_category: HandoverCategory;
  condition_status: ConditionStatus;
  status: HandoverStatus;
  notes: string | null;
  acknowledged_at: string | null;
  acknowledged_by: string | null;
  created_at: string;
  
  // Joined fields
  author_name?: string;
  author_avatar?: string;
  acknowledged_by_name?: string;
}

export interface HandoverInput {
  shiftType: ShiftType;
  nextSupervisorId: string | null;
  handoverCategory: HandoverCategory;
  conditionStatus: ConditionStatus;
  notes: string;
}
