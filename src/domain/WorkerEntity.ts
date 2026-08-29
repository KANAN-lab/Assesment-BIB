import type { WorkerProfile, TierType, BibScores } from '../types/assessment';

export class WorkerEntity {
  public static calculateTier(totalPoints: number): TierType {
    if (totalPoints >= 3000) return 'Legendary Champion';
    if (totalPoints >= 1500) return 'Elite Logistician';
    if (totalPoints >= 500) return 'Pro Specialist';
    return 'Novice Operational';
  }

  public static getStreakMultiplier(streakDays: number): number {
    if (streakDays >= 30) return 2.0;
    if (streakDays >= 14) return 1.5;
    if (streakDays >= 7) return 1.2;
    return 1.0;
  }

  public static calculateStreakBonusPoints(streakDays: number, basePoints: number): number {
    const multiplier = this.getStreakMultiplier(streakDays);
    return Math.round(basePoints * multiplier);
  }

  public static calculateBibTotal(behavior: number, integrity: number, benchmark: number): number {
    const weighted = (behavior * 0.35) + (integrity * 0.30) + (benchmark * 0.35);
    return Math.round(weighted * 10) / 10;
  }

  public static determineGrade(bibTotalScore: number): 'A+' | 'A' | 'B' | 'C' {
    if (bibTotalScore >= 90) return 'A+';
    if (bibTotalScore >= 80) return 'A';
    if (bibTotalScore >= 70) return 'B';
    return 'C';
  }

  public static isDailyResetNeeded(lastActivityDate?: string): boolean {
    if (!lastActivityDate) return false;
    const today = new Date().toISOString().split('T')[0];
    const lastDate = new Date(lastActivityDate).toISOString().split('T')[0];
    return today !== lastDate;
  }

  public static updateProfileWithPoints(
    profile: WorkerProfile,
    additionalBasePoints: number,
    incrementStreak: boolean = false
  ): { updatedProfile: WorkerProfile; pointsAwarded: number; tierChanged: boolean } {
    const newStreak = incrementStreak ? profile.streakDays + 1 : profile.streakDays;
    const pointsAwarded = this.calculateStreakBonusPoints(newStreak, additionalBasePoints);
    const newTotalPoints = profile.totalPoints + pointsAwarded;
    const newTier = this.calculateTier(newTotalPoints);
    const tierChanged = newTier !== profile.tier;

    return {
      updatedProfile: {
        ...profile,
        streakDays: newStreak,
        totalPoints: newTotalPoints,
        tier: newTier,
      },
      pointsAwarded,
      tierChanged,
    };
  }
}
