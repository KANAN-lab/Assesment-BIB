import { IncidentReport, IncidentReportHistory } from '../types/assessment';
import { SystemConfigService, SystemConfig } from './SystemConfigService';

/**
 * IncidentEntity (Domain Model)
 * Encapsulates incident report validation, status state-machine,
 * dynamic K3 reward point calculation, and CAPA compliance verification.
 */
export class IncidentEntity {
  public readonly id: string;
  public readonly workerId: string;
  public readonly workerName?: string;
  public readonly incidentType: IncidentReport['incidentType'];
  public readonly location: string;
  public readonly description: string;
  public readonly severity: IncidentReport['severity'];
  public status: IncidentReport['status'];
  public readonly occurredAt: string;
  public readonly createdAt: string;
  public resolvedAt?: string;
  public resolutionNote?: string;
  public photoUrl?: string;
  public gdriveFolderId?: string;
  public originalSizeKb?: number;
  public compressedSizeKb?: number;
  public pointsAwarded?: boolean;
  public rootCause?: string;
  public correctiveAction?: string;
  public assignedPic?: string;
  public dueDate?: string;
  public history?: IncidentReportHistory[];

  constructor(data: IncidentReport) {
    this.id = data.id;
    this.workerId = data.workerId;
    this.workerName = data.workerName;
    this.incidentType = data.incidentType;
    this.location = data.location;
    this.description = data.description;
    this.severity = data.severity;
    this.status = data.status;
    this.occurredAt = data.occurredAt;
    this.createdAt = data.createdAt;
    this.resolvedAt = data.resolvedAt;
    this.resolutionNote = data.resolutionNote;
    this.photoUrl = data.photoUrl;
    this.gdriveFolderId = data.gdriveFolderId;
    this.originalSizeKb = data.originalSizeKb;
    this.compressedSizeKb = data.compressedSizeKb;
    this.pointsAwarded = data.pointsAwarded;
    this.rootCause = data.rootCause;
    this.correctiveAction = data.correctiveAction;
    this.assignedPic = data.assignedPic;
    this.dueDate = data.dueDate;
    this.history = data.history;
  }

  public isNearMiss(): boolean {
    return this.incidentType === 'near_miss';
  }

  public isValidated(): boolean {
    return ['investigating', 'resolved', 'closed'].includes(this.status);
  }

  public isResolved(): boolean {
    return this.status === 'resolved' || this.status === 'closed';
  }

  public canAwardReward(): boolean {
    return !this.pointsAwarded && this.isValidated();
  }

  public calculateRewardPoints(config?: SystemConfig): number {
    const cfg = config || SystemConfigService.getConfig();
    return this.isNearMiss() ? cfg.nearMissRewardPoints : cfg.incidentValidRewardPoints;
  }

  public getStatusBadge(): { label: string; badgeCls: string } {
    switch (this.status) {
      case 'open':
        return { label: 'Terbuka / Menunggu Respon', badgeCls: 'bg-amber-500/10 text-amber-400 border-amber-500/30' };
      case 'investigating':
        return { label: 'Dalam Investigasi (CAPA)', badgeCls: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30' };
      case 'resolved':
        return { label: 'Tuntas (CAPA Disepakati)', badgeCls: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' };
      case 'closed':
        return { label: 'Ditutup (Arsip Resmi)', badgeCls: 'bg-zinc-800 text-zinc-400 border-zinc-700' };
      default:
        return { label: this.status, badgeCls: 'bg-zinc-800 text-zinc-400 border-zinc-700' };
    }
  }

  public hasCapaDetails(): boolean {
    return Boolean(this.rootCause?.trim() && this.correctiveAction?.trim() && this.assignedPic?.trim());
  }

  public toJSON(): IncidentReport {
    return {
      id: this.id,
      workerId: this.workerId,
      workerName: this.workerName,
      incidentType: this.incidentType,
      location: this.location,
      description: this.description,
      severity: this.severity,
      status: this.status,
      occurredAt: this.occurredAt,
      createdAt: this.createdAt,
      resolvedAt: this.resolvedAt,
      resolutionNote: this.resolutionNote,
      photoUrl: this.photoUrl,
      gdriveFolderId: this.gdriveFolderId,
      originalSizeKb: this.originalSizeKb,
      compressedSizeKb: this.compressedSizeKb,
      pointsAwarded: this.pointsAwarded,
      rootCause: this.rootCause,
      correctiveAction: this.correctiveAction,
      assignedPic: this.assignedPic,
      dueDate: this.dueDate,
      history: this.history,
    };
  }
}
