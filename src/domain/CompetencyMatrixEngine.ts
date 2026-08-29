import { CompetencyItem, ScoringRule } from '../types/assessment';
import matrixData from '../data/matrixData.json';

export interface CategorySummary {
  category: string;
  auditedScore: number;
  maxScore: number;
  itemCount: number;
  percentage: number;
}

/**
 * OOP Engine: CompetencyMatrixEngine
 * Encapsulates matrix rules, active category filtering per role,
 * score bounds validation, and percentage calculations.
 */
export class CompetencyMatrixEngine {
  private items: CompetencyItem[];
  private rules: ScoringRule[];

  constructor(
    items?: CompetencyItem[],
    rules?: ScoringRule[]
  ) {
    this.items = items || matrixData.competencyMatrix;
    this.rules = rules || matrixData.scoringRules;
  }

  public getItems(): CompetencyItem[] {
    return this.items;
  }

  public getRules(): ScoringRule[] {
    return this.rules;
  }

  /**
   * Resolve column key in matrix data corresponding to worker's role name
   */
  public resolveRoleColumnKey(roleName: string): string {
    const rawRole = (roleName || '').toUpperCase();
    if (rawRole.includes('TIMBANGAN')) return 'ADMIN TIMBANGAN';
    if (rawRole.includes('EKSPEDISI')) return 'ADMIN EKSPEDISI';
    if (rawRole.includes('WSP') && rawRole.includes('ADMIN')) return 'ADMIN WSP';
    if (rawRole.includes('WRM') && rawRole.includes('ADMIN')) return 'ADMIN WRM';
    if (rawRole.includes('WFG') && rawRole.includes('ADMIN')) return 'ADMIN WFG';
    if (rawRole.includes('GA') && rawRole.includes('ADMIN')) return 'ADMIN WFG'; // GA maps to Admin WFG tier
    if (rawRole.includes('PIC') || rawRole.includes('AREA')) return 'PIC AREA';
    if (rawRole.includes('CHECKER')) return 'CHECKER';
    if (rawRole.includes('REACHTRUCK')) return 'OPERATOR REACHTRUCK';
    if (rawRole.includes('FORKLIFT')) return 'OPERATOR FORKLIFT';
    if (rawRole.includes('ADMIN')) return 'ADMIN WFG'; // fallback generic Admin
    return 'OPERATOR FORKLIFT'; // default fallback
  }


  /**
   * Get maximum allowed score for a specific item and role
   */
  public getMaxScoreForItemAndRole(itemId: string, roleName: string): number {
    const item = this.items.find((i) => i.id === itemId);
    if (!item) return 0;
    const roleKey = this.resolveRoleColumnKey(roleName);
    return item.maxScores[roleKey] ?? 0;
  }

  /**
   * Validate if a given score is within 0..MaxAllowed bounds
   */
  public validateScore(itemId: string, roleName: string, inputScore: number): { valid: boolean; clampedScore: number; maxAllowed: number } {
    const maxAllowed = this.getMaxScoreForItemAndRole(itemId, roleName);
    if (inputScore < 0) return { valid: false, clampedScore: 0, maxAllowed };
    if (inputScore > maxAllowed) return { valid: false, clampedScore: maxAllowed, maxAllowed };
    return { valid: true, clampedScore: inputScore, maxAllowed };
  }

  /**
   * Get list of active categories for a role (categories with maxScore > 0)
   */
  public getActiveCategoriesForRole(roleName: string): string[] {
    const roleKey = this.resolveRoleColumnKey(roleName);
    const activeCats = new Set<string>();
    for (const item of this.items) {
      if ((item.maxScores[roleKey] ?? 0) > 0) {
        activeCats.add(item.category || 'General');
      }
    }
    return Array.from(activeCats);
  }

  /**
   * Calculate category summaries (audited vs max possible) for a worker
   */
  public calculateCategorySummaries(
    roleName: string,
    auditedScores: Record<string, number>,
    fallbackBibScore: number = 85
  ): CategorySummary[] {
    const roleKey = this.resolveRoleColumnKey(roleName);
    const catMap: Record<string, { audited: number; max: number; count: number }> = {};
    const baselineRatio = fallbackBibScore > 0 ? Math.min(1, fallbackBibScore / 100) : 0;

    for (const item of this.items) {
      const maxForRole = item.maxScores[roleKey] ?? 0;
      if (maxForRole <= 0) continue; // EXCLUDE IRRELEVANT CATEGORIES

      const cat = item.category || 'General';
      if (!catMap[cat]) {
        catMap[cat] = { audited: 0, max: 0, count: 0 };
      }

      catMap[cat].max += maxForRole;
      catMap[cat].count += 1;

      if (auditedScores && item.id in auditedScores) {
        catMap[cat].audited += Math.min(auditedScores[item.id], maxForRole);
      } else {
        catMap[cat].audited += Math.round(maxForRole * baselineRatio * 10) / 10;
      }
    }

    return Object.entries(catMap).map(([cat, val]) => {
      const pct = val.max > 0 ? (val.audited / val.max) * 100 : 0;
      return {
        category: cat,
        auditedScore: parseFloat(val.audited.toFixed(1)),
        maxScore: val.max,
        itemCount: val.count,
        percentage: parseFloat(pct.toFixed(1)),
      };
    });
  }

  /**
   * Calculate overall matrix percentage score (0..100)
   */
  public calculateOverallPercentage(roleName: string, auditedScores: Record<string, number>, fallbackBibScore: number = 85): number {
    const summaries = this.calculateCategorySummaries(roleName, auditedScores, fallbackBibScore);
    const totalAudited = summaries.reduce((acc, curr) => acc + curr.auditedScore, 0);
    const totalMax = summaries.reduce((acc, curr) => acc + curr.maxScore, 0);
    if (totalMax === 0) return fallbackBibScore;
    return parseFloat(((totalAudited / totalMax) * 100).toFixed(1));
  }
}

// Singleton instance for app-wide use
export const matrixEngine = new CompetencyMatrixEngine();
