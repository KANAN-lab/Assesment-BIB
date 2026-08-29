/**
 * OOP Entity: Role
 * Encapsulates operational role properties and methods.
 * Convention: name matches SQL workers.role values exactly.
 */
export class RoleEntity {
  constructor(
    public readonly id: string,
    public name: string,        // e.g. "Operator Forklift", "Admin WFG", "PIC Area"
    public divisionCode: string,// matching DivisionEntity.code (WFG, WRM, etc.)
    public description: string = ''
  ) {}

  public static createDefaultRoles(): RoleEntity[] {
    return [
      new RoleEntity('role-forklift',       'Operator Forklift', 'WFG',      'Operator armada forklift finished goods / raw material'),
      new RoleEntity('role-reachtruck',     'Operator Reachtruck','WFG',     'Operator armada reach truck high bay warehouse'),
      new RoleEntity('role-checker-wfg',   'Checker WFG',        'WFG',      'Petugas pemeriksa & verifikasi barang masuk/keluar WFG'),
      new RoleEntity('role-checker-wrm',   'Checker WRM',        'WRM',      'Petugas pemeriksa & verifikasi barang masuk/keluar WRM'),
      new RoleEntity('role-pic-area',       'PIC Area',           'WRM',      'Penanggung jawab area operasional gudang'),
      new RoleEntity('role-admin-wfg',      'Admin WFG',          'WFG',      'Administrator pengolah data operasional WFG'),
      new RoleEntity('role-admin-wrm',      'Admin WRM',          'WRM',      'Administrator pengolah data raw material'),
      new RoleEntity('role-admin-timbangan','Admin Timbangan',    'TIMBANGAN','Administrator operasional jembatan timbang'),
      new RoleEntity('role-admin-ekspedisi','Admin Ekspedisi',    'EXPEDISI', 'Administrator manifest armada & ekspedisi'),
      new RoleEntity('role-admin-ga',       'Admin GA',           'GA',       'Administrator umum & sarana pendukung'),
    ];
  }

  public matchesKey(key: string): boolean {
    return this.name.toLowerCase().includes(key.toLowerCase());
  }

  public static resolveSystemRole(roleName: string): 'worker' | 'supervisor' | 'admin' {
    const r = (roleName || '').toLowerCase().trim();
    // Only System Administrator / Administrator gets System Admin Apps console access
    if (r === 'system administrator' || r === 'administrator' || r === 'app administrator' || r === 'sysadmin' || r === 'admin apps') {
      return 'admin';
    }
    // Supervisors / Pengawas get Supervisor console access (PIC Area is an operational worker role, NOT supervisor)
    if (r.includes('supervisor') || r.includes('pengawas') || r.includes('head') || r === 'spv' || r.includes('supervisor logistik')) {
      return 'supervisor';
    }
    // Operational Staff (Operator Forklift, Checker, PIC Area, Admin WFG, Admin WRM, Admin Timbangan, etc.) get Worker access
    return 'worker';
  }

  public static isOperationalWorker(roleName: string): boolean {
    return this.resolveSystemRole(roleName) === 'worker';
  }
}
