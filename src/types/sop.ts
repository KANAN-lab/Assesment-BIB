// src/types/sop.ts

export type SopCategory = 
  | 'K3 & Safety' 
  | 'Operasional MHE' 
  | 'Warehouse & Staging' 
  | 'Inbound & Timbangan' 
  | 'Outbound & Ekspedisi'
  | '5S & Continuous Improvement'
  | 'Tanggap Darurat & Lingkungan';

export type SopDifficulty = 'Beginner' | 'Intermediate' | 'Advanced' | 'Mandatory Compliance';

/** 9 Tipe Slide Interaktif yang Didukung Engine */
export type SopSlideType = 
  | 'step_instruction'    // 1. Panduan langkah kerja bernomor urut & berikon
  | 'dos_and_donts'       // 2. Komparasi visual perbuatan benar (DO) vs salah (DON'T)
  | 'safety_alert'        // 3. Peringatan bahaya kritis & Golden Rules K3
  | 'interactive_hotspot' // 4. Diagram gambar dengan titik inspeksi interaktif
  | 'decision_tree'       // 5. Pohon keputusan alur tindakan cepat di lapangan
  | 'video_demonstration' // 6. Video pendek/animasi gerakan teknis operasional
  | 'faq_accordion'       // 7. Tanya-jawab seputar kendala umum di lapangan
  | 'glossary_card'       // 8. Istilah teknis, jargon logistik, dan singkatan
  | 'quiz_checkpoint';    // 9. Kuis evaluasi pemahaman akhir sebelum klaim poin

// ─── Sub-Interfaces Format Slide ──────────────────────────────────────────

export interface SopStepItem {
  stepNumber: number;
  title: string;
  description: string;
  iconName?: string;
  keyHighlight?: string;
}

export interface SopDoDontItem {
  doTitle: string;
  doText: string;
  doTip?: string;
  dontTitle: string;
  dontText: string;
  dontWarning?: string;
}

export interface SopHotspotPoint {
  id: string;
  xPercent: number;          // Posisi X (0 - 100%) pada gambar
  yPercent: number;          // Posisi Y (0 - 100%) pada gambar
  label: string;
  description: string;
  status: 'critical' | 'check' | 'safe';
}

export interface SopDecisionNode {
  condition: string;
  actionRequired: string;
  responsibleRole?: string;
  isEscalateToSupervisor?: boolean;
}

export interface SopFaqItem {
  question: string;
  answer: string;
}

export interface SopGlossaryItem {
  term: string;
  definition: string;
  practicalExample?: string;
}

export interface SopQuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswerIndex: number;
  explanation: string;
  points?: number;
}

// ─── Main Slide Interface ──────────────────────────────────────────────────

export interface SopSlide {
  id: string;
  slideNumber: number;
  slideType: SopSlideType;
  title: string;
  subtitle?: string;
  content?: string;
  imageUrl?: string;
  audioNarrationText?: string;   // Teks khusus untuk di-voiceover oleh Text-to-Speech
  alertLevel?: 'warning' | 'critical' | 'info';
  
  // Dynamic payloads based on slideType
  steps?: SopStepItem[];
  dosAndDonts?: SopDoDontItem[];
  hotspots?: SopHotspotPoint[];
  decisionNodes?: SopDecisionNode[];
  faqList?: SopFaqItem[];
  glossaryList?: SopGlossaryItem[];
  videoUrl?: string;
  quiz?: SopQuizQuestion;
}

// ─── Main Deck Module Interface ───────────────────────────────────────────

export interface SopModule {
  id: string;
  code: string;                  // Cth: 'SOP-MHE-01'
  title: string;
  description: string;
  category: SopCategory;
  difficulty: SopDifficulty;
  targetDivisions: string[];     // ['WFG', 'WRM', 'TIM', 'ALL']
  targetRoles: string[];         // ['Operator Forklift', 'Checker', 'ALL']
  estimatedMinutes: number;      // Cth: 3 (estimasi durasi)
  pointsReward: number;          // Default: 50 PTS
  badgeIcon: string;             // Lucide Icon identifier
  slides: SopSlide[];
  isMandatory: boolean;          // Apakah modul wajib baca kepatuhan
  deadlineDays?: number;         // Batas hari penyelesaian sejak akun aktif
  version: string;               // Cth: 'v2.1'
  isActive: boolean;
  author: string;
  createdAt: string;
  updatedAt: string;
}

// ─── Worker Progress & Compliance Tracking ─────────────────────────────────

export interface WorkerSopProgress {
  id: string;
  workerId: string;
  sopId: string;
  lastSlideViewed: number;
  isCompleted: boolean;
  completedAt?: string;
  pointsAwarded: boolean;
  quizScore?: number;
  timeSpentSeconds: number;
  bookmarkedSlideIds: string[];
  personalNotes?: string;
}

export interface SopComplianceOverview {
  totalModules: number;
  completedCount: number;
  mandatoryCompletedRatio: number; // 0.0 - 1.0 (0% - 100%)
  totalPointsEarnedFromSop: number;
  nextRecommendedModule?: SopModule;
}
