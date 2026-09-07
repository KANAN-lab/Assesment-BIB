/**
 * OOP Entity: Role
 * Encapsulates operational role properties and methods.
 * Convention: name matches SQL workers.role values exactly.
 */

import { SystemRole } from '../types/assessment';

export class RoleEntity {
  constructor(
    public readonly id: string,
    public name: string,        // e.g. "Operator Forklift", "HSE Officer", "Admin WFG"
    public divisionCode: string,// matching DivisionEntity.code (WFG, WRM, GA, etc.)
    public description: string = ''
  ) {}

  public static createDefaultRoles(): RoleEntity[] {
    return [
      new RoleEntity('role-forklift',       'Operator Forklift',         'WFG',      'Operator armada forklift finished goods / raw material'),
      new RoleEntity('role-reachtruck',     'Operator Reachtruck',       'WFG',      'Operator armada reach truck high bay warehouse'),
      new RoleEntity('role-checker-wfg',   'Checker WFG',                'WFG',      'Petugas pemeriksa & verifikasi barang masuk/keluar WFG'),
      new RoleEntity('role-checker-wrm',   'Checker WRM',                'WRM',      'Petugas pemeriksa & verifikasi barang masuk/keluar WRM'),
      new RoleEntity('role-pic-area',       'PIC Area',                   'WRM',      'Penanggung jawab area operasional gudang'),
      new RoleEntity('role-admin-wfg',      'Admin WFG',                  'WFG',      'Administrator pengolah data operasional WFG'),
      new RoleEntity('role-admin-wrm',      'Admin WRM',                  'WRM',      'Administrator pengolah data raw material'),
      new RoleEntity('role-admin-timbangan','Admin Timbangan',            'TIMBANGAN','Administrator operasional jembatan timbang'),
      new RoleEntity('role-admin-ekspedisi','Admin Ekspedisi',            'EXPEDISI', 'Administrator manifest armada & ekspedisi'),
      new RoleEntity('role-admin-ga',       'Admin GA',                   'GA',       'Administrator umum & sarana pendukung fasilitas'),
      new RoleEntity('role-checker-wsp',    'Checker WSP',                'WSP',      'Petugas penerimaan, penataan rak part & pengeluaran sparepart'),
      new RoleEntity('role-admin-wsp',      'Admin WSP',                  'WSP',      'Administrator stok suku cadang, reorder level & kartu stok'),
      new RoleEntity('role-forklift-wsp',   'Operator Forklift WSP',      'WSP',      'Operator armada handling suku cadang & komponen mesin'),
      new RoleEntity('role-spv-wsp',        'Supervisor WSP',             'WSP',      'Pengawas operasional warehouse sparepart'),
      new RoleEntity('role-spv-wfg',        'Supervisor Logistik',        'WFG',      'Pengawas operasional lapangan, ritme kerja & audit BIB'),
      new RoleEntity('role-spv-wrm',        'Supervisor WRM',             'WRM',      'Pengawas operasional gudang raw material'),
      new RoleEntity('role-hse-officer',    'HSE Officer',                'GA',       'Spesialis K3, investigasi insiden & kepatuhan SIO Kemnaker'),
      new RoleEntity('role-ga-officer',     'GA & Facility Officer',      'GA',       'Pengelola sarana fasilitas, audit 5R/5S & master stok APD'),
      new RoleEntity('role-hr-training',    'HR & Training Specialist',   'GA',       'Pengelola matriks kompetensi, kurikulum kuis & disiplin staf'),
    ];
  }

  public matchesKey(key: string): boolean {
    return this.name.toLowerCase().includes(key.toLowerCase());
  }

  /**
   * Resolves the enterprise system authorization role based on employee position title.
   * Maps to 6 distinct roles: 'worker' | 'supervisor' | 'hse' | 'ga' | 'hr' | 'admin'
   */
  public static resolveSystemRole(roleName: string): SystemRole {
    const r = (roleName || '').toLowerCase().trim();

    // 1. System Administrator
    if (
      r === 'system administrator' ||
      r === 'administrator' ||
      r === 'app administrator' ||
      r === 'sysadmin' ||
      r === 'admin apps'
    ) {
      return 'admin';
    }

    // 2. HSE / EHS Specialist
    if (
      r.includes('hse') ||
      r.includes('ehs') ||
      r.includes('k3') ||
      r.includes('safety officer') ||
      r.includes('safety inspector') ||
      r.includes('ahli k3')
    ) {
      return 'hse';
    }

    // 3. General Affairs & Facility Management
    if (
      r.includes('general affairs') ||
      r.includes('ga officer') ||
      r.includes('fasilitas') ||
      r.includes('facility') ||
      r === 'admin ga' ||
      r.includes('maintenance lead')
    ) {
      return 'ga';
    }

    // 4. Human Resources & Training Development
    if (
      r.includes('human resources') ||
      r.includes('people development') ||
      r.includes('trainer') ||
      r.includes('training') ||
      r.includes('hrd') ||
      r === 'hr' ||
      r.includes('hr specialist')
    ) {
      return 'hr';
    }

    // 5. Operational Supervisor / Pengawas Lapangan
    if (
      r.includes('supervisor') ||
      r.includes('pengawas') ||
      r.includes('head') ||
      r === 'spv' ||
      r.includes('supervisor logistik') ||
      r.includes('section manager')
    ) {
      return 'supervisor';
    }

    // 6. Operational Worker (Operator Forklift, Checker, PIC Area, Admin WFG/WRM, dll.)
    return 'worker';
  }

  public static isOperationalWorker(roleName: string): boolean {
    return this.resolveSystemRole(roleName) === 'worker';
  }

  public static isManagementRole(role: SystemRole): boolean {
    return role !== 'worker';
  }

  public static getRoleLabel(role: SystemRole): string {
    switch (role) {
      case 'admin':
        return 'System Administrator';
      case 'hse':
        return 'HSE / EHS Specialist';
      case 'ga':
        return 'General Affairs & Facility';
      case 'hr':
        return 'HR & Training Specialist';
      case 'supervisor':
        return 'Operational Supervisor';
      case 'worker':
      default:
        return 'Operational Employee';
    }
  }
}
