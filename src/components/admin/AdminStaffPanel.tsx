import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  UserCheck, Search, ChevronDown, Download, Upload, ArrowRightLeft,
  X, AlertTriangle, Loader2, Plus, Users
} from 'lucide-react';
import { WorkerProfile } from '../../types/assessment';
import { DivisionEntity } from '../../domain/DivisionEntity';
import { RoleEntity } from '../../domain/RoleEntity';
import { CustomDataTable, DataTableColumn } from '../CustomDataTable';
import { WorkerAvatar } from '../WorkerAvatar';
import { exportWorkersCSV, batchImportWorkers } from '../../lib/supabaseService';
import { RoleMutationManager } from '../../domain/RoleMutationManager';
import { SystemConfigService } from '../../domain/SystemConfigService';

export const SAMPLE_EMPLOYEE_IMPORT_DATA = `328000257\tAGUNG BAGASKARA\tOperator Forklift (WFG)\tWFG
328000261\tARANIKITA BERU SIBIRO\tAdmin (Timbangan)\tTIM
328000254\tARI MUHAMAD RIDWAN\tOperator Forklift (WFG)\tWFG
328000301\tCINDY PERMATASARI\tAdmin (WRM)\tWRM
328000251\tDEDE SAMAN N\tChecker WFG (WFG)\tWFG
328000080\tILHAM PAOJI MUHAROM\tOperator Forklift (WRM)\tWRM
328000262\tJUJUN JUNAEDI\tOPERATOR FORKLIFT (WFG)\tWFG
328000148\tM ALFIKRI\tChecker WFG (WFG)\tWFG
328000263\tMAGIE MAGHFIRA\tADMIN (WFG)\tWFG
328000256\tMIFTAHUS SALAM\tOperator Forklift (WRM)\tWRM
328000237\tMUHAMAD GAMAN\tOperator Forklift (WRM)\tWRM
328000271\tNURYANA\tOperator Forklift (WRM)\tWRM
328000097\tYOGI RUDIYANTO\tPIC Area (WRM)\tWRM
328000318\tMELIA SALSABILA\tAdmin (GA)\tGA
328000359\tFIRLY MEITASARI\tAdmin (Expedisi)\tEXP
328000391\tRANGGA ADITYA\tChecker WFG (WFG)\tWFG
328000409\tSUHENDI\tPIC Area (WRM)\tWRM
328000419\tCECEP SUKMA WIJAYA\tChecker WFG (WFG)\tWFG
328000434\tANGGI MEIDIAN\tPIC Area (WRM)\tWRM
328000440\tASTRI NUR AULIYA\tAdmin (WRM)\tWRM
328000438\tWANDI ISMAYADI\tPIC Area (WRM)\tWRM
328000439\tDENI AZI PRASTYO\tPIC Area (WRM)\tWRM
328000443\tADIS SUPRIATNA\tAdmin (WFG)\tWFG
328000453\tABDUL HUSNI \tPIC Area (WRM)\tWRM
328000471\tSAHRUL ZANURI\tPIC Area (WRM)\tWRM
328000488\tMUCHAMAD AZIS NURJAMAN\tOPERATOR FORKLIFT (WFG)\tWFG
328000494\tAkhmad Yuri Maulana\tOperator Forklift (WFG)\tWFG
328000513\tRAKA PUTRA\tOperator Forklift (WRM)\tWRM
328000516\tAcep Saepulloh\tOperator Forklift (WRM)\tWRM
328000603\tAhmad hafid\tOperator Forklift (WRM)\tWRM
328000610\tABDUL KAHFI\tOperator Forklift (WFG)\tWFG
328000616\tYENI NURHAENI\tOperator Forklift (WFG)\tWRM
328000680\tNATASYA SHAFIRA\tAdmin (WRM)\tWRM
328000639\tSURYA SUBASTIAN\tOperator Forklift (WRM)\tWRM
328000697\tAZIE RAMADANI\tOPERATOR FORKLIFT (WFG)\tWFG
328000707\tAgung Purwanto\tOperator Forklift (WFG)\tWFG
328000712\tAwing\tChecker WRM (WRM)\tWRM
328000714\tNurasyiah\tAdmin (WRM)\tWRM
328000720\tBurhan Fauzi Nawawi\tOperator Forklift (WFG)\tWFG
328000721\tBenito Fabiyan\tAdmin (WFG)\tWFG
328000723\tAndika Aulya Rahman\tChecker WFG (WFG)\tWFG
328000731\tAbdul Harish Anshori\tOperator Forklift (WFG)\tWFG
328000730\tFajar Sampurna Putra\tOperator Forklift (WFG)\tWFG
328000719\tNOVA HARDIANSYAH\tOPERATOR FORKLIFT (WFG)\tWFG
328000737\tDIAN PERMANA\tOPERATOR FORKLIFT (WRM)\tWRM
328000740\tIRFAN ZAINI\tCHECKER WFG (WFG)\tWFG
328000748\tSeptiyan Nugraha\tCHECKER WFG (WFG)\tWFG
328000746\tDwi Purnomo\tOperator Forklift (WFG)\tWFG
328000747\tDODY PRASETYA\tOPERATOR FORKLIFT (WFG)\tWFG
328000752\tYADI KUSNAEDI\tOPERATOR FORKLIFT (WFG)\tWFG
328000753\tMuchlis Hudaya\tOperator Forklift (WFG)\tWFG
328000757\tHILMAN RUHIYAT\tOPERATOR FORKLIFT (WFG)\tWFG
328000756\tAGUS NURFAJAR\tCHECKER WRM (WRM)\tWRM
328000767\tINDRI\tADMIN (WRM)\tWRM
328000780\tRiki Rikmawan\tOPERATOR FORKLIFT (WFG)\tWFG`;

