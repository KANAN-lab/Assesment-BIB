import { IncidentReport } from '../types/assessment';
import { IncidentEntity } from './IncidentEntity';
import { SystemConfigService } from './SystemConfigService';
import { NotificationEngine } from './NotificationEngine';
import { updateIncidentCapaAndStatus, fetchIncidentReports } from '../lib/supabaseService';

export interface IncidentValidationInput {
  incidentId: string;
  workerId: string;
  location: string;
  incidentType: IncidentReport['incidentType'];
  approved: boolean;
  rootCause: string;
  correctiveAction: string;
  assignedPic: string;
  dueDate: string;
  resolutionNote?: string;
  validatorName?: string;
}

/**
 * IncidentManager (Domain Service)
 * Encapsulates the business workflow for validating safety incidents,
 * managing CAPA lifecycle, computing reward points, and dispatching notifications.
 */
export class IncidentManager {
  /**
   * Validates an incident report, assigns CAPA details, and awards points if approved.
   */
  public static async validateAndApplyCapa(input: IncidentValidationInput): Promise<{
    success: boolean;
    pointsAwarded: number;
    newStatus: IncidentReport['status'];
  }> {
    const targetStatus: IncidentReport['status'] = input.approved ? 'investigating' : 'closed';
    const note = input.approved
      ? (input.resolutionNote?.trim() || 'Laporan insiden disetujui & terverifikasi valid oleh Pengawas K3.')
      : 'Laporan insiden ditolak (tidak memenuhi standar/kriteria K3).';

    const cfg = SystemConfigService.getConfig();
    const isNearMiss = input.incidentType === 'near_miss';
    const pointsToAward = input.approved ? (isNearMiss ? cfg.nearMissRewardPoints : cfg.incidentValidRewardPoints) : 0;

    await updateIncidentCapaAndStatus(input.incidentId, {
      status: targetStatus,
      rootCause: input.rootCause.trim(),
      correctiveAction: input.correctiveAction.trim(),
      assignedPic: input.assignedPic.trim(),
      dueDate: input.dueDate,
      resolutionNote: note,
      updatedBy: input.validatorName || 'Supervisor HSEQ',
      workerId: input.workerId,
    });

    if (input.approved) {
      NotificationEngine.addNotification({
        recipientId: input.workerId,
        recipientRole: 'worker',
        title: `🎉 Laporan Insiden K3 Disetujui! (+${pointsToAward} PTS)`,
        message: `Laporan Anda di ${input.location} disetujui Supervisor. Poin +${pointsToAward} PTS telah ditambahkan ke akun Anda.`,
        type: 'incident',
      });
    } else {
      NotificationEngine.addNotification({
        recipientId: input.workerId,
        recipientRole: 'worker',
        title: 'ℹ️ Update Status Laporan Insiden K3',
        message: `Laporan insiden Anda di ${input.location} tidak dapat diproses (Tidak Memenuhi Kriteria K3).`,
        type: 'incident',
      });
    }

    return {
      success: true,
      pointsAwarded: pointsToAward,
      newStatus: targetStatus,
    };
  }

  /**
   * Fetches all incidents wrapped as rich IncidentEntity objects
   */
  public static async getAllEntities(): Promise<IncidentEntity[]> {
    const rawList = await fetchIncidentReports();
    return rawList.map((item) => new IncidentEntity(item));
  }
}
