export type LicenseType =
  | 'SIO Forklift (Kelas II)'
  | 'SIO Reach Truck (Kelas I)'
  | 'SIM B2 Umum (Ekspedisi)'
  | 'Ahli K3 Umum Kemenaker'
  | 'Petugas P3K (First Aid)'
  | 'Auditor SMK3 / 5S';

export type LicenseStatus = 'active' | 'expiring_soon' | 'expired';

export interface MheLicenseEntity {
  id: string;
  workerId: string;
  workerName: string;
  employeeId: string;
  division: string;
  licenseType: LicenseType;
  licenseNumber: string;
  issuingAuthority: string;
  issuedDate: string; // YYYY-MM-DD
  expiryDate: string; // YYYY-MM-DD
  status: LicenseStatus;
  daysRemaining: number;
  notes?: string;
  documentUrl?: string;
  verifiedBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface LicenseStats {
  total: number;
  active: number;
  expiringSoon: number;
  expired: number;
}
