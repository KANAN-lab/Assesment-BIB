import { ShiftHandoverEntity, HandoverStatus, ConditionStatus } from '../types/handover';

/**
 * ShiftHandoverManager (OOP Domain Service & State Machine)
 * Encapsulates the business rules for operational shift handover:
 * valid status transitions, condition escalation, and 24-hour auto-archival policies.
 */
export class ShiftHandoverManager {
  public static readonly ARCHIVE_EXPIRATION_HOURS = 24;

  /**
   * Evaluates if an archived completed handover is older than the expiration threshold.
   */
  public static isExpiredForArchival(
    createdAtStr: string,
    hoursThreshold: number = ShiftHandoverManager.ARCHIVE_EXPIRATION_HOURS
  ): boolean {
    const itemTime = new Date(createdAtStr).getTime();
    const thresholdMs = hoursThreshold * 60 * 60 * 1000;
    return Date.now() - itemTime > thresholdMs;
  }

  /**
   * Domain State Machine: Determines if a transition from currentStatus to targetStatus is valid.
   */
  public static canTransition(currentStatus: HandoverStatus, targetStatus: HandoverStatus): boolean {
    if (currentStatus === targetStatus) return true;

    switch (currentStatus) {
      case 'Tertunda':
        // Tertunda can transition to Proses or directly Selesai (if quick resolve)
        return targetStatus === 'Proses' || targetStatus === 'Selesai';
      case 'Proses':
        // In Progress can be completed or reverted back to pending
        return targetStatus === 'Selesai' || targetStatus === 'Tertunda';
      case 'Selesai':
        // Resolved can only be reopened to Proses
        return targetStatus === 'Proses';
      default:
        return false;
    }
  }

  /**
   * Filters active visible handover items versus archived items based on 24-hour rule.
   */
  public static partitionActiveAndArchived(
    items: ShiftHandoverEntity[],
    showArchived: boolean = false
  ): { visible: ShiftHandoverEntity[]; archivedCount: number } {
    let archivedCount = 0;

    const visible = items.filter((item) => {
      if (item.status === 'Selesai') {
        const isArchived = ShiftHandoverManager.isExpiredForArchival(item.created_at);
        if (isArchived) {
          archivedCount++;
          return showArchived;
        }
      }
      return true;
    });

    return { visible, archivedCount };
  }

  /**
   * Returns styling for condition status
   */
  public static getConditionBadge(condition: ConditionStatus): { label: string; badgeCls: string } {
    switch (condition) {
      case 'Aman':
        return { label: 'Kondisi Aman', badgeCls: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' };
      case 'Perlu Perhatian':
        return { label: 'Perlu Perhatian', badgeCls: 'bg-amber-500/10 text-amber-400 border-amber-500/30' };
      case 'Urgent':
        return { label: 'URGENT PRIORITAS', badgeCls: 'bg-rose-500/10 text-rose-400 border-rose-500/30' };
      default:
        return { label: condition, badgeCls: 'bg-zinc-800 text-zinc-400 border-zinc-700' };
    }
  }
}
