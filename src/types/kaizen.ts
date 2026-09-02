export type KaizenCategory =
  | 'Safety / K3'
  | 'Efisiensi Operasional'
  | '5R & Kebersihan'
  | 'Penghematan Biaya'
  | 'Kualitas Layanan'
  | 'Lainnya';

export type KaizenStatus =
  | 'Submitted'
  | 'Under Review'
  | 'Approved'
  | 'Implemented'
  | 'Rejected';

export interface KaizenSuggestionEntity {
  id: string;
  author_id: string;
  title: string;
  category: KaizenCategory;
  current_condition: string;
  proposed_solution: string;
  expected_impact: string | null;
  photo_before_url: string | null;
  photo_after_url: string | null;
  status: KaizenStatus;
  reward_points: number;
  reviewer_id: string | null;
  reviewer_feedback: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;

  // Joined author/reviewer details
  author_name?: string;
  author_avatar?: string;
  author_role?: string;
  author_division?: string;
  reviewer_name?: string;
}

export interface KaizenInput {
  title: string;
  category: KaizenCategory;
  currentCondition: string;
  proposedSolution: string;
  expectedImpact?: string;
  photoBeforeUrl?: string;
  photoAfterUrl?: string;
}

export interface KaizenReviewInput {
  suggestionId: string;
  reviewerId: string;
  newStatus: KaizenStatus;
  rewardPoints: number;
  feedback: string;
}
