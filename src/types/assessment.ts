export type RoleType = string;
export type DefaultTierType = 'Novice Operational' | 'Pro Specialist' | 'Elite Logistician' | 'Legendary Champion';
export type TierType = DefaultTierType | (string & {});

export interface TierConfig {
  id: string;
  name: string;
  minPoints: number;
  level: number;
  badgeColor: string;
  badgeBg: string;
  badgeBorder: string;
  icon: string;
}

export interface BibScores {
  behavior: number;   // Max 100 (Weight: 35%)
  integrity: number;  // Max 100 (Weight: 30%)
  benchmark: number;  // Max 100 (Weight: 35%)
  totalScore: number; // Weighted average (0-100)
}

export interface WorkerProfile {
  id: string;
  userId?: string;
  email?: string;
  name: string;
  employeeId: string;
  role: RoleType;
  division: string;
  avatar: string;
  streakDays: number;
  totalPoints: number;
  tier: TierType;
  bibScores: BibScores;
  dailyQuizCompleted: boolean;
  preShiftChecklistDone: boolean;
  lastActivityDate?: string;
  mustChangePassword?: boolean;
  status?: 'active' | 'pending_approval' | 'rejected';
  accountType?: 'worker' | 'supervisor' | 'admin';
  competencyAuditScores?: Record<string, number>;
}

export interface ScoreHistoryEntry {
  id: string;
  workerId: string;
  bibScore: number;
  totalPoints: number;
  recordedAt: string;
}

export interface CompetencyItem {
  id: string;
  kompetensi: string;
  type: string;
  category: string;
  title: string;
  definition: string;
  maxScores: Record<string, number>;
}

export interface ScoringRule {
  level: number;
  name: string;
  description: string;
}

export interface WorkerCompetencyAudit {
  workerId: string;
  scores: Record<string, number>;
  totalScore: number;
  maxPossibleScore: number;
  percentage: number;
  updatedAt?: string;
}

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswerIndex: number;
  explanation: string;
  pointsReward: number;
  category: string;
}

export interface RewardItem {
  id: string;
  title: string;
  category: string;
  pointsRequired: number;
  iconName: string;
  description: string;
  availableStock: number;
  monthlyStockLimit?: number;
  badgeTag?: string;
  minTier?: TierType | string;
  maxClaimsPerMonth?: number;
}

export interface RewardHistory {
  id: string;
  itemTitle: string;
  pointsSpent: number;
  redeemedAt: string;
  redemptionCode: string;
  status?: 'pending' | 'completed' | 'cancelled';
  expiryDate?: string;
  fulfilledAt?: string;
  fulfilledBy?: string;
  fulfilledByName?: string;
}

export interface LeaderboardEntry {
  rank: number;
  workerId: string;
  name: string;
  role: RoleType;
  division: string;
  avatar: string;
  totalScore: number;
  streakDays: number;
  tier: TierType;
  totalPoints: number;
}

export interface AuditInput {
  workerId: string;
  behaviorScore: number;
  integrityScore: number;
  benchmarkScore: number;
  notes: string;
}

// ─── PRD §9 — New Feature Types ─────────────────────────────────────────────

export interface Announcement {
  id: string;
  title: string;
  content: string;
  priority: 'normal' | 'urgent' | 'info';
  createdBy?: string;
  isActive: boolean;
  startsAt?: string;
  expiresAt?: string;
  createdAt: string;
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  condition: string;
  threshold: number;
}

export interface WorkerBadge {
  id: string;
  workerId: string;
  badgeId: string;
  badge: Badge;
  awardedAt: string;
}

export interface IncidentReportHistory {
  status: IncidentReport['status'];
  updatedBy: string;
  updatedAt: string;
  note?: string;
}

export interface IncidentReport {
  id: string;
  workerId: string;
  workerName?: string;
  incidentType: 'near_miss' | 'injury' | 'property_damage' | 'unsafe_condition' | 'other';
  location: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'open' | 'investigating' | 'resolved' | 'closed';
  occurredAt: string;
  createdAt: string;
  resolvedAt?: string;
  resolutionNote?: string;
  photoUrl?: string;
  gdriveFolderId?: string;
  originalSizeKb?: number;
  compressedSizeKb?: number;
  pointsAwarded?: boolean;
  rootCause?: string;
  correctiveAction?: string;
  assignedPic?: string;
  dueDate?: string;
  history?: IncidentReportHistory[];
}

export type ActivityAction =
  | 'login'
  | 'logout'
  | 'password_reset'
  | 'profile_update'
  | 'badge_awarded'
  | 'quiz_completed'
  | 'checklist_completed'
  | 'incident_reported'
  | 'kudo_sent'
  | 'kudo_received'
  | 'shift_handover'
  | 'sop_completed'
  | 'kaizen_submitted'
  | 'kaizen_approved'
  | 'role_mutated';

export interface WorkerRoleMutation {
  id: string;
  workerId: string;
  workerName?: string;
  previousRole: string;
  previousDivision: string;
  newRole: string;
  newDivision: string;
  archivedBibBehavior: number;
  archivedBibIntegrity: number;
  archivedBibBenchmark: number;
  archivedBibTotal: number;
  archivedCompetencyScores?: Record<string, number>;
  mutatedAt: string;
  mutatedBy: string;
  reason: string;
}

export interface ActivityLog {
  id: string;
  workerId?: string;
  workerName?: string;
  action: ActivityAction;
  detail?: string;
  createdAt: string;
}

export interface DivisionStat {
  division: string;
  workerCount: number;
  avgBibScore: number;
  avgTotalPoints: number;
  tierDistribution: Record<string, number>;
  quizCompletionRate: number;
}

