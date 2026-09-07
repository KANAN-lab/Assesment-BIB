/**
 * OOP Entity: Division
 * Encapsulates logistics division properties and methods.
 * Convention: name is the code itself (WFG, WRM, TIMBANGAN, GA, EXPEDISI, WSP)
 */
export class DivisionEntity {
  constructor(
    public readonly id: string,
    public name: string,        // e.g. "WFG" — kode singkat tanpa prefix
    public code: string,        // sama dengan name
    public description: string = ''
  ) {}

  public static createDefaultDivisions(): DivisionEntity[] {
    return [
      new DivisionEntity('div-wfg',       'Warehouse Finished Goods',   'WFG',      'Warehouse Finished Goods'),
      new DivisionEntity('div-wrm',       'Warehouse Raw Material',     'WRM',      'Warehouse Raw Material'),
      new DivisionEntity('div-wsp',       'Warehouse Sparepart',        'WSP',      'Warehouse Sparepart (Suku Cadang & Komponen Mesin)'),
      new DivisionEntity('div-timbangan', 'Jembatan Timbang',           'TIMBANGAN','Jembatan Timbang & Scale Operations'),
      new DivisionEntity('div-ga',        'General Affairs & Fasilitas','GA',       'General Affairs, K3 & Sarana Fasilitas'),
      new DivisionEntity('div-expedisi',  'Ekspedisi & Transportasi',   'EXPEDISI', 'Ekspedisi, Armada & Transportasi Logistik'),
    ];
  }

  public toJSON() {
    return {
      id: this.id,
      name: this.name,
      code: this.code,
      description: this.description,
    };
  }
}
