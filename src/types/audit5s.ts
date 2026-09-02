// src/types/audit5s.ts

export type ZoneType =
  | 'loading_dock'        // Area Loading & Unloading Dock
  | 'racking_aisle'       // Lorong Racking Rak Penyimpanan
  | 'charging_bay'        // Ruang Battery Charging Forklift / MHE
  | 'staging_area'        // Area Staging / Buffer Pallet Masuk & Keluar
  | 'weighbridge_pos'     // Pos Jaga & Timbangan Inbound / Outbound
  | 'office_area'         // Ruang Administrasi & Dokumen Operasional
  | 'other';              // Wilayah Gudang Lainnya

export type Rating5s = 'Gold' | 'Silver' | 'Bronze' | 'Perlu Perbaikan';

export interface Audit5sPillars {
  ringkas_seiri: number;    // 1. Ringkas (Seiri) - Pisahkan barang terpakai vs tidak terpakai, buang sampah (0-100)
  rapi_seiton: number;      // 2. Rapi (Seiton) - Penataan pallet pada marka, label identitas jelas (0-100)
  resik_seiso: number;      // 3. Resik (Seiso) - Lantai bebas debu, oli, ceceran & mesin bersih (0-100)
  rawat_seiketsu: number;   // 4. Rawat (Seiketsu) - Standardisasi visual, kontrol kebersihan konsisten (0-100)
  rajin_shitsuke: number;   // 5. Rajin (Shitsuke) - Kedisiplinan personel merawat zona kerja & briefing (0-100)
}

export interface WarehouseZone5s {
  id: string;
  name: string;
  zoneType: ZoneType;
  division: string;
  picWorkerId?: string;
  picWorkerName?: string;
  lastAuditedDate?: string;
  lastAuditScore?: number;
  badgeRating?: Rating5s;
  isActive: boolean;
  notes?: string;
}

export interface Audit5sRecord {
  id: string;
  auditRefNumber: string;         // e.g., 5S/DAM/2026/09/001
  zoneId: string;
  zoneName: string;
  division: string;
  auditorId?: string;
  auditorName: string;
  auditDate: string;
  scores: Audit5sPillars;
  totalScore: number;             // Rata-rata 5 pilar (0 - 100%)
  rating: Rating5s;
  findingsDescription?: string;   // Temuan ketidaksesuaian / catatan perbaikan
  correctiveAction?: string;      // Tindakan korektif yang disepakati
  beforePhotoUrl?: string;
  afterPhotoUrl?: string;
  allocatedRewardPoints: number;  // Poin reward BIB yang dialokasikan ke PIC zona
  status: 'passed' | 'needs_improvement' | 'critical_remedial';
  createdAt: string;
}

export interface Audit5sStats {
  totalZones: number;
  avgScore: number;
  goldZones: number;
  silverZones: number;
  improvementNeededZones: number;
  totalAuditsRecorded: number;
  totalRewardPointsAwarded: number;
}
