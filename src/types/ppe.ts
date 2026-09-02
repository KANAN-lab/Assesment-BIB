export type PpeCategory =
  | 'head_protection'
  | 'foot_protection'
  | 'body_protection'
  | 'hand_protection'
  | 'eye_face_protection'
  | 'fall_protection'
  | 'respiratory';

export type PpeItemCondition = 'new' | 'good' | 'fair' | 'damaged';

export type PpeDistributionStatus =
  | 'active'
  | 'expiring_soon'
  | 'expired_replaced'
  | 'damaged'
  | 'lost'
  | 'returned';

export type PpeDamageReason =
  | 'damaged_operation'
  | 'damaged_accident'
  | 'lost'
  | 'worn_out';

export type PpeDamageAction =
  | 'pending_review'
  | 'replacement_issued'
  | 'repaired'
  | 'rejected';

/**
 * Master catalog item for safety gear inventory
 */
export interface PpeItemEntity {
  id: string;
  name: string;
  category: PpeCategory;
  brand: string;
  standard: string; // e.g. "SNI 13-0862-2005 / ANSI Z89.1"
  stockTotal: number;
  stockAvailable: number;
  stockDistributed: number;
  unit: string; // "Pcs", "Pasang", "Set", "Box"
  standardLifespanMonths: number; // Duration before expected wear-and-tear replacement
  minimumStockThreshold: number; // Low stock warning trigger
  createdAt: string;
  updatedAt: string;
}

/**
 * Individual handover / distribution record of PPE to an operational worker
 */
export interface PpeDistributionEntity {
  id: string;
  workerId: string;
  workerName: string;
  employeeId: string;
  division: string;
  ppeItemId: string;
  ppeName: string;
  category: PpeCategory;
  serialOrBatchNumber?: string;
  size?: string;
  quantity: number;
  distributionDate: string; // ISO date string (YYYY-MM-DD)
  expectedReplacementDate: string; // ISO date string (YYYY-MM-DD)
  status: PpeDistributionStatus;
  condition: PpeItemCondition;
  handoverOfficer: string;
  notes?: string;
  daysRemaining?: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * Ticket for reporting damaged, lost, or worn out PPE requiring replacement
 */
export interface PpeDamageReportEntity {
  id: string;
  distributionId: string;
  workerId: string;
  workerName: string;
  employeeId: string;
  division: string;
  ppeItemId: string;
  ppeName: string;
  category: PpeCategory;
  damageReason: PpeDamageReason;
  reportDate: string;
  damageDescription: string;
  photoEvidenceUrl?: string;
  status: PpeDamageAction;
  reviewedBy?: string;
  reviewDate?: string;
  reviewNotes?: string;
  replacementDistributionId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PpeStats {
  totalItems: number;
  totalDistributedActive: number;
  lowStockCount: number;
  expiringSoonCount: number;
  pendingDamageReports: number;
}
