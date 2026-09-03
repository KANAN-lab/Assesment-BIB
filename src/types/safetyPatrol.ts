/**
 * Safety Patrol & Gemba Walk Types
 * PT. DAYA ANUGRAH MULYA
 */

export type FindingType = 'Unsafe Act' | 'Unsafe Condition' | 'Good Practice';
export type PatrolSeverity = 'Low' | 'Medium' | 'High' | 'Critical';
export type PatrolStatus = 'Open' | 'In Progress' | 'Resolved';

export interface SafetyPatrolRecord {
  id: string;
  supervisorId: string;
  supervisorName: string;
  patrolDate: string; // ISO date string
  zoneId: string;
  zoneName: string;
  findingType: FindingType;
  severity: PatrolSeverity;
  description: string;
  photoUrl?: string | null;
  assignedPicId?: string | null;
  assignedPicName?: string | null;
  status: PatrolStatus;
  dueDate?: string | null; // YYYY-MM-DD
  resolutionNotes?: string | null;
  resolvedAt?: string | null;
  pointsAwarded?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface WarehouseZoneOption {
  id: string;
  name: string;
  division: string;
  riskLevel: 'Low' | 'Medium' | 'High';
  description: string;
}

export const WAREHOUSE_PATROL_ZONES: WarehouseZoneOption[] = [
  {
    id: 'ZONE-WFG-BAY-1',
    name: 'Finished Goods (WFG) — High Bay Rack 1-4',
    division: 'WFG',
    riskLevel: 'High',
    description: 'Area lalu lintas forklift & reachtruck rak vertikal tingkat 5.',
  },
  {
    id: 'ZONE-WFG-STAGING',
    name: 'WFG — Staging Area & Buffer Stock',
    division: 'WFG',
    riskLevel: 'Medium',
    description: 'Area penumpukan palet siap kirim & packing akhir.',
  },
  {
    id: 'ZONE-LOADING-DOCK',
    name: 'Loading Dock A & B (Ekspedisi Outbound)',
    division: 'EXPEDISI',
    riskLevel: 'High',
    description: 'Pintu bongkar muat kontainer & dock leveler armada trailer.',
  },
  {
    id: 'ZONE-WRM-INBOUND',
    name: 'Raw Material (WRM) — Inbound Receiving',
    division: 'WRM',
    riskLevel: 'High',
    description: 'Area penerimaan bahan baku & inspeksi awal karantina.',
  },
  {
    id: 'ZONE-WRM-STORAGE',
    name: 'WRM — Gudang Bahan Baku & Silo',
    division: 'WRM',
    riskLevel: 'Medium',
    description: 'Penyimpanan bahan baku dengan standar pallet flow.',
  },
  {
    id: 'ZONE-BATTERY-ROOM',
    name: 'Battery Charging Station MHE (Forklift & Reachtruck)',
    division: 'WFG',
    riskLevel: 'High',
    description: 'Area pengisian aki forklift, ventilasi gas hidrogen & eyewash.',
  },
  {
    id: 'ZONE-WEIGHBRIDGE',
    name: 'Jembatan Timbang & Pos Manifest',
    division: 'TIMBANGAN',
    riskLevel: 'Medium',
    description: 'Jalur keluar masuk truk tronton & pemeriksaan tonase.',
  },
  {
    id: 'ZONE-WORKSHOP-MHE',
    name: 'Workshop Bengkel Pemeliharaan MHE',
    division: 'GA',
    riskLevel: 'Medium',
    description: 'Area perbaikan unit forklift, penanganan oli dan grease.',
  },
];

export const SEVERITY_CONFIG: Record<
  PatrolSeverity,
  { label: string; badgeClass: string; borderClass: string; colorHex: string }
> = {
  Low: {
    label: 'Rendah (Low)',
    badgeClass: 'bg-zinc-800 text-zinc-300 border-zinc-700',
    borderClass: 'border-zinc-700',
    colorHex: '#71717a',
  },
  Medium: {
    label: 'Sedang (Medium)',
    badgeClass: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    borderClass: 'border-amber-500/40',
    colorHex: '#f59e0b',
  },
  High: {
    label: 'Tinggi (High)',
    badgeClass: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
    borderClass: 'border-orange-500/40',
    colorHex: '#f97316',
  },
  Critical: {
    label: 'Kritis (Critical)',
    badgeClass: 'bg-rose-500/20 text-rose-300 border-rose-500/30 font-black animate-pulse',
    borderClass: 'border-rose-500/60',
    colorHex: '#ef4444',
  },
};

export const FINDING_TYPE_CONFIG: Record<
  FindingType,
  { label: string; badgeClass: string; icon: string }
> = {
  'Unsafe Act': {
    label: 'Tindakan Tidak Aman (Unsafe Act)',
    badgeClass: 'bg-rose-950/70 text-rose-300 border-rose-500/30',
    icon: 'UserX',
  },
  'Unsafe Condition': {
    label: 'Kondisi Tidak Aman (Unsafe Condition)',
    badgeClass: 'bg-amber-950/70 text-amber-300 border-amber-500/30',
    icon: 'AlertTriangle',
  },
  'Good Practice': {
    label: 'Praktik Positif / Kepatuhan K3 (Good Practice)',
    badgeClass: 'bg-emerald-950/70 text-emerald-300 border-emerald-500/30',
    icon: 'CheckCircle2',
  },
};