export interface ParsedImportRow {
  employeeId: string;
  name: string;
  role: string;
  division: string;
  isDuplicate: boolean;
}

export function parseTSVEmployeeData(text: string, existingIds: Set<string>): ParsedImportRow[] {
  const lines = text.trim().split('\n');
  const results: ParsedImportRow[] = [];
  const seenIds = new Set<string>(existingIds);

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    let parts = trimmed.split('\t');
    if (parts.length < 2) parts = trimmed.split(/ {2,}/);
    if (parts.length < 2) continue;

    const employeeId = parts[0].trim();
    const name = parts[1].trim();
    const rawRole = parts[2]?.trim() || 'Operator Forklift';
    const rawDiv = parts[3]?.trim() || 'WFG';

    let division = rawDiv.toUpperCase();
    const divUpper = rawDiv.toUpperCase();
    if (divUpper.includes('TIMBANGAN') || divUpper.includes('TIM')) division = 'TIMBANGAN';
    else if (divUpper.includes('WRM')) division = 'WRM';
    else if (divUpper.includes('GA')) division = 'GA';
    else if (divUpper.includes('EXP') || divUpper.includes('EKSPEDISI')) division = 'EXPEDISI';
    else if (divUpper.includes('WSP')) division = 'WSP';
    else if (divUpper.includes('WFG')) division = 'WFG';

    let role = rawRole.replace(/\s*\([^)]*\)/g, '').trim();
    if (!role) role = rawRole;

    const roleUpper = role.toUpperCase();
    if (roleUpper.includes('OPERATOR FORKLIFT')) role = 'Operator Forklift';
    else if (roleUpper.includes('OPERATOR REACHTRUCK') || roleUpper.includes('REACHTRUCK')) role = 'Operator Reachtruck';
    else if (roleUpper.includes('CHECKER WFG')) role = 'Checker WFG';
    else if (roleUpper.includes('CHECKER WRM')) role = 'Checker WRM';
    else if (roleUpper.includes('PIC AREA')) role = 'PIC Area';
    else if (roleUpper.includes('ADMIN') && (roleUpper.includes('TIMBANGAN') || divUpper.includes('TIM'))) role = 'Admin Timbangan';
    else if (roleUpper.includes('ADMIN') && (roleUpper.includes('WRM') || divUpper.includes('WRM'))) role = 'Admin WRM';
    else if (roleUpper.includes('ADMIN') && (roleUpper.includes('GA') || divUpper.includes('GA'))) role = 'Admin GA';
    else if (roleUpper.includes('ADMIN') && (roleUpper.includes('EXPEDISI') || roleUpper.includes('EKSPEDISI') || divUpper.includes('EXP'))) role = 'Admin Ekspedisi';
    else if (roleUpper.includes('ADMIN') && (roleUpper.includes('WFG') || divUpper.includes('WFG'))) role = 'Admin WFG';

    const isDuplicate = seenIds.has(employeeId);
    seenIds.add(employeeId);

    results.push({ employeeId, name, role, division, isDuplicate });
  }

  return results;
}

