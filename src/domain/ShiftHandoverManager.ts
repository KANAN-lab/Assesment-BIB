import { ShiftHandoverEntity, HandoverStatus, ConditionStatus } from '../types/handover';
import { NotificationEngine } from './NotificationEngine';

/**
 * ShiftHandoverManager (OOP Domain Service & State Machine)
 * Encapsulates the business rules for operational shift handover:
 * valid status transitions, condition escalation, 90-minute overdue detection, and 24-hour auto-archival policies.
 */
export class ShiftHandoverManager {
  public static readonly ARCHIVE_EXPIRATION_HOURS = 24;
  public static readonly OVERDUE_MINUTES_THRESHOLD = 90;

  /**
   * Menghitung selisih durasi dalam menit sejak log handover dibuat
   */
  public static getElapsedMinutes(createdAtStr: string): number {
    const itemTime = new Date(createdAtStr).getTime();
    if (isNaN(itemTime)) return 0;
    return Math.max(0, Math.floor((Date.now() - itemTime) / (60 * 1000)));
  }

  /**
   * Evaluasi apakah handover belum dikonfirmasi (unacknowledged) dan telah melewati batas toleransi 90 menit
   */
  public static isOverdue(item: ShiftHandoverEntity): boolean {
    if (item.acknowledged_at) return false;
    if (item.status === 'Selesai') return false;
    const elapsed = ShiftHandoverManager.getElapsedMinutes(item.created_at);
    return elapsed >= ShiftHandoverManager.OVERDUE_MINUTES_THRESHOLD;
  }

  /**
   * Memeriksa daftar handover aktif dan mengirimkan notifikasi eskalasi otomatis ke Supervisor
   * Dilengkapi Cooldown Guard (4 jam) agar tidak membanjiri notifikasi pengguna.
   */
  public static checkAndEscalateOverdue(handovers: ShiftHandoverEntity[]): ShiftHandoverEntity[] {
    const overdueList = handovers.filter((h) => ShiftHandoverManager.isOverdue(h));

    overdueList.forEach((item) => {
      const cooldownKey = `bib_handover_escalated_${item.id}`;
      const lastEscalated = localStorage.getItem(cooldownKey);
      const now = Date.now();
      const fourHoursMs = 4 * 60 * 60 * 1000;

      if (!lastEscalated || now - Number(lastEscalated) > fourHoursMs) {
        try {
          const minutes = ShiftHandoverManager.getElapsedMinutes(item.created_at);
          const hours = Math.floor(minutes / 60);
          const remMin = minutes % 60;
          const timeText = hours > 0 ? `${hours} jam ${remMin} menit` : `${minutes} menit`;

          NotificationEngine.addNotification({
            recipientId: item.next_supervisor_id || 'supervisor',
            recipientRole: 'supervisor',
            title: '⚠️ Eskalasi Serah Terima: Belum Dikonfirmasi',
            message: `Catatan serah terima Shift ${item.shift_type} (${item.handover_category}) dari ${item.author_name || 'Petugas'} belum dikonfirmasi selama ${timeText} (Status: ${item.condition_status}). Harap tindak lanjuti serah terima shift ini.`,
            type: 'system',
            metadata: {
              handoverId: item.id,
              escalatedAt: new Date().toISOString(),
              elapsedMinutes: minutes,
            },
          });
          localStorage.setItem(cooldownKey, String(now));
        } catch (e) {
          console.warn('[ShiftHandoverManager] Non-blocking escalation warning:', e);
        }
      }
    });

    return overdueList;
  }

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
