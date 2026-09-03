import {
  ViolationLevel,
  ViolationCategory,
  DisciplinaryActionEntity,
} from '../types/disciplinary';
import { SystemConfigService, SystemConfig } from './SystemConfigService';

/**
 * DisciplinaryMatrixEngine (OOP Domain Engine)
 * Encapsulates the progressive safety disciplinary escalation matrix
 * (Konseling Lisan -> SP1 -> SP2 -> SP3 -> Skorsing),
 * computes statutory expiration dates, and enforces dynamic point penalties.
 */
export class DisciplinaryMatrixEngine {
  /**
   * Calculates the statutory validity period (in months) for each disciplinary tier.
   */
  public static getValidityMonths(level: ViolationLevel): number {
    switch (level) {
      case 'coaching_verbal':
        return 1;
      case 'written_warning_1':
      case 'written_warning_2':
      case 'written_warning_3':
        return 6;
      case 'suspension':
        return 12;
      case 'remedial_evaluation':
        return 3;
      default:
        return 6;
    }
  }

  /**
   * Computes the official expiration date for a sanction starting from issue date.
   */
  public static calculateExpiryDate(level: ViolationLevel, fromDate: Date = new Date()): string {
    const expiry = new Date(fromDate);
    const months = this.getValidityMonths(level);
    expiry.setMonth(expiry.getMonth() + months);
    return expiry.toISOString().slice(0, 10);
  }

  /**
   * Checks whether a disciplinary action is still legally active (within validity period).
   */
  public static isSanctionActive(action: DisciplinaryActionEntity): boolean {
    if (action.status === 'resolved' || action.status === 'appealed') return false;
    if (!action.expiryDate) return true;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expiry = new Date(action.expiryDate);
    expiry.setHours(0, 0, 0, 0);

    return expiry.getTime() >= today.getTime();
  }

  /**
   * Evaluates a worker's past active sanctions and recommends the progressive next tier.
   */
  public static recommendEscalatedLevel(
    category: ViolationCategory,
    workerActiveSanctions: DisciplinaryActionEntity[]
  ): {
    recommendedLevel: ViolationLevel;
    rationale: string;
    isEscalated: boolean;
  } {
    const activeWarnings = workerActiveSanctions.filter((s) => this.isSanctionActive(s));

    const hasSp3 = activeWarnings.some((s) => s.violationLevel === 'written_warning_3');
    if (hasSp3) {
      return {
        recommendedLevel: 'suspension',
        rationale: 'Pekerja memiliki SP3 aktif dalam 6 bulan terakhir. Eskalasi otomatis ke Skorsing Operasional.',
        isEscalated: true,
      };
    }

    const hasSp2 = activeWarnings.some((s) => s.violationLevel === 'written_warning_2');
    if (hasSp2) {
      return {
        recommendedLevel: 'written_warning_3',
        rationale: 'Pekerja memiliki SP2 aktif. Eskalasi otomatis ke Surat Peringatan III (SP 3).',
        isEscalated: true,
      };
    }

    const hasSp1 = activeWarnings.some((s) => s.violationLevel === 'written_warning_1');
    if (hasSp1) {
      return {
        recommendedLevel: 'written_warning_2',
        rationale: 'Pekerja memiliki SP1 aktif. Eskalasi otomatis ke Surat Peringatan II (SP 2).',
        isEscalated: true,
      };
    }

    const hasVerbal = activeWarnings.some((s) => s.violationLevel === 'coaching_verbal');
    if (hasVerbal) {
      return {
        recommendedLevel: 'written_warning_1',
        rationale: 'Pekerja telah menerima Catatan Konseling Lisan aktif. Pelanggaran berikutnya meningkat ke SP 1.',
        isEscalated: true,
      };
    }

    // First-time offenses: severe violations directly trigger SP 1, others start at verbal coaching
    if (category === 'mhe_reckless' || category === 'sop_breach' || category === 'hazard_negligence') {
      return {
        recommendedLevel: 'written_warning_1',
        rationale: 'Pelanggaran kategori berisiko tinggi / membahayakan nyawa langsung diterbitkan SP 1.',
        isEscalated: false,
      };
    }

    return {
      recommendedLevel: 'coaching_verbal',
      rationale: 'Pelanggaran operasional awal. Disarankan Pembinaan Lisan & Konseling terlebih dahulu.',
      isEscalated: false,
    };
  }

  /**
   * Retrieves dynamic penalty points according to the system configuration.
   */
  public static calculatePenalty(level: ViolationLevel, config?: SystemConfig): number {
    const cfg = config || SystemConfigService.getConfig();
    switch (level) {
      case 'coaching_verbal':
        return cfg.verbalCoachingPenaltyPoints;
      case 'written_warning_1':
        return cfg.warningLetter1PenaltyPoints;
      case 'written_warning_2':
        return cfg.warningLetter2PenaltyPoints;
      case 'written_warning_3':
        return cfg.warningLetter3PenaltyPoints;
      case 'suspension':
        return cfg.suspensionPenaltyPoints;
      case 'remedial_evaluation':
        return 50;
      default:
        return 0;
    }
  }
}
