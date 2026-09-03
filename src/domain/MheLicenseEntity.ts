import { MheLicenseEntity as IMheLicenseEntity, LicenseType, LicenseStatus } from '../types/license';

/**
 * MheLicenseEntity (OOP Domain Model)
 * Encapsulates MHE (Material Handling Equipment) and K3 official licenses,
 * expiration monitoring, regulatory validity, and operational eligibility.
 */
export class MheLicenseEntity {
  public readonly id: string;
  public readonly workerId: string;
  public readonly workerName: string;
  public readonly employeeId: string;
  public readonly division: string;
  public readonly licenseType: LicenseType;
  public readonly licenseNumber: string;
  public readonly issuingAuthority: string;
  public readonly issuedDate: string;
  public readonly expiryDate: string;
  public status: LicenseStatus;
  public daysRemaining: number;
  public notes?: string;
  public documentUrl?: string;
  public verifiedBy?: string;
  public readonly createdAt: string;
  public updatedAt: string;

  constructor(data: IMheLicenseEntity) {
    this.id = data.id;
    this.workerId = data.workerId;
    this.workerName = data.workerName;
    this.employeeId = data.employeeId;
    this.division = data.division;
    this.licenseType = data.licenseType;
    this.licenseNumber = data.licenseNumber;
    this.issuingAuthority = data.issuingAuthority;
    this.issuedDate = data.issuedDate;
    this.expiryDate = data.expiryDate;
    this.notes = data.notes;
    this.documentUrl = data.documentUrl;
    this.verifiedBy = data.verifiedBy;
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;

    // Recalculate live status & remaining days on instantiation
    const computed = MheLicenseEntity.calculateStatusAndDays(data.expiryDate);
    this.status = computed.status;
    this.daysRemaining = computed.daysRemaining;
  }

  /**
   * Evaluates validity & remaining days from an expiry date string.
   */
  public static calculateStatusAndDays(expiryDateStr: string): { status: LicenseStatus; daysRemaining: number } {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const expiry = new Date(expiryDateStr);
    expiry.setHours(0, 0, 0, 0);

    const diffTime = expiry.getTime() - today.getTime();
    const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    let status: LicenseStatus = 'active';
    if (daysRemaining < 0) {
      status = 'expired';
    } else if (daysRemaining <= 30) {
      status = 'expiring_soon';
    }

    return { status, daysRemaining };
  }

  public isExpired(): boolean {
    return this.daysRemaining < 0;
  }

  public isExpiringSoon(): boolean {
    return this.daysRemaining >= 0 && this.daysRemaining <= 30;
  }

  public isActive(): boolean {
    return this.daysRemaining > 30;
  }

  /**
   * Operator is legally authorized to drive/operate if status is active or expiring soon (grace period)
   */
  public isEligibleToOperate(): boolean {
    return !this.isExpired();
  }

  /**
   * Checks if this license governs heavy equipment (Forklift or Reach Truck)
   */
  public isHeavyEquipmentMhe(): boolean {
    return this.licenseType.includes('Forklift') || this.licenseType.includes('Reach Truck');
  }

  public getStatusBadge(): { label: string; badgeCls: string } {
    if (this.isExpired()) {
      return {
        label: 'Kedaluwarsa (Non-Aktif)',
        badgeCls: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
      };
    }
    if (this.isExpiringSoon()) {
      return {
        label: `Segera Habis (${this.daysRemaining} Hari)`,
        badgeCls: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
      };
    }
    return {
      label: `Aktif (${this.daysRemaining} Hari)`,
      badgeCls: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    };
  }

  public toJSON(): IMheLicenseEntity {
    return {
      id: this.id,
      workerId: this.workerId,
      workerName: this.workerName,
      employeeId: this.employeeId,
      division: this.division,
      licenseType: this.licenseType,
      licenseNumber: this.licenseNumber,
      issuingAuthority: this.issuingAuthority,
      issuedDate: this.issuedDate,
      expiryDate: this.expiryDate,
      status: this.status,
      daysRemaining: this.daysRemaining,
      notes: this.notes,
      documentUrl: this.documentUrl,
      verifiedBy: this.verifiedBy,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}
