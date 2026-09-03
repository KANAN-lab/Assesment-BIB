import { Audit5sPillars, Rating5s, Audit5sRecord } from '../types/audit5s';
import { SystemConfigService, SystemConfig } from './SystemConfigService';

/**
 * Audit5sEngine (OOP Domain Engine)
 * Pure domain logic for 5S / 5R Warehouse Quality Audits:
 * composite scoring across 5 pillars (Ringkas, Rapi, Resik, Rawat, Rajin),
 * certification predicate evaluation (Gold/Silver/Bronze), and dynamic reward calculation.
 */
export class Audit5sEngine {
  public static readonly PASSING_SCORE = 70;
  public static readonly SILVER_THRESHOLD = 80;
  public static readonly GOLD_THRESHOLD = 90;

  /**
   * Computes composite average percentage across the 5 pillars (0 - 100%).
   */
  public static calculateCompositeScore(scores: Audit5sPillars): number {
    const sum =
      (scores.ringkas_seiri || 0) +
      (scores.rapi_seiton || 0) +
      (scores.resik_seiso || 0) +
      (scores.rawat_seiketsu || 0) +
      (scores.rajin_shitsuke || 0);

    return Math.round(sum / 5);
  }

  /**
   * Evaluates certification rating, points reward, and status from composite score.
   */
  public static evaluateRating(
    totalScore: number,
    config?: SystemConfig
  ): {
    rating: Rating5s;
    points: number;
    status: Audit5sRecord['status'];
  } {
    const cfg = config || SystemConfigService.getConfig();

    if (totalScore >= this.GOLD_THRESHOLD) {
      return { rating: 'Gold', points: cfg.audit5sGoldRewardPoints, status: 'passed' };
    }
    if (totalScore >= this.SILVER_THRESHOLD) {
      return { rating: 'Silver', points: cfg.audit5sSilverRewardPoints, status: 'passed' };
    }
    if (totalScore >= this.PASSING_SCORE) {
      return { rating: 'Bronze', points: cfg.audit5sBronzeRewardPoints, status: 'passed' };
    }
    return { rating: 'Perlu Perbaikan', points: 0, status: 'needs_improvement' };
  }

  /**
   * Returns UI badge styling for a 5S rating.
   */
  public static getRatingBadge(rating: Rating5s): { label: string; badgeCls: string } {
    switch (rating) {
      case 'Gold':
        return {
          label: 'Gold (Audit Sangat Unggul)',
          badgeCls: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
        };
      case 'Silver':
        return {
          label: 'Silver (Audit Baik & Sesuai SOP)',
          badgeCls: 'bg-zinc-700/30 text-zinc-300 border-zinc-500/30',
        };
      case 'Bronze':
        return {
          label: 'Bronze (Audit Cukup Terkendali)',
          badgeCls: 'bg-orange-700/20 text-orange-400 border-orange-600/30',
        };
      case 'Perlu Perbaikan':
      default:
        return {
          label: 'Perlu Perbaikan (Temuan)',
          badgeCls: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
        };
    }
  }

  /**
   * Metadata description for each of the 5S/5R pillars.
   */
  public static getPillarMeta(pillar: keyof Audit5sPillars): {
    title: string;
    japanese: string;
    desc: string;
  } {
    switch (pillar) {
      case 'ringkas_seiri':
        return {
          title: '1. Ringkas',
          japanese: 'Seiri (整理)',
          desc: 'Pilah barang penting vs tidak terpakai, buang sampah/scrap dari area kerja.',
        };
      case 'rapi_seiton':
        return {
          title: '2. Rapi',
          japanese: 'Seiton (整頓)',
          desc: 'Penataan pallet sesuai marka garis, label identitas jelas & mudah diambil.',
        };
      case 'resik_seiso':
        return {
          title: '3. Resik',
          japanese: 'Seiso (清掃)',
          desc: 'Lantai lorong bebas debu, bebas ceceran oli/cairan, dan unit MHE bersih.',
        };
      case 'rawat_seiketsu':
        return {
          title: '4. Rawat',
          japanese: 'Seiketsu (清潔)',
          desc: 'Standardisasi visual, visual management (marka), dan jadwal kontrol kebersihan.',
        };
      case 'rajin_shitsuke':
        return {
          title: '5. Rajin',
          japanese: 'Shitsuke (躾)',
          desc: 'Disiplin staf mematuhi aturan 5R, briefing keselamatan, dan integritas kerja.',
        };
    }
  }
}