interface AdminStaffPanelProps {
  workers: WorkerProfile[];
  divisions: DivisionEntity[];
  roles: RoleEntity[];
  currentAdminId?: string;
  showToast: (msg: string) => void;
  onWorkersUpdated?: () => void;
}

export const AdminStaffPanel: React.FC<AdminStaffPanelProps> = ({
  workers,
  divisions,
  roles,
  currentAdminId,
  showToast,
  onWorkersUpdated,
}) => {
  const [filterDiv, setFilterDiv] = useState('Semua');
  const [searchTerm, setSearchTerm] = useState('');

  // Import modal state
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importRawText, setImportRawText] = useState('');
  const [isImporting, setIsImporting] = useState(false);

  // Mutation modal state
  const [isMutationModalOpen, setIsMutationModalOpen] = useState(false);
  const [selectedMutationWorker, setSelectedMutationWorker] = useState<WorkerProfile | null>(null);
  const [targetMutatedRole, setTargetMutatedRole] = useState('');
  const [targetMutatedDivision, setTargetMutatedDivision] = useState('');
  const [mutationReason, setMutationReason] = useState('');
  const [isMutating, setIsMutating] = useState(false);

  // Filtered workers list
  const filteredWorkers = useMemo(() => {
    return workers.filter((w) => {
      const matchDiv = filterDiv === 'Semua' || w.division === filterDiv;
      const matchSearch =
        w.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        w.employeeId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        w.role.toLowerCase().includes(searchTerm.toLowerCase());
      return matchDiv && matchSearch;
    });
  }, [workers, filterDiv, searchTerm]);

  // Roles available for mutation target
  const availableRolesForMutation = useMemo(() => {
    if (!targetMutatedDivision) return roles;
    const filtered = roles.filter(
      (r) => r.divisionCode === targetMutatedDivision || r.name.toLowerCase().includes(targetMutatedDivision.toLowerCase())
    );
    return filtered.length > 0 ? filtered : roles;
  }, [roles, targetMutatedDivision]);

  const handleMutationDivisionChange = (newDivCode: string) => {
    setTargetMutatedDivision(newDivCode);
    const matching = roles.filter(
      (r) => r.divisionCode === newDivCode || r.name.toLowerCase().includes(newDivCode.toLowerCase())
    );
    if (matching.length > 0) {
      setTargetMutatedRole(matching[0].name);
    }
  };

  const handleOpenMutationModal = (worker: WorkerProfile) => {
    setSelectedMutationWorker(worker);
    setTargetMutatedDivision(worker.division);
    const matching = roles.filter(
      (r) => r.divisionCode === worker.division || r.name.toLowerCase().includes(worker.division.toLowerCase())
    );
    setTargetMutatedRole(matching.length > 0 ? matching[0].name : worker.role);
    setMutationReason('');
    setIsMutationModalOpen(true);
  };

  const handleExecuteMutation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMutationWorker) return;

    if (selectedMutationWorker.role === targetMutatedRole && selectedMutationWorker.division === targetMutatedDivision) {
      showToast('Role dan Divisi baru harus berbeda dari posisi saat ini.');
      return;
    }

    setIsMutating(true);
    try {
      const res = await RoleMutationManager.executeRoleMutation({
        workerId: selectedMutationWorker.id,
        newRole: targetMutatedRole,
        newDivision: targetMutatedDivision,
        mutatedBy: currentAdminId || 'System Admin',
        reason: mutationReason.trim() || 'Mutasi Role & Divisi Operasional',
      });

      showToast(`Berhasil memindahkan ${selectedMutationWorker.name} dari ${res.previousRole} (${res.previousDivision}) ke ${targetMutatedRole} (${targetMutatedDivision})! ${res.archivedScoresCount} skor audit diarsipkan & di-reset bersih.`);
      setIsMutationModalOpen(false);

      if (onWorkersUpdated) {
        onWorkersUpdated();
      } else {
        setTimeout(() => window.location.reload(), 1000);
      }
    } catch (err: any) {
      showToast(err?.message || 'Gagal memproses mutasi role.');
    } finally {
      setIsMutating(false);
    }
  };

  // Parsed TSV Import Rows
  const parsedImportRows = useMemo(() => {
    if (!importRawText.trim()) return [];
    const existingIds = new Set<string>(workers.map((w) => w.employeeId));
    return parseTSVEmployeeData(importRawText, existingIds);
  }, [importRawText, workers]);

  const validImportRows = useMemo(() => {
    return parsedImportRows.filter((r) => !r.isDuplicate);
  }, [parsedImportRows]);

  const handleRunBatchImport = async () => {
    if (validImportRows.length === 0) return;
    setIsImporting(true);
    try {
      const payload = validImportRows.map((r) => ({
        employeeId: r.employeeId,
        name: r.name,
        role: r.role,
        division: r.division,
      }));

      const res = await batchImportWorkers(payload);
      showToast(`Berhasil mengimpor ${res.successCount} pekerja baru ke database!`);
      setIsImportModalOpen(false);
      setImportRawText('');

      if (onWorkersUpdated) {
        onWorkersUpdated();
      } else {
        setTimeout(() => window.location.reload(), 1000);
      }
    } catch (err: any) {
      showToast(`Gagal import: ${err.message}`);
    } finally {
      setIsImporting(false);
    }
  };

  // DataTable Columns
  const workerColumns: DataTableColumn<WorkerProfile>[] = [
    {
      key: 'name',
      header: 'Pekerja',
      sortable: true,
      render: (w) => (
        <div className="flex items-center gap-3 min-w-[200px]">
          <WorkerAvatar src={w.avatar} name={w.name} />
          <div>
            <div className="font-bold text-white text-xs">{w.name}</div>
            <div className="text-[10px] text-zinc-500 font-mono">
              {w.employeeId} {w.email && `· ${w.email}`}
            </div>
          </div>
        </div>
      ),
    },
    {
      key: 'division',
      header: 'Divisi & Role',
      sortable: true,
      render: (w) => (
        <div className="text-xs">
          <div className="text-white font-semibold">{w.role}</div>
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300">
            {w.division}
          </span>
        </div>
      ),
    },
    {
      key: 'tier',
      header: 'Tier',
      sortable: true,
      render: (w) => {
        const tierDef = SystemConfigService.getTierByName(w.tier);
        return (
          <span
            className="text-[10px] font-bold px-2 py-0.5 rounded inline-flex items-center gap-1"
            style={SystemConfigService.getTierBadgeStyle(w.tier)}
          >
            <span>{tierDef?.icon || '🔰'}</span>
            <span>{w.tier}</span>
          </span>
        );
      },
    },
    {
      key: 'totalPoints',
      header: 'Poin',
      sortable: true,
      align: 'right',
      render: (w) => (
        <span className="font-mono text-amber-400 font-bold text-xs">
          {(w.totalPoints || 0).toLocaleString()} PTS
        </span>
      ),
    },
    {
      key: 'bibScores.totalScore',
      header: 'Skor BIB',
      sortable: true,
      align: 'center',
      render: (w) => (
        <span className="font-mono text-xs font-black text-emerald-400 bg-emerald-950/30 px-2 py-1 rounded border border-emerald-500/20">
          {w.bibScores?.totalScore?.toFixed(1) ?? '0.0'}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Aksi Mutasi',
      align: 'center',
      render: (w) => (
        <button
          type="button"
          onClick={() => handleOpenMutationModal(w)}
          className="px-2.5 py-1 bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/30 rounded-lg text-[11px] font-bold transition flex items-center gap-1.5 mx-auto"
          title="Pindahkan Role/Divisi Staf (Clean Slate)"
        >
          <ArrowRightLeft className="w-3 h-3 text-purple-400" />
          <span>Mutasi</span>
        </button>
      ),
    },
  ];

  return (
    <div className="card p-5 space-y-4">
      {/* Table Toolbar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <h3 className="font-bold text-white text-xs flex items-center gap-2">
          <UserCheck className="w-4 h-4 text-emerald-400" />
          Daftar Personel Operasional ({filteredWorkers.length})
        </h3>

        <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
          {/* Division Filter Dropdown */}
          <div className="relative">
            <select
              value={filterDiv}
              onChange={(e) => setFilterDiv(e.target.value)}
              className="appearance-none bg-zinc-950 border border-zinc-800 rounded-xl pl-3 pr-8 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
            >
              <option value="Semua">Semua Divisi</option>
              {divisions.map((d) => (
                <option key={d.id} value={d.code}>{d.code} — {d.name}</option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-zinc-500 absolute right-2.5 top-2.5 pointer-events-none" />
          </div>

          {/* Search */}
          <div className="relative flex-1 min-w-48">
            <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Cari nama, NIP, role..."
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Export CSV Button */}
          <button
            type="button"
            onClick={() => exportWorkersCSV(filteredWorkers)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 rounded-xl text-xs font-bold transition"
            title="Ekspor daftar pekerja ke file CSV"
          >
            <Download className="w-3.5 h-3.5 text-emerald-400" />
            <span>Export CSV</span>
          </button>

          {/* Import Massal Button */}
          <button
            type="button"
            onClick={() => setIsImportModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition shadow-sm"
            title="Import data pekerja massal dari format TSV/Text"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Import TSV</span>
          </button>
        </div>
      </div>

      {/* Reusable Data Table */}
      <CustomDataTable
        columns={workerColumns}
        data={filteredWorkers}
        searchPlaceholder="Cari NIP, nama, role, divisi..."
        defaultSortKey="name"
        exportFileName="Data_Staf_Operasional_PT_DAYA_ANUGRAH_MULYA"
      />

      {/* ─── MODAL IMPORT MASSAL TSV ─── */}
      {isImportModalOpen && createPortal(
        <div
          className="fixed inset-0 z-[9999] overflow-y-auto bg-black/90 backdrop-blur-xl p-4 sm:p-6 flex items-center justify-center min-h-screen animate-fade-in"
          onClick={() => setIsImportModalOpen(false)}
        >
          <div
            className="relative w-full max-w-3xl max-h-[90vh] m-auto card-elevated p-6 space-y-4 border border-emerald-500/30 overflow-y-auto custom-scrollbar"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-2.5">
                <Upload className="w-5 h-5 text-emerald-400" />
                <div>
                  <h3 className="text-sm font-bold text-white">Import Massal Staf Operasional</h3>
                  <p className="text-xs text-zinc-400">Salin & tempel baris data dari Excel / Spreadsheet (Format: NIP, Nama, Role, Divisi)</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsImportModalOpen(false)}
                className="text-zinc-500 hover:text-white p-1 rounded-lg hover:bg-zinc-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-zinc-300">Data Tab-Separated (TSV):</label>
                <button
                  type="button"
                  onClick={() => setImportRawText(SAMPLE_EMPLOYEE_IMPORT_DATA)}
                  className="text-xs text-emerald-400 hover:underline font-semibold"
                >
                  Muat Contoh Data (55 Baris)
                </button>
              </div>

              <textarea
                rows={6}
                value={importRawText}
                onChange={(e) => setImportRawText(e.target.value)}
                placeholder="Tempel data Excel di sini..."
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-xs font-mono text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-emerald-500"
              />

              {/* Preview Table */}
              {parsedImportRows.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-white">
                      Pratinjau ({validImportRows.length} valid / {parsedImportRows.length - validImportRows.length} duplikat)
                    </span>
                  </div>

                  <div className="max-h-48 overflow-y-auto border border-zinc-800 rounded-xl bg-zinc-950 custom-scrollbar text-xs">
                    <table className="w-full text-left font-mono">
                      <thead className="bg-zinc-900 sticky top-0 text-[10px] text-zinc-400 uppercase">
                        <tr>
                          <th className="p-2">#</th>
                          <th className="p-2">NIP</th>
                          <th className="p-2 font-sans">Nama</th>
                          <th className="p-2 font-sans">Role</th>
                          <th className="p-2">Divisi</th>
                          <th className="p-2">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-800/60">
                        {parsedImportRows.slice(0, 15).map((row, idx) => (
                          <tr key={idx} className={row.isDuplicate ? 'bg-amber-950/20 text-amber-300' : 'text-zinc-300'}>
                            <td className="p-2 text-zinc-500">{idx + 1}</td>
                            <td className="p-2 text-emerald-400 font-bold">{row.employeeId}</td>
                            <td className="p-2 font-sans font-semibold text-white">{row.name}</td>
                            <td className="p-2 font-sans">{row.role}</td>
                            <td className="p-2 font-bold">{row.division}</td>
                            <td className="p-2">
                              {row.isDuplicate ? (
                                <span className="text-[10px] bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded">Duplikat</span>
                              ) : (
                                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded">Siap</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {parsedImportRows.length > 15 && (
                      <div className="p-2 text-center text-[10px] text-zinc-500 bg-zinc-900/50">
                        ...dan {parsedImportRows.length - 15} baris lainnya
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-800">
              <button
                type="button"
                onClick={() => setIsImportModalOpen(false)}
                className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-bold rounded-xl transition"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleRunBatchImport}
                disabled={isImporting || validImportRows.length === 0}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition flex items-center gap-2"
              >
                {isImporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                <span>Import {validImportRows.length} Pekerja</span>
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ─── MODAL MUTASI ROLE & DIVISI PEKERJA ─── */}
      {isMutationModalOpen && selectedMutationWorker && createPortal(
        <div
          className="fixed inset-0 z-[9999] overflow-y-auto bg-black/90 backdrop-blur-xl p-4 sm:p-6 flex items-center justify-center min-h-screen animate-fade-in"
          onClick={() => setIsMutationModalOpen(false)}
        >
          <div
            className="relative w-full max-w-lg m-auto card-elevated p-6 space-y-4 border border-purple-500/30 overflow-y-auto custom-scrollbar"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-2.5">
                <ArrowRightLeft className="w-5 h-5 text-purple-400" />
                <div>
                  <h3 className="text-sm font-bold text-white">Mutasi Role & Divisi Pekerja</h3>
                  <p className="text-xs text-zinc-400">Protokol Pemindahan Posisi Operasional (Clean Slate Baseline)</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsMutationModalOpen(false)}
                className="text-zinc-500 hover:text-white p-1 rounded-lg hover:bg-zinc-800 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Current Worker Summary */}
            <div className="bg-zinc-900 p-3 rounded-xl border border-zinc-800 flex items-center justify-between text-xs">
              <div>
                <div className="font-bold text-white">{selectedMutationWorker.name}</div>
                <div className="text-[11px] font-mono text-zinc-500">NIP: {selectedMutationWorker.employeeId}</div>
              </div>
              <div className="text-right">
                <div className="text-[10px] text-zinc-500 uppercase font-semibold">Posisi Saat Ini</div>
                <div className="font-bold text-emerald-400">{selectedMutationWorker.role} ({selectedMutationWorker.division})</div>
              </div>
            </div>

            {/* Warning Alert */}
            <div className="bg-amber-500/10 border border-amber-500/30 p-3 rounded-xl flex items-start gap-2.5 text-xs text-amber-200">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <strong className="block text-amber-300 font-bold mb-0.5">Penegakan Clean Slate Baseline:</strong>
                Nilai audit role lama otomatis <strong>diarsipkan terisolasi</strong>. Skor audit role baru akan dimulai murni dari angka 0.
              </div>
            </div>

            <form onSubmit={handleExecuteMutation} className="space-y-3 pt-1">
              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1">1. Divisi Baru</label>
                <select
                  value={targetMutatedDivision}
                  onChange={(e) => handleMutationDivisionChange(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
                >
                  {divisions.map((d) => (
                    <option key={d.id} value={d.code}>{d.code} — {d.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1">2. Role Baru (Spesifik Divisi)</label>
                <select
                  value={targetMutatedRole}
                  onChange={(e) => setTargetMutatedRole(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
                >
                  {availableRolesForMutation.map((r) => (
                    <option key={r.id} value={r.name}>{r.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1">Alasan Mutasi (Opsional)</label>
                <input
                  type="text"
                  value={mutationReason}
                  onChange={(e) => setMutationReason(e.target.value)}
                  placeholder="cth. Rotasi Operasional Q3, Promosi..."
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsMutationModalOpen(false)}
                  className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-bold rounded-xl transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isMutating}
                  className="px-5 py-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition flex items-center gap-2 shadow-md shadow-purple-900/30"
                >
                  {isMutating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ArrowRightLeft className="w-3.5 h-3.5" />}
                  <span>Eksekusi Mutasi</span>
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
