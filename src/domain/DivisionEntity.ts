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
      new DivisionEntity('div-wfg',       'WFG',      'WFG',      'Warehouse Finished Goods'),
      new DivisionEntity('div-wrm',       'WRM',      'WRM',      'Warehouse Raw Material'),
      new DivisionEntity('div-timbangan', 'TIMBANGAN','TIMBANGAN','Weighbridge & Scale Operations'),
      new DivisionEntity('div-ga',        'GA',       'GA',       'General Affairs & Operations'),
      new DivisionEntity('div-expedisi',  'EXPEDISI', 'EXPEDISI', 'Fleet & Expedition Logistics'),
      new DivisionEntity('div-wsp',       'WSP',      'WSP',      'Spare Parts Warehouse'),
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
