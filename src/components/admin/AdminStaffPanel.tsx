import React, { useState, useMemo } from 'react';
import SearchableSelect, { SelectOption } from '../ui/SearchableSelect';
import { createPortal } from 'react-dom';
import {
  UserCheck, Search, ChevronDown, Download, Upload, ArrowRightLeft,
  X, AlertTriangle, Loader2, Plus, Users, UserPlus, KeyRound
} from 'lucide-react';
import { WorkerProfile } from '../../types/assessment';
import { DivisionEntity } from '../../domain/DivisionEntity';
import { RoleEntity } from '../../domain/RoleEntity';
import { CustomDataTable, DataTableColumn } from '../CustomDataTable';
import { WorkerAvatar } from '../WorkerAvatar';
import { exportWorkersCSV, batchImportWorkers, createWorkerProfile } from '../../lib/supabaseService';
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
    if (roleUpper.includes('OPERATOR REACHTRUCK') || roleUpper.includes('REACHTRUCK')) role = 'Operator Reachtruck';
    else if (roleUpper.includes('OPERATOR FORKLIFT') && (roleUpper.includes('WSP') || divUpper.includes('WSP'))) role = 'Operator Forklift WSP';
    else if (roleUpper.includes('OPERATOR FORKLIFT')) role = 'Operator Forklift';
    else if (roleUpper.includes('CHECKER WFG')) role = 'Checker WFG';
    else if (roleUpper.includes('CHECKER WRM')) role = 'Checker WRM';
    else if (roleUpper.includes('CHECKER WSP') || (roleUpper.includes('CHECKER') && divUpper.includes('WSP'))) role = 'Checker WSP';
    else if (roleUpper.includes('PIC AREA')) role = 'PIC Area';
    else if (roleUpper.includes('ADMIN') && (roleUpper.includes('TIMBANGAN') || divUpper.includes('TIM'))) role = 'Admin Timbangan';
    else if (roleUpper.includes('ADMIN') && (roleUpper.includes('WRM') || divUpper.includes('WRM'))) role = 'Admin WRM';
    else if (roleUpper.includes('ADMIN') && (roleUpper.includes('WSP') || divUpper.includes('WSP'))) role = 'Admin WSP';
    else if (roleUpper.includes('ADMIN') && (roleUpper.includes('GA') || divUpper.includes('GA'))) role = 'Admin GA';
    else if (roleUpper.includes('ADMIN') && (roleUpper.includes('EXPEDISI') || roleUpper.includes('EKSPEDISI') || divUpper.includes('EXP'))) role = 'Admin Ekspedisi';
    else if (roleUpper.includes('ADMIN') && (roleUpper.includes('WFG') || divUpper.includes('WFG'))) role = 'Admin WFG';
    else if (roleUpper.includes('SUPERVISOR') || roleUpper.includes('SPV')) {
      if (divUpper.includes('WRM')) role = 'Supervisor WRM';
      else if (divUpper.includes('WSP')) role = 'Supervisor WSP';
      else role = 'Supervisor Logistik';
    }
    else if (roleUpper.includes('HSE') || roleUpper.includes('EHS') || roleUpper.includes('K3') || roleUpper.includes('SAFETY')) role = 'HSE Officer';
    else if (roleUpper.includes('GA') || roleUpper.includes('GENERAL AFFAIRS') || roleUpper.includes('FACILITY') || roleUpper.includes('FASILITAS')) role = 'GA & Facility Officer';
    else if (roleUpper.includes('HR') || roleUpper.includes('TRAINING') || roleUpper.includes('HRD') || roleUpper.includes('DEVELOPMENT')) role = 'HR & Training Specialist';

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
  const [filterCategory, setFilterCategory] = useState<'Semua' | 'worker' | 'specialist'>('Semua');

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

  // Add single worker modal state
  const [isAddWorkerModalOpen, setIsAddWorkerModalOpen] = useState(false);
  const [newWorkerEmpId, setNewWorkerEmpId] = useState('');
  const [newWorkerName, setNewWorkerName] = useState('');
  const [newWorkerEmail, setNewWorkerEmail] = useState('');
  const [newWorkerDivision, setNewWorkerDivision] = useState(divisions[0]?.code ?? 'WFG');
  const [newWorkerRole, setNewWorkerRole] = useState('');
  const [isCustomRole, setIsCustomRole] = useState(false);
  const [customRoleText, setCustomRoleText] = useState('');
  const [newWorkerPassword, setNewWorkerPassword] = useState('123');
  const [isSubmittingWorker, setIsSubmittingWorker] = useState(false);

  // Filtered roles available for new worker registration, categorized
  const { operationalRoles, specialistRoles, allDivisionRoles } = useMemo(() => {
    const matching = roles.filter(
      (r) => r.divisionCode === newWorkerDivision || r.name.toLowerCase().includes(newWorkerDivision.toLowerCase())
    );
    const pool = matching.length > 0 ? matching : roles;
    return {
      operationalRoles: pool.filter((r) => RoleEntity.isOperationalWorker(r.name)),
      specialistRoles: pool.filter((r) => !RoleEntity.isOperationalWorker(r.name)),
      allDivisionRoles: pool,
    };
  }, [roles, newWorkerDivision]);

  const handleOpenAddModal = () => {
    const defaultDiv = divisions[0]?.code ?? 'WFG';
    setNewWorkerDivision(defaultDiv);
    const matching = roles.filter((r) => r.divisionCode === defaultDiv);
    setNewWorkerRole(matching.length > 0 ? matching[0].name : 'Operator Forklift');
    setIsCustomRole(false);
    setCustomRoleText('');
    setNewWorkerEmpId('');
    setNewWorkerName('');
    setNewWorkerEmail('');
    setNewWorkerPassword('123');
    setIsAddWorkerModalOpen(true);
  };

  const handleCreateSingleWorker = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWorkerEmpId.trim() || !newWorkerName.trim()) {
      showToast('NIP dan Nama Lengkap wajib diisi.');
      return;
    }
    const finalRole = (isCustomRole ? customRoleText.trim() : newWorkerRole) || (allDivisionRoles[0]?.name ?? 'Operator Forklift');
    if (isCustomRole && !customRoleText.trim()) {
      showToast('Nama role kustom tidak boleh kosong.');
      return;
    }
    setIsSubmittingWorker(true);
    try {
      const created = await createWorkerProfile({
        employeeId: newWorkerEmpId.trim(),
        name: newWorkerName.trim(),
        email: newWorkerEmail.trim() || undefined,
        division: newWorkerDivision,
        role: finalRole,
        password: newWorkerPassword.trim() || '123',
        creatorAdminId: currentAdminId || 'System Admin',
        status: 'active',
      });
      showToast(`Pegawai ${created.name} (${created.role}) berhasil didaftarkan!`);
      setIsAddWorkerModalOpen(false);
      if (onWorkersUpdated) {
        onWorkersUpdated();
      } else {
        setTimeout(() => window.location.reload(), 1000);
      }
    } catch (err: any) {
      showToast(err?.message || 'Gagal mendaftarkan pegawai.');
    } finally {
      setIsSubmittingWorker(false);
    }
  };

  // Filtered workers list (Divisi & Kategori - pencarian dihandle otomatis oleh CustomDataTable)
  const filteredWorkers = useMemo(() => {
    return workers.filter((w) => {
      const matchDiv = filterDiv === 'Semua' || w.division === filterDiv;
      const isWorker = RoleEntity.isOperationalWorker(w.role);
      const matchCat =
        filterCategory === 'Semua' ||
        (filterCategory === 'worker' && isWorker) ||
        (filterCategory === 'specialist' && !isWorker);
      return matchDiv && matchCat;
    });
  }, [workers, filterDiv, filterCategory]);

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
      render: (w) => {
        const isWorker = RoleEntity.isOperationalWorker(w.role);
        return (
          <div className="text-xs space-y-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-white font-semibold">{w.role}</span>
              <span
                className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${
                  isWorker
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                    : 'bg-purple-500/10 text-purple-300 border-purple-500/20'
                }`}
              >
                {isWorker ? 'Staf Lapangan' : 'Pengawas / Spesialis'}
              </span>
            </div>
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300 inline-block">
              {w.division}
            </span>
          </div>
        );
      },
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
    <div className="card p-4 sm:p-5 space-y-4">
      {/* Table Header & Primary Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-zinc-800/80 pb-3">
        <div>
          <h3 className="font-bold text-white text-sm flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Daftar Personel Operasional & Spesialis ({workers.length})</span>
          </h3>
          <p className="text-[11px] text-zinc-500 mt-0.5">
            Kelola data staf lapangan, lisensi SIO, tier prestasi, dan mutasi jabatan lintas divisi
          </p>
        </div>

        {/* Primary Action Buttons (Desktop Inline, Mobile 2-Column Balanced) */}
        <div className="grid grid-cols-2 sm:flex items-center gap-2 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => setIsImportModalOpen(true)}
            className="flex items-center justify-center gap-1.5 px-3.5 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 rounded-xl text-xs font-bold transition shadow-sm min-h-[38px]"
            title="Import data pekerja massal dari format TSV/Text"
          >
            <Upload className="w-3.5 h-3.5 text-purple-400" />
            <span>Import TSV</span>
          </button>

          <button
            type="button"
            onClick={handleOpenAddModal}
            className="flex items-center justify-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition shadow-sm shadow-emerald-950/40 min-h-[38px]"
            title="Daftarkan satu personel operasional/spesialis baru ke sistem"
          >
            <UserPlus className="w-4 h-4" />
            <span>+ Tambah Pegawai</span>
          </button>
        </div>
      </div>

      {/* Unified Custom Data Table with Integrated Filters */}
      <CustomDataTable
        columns={workerColumns}
        data={filteredWorkers}
        searchPlaceholder="Cari nama, NIP, role, divisi..."
        searchFields={['name', 'employeeId', 'role', 'division']}
        defaultSortKey="name"
        exportFileName="Data_Staf_Operasional_PT_DAYA_ANUGRAH_MULYA"
        filterSlot={
          <>
            {/* Division Filter Dropdown */}
            <div className="relative flex-1 sm:flex-initial min-w-[130px] sm:min-w-[150px]">
              <select
                value={filterDiv}
                onChange={(e) => setFilterDiv(e.target.value)}
                className="appearance-none w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-3 pr-8 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500 font-medium"
              >
                <option value="Semua">Semua Divisi</option>
                {divisions.map((d) => (
                  <option key={d.id} value={d.code}>{d.code} — {d.name}</option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-zinc-500 absolute right-2.5 top-2.5 pointer-events-none" />
            </div>

            {/* Role Category Filter Dropdown */}
            <div className="relative flex-1 sm:flex-initial min-w-[140px] sm:min-w-[160px]">
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value as any)}
                className="appearance-none w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-3 pr-8 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500 font-medium"
              >
                <option value="Semua">Semua Kategori</option>
                <option value="worker">Staf Lapangan / Operator</option>
                <option value="specialist">Pengawas & Spesialis</option>
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-zinc-500 absolute right-2.5 top-2.5 pointer-events-none" />
            </div>
          </>
        }
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
                <SearchableSelect
                  value={targetMutatedDivision}
                  onChange={handleMutationDivisionChange}
                  placeholder="-- Pilih Divisi Baru --"
                  searchPlaceholder="Cari divisi..."
                  options={divisions.map((d): SelectOption => ({
                    value: d.code,
                    label: `${d.code} — ${d.description || d.name}`,
                  }))}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1">2. Role Baru (Spesifik Divisi)</label>
                <SearchableSelect
                  value={targetMutatedRole}
                  onChange={setTargetMutatedRole}
                  placeholder="-- Pilih Role Baru --"
                  searchPlaceholder="Cari role..."
                  options={availableRolesForMutation.map((r): SelectOption => ({
                    value: r.name,
                    label: `${r.name} (${RoleEntity.isOperationalWorker(r.name) ? 'Staf Lapangan' : 'Pengawas / Spesialis'})`,
                  }))}
                />
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

      {/* ─── MODAL TAMBAH PEGAWAI BARU ─── */}
      {isAddWorkerModalOpen && createPortal(
        <div
          className="fixed inset-0 z-[9999] overflow-y-auto bg-black/85 backdrop-blur-xl p-4 sm:p-6 flex items-center justify-center min-h-screen animate-fade-in"
          onClick={() => setIsAddWorkerModalOpen(false)}
        >
          <div
            className="relative w-full max-w-lg m-auto card-elevated p-6 space-y-4 border border-emerald-500/40 shadow-2xl shadow-emerald-950/40"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-emerald-500/20 rounded-xl text-emerald-400 border border-emerald-500/30">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-sm">Registrasi Pegawai Baru</h3>
                  <p className="text-[11px] text-zinc-400">Daftarkan personel operasional atau spesialis (HSE, GA, HR, SPV)</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAddWorkerModalOpen(false)}
                className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateSingleWorker} className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-zinc-300 mb-1">
                    NIP / Employee ID <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={newWorkerEmpId}
                    onChange={(e) => setNewWorkerEmpId(e.target.value)}
                    placeholder="cth. 128000095"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-300 mb-1">
                    Password Awal
                  </label>
                  <div className="relative">
                    <KeyRound className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      value={newWorkerPassword}
                      onChange={(e) => setNewWorkerPassword(e.target.value)}
                      placeholder="123"
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1">
                  Nama Lengkap <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newWorkerName}
                  onChange={(e) => setNewWorkerName(e.target.value)}
                  placeholder="cth. Ahmad Zaki, S.T."
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1">
                  Email Operasional (Opsional)
                </label>
                <input
                  type="email"
                  value={newWorkerEmail}
                  onChange={(e) => setNewWorkerEmail(e.target.value)}
                  placeholder="cth. ahmad.zaki@dam.co.id"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-zinc-300 mb-1">
                    Divisi Penempatan <span className="text-rose-400">*</span>
                  </label>
                  <select
                    value={newWorkerDivision}
                    onChange={(e) => {
                      const div = e.target.value;
                      setNewWorkerDivision(div);
                      const matching = roles.filter(r => r.divisionCode === div);
                      setNewWorkerRole(matching.length > 0 ? matching[0].name : 'Operator Forklift');
                    }}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
                  >
                    {divisions.map((d) => (
                      <option key={d.id} value={d.code}>{d.code} — {d.description || d.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-zinc-300">
                      Role / Jabatan <span className="text-rose-400">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setIsCustomRole(!isCustomRole)}
                      className="text-[10px] text-emerald-400 hover:underline font-semibold"
                    >
                      {isCustomRole ? 'Pilih dari List' : '+ Ketik Kustom'}
                    </button>
                  </div>
                  {isCustomRole ? (
                    <input
                      type="text"
                      required
                      value={customRoleText}
                      onChange={(e) => setCustomRoleText(e.target.value)}
                      placeholder="cth. Safety Officer, Facility Lead..."
                      className="w-full bg-zinc-950 border border-emerald-500/50 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500"
                    />
                  ) : (
                    <select
                      value={newWorkerRole}
                      onChange={(e) => setNewWorkerRole(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                    >
                      {operationalRoles.length > 0 && (
                        <optgroup label="Staf Lapangan / Operator">
                          {operationalRoles.map((r) => (
                            <option key={r.id} value={r.name}>{r.name}</option>
                          ))}
                        </optgroup>
                      )}
                      {specialistRoles.length > 0 && (
                        <optgroup label="Pengawas & Spesialis">
                          {specialistRoles.map((r) => (
                            <option key={r.id} value={r.name}>{r.name}</option>
                          ))}
                        </optgroup>
                      )}
                      {operationalRoles.length === 0 && specialistRoles.length === 0 && (
                        <option value="Operator Forklift">Operator Forklift</option>
                      )}
                    </select>
                  )}
                </div>
              </div>

              {/* Dynamic Contextual Authorization Feedback */}
              {(() => {
                const chosenRole = isCustomRole ? customRoleText : newWorkerRole;
                const sysRole = RoleEntity.resolveSystemRole(chosenRole);
                const isOp = RoleEntity.isOperationalWorker(chosenRole);

                let consoleTitle = 'Portal Staf Lapangan Operasional';
                let consoleDesc = 'Akses Kuis K3 Harian, Pre-Shift Checklist MHE, Papan Kaizen & Marketplace Poin BIB.';

                if (sysRole === 'hse') {
                  consoleTitle = 'Konsol K3 / HSE Specialist';
                  consoleDesc = 'Akses Investigasi Insiden, Verifikasi CAPA, Lisensi SIO Kemnaker & Gemba Walk Safety Patrol.';
                } else if (sysRole === 'ga') {
                  consoleTitle = 'Konsol General Affairs & Fasilitas';
                  consoleDesc = 'Akses Manajemen Stok APD, Master Fasilitas Gudang & Audit Standar 5R/5S.';
                } else if (sysRole === 'hr') {
                  consoleTitle = 'Konsol HR & Training Specialist';
                  consoleDesc = 'Akses Matriks 54 Kompetensi, Kurikulum Kuis Adaptif & Penegakan Disiplin SP K3.';
                } else if (sysRole === 'supervisor') {
                  consoleTitle = 'Konsol Supervisor Operasional';
                  consoleDesc = 'Akses Audit Lapangan BIB, Validasi Insiden Shift & Monitoring Ritme Kerja Lapangan.';
                }

                return (
                  <div className={`p-3 rounded-xl border text-[11px] space-y-1.5 transition-all ${
                    isOp
                      ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-200'
                      : 'bg-purple-950/40 border-purple-500/30 text-purple-200'
                  }`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 font-bold">
                        <span className={`w-2 h-2 rounded-full ${isOp ? 'bg-emerald-400' : 'bg-purple-400'}`}></span>
                        <span>{consoleTitle}</span>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded font-mono font-bold bg-zinc-900/80 border border-zinc-700 text-zinc-300">
                        {isOp ? 'Staf Lapangan' : 'Pengawas & Spesialis'}
                      </span>
                    </div>
                    <p className="text-[10.5px] leading-relaxed text-zinc-300">
                      {consoleDesc}
                    </p>
                    <div className="text-[10px] text-zinc-400 pt-0.5">
                      Status Akun: <strong className="text-emerald-400">Langsung Aktif</strong> (Otorisasi Resmi Administrator)
                    </div>
                  </div>
                );
              })()}

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsAddWorkerModalOpen(false)}
                  className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-bold rounded-xl transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingWorker}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition flex items-center gap-2 shadow-md shadow-emerald-900/30"
                >
                  {isSubmittingWorker ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UserPlus className="w-3.5 h-3.5" />}
                  <span>Daftarkan Pegawai</span>
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
