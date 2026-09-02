import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { WorkerProfile, CompetencyItem, Announcement, IncidentReport, ActivityLog, RewardItem, TierType } from '../types/assessment';
import { DivisionEntity } from '../domain/DivisionEntity';
import { RoleEntity } from '../domain/RoleEntity';
import { RewardEntity } from '../domain/RewardEntity';
import matrixData from '../data/matrixData.json';
import { PaginationControls } from './PaginationControls';
import { SkeletonLoader } from './SkeletonLoader';
import {
  Settings, UserCheck, Plus, Search, TableProperties,
  ShieldAlert, Award, FileSpreadsheet, Upload, Check, Trash2, Edit3,
  CheckCircle2, Building2, UserPlus, ChevronDown, Zap, RefreshCw, AlertTriangle, Key, Cpu, Clock, Sparkles, HelpCircle,
  Megaphone, Activity, BarChart2, Download, X, Calendar, ToggleLeft, ToggleRight, ShoppingBag, PackageCheck, History, Coins, PackagePlus, Edit2, Loader2, AlertCircle, Users, ShieldCheck, ArrowRightLeft, ExternalLink, BookOpen, Bell, Truck, HardHat, FileText
} from 'lucide-react';
import { WorkerAvatar } from './WorkerAvatar';
import { CustomDataTable, DataTableColumn } from './CustomDataTable';
import { getQuizStatusMeta, forceRefreshDailyQuiz, clearQuizCache, QuizStatusMeta, saveGeminiApiKeyToSupabase } from '../lib/geminiService';
import { supabase } from '../lib/supabaseClient';
import {
  fetchAnnouncements, createAnnouncement, toggleAnnouncement, deleteAnnouncement,
  fetchIncidentReports, updateIncidentStatus, updateIncidentCapaAndStatus,
  fetchActivityLog, exportWorkersCSV, exportIncidentsCSV,
  fetchAllRedemptionHistory, fulfillRedemption, AdminRedemptionRecord,
  batchImportWorkers, mutateWorkerRoleAndDivision
} from '../lib/supabaseService';
import { SystemConfigService, FREQUENCY_OPTIONS } from '../domain/SystemConfigService';
import { ExecutivePDFReportGenerator } from '../lib/pdfReportService';

// ─── Granular Lazy-Loaded Sub-Panels (Performance Optimization) ───
const AdminAnalytics = React.lazy(() => import('./AdminAnalytics').then(m => ({ default: m.AdminAnalytics })));
const ActivityLogPanel = React.lazy(() => import('./ActivityLogPanel').then(m => ({ default: m.ActivityLogPanel })));
const BadgeManagementPanel = React.lazy(() => import('./BadgeManagementPanel').then(m => ({ default: m.BadgeManagementPanel })));
const QuizManagementPanel = React.lazy(() => import('./QuizManagementPanel').then(m => ({ default: m.QuizManagementPanel })));
const SopManagementPanel = React.lazy(() => import('./SopManagementPanel').then(m => ({ default: m.SopManagementPanel })));
const KaizenKanbanBoard = React.lazy(() => import('./KaizenKanbanBoard').then(m => ({ default: m.KaizenKanbanBoard })));
const AdminNotificationPanel = React.lazy(() => import('./AdminNotificationPanel').then(m => ({ default: m.AdminNotificationPanel })));
const MheLicensePanel = React.lazy(() => import('./MheLicensePanel').then(m => ({ default: m.MheLicensePanel })));
const PpeManagementPanel = React.lazy(() => import('./PpeManagementPanel').then(m => ({ default: m.PpeManagementPanel })));
const ExecutiveReportPanel = React.lazy(() => import('./ExecutiveReportPanel').then(m => ({ default: m.ExecutiveReportPanel })));
const DisciplinaryPanel = React.lazy(() => import('./DisciplinaryPanel').then(m => ({ default: m.DisciplinaryPanel })));
const Audit5sPanel = React.lazy(() => import('./Audit5sPanel').then(m => ({ default: m.Audit5sPanel })));
const SystemConfigPanel = React.lazy(() => import('./SystemConfigPanel').then(m => ({ default: m.SystemConfigPanel })));

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
328000780\tRiki Rikmawan\tOPERATOR FORKLIFT (WFG)\tWFG
328000782\tRizky Mochamad Ramdani\tOPERATOR FORKLIFT (WFG)\tWFG`;

function parseRawImportText(text: string) {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  const results: { employeeId: string; name: string; role: string; division: string; isDuplicate: boolean }[] = [];
  const seenIds = new Set<string>();

  for (const line of lines) {
    let parts = line.split('\t').map((p) => p.trim());
    if (parts.length < 3) {
      parts = line.split(/\s{2,}/).map((p) => p.trim());
    }
    if (parts.length < 3) continue;

    const employeeId = parts[0] || '';
    let rawName = parts[1] || '';
    let rawRole = parts[2] || '';
    let rawDivCode = parts[3] || '';

    // Title case for Name
    const name = rawName
      .toLowerCase()
      .replace(/(^\w|\s\w)/g, (m) => m.toUpperCase());

    // Normalize Division
    let division = 'WFG';
    const divUpper = (rawDivCode || rawRole).toUpperCase();
    if (divUpper.includes('WRM')) division = 'WRM';
    else if (divUpper.includes('TIM') || divUpper.includes('TIMBANGAN')) division = 'TIMBANGAN';
    else if (divUpper.includes('GA')) division = 'GA';
    else if (divUpper.includes('EXP') || divUpper.includes('EKSPEDISI')) division = 'EXPEDISI';
    else if (divUpper.includes('WSP')) division = 'WSP';
    else if (divUpper.includes('WFG')) division = 'WFG';

    // Normalize Role
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

interface AdminConsoleProps {
  workers: WorkerProfile[];
  currentAdminId?: string;
  onApproveWorker?: (workerId: string) => void;
  onRejectWorker?: (workerId: string) => void;
  rewardCatalog?: RewardItem[];
  onCreateReward?: (item: Omit<RewardItem, 'id'>) => Promise<void> | void;
  onUpdateReward?: (rewardId: string, updates: Partial<Omit<RewardItem, 'id'>>) => Promise<void> | void;
  onRestockReward?: (rewardId: string, addStock: number) => Promise<void> | void;
  onDeleteReward?: (rewardId: string) => Promise<void> | void;
}

export const AdminConsole: React.FC<AdminConsoleProps> = ({
  workers,
  currentAdminId,
  onApproveWorker,
  onRejectWorker,
  rewardCatalog = [],
  onCreateReward,
  onUpdateReward,
  onRestockReward,
  onDeleteReward,
}) => {
  const [activeTab, setActiveTab] = useState<'workers' | 'approvals' | 'divisions' | 'roles' | 'matrix' | 'ai-quiz' | 'analytics' | 'announcements' | 'incidents' | 'kaizen' | 'activity' | 'rewards' | 'badges' | 'quiz' | 'config' | 'sop' | 'notifications' | 'licenses' | 'ppe' | 'reports' | 'disciplinary' | 'audit-5s'>('workers');
  const [quizMeta, setQuizMeta] = useState<QuizStatusMeta>(() => getQuizStatusMeta());
  const [refreshingQuiz, setRefreshingQuiz] = useState(false);

  // OOP Domain state
  const [divisions, setDivisions] = useState<DivisionEntity[]>(DivisionEntity.createDefaultDivisions());
  const [roles, setRoles] = useState<RoleEntity[]>(RoleEntity.createDefaultRoles());

  // Tambah Divisi — name otomatis jadi code (uppercase)
  const [newDivName, setNewDivName] = useState('');
  const [newDivDesc, setNewDivDesc] = useState('');

  // Tambah Role
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleDivCode, setNewRoleDivCode] = useState(divisions[0]?.code ?? 'WFG');
  const [newRoleDesc, setNewRoleDesc] = useState('');

  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Role & Division Mutation state
  const [isMutationModalOpen, setIsMutationModalOpen] = useState(false);
  const [selectedMutationWorker, setSelectedMutationWorker] = useState<WorkerProfile | null>(null);
  const [targetMutatedRole, setTargetMutatedRole] = useState('');
  const [targetMutatedDivision, setTargetMutatedDivision] = useState('');
  const [mutationReason, setMutationReason] = useState('');
  const [isMutating, setIsMutating] = useState(false);

  // Photo viewer & incident lightbox state
  const [viewingIncidentPhoto, setViewingIncidentPhoto] = useState<{ url: string; title: string; subtitle: string; sizes?: string } | null>(null);

  // Incident Control, CAPA & Filtering state
  const [incidentSearchQuery, setIncidentSearchQuery] = useState('');
  const [incidentSeverityFilter, setIncidentSeverityFilter] = useState<string>('all');
  const [incidentStatusFilter, setIncidentStatusFilter] = useState<string>('all');

  // CAPA Follow-Up Modal state
  const [selectedCapaIncident, setSelectedCapaIncident] = useState<IncidentReport | null>(null);
  const [capaRootCause, setCapaRootCause] = useState('');
  const [capaCorrectiveAction, setCapaCorrectiveAction] = useState('');
  const [capaAssignedPic, setCapaAssignedPic] = useState('');
  const [capaDueDate, setCapaDueDate] = useState('');
  const [capaStatus, setCapaStatus] = useState<IncidentReport['status']>('investigating');
  const [capaNote, setCapaNote] = useState('');
  const [isSubmittingCapa, setIsSubmittingCapa] = useState(false);
  const [inputApiKey, setInputApiKey] = useState('');
  const [savingKey, setSavingKey] = useState(false);





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
      const res = await mutateWorkerRoleAndDivision(
        selectedMutationWorker.id,
        targetMutatedRole,
        targetMutatedDivision,
        currentAdminId || 'System Admin',
        mutationReason.trim() || 'Mutasi Role & Divisi Operasional'
      );

      showToast(`Berhasil memindahkan ${selectedMutationWorker.name} dari ${res.previousRole} (${res.previousDivision}) ke ${targetMutatedRole} (${targetMutatedDivision})! Skor audit lama diarsipkan & di-reset bersih.`);
      setIsMutationModalOpen(false);

      setTimeout(() => {
        window.location.reload();
      }, 1200);
    } catch (err: any) {
      showToast(err?.message || 'Gagal memproses mutasi role.');
    } finally {
      setIsMutating(false);
    }
  };

  // Import Massal Worker state
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importRawText, setImportRawText] = useState('');
  const [isImporting, setIsImporting] = useState(false);

  const parsedImportRows = useMemo(() => {
    if (!importRawText.trim()) return [];
    return parseRawImportText(importRawText);
  }, [importRawText]);

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
      showToast(`Berhasil mengimpor ${res.successCount} data pekerja baru!`);
      setIsImportModalOpen(false);
      setImportRawText('');

      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (err: any) {
      showToast(`Gagal mengimpor data: ${err?.message || 'Error'}`);
    } finally {
      setIsImporting(false);
    }
  };

  // Pending supervisor requests
  const pendingSupervisors = useMemo(() => {
    return workers.filter((w) => w.status === 'pending_approval');
  }, [workers]);

  // Worker search + pagination
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDiv, setFilterDiv] = useState('Semua');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 8;

  const filteredWorkers = useMemo(() => {
    return workers.filter((w) => {
      // Exclude System Administrator & Supervisor console users from operational worker list
      if (!RoleEntity.isOperationalWorker(w.role) || w.division.toUpperCase() === 'SYSTEM') return false;

      const matchSearch =
        w.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        w.employeeId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        w.role.toLowerCase().includes(searchTerm.toLowerCase());
      const matchDiv = filterDiv === 'Semua' || w.division === filterDiv;
      return matchSearch && matchDiv;
    });
  }, [workers, searchTerm, filterDiv]);

  const workerColumns: DataTableColumn<WorkerProfile>[] = useMemo(() => [
    {
      key: 'name',
      header: 'Nama Pekerja',
      sortable: true,
      render: (w) => (
        <div className="flex items-center gap-2.5">
          <WorkerAvatar src={w.avatar} name={w.name} className="w-7 h-7 rounded-lg ring-1 ring-zinc-700 shrink-0" />
          <span className="font-semibold text-white">{w.name}</span>
        </div>
      ),
    },
    { key: 'employeeId', header: 'NIP', sortable: true },
    {
      key: 'role',
      header: 'Role Operasional',
      sortable: true,
      render: (w) => (
        <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded text-[10px] font-bold">
          {w.role}
        </span>
      ),
    },
    {
      key: 'division',
      header: 'Divisi',
      sortable: true,
      render: (w) => (
        <span className="bg-zinc-800 text-zinc-300 px-2 py-0.5 rounded font-mono text-[10px] font-bold">
          {w.division}
        </span>
      ),
    },
    {
      key: 'bibScore',
      header: 'Skor BIB',
      sortable: true,
      align: 'center',
      render: (w) => (
        <span className="font-black text-emerald-400">{w.bibScores.totalScore.toFixed(1)}</span>
      ),
    },
    {
      key: 'totalPoints',
      header: 'Poin Reward',
      sortable: true,
      align: 'center',
      render: (w) => (
        <span className="font-bold text-amber-300">{w.totalPoints.toLocaleString()}</span>
      ),
    },
    { key: 'tier', header: 'Tier Performance', sortable: true, align: 'right' },
    {
      key: 'actions',
      header: 'Aksi Management',
      align: 'right',
      render: (w) => (
        <button
          onClick={() => handleOpenMutationModal(w)}
          className="px-2.5 py-1 bg-purple-600/20 hover:bg-purple-600/40 text-purple-300 border border-purple-500/30 rounded-lg text-[11px] font-bold transition flex items-center gap-1 ml-auto"
          title="Pindahkan Role / Divisi Pekerja dengan Clean Slate Reset"
        >
          <ArrowRightLeft className="w-3 h-3 text-purple-400" />
          Mutasi
        </button>
      ),
    },
  ], []);

  const paginatedWorkers = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredWorkers.slice(start, start + pageSize);
  }, [filteredWorkers, currentPage, pageSize]);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  const handleAddDivision = (e: React.FormEvent) => {
    e.preventDefault();
    const code = newDivName.trim().toUpperCase();
    if (!code) return;
    if (divisions.find((d) => d.code === code)) {
      showToast(`Divisi "${code}" sudah terdaftar.`);
      return;
    }
    const newDiv = new DivisionEntity(`div-${Date.now()}`, code, code, newDivDesc);
    setDivisions((prev) => [...prev, newDiv]);
    setNewDivName('');
    setNewDivDesc('');
    showToast(`Divisi "${code}" berhasil ditambahkan.`);
  };

  const handleAddRole = (e: React.FormEvent) => {
    e.preventDefault();
    const name = newRoleName.trim();
    if (!name) return;
    if (roles.find((r) => r.name.toLowerCase() === name.toLowerCase())) {
      showToast(`Role "${name}" sudah terdaftar.`);
      return;
    }
    const newRole = new RoleEntity(`role-${Date.now()}`, name, newRoleDivCode, newRoleDesc);
    setRoles((prev) => [...prev, newRole]);
    setNewRoleName('');
    setNewRoleDesc('');
    showToast(`Role "${name}" berhasil ditambahkan.`);
  };

  const handleForceRefreshQuiz = async () => {
    setRefreshingQuiz(true);
    try {
      const updatedMeta = await forceRefreshDailyQuiz('WFG', 'Operator Forklift');
      setQuizMeta(updatedMeta);
      showToast('Berhasil menguji koneksi Gappy AI & meregenerasi 5 soal K3 harian baru!');
    } catch (e: any) {
      setQuizMeta(getQuizStatusMeta());
      showToast(e?.message || 'Gagal terhubung ke Gappy AI API. Mengakses Supabase Bank.');
    } finally {
      setRefreshingQuiz(false);
    }
  };

  const handleClearQuizCache = () => {
    clearQuizCache();
    setQuizMeta(getQuizStatusMeta());
    showToast('Cache kuis harian berhasil dibersihkan.');
  };

  const competencyItems: CompetencyItem[] = matrixData.competencyMatrix;

  // ─── Announcements state ──────────────────────────────────────────────────
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [annLoading, setAnnLoading] = useState(false);
  const [newAnnTitle, setNewAnnTitle] = useState('');
  const [newAnnContent, setNewAnnContent] = useState('');
  const [newAnnPriority, setNewAnnPriority] = useState<Announcement['priority']>('normal');
  const [newAnnExpiry, setNewAnnExpiry] = useState('');

  // ─── Incidents state ─────────────────────────────────────────────────────
  const [incidents, setIncidents] = useState<IncidentReport[]>([]);
  const [incidentsLoading, setIncidentsLoading] = useState(false);

  const loadIncidents = async () => {
    setIncidentsLoading(true);
    try {
      const data = await fetchIncidentReports();
      setIncidents(data);
    } catch (e) {
      console.warn('Gagal memuat insiden:', e);
    } finally {
      setIncidentsLoading(false);
    }
  };

  const filteredIncidents = useMemo(() => {
    return incidents.filter((inc) => {
      const matchSearch =
        !incidentSearchQuery.trim() ||
        (inc.description || '').toLowerCase().includes(incidentSearchQuery.toLowerCase()) ||
        (inc.location || '').toLowerCase().includes(incidentSearchQuery.toLowerCase()) ||
        (inc.workerName || '').toLowerCase().includes(incidentSearchQuery.toLowerCase());

      const matchSeverity = incidentSeverityFilter === 'all' || inc.severity === incidentSeverityFilter;
      const matchStatus = incidentStatusFilter === 'all' || inc.status === incidentStatusFilter;

      return matchSearch && matchSeverity && matchStatus;
    });
  }, [incidents, incidentSearchQuery, incidentSeverityFilter, incidentStatusFilter]);

  const handleOpenCapaModal = (inc: IncidentReport) => {
    setSelectedCapaIncident(inc);
    setCapaStatus(inc.status);
    setCapaRootCause(inc.rootCause || '');
    setCapaCorrectiveAction(inc.correctiveAction || '');
    setCapaAssignedPic(inc.assignedPic || '');
    setCapaDueDate(inc.dueDate || new Date().toISOString().slice(0, 10));
    setCapaNote('');
  };

  const handleSaveCapa = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCapaIncident) return;
    setIsSubmittingCapa(true);
    try {
      const res = await updateIncidentCapaAndStatus(selectedCapaIncident.id, {
        status: capaStatus,
        rootCause: capaRootCause.trim(),
        correctiveAction: capaCorrectiveAction.trim(),
        assignedPic: capaAssignedPic.trim(),
        dueDate: capaDueDate,
        resolutionNote: capaNote.trim(),
        updatedBy: 'System Administrator',
      });
      if (res.pointsAwarded) {
        showToast('Tindakan Korektif CAPA Berhasil Diperbarui! +50 Poin Reward ditambahkan ke akun pelapor.');
      } else {
        showToast('Tindakan Korektif CAPA & Status Insiden K3 Berhasil Diperbarui!');
      }
      setSelectedCapaIncident(null);
      await loadIncidents();
    } catch (err: any) {
      showToast(`Gagal update CAPA: ${err.message}`);
    } finally {
      setIsSubmittingCapa(false);
    }
  };





  // ─── Activity Log state ──────────────────────────────────────────────────
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [activityLoading, setActivityLoading] = useState(false);

  // Load data when tabs become active
  useEffect(() => {
    if (activeTab === 'announcements' && announcements.length === 0) {
      setAnnLoading(true);
      fetchAnnouncements(false).then(setAnnouncements).catch(() => { }).finally(() => setAnnLoading(false));
    }
    if (activeTab === 'incidents' && incidents.length === 0) {
      setIncidentsLoading(true);
      fetchIncidentReports().then(setIncidents).catch(() => { }).finally(() => setIncidentsLoading(false));
    }
    if (activeTab === 'activity' && activityLogs.length === 0) {
      setActivityLoading(true);
      fetchActivityLog(100).then(setActivityLogs).catch(() => { }).finally(() => setActivityLoading(false));
    }
  }, [activeTab]);

  const handleCreateAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAnnTitle.trim() || !newAnnContent.trim()) return;
    try {
      const ann = await createAnnouncement(
        newAnnTitle.trim(), newAnnContent.trim(), newAnnPriority,
        currentAdminId ?? 'SYS-ADMIN',
        newAnnExpiry ? new Date(newAnnExpiry).toISOString() : undefined
      );
      setAnnouncements((prev) => [ann, ...prev]);
      setNewAnnTitle(''); setNewAnnContent(''); setNewAnnExpiry('');
      showToast('Pengumuman berhasil dibuat.');
    } catch (err: any) {
      showToast(err.message);
    }
  };

  const handleToggleAnn = async (id: string, current: boolean) => {
    await toggleAnnouncement(id, !current);
    setAnnouncements((prev) => prev.map((a) => a.id === id ? { ...a, isActive: !current } : a));
    showToast(`Pengumuman ${!current ? 'diaktifkan' : 'dinonaktifkan'}.`);
  };

  const handleDeleteAnn = async (id: string) => {
    await deleteAnnouncement(id);
    setAnnouncements((prev) => prev.filter((a) => a.id !== id));
    showToast('Pengumuman dihapus.');
  };

  const handleUpdateIncidentStatus = async (id: string, status: IncidentReport['status']) => {
    await updateIncidentStatus(id, status);
    setIncidents((prev) => prev.map((i) => i.id === id ? { ...i, status } : i));
    showToast(`Status insiden diperbarui: ${status}`);
  };

  interface AdminTabItem {
    key: typeof activeTab;
    label: string;
    icon: React.ElementType;
    badge?: number;
    alert?: boolean;
  }

  const TAB_GROUPS: { groupLabel: string; tabs: AdminTabItem[] }[] = [
    {
      groupLabel: 'SDM & AKSES PEKERJA',
      tabs: [
        { key: 'workers', label: 'Operational Employee', icon: Users, badge: workers.length },
        { key: 'disciplinary', label: 'Konseling & Sanksi K3', icon: ShieldAlert },
        { key: 'licenses', label: 'Pelacak SIO & Lisensi MHE', icon: Truck },
        { key: 'ppe', label: 'Inventaris & Distribusi APD', icon: HardHat },
        { key: 'approvals', label: 'Approval Supervisor', icon: UserCheck, badge: pendingSupervisors.length, alert: pendingSupervisors.length > 0 },
        { key: 'activity', label: 'Log Aktivitas Sistem', icon: History },
      ]
    },
    {
      groupLabel: 'PERFORMANSI & REWARD',
      tabs: [
        { key: 'reports', label: 'Laporan Audit Eksekutif', icon: FileText },
        { key: 'audit-5s', label: 'Audit Standar 5R / 5S', icon: CheckCircle2 },
        { key: 'rewards', label: 'Katalog Reward', icon: ShoppingBag, badge: rewardCatalog.length },
        { key: 'badges', label: 'Manajemen Badge', icon: Award },
        { key: 'kaizen', label: 'Inovasi Kaizen', icon: Sparkles },
        { key: 'analytics', label: 'Executive Analytics', icon: BarChart2 },
        { key: 'incidents', label: 'Laporan Insiden', icon: ShieldAlert, badge: incidents.filter(i => i.status === 'open').length, alert: incidents.filter(i => i.status === 'open').length > 0 },
      ]
    },
    {
      groupLabel: 'MASTER SETUP DATA',
      tabs: [
        { key: 'divisions', label: 'Master Divisi', icon: Building2, badge: divisions.length },
        { key: 'roles', label: 'Master Role', icon: UserPlus, badge: roles.length },
        { key: 'matrix', label: 'Matriks Kompetensi', icon: TableProperties, badge: competencyItems.length },
        { key: 'config', label: 'Aturan & Config System', icon: Settings },
      ]
    },
    {
      groupLabel: 'AI ENGINE & EDUKASI SOP',
      tabs: [
        { key: 'sop', label: 'Modul SOP Micro-Deck', icon: BookOpen },
        { key: 'ai-quiz', label: 'Gappy AI Engine', icon: Zap },
        { key: 'quiz', label: 'Bank Soal Quiz', icon: HelpCircle },
        { key: 'announcements', label: 'Pengumuman Tim', icon: Megaphone, badge: announcements.filter(a => a.isActive).length },
        { key: 'notifications', label: 'Manajemen Notifikasi', icon: Bell },
      ]
    }
  ];

  return (
    <div className="space-y-5 animate-fade-in">

      {/* Toast */}
      {toastMsg && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-emerald-950/90 border border-emerald-500/40 text-emerald-200 text-xs px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
          {toastMsg}
        </div>
      )}

      {/* Executive Administrator Navigation Header */}
      <div className="card p-5 space-y-4">
        {/* Title & System Badge */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-zinc-800/80 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-500/10 border border-purple-500/20 rounded-xl flex items-center justify-center shadow-inner">
              <Settings className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white">Administrator Console</h2>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20 uppercase tracking-wider">
                  SYSTEM LEVEL
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-0.5">
                Pusat Kendali Master Data, HR Approval, Modul Reward, Executive Analytics & Gappy AI Engine
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs bg-zinc-950 px-3.5 py-1.5 rounded-xl border border-zinc-800/80 shrink-0">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span className="font-semibold text-zinc-300">Hak Akses: <strong className="text-white">Full Administrator</strong></span>
          </div>
        </div>

        {/* Categorized Executive Tab Navigation Suite Bar */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
          {TAB_GROUPS.map((group, idx) => (
            <div key={idx} className="bg-zinc-950/70 p-2.5 rounded-xl border border-zinc-800/80 space-y-1.5">
              <div className="text-[9px] font-bold text-zinc-500 tracking-wider uppercase px-1">
                {group.groupLabel}
              </div>

              <div className="space-y-1">
                {group.tabs.map((t) => {
                  const isActive = activeTab === t.key;
                  const Icon = t.icon;

                  return (
                    <button
                      key={t.key}
                      onClick={() => { setActiveTab(t.key); setCurrentPage(1); }}
                      className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-bold transition ${isActive
                          ? 'bg-purple-600 text-white shadow-md shadow-purple-900/40 ring-1 ring-purple-400/30'
                          : 'text-zinc-400 hover:text-white hover:bg-zinc-900/90'
                        }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <Icon className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-white' : 'text-zinc-500'}`} />
                        <span className="truncate">{t.label}</span>
                      </div>

                      {t.badge !== undefined && (
                        <span
                          className={`text-[9px] font-mono font-bold px-1.5 py-0.2 rounded shrink-0 ${t.alert
                              ? 'bg-amber-500 text-zinc-950 font-black animate-pulse'
                              : isActive
                                ? 'bg-purple-800 text-purple-100'
                                : 'bg-zinc-900 text-zinc-400 border border-zinc-800'
                            }`}
                        >
                          {t.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ─── TAB: PERSONEL ─── */}
      {activeTab === 'workers' && (
        <div className="card p-5 space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <h3 className="font-bold text-white text-xs flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-emerald-400" />
              Daftar Personel ({filteredWorkers.length})
            </h3>

            <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
              {/* Division Filter Dropdown */}
              <div className="relative">
                <select
                  value={filterDiv}
                  onChange={(e) => { setFilterDiv(e.target.value); setCurrentPage(1); }}
                  className="appearance-none bg-zinc-950 border border-zinc-800 rounded-xl pl-3 pr-8 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="Semua">Semua Divisi</option>
                  {divisions.map((d) => (
                    <option key={d.id} value={d.code}>{d.code}</option>
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
                  onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                  placeholder="Cari nama, NIP, role..."
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Export CSV Button */}
              <button
                onClick={() => exportWorkersCSV(filteredWorkers)}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 rounded-xl text-xs font-bold transition"
                title="Ekspor daftar pekerja ke file CSV"
              >
                <Download className="w-3.5 h-3.5 text-emerald-400" />
                Export CSV Staf
              </button>

              {/* Import Massal Button */}
              <button
                onClick={() => setIsImportModalOpen(true)}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition shadow-sm"
                title="Import data pekerja massal dari format TSV/Text"
              >
                <Upload className="w-3.5 h-3.5" />
                Import Data Staf
              </button>
            </div>
          </div>

          <CustomDataTable
            columns={workerColumns}
            data={filteredWorkers}
            searchPlaceholder="Cari NIP, nama, role, divisi..."
            defaultSortKey="name"
            exportFileName="Data_Staf_Operasional_BIB"
          />
        </div>
      )}

      {/* ─── TAB: APPROVAL SUPERVISOR ─── */}
      {activeTab === 'approvals' && (
        <div className="card p-5 space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <h3 className="font-bold text-white text-xs flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-purple-400" />
                Permohonan Akses Supervisor Logistik ({pendingSupervisors.length})
              </h3>
              <p className="text-[11px] text-zinc-500 mt-0.5">Disetujui untuk memberikan akses Audit Matriks & Evaluasi Staf Operasional</p>
            </div>
            <button
              onClick={async () => {
                // Pilih salah satu worker non-admin untuk di-set status pending_approval untuk simulasi pengujian
                const candidate = workers.find((w) => w.role !== 'System Administrator' && w.status !== 'pending_approval');
                if (candidate) {
                  await supabase.from('workers').update({ status: 'pending_approval' }).eq('id', candidate.id);
                  showToast(`Simulasi permohonan supervisor dibuat untuk ${candidate.name}!`);
                  window.location.reload();
                } else {
                  showToast('Semua worker sudah memiliki permohonan aktif.');
                }
              }}
              className="px-3 py-1.5 bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/30 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
            >
              <UserPlus className="w-3.5 h-3.5" />
              + Uji Simulasi Permohonan
            </button>
          </div>

          {pendingSupervisors.length === 0 ? (
            <div className="text-center py-10 text-zinc-400 text-xs border border-zinc-800 rounded-xl bg-zinc-950/40 space-y-2">
              <UserCheck className="w-8 h-8 text-zinc-600 mx-auto" />
              <div className="font-bold text-white">Tidak Ada Permohonan Antrean (0 Pending)</div>
              <p className="text-[11px] text-zinc-500 max-w-sm mx-auto leading-relaxed">
                Permohonan akan muncul saat staf mendaftar melalui form <strong>"Daftar Akun Baru → Akses Supervisor / Pengawas"</strong> pada layar Login. Anda juga dapat menguji alur approval dengan mengeklik tombol <strong>"+ Uji Simulasi Permohonan"</strong> di atas.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {pendingSupervisors.map((w) => (
                <div key={w.id} className="p-4 rounded-xl bg-zinc-800/50 border border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <img src={w.avatar} alt={w.name} className="w-10 h-10 rounded-lg object-cover ring-1 ring-zinc-700 shrink-0" />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-white">{w.name}</span>
                        <span className="bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[10px] font-bold px-2 py-0.5 rounded">
                          Pending Approval
                        </span>
                      </div>
                      <p className="text-xs text-zinc-400 mt-0.5">
                        {w.email || w.employeeId} · Permohonan Role: <span className="text-white font-bold">{w.role}</span> ({w.division})
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => {
                        onRejectWorker?.(w.id);
                        showToast(`Pendaftaran ${w.name} ditolak.`);
                      }}
                      className="px-3.5 py-1.5 rounded-xl bg-zinc-800 hover:bg-rose-950/60 border border-zinc-700 text-zinc-400 hover:text-rose-300 text-xs font-bold transition"
                    >
                      Tolak
                    </button>
                    <button
                      onClick={() => {
                        onApproveWorker?.(w.id);
                        showToast(`Akses Supervisor ${w.name} berhasil disetujui!`);
                      }}
                      className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition shadow-sm"
                    >
                      Setujui (Approve)
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}


      {/* ─── TAB: KAIZEN KANBAN ─── */}
      {activeTab === 'kaizen' && (
        <div className="animate-in fade-in duration-300">
          <React.Suspense fallback={<SkeletonLoader />}>
            <KaizenKanbanBoard currentUserId={currentAdminId} isAdmin={true} />
          </React.Suspense>
        </div>
      )}

      {/* ─── TAB: DIVISI ─── */}
      {activeTab === 'divisions' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

          {/* Form Tambah */}
          <div className="card p-5">
            <h3 className="font-bold text-white text-xs mb-3 flex items-center gap-2">
              <Plus className="w-4 h-4 text-emerald-400" />
              Tambah Divisi Baru
            </h3>
            <p className="text-[11px] text-zinc-400 mb-4 leading-relaxed">
              Masukkan kode divisi (contoh: <span className="font-mono font-bold text-emerald-400">QC</span>, <span className="font-mono font-bold text-emerald-400">PACKING</span>).
            </p>

            <form onSubmit={handleAddDivision} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1">
                  Kode Divisi
                </label>
                <input
                  type="text"
                  value={newDivName}
                  onChange={(e) => setNewDivName(e.target.value.toUpperCase())}
                  placeholder="QC"
                  maxLength={20}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1">Deskripsi</label>
                <textarea
                  rows={2}
                  value={newDivDesc}
                  onChange={(e) => setNewDivDesc(e.target.value)}
                  placeholder="Fungsi operasional divisi"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl transition flex items-center justify-center gap-1.5"
              >
                <Building2 className="w-4 h-4" />
                Simpan Divisi
              </button>
            </form>
          </div>

          {/* Division List */}
          <div className="card p-5 lg:col-span-2">
            <h3 className="font-bold text-white text-xs mb-3">Divisi Terdaftar ({divisions.length})</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {divisions.map((d) => (
                <div key={d.id} className="p-3.5 rounded-xl bg-zinc-800/60 border border-zinc-800 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
                    <span className="font-black text-emerald-400 text-[10px] leading-tight text-center">{d.code}</span>
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-bold text-white text-xs">{d.code}</h4>
                    <p className="text-[11px] text-zinc-400 truncate">{d.description || 'Divisi Logistik Operasional'}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      )}

      {/* ─── TAB: ROLE ─── */}
      {activeTab === 'roles' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

          {/* Form Tambah */}
          <div className="card p-5">
            <h3 className="font-bold text-white text-xs mb-3 flex items-center gap-2">
              <UserPlus className="w-4 h-4 text-emerald-400" />
              Tambah Role Operasional
            </h3>

            <form onSubmit={handleAddRole} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1">Nama Role</label>
                <input
                  type="text"
                  value={newRoleName}
                  onChange={(e) => setNewRoleName(e.target.value)}
                  placeholder="Inspector QC"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1">Divisi</label>
                <div className="relative">
                  <select
                    value={newRoleDivCode}
                    onChange={(e) => setNewRoleDivCode(e.target.value)}
                    className="appearance-none w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 pr-8 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                  >
                    {divisions.map((d) => (
                      <option key={d.id} value={d.code}>{d.code} — {d.description}</option>
                    ))}
                  </select>
                  <ChevronDown className="w-3.5 h-3.5 text-zinc-500 absolute right-2.5 top-2.5 pointer-events-none" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1">Deskripsi Tugas</label>
                <textarea
                  rows={2}
                  value={newRoleDesc}
                  onChange={(e) => setNewRoleDesc(e.target.value)}
                  placeholder="Tanggung jawab utama role ini"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl transition flex items-center justify-center gap-1.5"
              >
                <UserCheck className="w-4 h-4" />
                Simpan Role
              </button>
            </form>
          </div>

          {/* Role List */}
          <div className="card p-5 lg:col-span-2">
            <h3 className="font-bold text-white text-xs mb-3">Role Terdaftar ({roles.length})</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {roles.map((r) => (
                <div key={r.id} className="p-3.5 rounded-xl bg-zinc-800/60 border border-zinc-800 flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0 mt-0.5">
                    <span className="font-black text-emerald-400 text-[9px]">{r.divisionCode}</span>
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-bold text-white text-xs">{r.name}</h4>
                    <p className="text-[11px] text-zinc-400 mt-0.5 truncate">{r.description || 'Peran operasional tim logistik'}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      )}

      {/* ─── TAB: MATRIX ─── */}
      {activeTab === 'matrix' && (
        <div className="card p-5 space-y-4">
          <h3 className="font-bold text-white text-xs flex items-center gap-2">
            <TableProperties className="w-4 h-4 text-emerald-400" />
            Master Competency Matrix ({competencyItems.length} Item)
          </h3>

          <div className="max-h-[500px] overflow-y-auto space-y-2 pr-1 custom-scrollbar">
            {competencyItems.map((item, idx) => (
              <div key={item.id} className="p-3.5 rounded-xl bg-zinc-800/60 border border-zinc-800 flex items-start gap-3">
                <span className="text-[10px] text-zinc-500 font-mono w-5 shrink-0 pt-0.5">{idx + 1}</span>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-500/10 text-emerald-400 rounded border border-emerald-500/20 uppercase tracking-wide">
                      {item.type}
                    </span>
                    <span className="text-[10px] font-semibold text-zinc-400">{item.category}</span>
                  </div>
                  <h4 className="font-bold text-white text-xs leading-snug">{item.title}</h4>
                  <p className="text-[11px] text-zinc-400 mt-0.5 leading-relaxed">{item.definition}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─── TAB: GEMINI AI QUIZ SENSOR & MONITORING ─── */}
      {activeTab === 'ai-quiz' && (
        <div className="space-y-5 animate-fade-in">

          {/* Module Header Card */}
          <div className="card p-5 space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center justify-center">
                  <Zap className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-white text-sm">Modul Sensor & Monitoring Soal K3 (Gappy AI Engine)</h3>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${quizMeta.source === 'Gappy AI Engine'
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                        : 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400'
                      }`}>
                      {quizMeta.source}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    Memantau keaktifan Gappy AI Engine API Key, kestabilan AI Model Generator, dan simpanan Supabase Quiz Bank.
                  </p>
                </div>
              </div>

              {/* Admin Action Buttons */}
              <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
                <button
                  onClick={handleForceRefreshQuiz}
                  disabled={refreshingQuiz}
                  className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs transition shadow-lg shadow-emerald-950/40"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${refreshingQuiz ? 'animate-spin' : ''}`} />
                  {refreshingQuiz ? 'Menguji Gappy AI...' : 'Uji API & Force Refresh'}
                </button>
                <button
                  onClick={handleClearQuizCache}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold text-xs transition border border-zinc-700"
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                  Reset Cache
                </button>
              </div>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2">

              <div className="bg-zinc-950 p-3.5 rounded-xl border border-zinc-800 flex items-center gap-3">
                <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 shrink-0">
                  <Key className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="text-[10px] text-zinc-500 font-bold uppercase">Status API Key</div>
                  <div className={`text-xs font-black truncate ${quizMeta.apiKeyConfigured ? 'text-emerald-400' : 'text-amber-400'}`}>
                    {quizMeta.apiKeyConfigured ? 'Terhubung (Aktif)' : 'Belum Dikonfigurasi'}
                  </div>
                </div>
              </div>

              <div className="bg-zinc-950 p-3.5 rounded-xl border border-zinc-800 flex items-center gap-3">
                <div className="p-2 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-400 shrink-0">
                  <Cpu className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="text-[10px] text-zinc-500 font-bold uppercase">Model AI Terpakai</div>
                  <div className="text-xs font-black text-purple-300 truncate">
                    {quizMeta.lastModelUsed}
                  </div>
                </div>
              </div>

              <div className="bg-zinc-950 p-3.5 rounded-xl border border-zinc-800 flex items-center gap-3">
                <div className="p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 shrink-0">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="text-[10px] text-zinc-500 font-bold uppercase">Sumber Soal</div>
                  <div className={`text-xs font-black truncate ${quizMeta.source !== 'Tidak Tersedia (AI Offline)' ? 'text-cyan-400' : 'text-amber-400'}`}>
                    {quizMeta.source}
                  </div>
                </div>
              </div>

              <div className="bg-zinc-950 p-3.5 rounded-xl border border-zinc-800 flex items-center gap-3">
                <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 shrink-0">
                  <Clock className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="text-[10px] text-zinc-500 font-bold uppercase">Status Freshness</div>
                  <div className="text-xs font-black text-emerald-400 truncate">
                    UPDATED (&lt; 24 Jam)
                  </div>
                </div>
              </div>

            </div>

            {/* Supabase Secure API Key Config Input */}
            <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Key className="w-3.5 h-3.5 text-amber-400" />
                  Konfigurasi Gemini AI API Key (Disimpan Aman Terenkripsi di Database Supabase)
                </label>
                <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="text-[10px] text-amber-400 hover:underline flex items-center gap-1">
                  <span>Ambil Key Gratis</span>
                  <ExternalLink className="w-2.5 h-2.5" />
                </a>
              </div>
              <div className="flex gap-2">
                <input
                  type="password"
                  value={inputApiKey}
                  onChange={(e) => setInputApiKey(e.target.value)}
                  placeholder="Masukkan Gemini API Key baru Anda..."
                  className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-1.5 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-amber-500 font-mono"
                />
                <button
                  type="button"
                  disabled={savingKey || !inputApiKey.trim()}
                  onClick={async () => {
                    setSavingKey(true);
                    try {
                      await saveGeminiApiKeyToSupabase(inputApiKey.trim());
                      alert('Gemini API Key berhasil disimpan ke Supabase system_settings! Aplikasi Anda siap digunakan di GitHub Pages.');
                      setInputApiKey('');
                      setQuizMeta(getQuizStatusMeta());
                    } catch (err: any) {
                      alert(err.message || 'Gagal menyimpan API key');
                    } finally {
                      setSavingKey(false);
                    }
                  }}
                  className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 disabled:opacity-50 shrink-0"
                >
                  {savingKey ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Simpan ke Database'}
                </button>
              </div>
            </div>

            {/* Guidance Banner if API Key is not set */}
            {!quizMeta.apiKeyConfigured && (
              <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold text-amber-300">Gappy AI Mode Fallback (Bank Soal Lokal Aktif)</div>
                  <div className="text-[11px] text-amber-200/80 mt-0.5">
                    Aplikasi saat ini menggunakan <strong>Bank Soal Fallback Lokal</strong> agar kuis harian tetap berjalan 100% lancar. Masukkan API key di atas untuk mengaktifkan AI Generatif secara penuh.
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Active Questions Preview List */}
          <div className="card p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-white text-xs flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-400" />
                Pratinjau Pertanyaan K3 Aktif Hari Ini ({quizMeta.questions.length} Soal)
              </h3>
              <span className="text-[10px] text-zinc-500 font-mono">Generasi: {quizMeta.cachedAt}</span>
            </div>

            <div className="space-y-4">
              {quizMeta.questions.map((q, qIdx) => (
                <div key={q.id || qIdx} className="p-4 rounded-xl bg-zinc-950 border border-zinc-800/80 space-y-3">

                  {/* Header */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="w-6 h-6 rounded-lg bg-zinc-800 text-white font-bold text-xs flex items-center justify-center shrink-0">
                        {qIdx + 1}
                      </span>
                      <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold px-2 py-0.5 rounded-md">
                        {q.category}
                      </span>
                    </div>
                    <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-md">
                      +{q.pointsReward || 50} Poin
                    </span>
                  </div>

                  {/* Question */}
                  <h4 className="text-xs font-bold text-white leading-relaxed">{q.question}</h4>

                  {/* Options */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {q.options.map((opt, optIdx) => {
                      const isCorrect = optIdx === q.correctAnswerIndex;
                      return (
                        <div
                          key={optIdx}
                          className={`p-2.5 rounded-lg text-[11px] border flex items-center gap-2 ${isCorrect
                              ? 'bg-emerald-600/15 border-emerald-500/40 text-emerald-200 font-semibold'
                              : 'bg-zinc-900 border-zinc-800/60 text-zinc-400'
                            }`}
                        >
                          <span className={`w-5 h-5 rounded-md text-[10px] font-bold flex items-center justify-center shrink-0 ${isCorrect ? 'bg-emerald-600 text-white' : 'bg-zinc-800 text-zinc-400'
                            }`}>
                            {String.fromCharCode(65 + optIdx)}
                          </span>
                          <span className="truncate">{opt}</span>
                          {isCorrect && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 ml-auto shrink-0" />}
                        </div>
                      );
                    })}
                  </div>

                  {/* Explanation */}
                  <div className="p-2.5 rounded-lg bg-zinc-900/80 border border-zinc-800/60 text-[11px] text-zinc-400 flex items-start gap-2">
                    <HelpCircle className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-zinc-300">Penjelasan K3: </span>
                      {q.explanation}
                    </div>
                  </div>

                </div>
              ))}
            </div>
          </div>

        </div>
      )}

      {/* ─── TAB: ANALYTICS ─── */}
      {activeTab === 'analytics' && (
        <div className="card p-5">
          <React.Suspense fallback={<SkeletonLoader />}>
            <AdminAnalytics workers={workers} />
          </React.Suspense>
        </div>
      )}

      {/* ─── TAB: ANNOUNCEMENTS ─── */}
      {activeTab === 'announcements' && (
        <div className="card p-5 space-y-5">
          {/* Form Buat Pengumuman */}
          <div>
            <h3 className="text-xs font-black text-white flex items-center gap-2 mb-3">
              <Megaphone className="w-4 h-4 text-amber-400" /> Buat Pengumuman Baru
            </h3>
            <form onSubmit={handleCreateAnnouncement} className="space-y-3">
              <input
                type="text" value={newAnnTitle} onChange={(e) => setNewAnnTitle(e.target.value)}
                placeholder="Judul pengumuman..."
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-amber-500"
              />
              <textarea
                value={newAnnContent} onChange={(e) => setNewAnnContent(e.target.value)}
                placeholder="Isi pengumuman..." rows={3}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-amber-500 resize-none"
              />
              <div className="flex gap-3 flex-wrap">
                <select value={newAnnPriority} onChange={(e) => setNewAnnPriority(e.target.value as Announcement['priority'])}
                  className="bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500">
                  <option value="info">ℹ️ Info</option>
                  <option value="normal">📢 Normal</option>
                  <option value="urgent">🚨 Urgent</option>
                </select>
                <input type="datetime-local" value={newAnnExpiry} onChange={(e) => setNewAnnExpiry(e.target.value)}
                  className="bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500"
                  title="Tanggal kadaluarsa (opsional)" />
                <button type="submit" className="px-4 py-1.5 bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs rounded-xl transition flex items-center gap-1.5">
                  <Plus className="w-3.5 h-3.5" /> Buat
                </button>
              </div>
            </form>
          </div>

          {/* Daftar Pengumuman */}
          <div className="space-y-2">
            {annLoading && <p className="text-xs text-zinc-500 text-center py-4">Memuat pengumuman...</p>}
            {!annLoading && announcements.length === 0 && (
              <p className="text-xs text-zinc-600 text-center py-6">Belum ada pengumuman.</p>
            )}
            {announcements.map((ann) => (
              <div key={ann.id} className={`flex items-start gap-3 p-3 rounded-xl border ${ann.isActive ? 'bg-zinc-900/70 border-zinc-800' : 'bg-zinc-900/30 border-zinc-800/50 opacity-60'}`}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-[9px] font-black px-1.5 py-0.5 rounded uppercase ${ann.priority === 'urgent' ? 'bg-rose-500/20 text-rose-300' :
                        ann.priority === 'info' ? 'bg-sky-500/20 text-sky-300' : 'bg-amber-500/20 text-amber-300'
                      }`}>{ann.priority}</span>
                    <span className="text-xs font-bold text-white truncate">{ann.title}</span>
                    {!ann.isActive && <span className="text-[9px] text-zinc-600 bg-zinc-800 px-1.5 rounded">Nonaktif</span>}
                  </div>
                  <p className="text-[11px] text-zinc-400 line-clamp-2">{ann.content}</p>
                  {ann.expiresAt && (
                    <p className="text-[10px] text-zinc-600 mt-1 flex items-center gap-1">
                      <Calendar className="w-3 h-3" /> Kadaluarsa: {new Date(ann.expiresAt).toLocaleDateString('id-ID')}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button onClick={() => handleToggleAnn(ann.id, ann.isActive)} className="text-zinc-500 hover:text-amber-400 transition" title={ann.isActive ? 'Nonaktifkan' : 'Aktifkan'}>
                    {ann.isActive ? <ToggleRight className="w-4 h-4 text-emerald-400" /> : <ToggleLeft className="w-4 h-4" />}
                  </button>
                  <button onClick={() => handleDeleteAnn(ann.id)} className="text-zinc-600 hover:text-rose-400 transition" title="Hapus">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─── TAB: INCIDENT REPORTS ─── */}
      {activeTab === 'incidents' && (
        <div className="card p-5 space-y-4">
          {/* Header & Filter Control Panel */}
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3 border-b border-zinc-800 pb-3">
            <div>
              <h3 className="text-xs font-black text-white flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-orange-400" />
                Modul Kontrol & Follow-Up Laporan Insiden K3 ({filteredIncidents.length} dari {incidents.length})
              </h3>
              <p className="text-[11px] text-zinc-400 mt-0.5">
                Pengelolaan Tindakan Korektif (CAPA), Log Riwayat Penanganan, dan Cetak Berita Acara Resmi PDF
              </p>
            </div>

            {/* Multi-Filter Panel (Point 4) */}
            <div className="flex items-center gap-2 flex-wrap w-full lg:w-auto">
              <div className="relative flex-1 sm:w-48">
                <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={incidentSearchQuery}
                  onChange={(e) => setIncidentSearchQuery(e.target.value)}
                  placeholder="Cari lokasi, deskripsi..."
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-orange-500"
                />
              </div>

              <select
                value={incidentSeverityFilter}
                onChange={(e) => setIncidentSeverityFilter(e.target.value)}
                className="bg-zinc-950 border border-zinc-800 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-orange-500 font-semibold"
              >
                <option value="all">Semua Keparahan</option>
                <option value="critical">🔴 Kritis (Critical)</option>
                <option value="high">🟠 Tinggi (High)</option>
                <option value="medium">🟡 Sedang (Medium)</option>
                <option value="low">🟢 Rendah (Low)</option>
              </select>

              <select
                value={incidentStatusFilter}
                onChange={(e) => setIncidentStatusFilter(e.target.value)}
                className="bg-zinc-950 border border-zinc-800 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-orange-500 font-semibold"
              >
                <option value="all">Semua Status</option>
                <option value="open">Open</option>
                <option value="investigating">Investigating</option>
                <option value="resolved">Resolved</option>
                <option value="closed">Closed</option>
              </select>

              <button
                onClick={() => exportIncidentsCSV(filteredIncidents)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 rounded-xl text-xs font-bold transition"
                title="Ekspor seluruh laporan insiden ke CSV"
              >
                <Download className="w-3.5 h-3.5 text-orange-400" />
                Export CSV Insiden
              </button>
            </div>
          </div>

          {incidentsLoading && <p className="text-xs text-zinc-500 text-center py-6">Memuat laporan insiden...</p>}
          {!incidentsLoading && filteredIncidents.length === 0 && (
            <div className="text-center py-10 text-zinc-500 text-xs border border-zinc-800 rounded-xl bg-zinc-950/40">
              Tidak ada laporan insiden K3 yang sesuai dengan filter.
            </div>
          )}

          <div className="space-y-3 max-h-[600px] overflow-y-auto custom-scrollbar pr-1">
            {filteredIncidents.map((inc) => (
              <div key={inc.id} className="p-4 rounded-xl bg-zinc-900/80 border border-zinc-800 space-y-3">
                {/* Header Row */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                      <span className={`text-[9px] font-black px-2 py-0.5 rounded uppercase ${inc.severity === 'critical' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' :
                          inc.severity === 'high' ? 'bg-orange-500/20 text-orange-300 border border-orange-500/30' :
                            inc.severity === 'medium' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'bg-zinc-800 text-zinc-400 border border-zinc-700'
                        }`}>{inc.severity}</span>

                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded uppercase ${inc.status === 'open' ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                          inc.status === 'investigating' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' :
                            inc.status === 'resolved' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-zinc-800 text-zinc-400 border border-zinc-700'
                        }`}>{inc.status}</span>

                      <span className="text-xs font-bold text-white flex items-center gap-1">
                        👤 {inc.workerName ?? inc.workerId}
                      </span>
                    </div>

                    <p className="text-xs text-zinc-300 font-medium leading-relaxed">{inc.description}</p>

                    <div className="flex items-center gap-3 mt-2 flex-wrap text-[10px]">
                      <span className="text-zinc-400">📍 {inc.location} · {new Date(inc.occurredAt).toLocaleString('id-ID')}</span>

                      <a
                        href="https://drive.google.com/drive/folders/16p6cnEb7o6zOF2jFcPm3z7Md-Utntrkr"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-purple-400 hover:text-purple-300 font-bold bg-purple-950/60 border border-purple-500/30 px-2 py-0.5 rounded flex items-center gap-1 transition"
                        title="Buka Folder Google Drive Target Insiden K3"
                      >
                        <span>Folder Google Drive</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>

                  {/* Actions Right */}
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <select
                      value={inc.status}
                      onChange={(e) => handleUpdateIncidentStatus(inc.id, e.target.value as IncidentReport['status'])}
                      className="bg-zinc-950 border border-zinc-800 rounded-lg px-2 py-1 text-[10px] text-white focus:outline-none shrink-0 font-bold"
                    >
                      <option value="open">Status: OPEN</option>
                      <option value="investigating">Status: INVESTIGATING</option>
                      <option value="resolved">Status: RESOLVED</option>
                      <option value="closed">Status: CLOSED</option>
                    </select>

                    <div className="flex items-center gap-1.5 flex-wrap">
                      <button
                        type="button"
                        onClick={() => handleOpenCapaModal(inc)}
                        className="px-2.5 py-1 bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-500/30 rounded-lg font-bold text-[10px] transition flex items-center gap-1"
                        title="Input Tindakan Korektif & Investigasi CAPA"
                      >
                        <Edit3 className="w-3 h-3" />
                        Follow-Up CAPA
                      </button>

                      <button
                        type="button"
                        onClick={() => ExecutivePDFReportGenerator.exportIncidentReportPDF(inc)}
                        className="px-2.5 py-1 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 rounded-lg font-bold text-[10px] transition flex items-center gap-1"
                        title="Cetak Berita Acara Insiden K3 PDF"
                      >
                        <FileSpreadsheet className="w-3 h-3" />
                        Cetak PDF
                      </button>
                    </div>
                  </div>
                </div>

                {/* Photo Evidence Box */}
                {inc.photoUrl && (
                  <div className="flex items-center justify-between p-2.5 bg-zinc-950 rounded-xl border border-zinc-800/80">
                    <div className="flex items-center gap-3 min-w-0">
                      <img
                        src={inc.photoUrl}
                        alt="Bukti Insiden"
                        className="w-14 h-14 object-cover rounded-lg border border-zinc-700 shrink-0 cursor-pointer hover:opacity-80 transition"
                        onClick={() => setViewingIncidentPhoto({
                          url: inc.photoUrl!,
                          title: `Foto Bukti: ${inc.incidentType.toUpperCase()} - ${inc.location}`,
                          subtitle: `Dilaporkan oleh: ${inc.workerName || inc.workerId} (${new Date(inc.occurredAt).toLocaleString('id-ID')})`,
                          sizes: inc.originalSizeKb && inc.compressedSizeKb ? `${inc.originalSizeKb} KB → ${inc.compressedSizeKb} KB (Tersimpan 90% HD)` : undefined,
                        })}
                      />
                      <div className="text-[10px] text-zinc-400 min-w-0">
                        <div className="font-bold text-white text-xs">Foto Bukti Terlampir (HD Compression)</div>
                        {inc.originalSizeKb && inc.compressedSizeKb && (
                          <div className="text-emerald-400 font-mono mt-0.5">
                            Ukuran: {inc.originalSizeKb} KB → {inc.compressedSizeKb} KB
                          </div>
                        )}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setViewingIncidentPhoto({
                        url: inc.photoUrl!,
                        title: `Foto Bukti: ${inc.incidentType.toUpperCase()} - ${inc.location}`,
                        subtitle: `Dilaporkan oleh: ${inc.workerName || inc.workerId} (${new Date(inc.occurredAt).toLocaleString('id-ID')})`,
                        sizes: inc.originalSizeKb && inc.compressedSizeKb ? `${inc.originalSizeKb} KB → ${inc.compressedSizeKb} KB (Tersimpan 90% HD)` : undefined,
                      })}
                      className="px-3 py-1.5 bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/30 rounded-lg font-bold text-[10px] transition shrink-0 flex items-center gap-1"
                    >
                      <Sparkles className="w-3 h-3" />
                      Pratinjau Foto UI
                    </button>
                  </div>
                )}

                {/* CAPA Corrective Action Details Box (Point 2) */}
                {(inc.rootCause || inc.correctiveAction || inc.assignedPic) && (
                  <div className="bg-amber-950/20 border border-amber-500/20 p-3 rounded-xl space-y-1 text-xs">
                    <div className="font-bold text-amber-300 text-[11px] flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5 text-amber-400" />
                      Detail Tindakan Korektif & Preventive Action (CAPA):
                    </div>
                    {inc.rootCause && (
                      <div className="text-[11px] text-zinc-300">
                        <strong className="text-amber-200">Akar Masalah:</strong> {inc.rootCause}
                      </div>
                    )}
                    {inc.correctiveAction && (
                      <div className="text-[11px] text-zinc-300">
                        <strong className="text-amber-200">Action Plan:</strong> {inc.correctiveAction}
                      </div>
                    )}
                    <div className="flex items-center gap-4 text-[10px] text-amber-200/80 pt-1">
                      {inc.assignedPic && <span>PIC: <strong className="text-white">{inc.assignedPic}</strong></span>}
                      {inc.dueDate && <span>Target Selesai: <strong className="text-white">{inc.dueDate}</strong></span>}
                    </div>
                  </div>
                )}

                {/* Incident Lifecycle Timeline Log (Point 3) */}
                {inc.history && inc.history.length > 0 && (
                  <div className="bg-zinc-950 p-2.5 rounded-xl border border-zinc-800/60 space-y-1.5">
                    <div className="text-[10px] font-bold text-zinc-400 flex items-center gap-1">
                      <Clock className="w-3 h-3 text-purple-400" />
                      Log Riwayat Penanganan ({inc.history.length} Aktivitas):
                    </div>
                    <div className="space-y-1">
                      {inc.history.map((h, hIdx) => (
                        <div key={hIdx} className="text-[10px] text-zinc-400 flex items-center justify-between bg-zinc-900/60 px-2 py-1 rounded border border-zinc-800">
                          <span className="font-medium text-zinc-300">
                            [{h.status.toUpperCase()}] {h.note || 'Status di-update'}
                          </span>
                          <span className="text-zinc-500 font-mono">
                            {h.updatedBy} · {new Date(h.updatedAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─── TAB: ACTIVITY LOG ─── */}
      {activeTab === 'activity' && (
        <div className="card p-5">
          <React.Suspense fallback={<SkeletonLoader />}>
            <ActivityLogPanel
              logs={activityLogs}
              loading={activityLoading}
              onRefresh={() => {
                setActivityLoading(true);
                fetchActivityLog(100).then(setActivityLogs).catch(() => { }).finally(() => setActivityLoading(false));
              }}
            />
          </React.Suspense>
        </div>
      )}

      {/* ─── TAB: KELOLA REWARD ─── */}
      {activeTab === 'rewards' && (
        <AdminRewardManagerSection
          rewardCatalog={rewardCatalog}
          currentAdminId={currentAdminId}
          onCreateReward={onCreateReward}
          onUpdateReward={onUpdateReward}
          onRestockReward={onRestockReward}
          onDeleteReward={onDeleteReward}
          showToast={showToast}
        />
      )}

      {/* ─── TAB: MANAJEMEN BADGE ─── */}
      {activeTab === 'badges' && (
        <div className="card p-5">
          <React.Suspense fallback={<SkeletonLoader />}>
            <BadgeManagementPanel />
          </React.Suspense>
        </div>
      )}

      {/* ─── TAB: BANK SOAL QUIZ ─── */}
      {activeTab === 'quiz' && (
        <div className="card p-5">
          <React.Suspense fallback={<SkeletonLoader />}>
            <QuizManagementPanel />
          </React.Suspense>
        </div>
      )}

      {/* ─── TAB: MODUL SOP MICRO-DECK ─── */}
      {activeTab === 'sop' && (
        <React.Suspense fallback={<SkeletonLoader />}>
          <SopManagementPanel currentAdminId={currentAdminId} onToast={showToast} />
        </React.Suspense>
      )}

      {/* ─── TAB: ATURAN & CONFIG SYSTEM ─── */}
      {activeTab === 'config' && (
        <React.Suspense fallback={<SkeletonLoader />}>
          <SystemConfigPanel onToast={showToast} />
        </React.Suspense>
      )}

      {/* ─── TAB: MANAJEMEN NOTIFIKASI ─── */}
      {activeTab === 'notifications' && (
        <React.Suspense fallback={<SkeletonLoader />}>
          <AdminNotificationPanel />
        </React.Suspense>
      )}

      {/* ─── TAB: PELACAK SIO & LISENSI MHE ─── */}
      {activeTab === 'licenses' && (
        <React.Suspense fallback={<SkeletonLoader />}>
          <MheLicensePanel workers={workers} />
        </React.Suspense>
      )}

      {/* ─── TAB: INVENTARIS & DISTRIBUSI APD ─── */}
      {activeTab === 'ppe' && (
        <React.Suspense fallback={<SkeletonLoader />}>
          <PpeManagementPanel workers={workers} currentUserName="System Administrator" />
        </React.Suspense>
      )}

      {/* ─── TAB: LAPORAN AUDIT EKSEKUTIF ─── */}
      {activeTab === 'reports' && (
        <React.Suspense fallback={<SkeletonLoader />}>
          <ExecutiveReportPanel
            workers={workers}
            incidents={incidents}
            rewardCatalog={rewardCatalog}
            currentUserName="System Administrator"
          />
        </React.Suspense>
      )}

      {/* ─── TAB: KONSELING & SANKSI K3 ─── */}
      {activeTab === 'disciplinary' && (
        <React.Suspense fallback={<SkeletonLoader />}>
          <DisciplinaryPanel
            workers={workers}
            currentUserName="System Administrator"
          />
        </React.Suspense>
      )}

      {/* ─── TAB: AUDIT STANDAR 5R / 5S ─── */}
      {activeTab === 'audit-5s' && (
        <React.Suspense fallback={<SkeletonLoader />}>
          <Audit5sPanel
            workers={workers}
            currentUserName="System Administrator"
          />
        </React.Suspense>
      )}

      {/* ─── MODAL: IMPORT MASSAL PEKERJA ─── */}
      {isImportModalOpen && createPortal(
        <div
          className="fixed inset-0 z-[9999] overflow-y-auto bg-black/90 backdrop-blur-xl p-4 sm:p-6 flex items-center justify-center min-h-screen animate-fade-in"
          onClick={() => setIsImportModalOpen(false)}
        >
          <div
            className="relative w-full max-w-3xl max-h-[82vh] sm:max-h-[85vh] m-auto card-elevated p-6 flex flex-col justify-between overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setIsImportModalOpen(false)}
              className="absolute top-4 right-4 text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-zinc-800 transition"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="overflow-y-auto space-y-4 pr-1">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center shrink-0">
                  <Upload className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Import Data Pekerja Massal</h3>
                  <p className="text-xs text-zinc-400">
                    Format per baris: <code className="bg-zinc-900 px-1.5 py-0.5 rounded text-emerald-400 font-mono">NIK [TAB] Nama [TAB] Role [TAB] Kode Divisi</code>
                  </p>
                </div>
              </div>

              {/* Toolbar & Template Button */}
              <div className="flex items-center justify-between gap-2 flex-wrap bg-zinc-900/80 p-2.5 rounded-xl border border-zinc-800">
                <button
                  type="button"
                  onClick={() => setImportRawText(SAMPLE_EMPLOYEE_IMPORT_DATA)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/40 text-indigo-300 rounded-lg text-xs font-bold transition"
                >
                  <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                  Isi Format Contoh Template (50+ Workers)
                </button>

                {importRawText && (
                  <button
                    type="button"
                    onClick={() => setImportRawText('')}
                    className="text-xs text-zinc-400 hover:text-rose-400 transition"
                  >
                    Bersihkan Teks
                  </button>
                )}
              </div>

              {/* Text Area */}
              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1">
                  Tempel (Paste) Data Teks / TSV di sini:
                </label>
                <textarea
                  rows={6}
                  value={importRawText}
                  onChange={(e) => setImportRawText(e.target.value)}
                  placeholder={`328000257\tAGUNG BAGASKARA\tOperator Forklift (WFG)\tWFG\n328000261\tARANIKITA BERU SIBIRO\tAdmin (Timbangan)\tTIM...`}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-xs font-mono text-emerald-300 focus:outline-none focus:border-emerald-500 leading-relaxed placeholder-zinc-700"
                />
              </div>

              {/* Preview Stats & Table */}
              {parsedImportRows.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-white flex items-center gap-2">
                      <TableProperties className="w-4 h-4 text-emerald-400" />
                      Pratinjau Hasil Parsing ({parsedImportRows.length} Baris)
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded text-[10px] font-bold">
                        Valid: {validImportRows.length}
                      </span>
                      {parsedImportRows.length - validImportRows.length > 0 && (
                        <span className="bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded text-[10px] font-bold">
                          Duplikat NIK: {parsedImportRows.length - validImportRows.length}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="max-h-48 overflow-y-auto rounded-xl border border-zinc-800 bg-zinc-950">
                    <table className="w-full text-left text-xs text-zinc-300">
                      <thead className="bg-zinc-900 text-zinc-400 font-bold sticky top-0 border-b border-zinc-800">
                        <tr>
                          <th className="py-2 px-3">#</th>
                          <th className="py-2 px-3">NIP</th>
                          <th className="py-2 px-3">Nama Pekerja</th>
                          <th className="py-2 px-3">Role</th>
                          <th className="py-2 px-3">Divisi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-800/60 font-mono text-[11px]">
                        {parsedImportRows.slice(0, 15).map((row, idx) => (
                          <tr key={idx} className="hover:bg-zinc-900/50">
                            <td className="py-1.5 px-3 text-zinc-500">{idx + 1}</td>
                            <td className="py-1.5 px-3 text-emerald-400 font-bold">{row.employeeId}</td>
                            <td className="py-1.5 px-3 font-sans font-semibold text-white">{row.name}</td>
                            <td className="py-1.5 px-3 font-sans text-zinc-300">{row.role}</td>
                            <td className="py-1.5 px-3">
                              <span className="bg-zinc-800 px-1.5 py-0.5 rounded text-zinc-300 font-bold">
                                {row.division}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {parsedImportRows.length > 15 && (
                      <div className="p-2 text-center text-[11px] text-zinc-500 bg-zinc-900/50 border-t border-zinc-800">
                        ...dan {parsedImportRows.length - 15} baris data lainnya
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2 pt-4 border-t border-zinc-800 mt-4">
              <button
                type="button"
                onClick={() => setIsImportModalOpen(false)}
                className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold text-xs rounded-xl transition"
              >
                Batal
              </button>

              <button
                type="button"
                onClick={handleRunBatchImport}
                disabled={isImporting || validImportRows.length === 0}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs rounded-xl transition flex items-center gap-2 shadow-lg shadow-emerald-950"
              >
                {isImporting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Mengimpor Ke Database...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    Proses Import {validImportRows.length} Pekerja
                  </>
                )}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ─── MODAL MUTASI ROLE & DIVISI PEKERJA (CLEAN SLATE BASELINE) ─── */}
      {isMutationModalOpen && selectedMutationWorker && createPortal(
        <div
          className="fixed inset-0 z-[9999] overflow-y-auto bg-black/90 backdrop-blur-xl p-4 sm:p-6 flex items-center justify-center min-h-screen animate-fade-in"
          onClick={() => setIsMutationModalOpen(false)}
        >
          <div
            className="relative w-full max-w-lg max-h-[82vh] sm:max-h-[85vh] m-auto card-elevated p-6 space-y-4 border border-purple-500/30 overflow-y-auto custom-scrollbar"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setIsMutationModalOpen(false)}
              className="absolute top-4 right-4 text-zinc-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3 border-b border-zinc-800 pb-3">
              <div className="w-9 h-9 bg-purple-500/10 border border-purple-500/30 rounded-xl flex items-center justify-center">
                <ArrowRightLeft className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <h3 className="font-bold text-white text-sm">Mutasi Role & Divisi Pekerja</h3>
                <p className="text-xs text-zinc-400">Protokol Pemindahan Posisi Operasional (Clean Slate Baseline)</p>
              </div>
            </div>

            {/* Current Worker Summary */}
            <div className="bg-zinc-900/90 border border-zinc-800 p-3 rounded-xl flex items-center justify-between text-xs">
              <div>
                <div className="font-bold text-white text-sm">{selectedMutationWorker.name}</div>
                <div className="text-[11px] font-mono text-zinc-500">NIP: {selectedMutationWorker.employeeId}</div>
              </div>
              <div className="text-right">
                <div className="text-[10px] text-zinc-500 font-bold uppercase">Posisi Saat Ini</div>
                <div className="font-bold text-emerald-400">{selectedMutationWorker.role} ({selectedMutationWorker.division})</div>
              </div>
            </div>

            {/* Warning Alert Banner */}
            <div className="bg-amber-500/10 border border-amber-500/30 p-3 rounded-xl flex items-start gap-2.5 text-xs text-amber-200">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <strong className="block text-amber-300 font-bold mb-0.5">Penegakan Clean Slate Baseline:</strong>
                Nilai audit matriks kompetensi role lama akan otomatis <strong>diarsipkan secara terisolasi</strong>. Skor audit pada role baru akan dimulai murni dari angka 0 agar tidak mencemari/mempengaruhi penilaian role baru.
              </div>
            </div>

            <form onSubmit={handleExecuteMutation} className="space-y-3.5 pt-1">
              {/* 1. Pilih Divisi Baru (PERTAMA) */}
              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1">1. Pilih Divisi Baru Pekerja</label>
                <select
                  value={targetMutatedDivision}
                  onChange={(e) => handleMutationDivisionChange(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500 font-semibold"
                >
                  {divisions.map((d) => (
                    <option key={d.id} value={d.code}>{d.code} — {d.name}</option>
                  ))}
                </select>
              </div>

              {/* 2. Pilih Role Baru (KEDUA - difilter otomatis berdasarkan Divisi) */}
              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1">2. Pilih Role Baru Pekerja (Spesifik Divisi)</label>
                <select
                  value={targetMutatedRole}
                  onChange={(e) => setTargetMutatedRole(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500 font-semibold"
                >
                  {availableRolesForMutation.map((r) => (
                    <option key={r.id} value={r.name}>{r.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1">Alasan Mutasi / Catatan HR (Opsional)</label>
                <input
                  type="text"
                  value={mutationReason}
                  onChange={(e) => setMutationReason(e.target.value)}
                  placeholder="Contoh: Rotasi Operasional Q3, Promosi Operator Forklift..."
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-purple-500"
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
                  className="px-5 py-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition flex items-center gap-2 shadow-lg shadow-purple-950"
                >
                  {isMutating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Memproses Mutasi...
                    </>
                  ) : (
                    <>
                      <ArrowRightLeft className="w-4 h-4" />
                      Proses Mutasi Role & Divisi
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
      {/* ─── MODAL FOLLOW-UP CAPA (CORRECTIVE & PREVENTIVE ACTION) ─── */}
      {selectedCapaIncident && createPortal(
        <div
          className="fixed inset-0 z-[9999] overflow-y-auto bg-black/90 backdrop-blur-xl p-4 sm:p-6 flex items-center justify-center min-h-screen animate-fade-in"
          onClick={() => setSelectedCapaIncident(null)}
        >
          <div
            className="relative w-full max-w-lg max-h-[82vh] sm:max-h-[85vh] m-auto card-elevated p-5 border border-amber-500/30 space-y-4 overflow-y-auto custom-scrollbar"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-2.5">
                <Edit3 className="w-5 h-5 text-amber-400" />
                <div>
                  <h3 className="text-sm font-black text-white">Investigasi & Form CAPA K3</h3>
                  <p className="text-[11px] text-zinc-400">
                    Pelapor: {selectedCapaIncident.workerName || selectedCapaIncident.workerId} · Lokasi: {selectedCapaIncident.location}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedCapaIncident(null)}
                className="text-zinc-500 hover:text-white p-1 rounded-lg hover:bg-zinc-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCapa} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1">Status Laporan Insiden</label>
                <select
                  value={capaStatus}
                  onChange={(e) => setCapaStatus(e.target.value as IncidentReport['status'])}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500 font-bold"
                >
                  <option value="open">OPEN (Belum Ditangani)</option>
                  <option value="investigating">INVESTIGATING (Sedang Diinvestigasi)</option>
                  <option value="resolved">RESOLVED (Tindakan Korektif Selesai)</option>
                  <option value="closed">CLOSED (Insiden Ditutup Resmi)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1">Akar Masalah (Root Cause / 5-Why Analysis)</label>
                <textarea
                  rows={2}
                  value={capaRootCause}
                  onChange={(e) => setCapaRootCause(e.target.value)}
                  placeholder="Contoh: Oli bocor dari unit forklift karena seal pecah, belum terdeteksi saat pre-shift inspection..."
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-2.5 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1">Rencana Tindakan Korektif (Corrective & Preventive Action)</label>
                <textarea
                  rows={2}
                  value={capaCorrectiveAction}
                  onChange={(e) => setCapaCorrectiveAction(e.target.value)}
                  placeholder="Contoh: Penggantian hydraulic seal unit, pembersihan ceceran oli dengan absorbant, re-briefing K3..."
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-2.5 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-zinc-300 mb-1">PIC Penanggung Jawab</label>
                  <input
                    type="text"
                    value={capaAssignedPic}
                    onChange={(e) => setCapaAssignedPic(e.target.value)}
                    placeholder="Nama Supervisor / Teknisi"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-300 mb-1">Target Selesai (Due Date)</label>
                  <input
                    type="date"
                    value={capaDueDate}
                    onChange={(e) => setCapaDueDate(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1">Catatan Resolusi / Log Perubahan Status</label>
                <input
                  type="text"
                  value={capaNote}
                  onChange={(e) => setCapaNote(e.target.value)}
                  placeholder="Catatan singkat untuk log riwayat penanganan..."
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setSelectedCapaIncident(null)}
                  className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold text-xs rounded-xl transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingCapa}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs rounded-xl transition flex items-center gap-1.5"
                >
                  {isSubmittingCapa && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Simpan Form CAPA
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* ─── MODAL LIGHTBOX FOTO BUKTI INSIDEN K3 ─── */}
      {viewingIncidentPhoto && createPortal(
        <div
          className="fixed inset-0 z-[9999] overflow-y-auto bg-black/90 backdrop-blur-xl p-4 sm:p-6 flex items-center justify-center min-h-screen animate-fade-in"
          onClick={() => setViewingIncidentPhoto(null)}
        >
          <div
            className="relative w-full max-w-2xl max-h-[82vh] sm:max-h-[85vh] m-auto card-elevated p-5 border border-orange-500/30 space-y-4 overflow-y-auto custom-scrollbar"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-2.5">
                <ShieldAlert className="w-5 h-5 text-orange-400" />
                <div>
                  <h3 className="text-sm font-black text-white">{viewingIncidentPhoto.title}</h3>
                  <p className="text-[11px] text-zinc-400">{viewingIncidentPhoto.subtitle}</p>
                </div>
              </div>
              <button
                onClick={() => setViewingIncidentPhoto(null)}
                className="text-zinc-500 hover:text-white p-1 rounded-lg hover:bg-zinc-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-zinc-950 p-2 rounded-xl border border-zinc-800 flex flex-col items-center justify-center min-h-[300px]">
              <img
                src={viewingIncidentPhoto.url}
                alt="Foto Bukti Insiden K3"
                className="max-h-[60vh] max-w-full object-contain rounded-lg shadow-2xl border border-zinc-800"
              />
            </div>

            <div className="flex items-center justify-between text-xs text-zinc-400 pt-2 border-t border-zinc-800">
              {viewingIncidentPhoto.sizes ? (
                <span className="text-emerald-400 font-mono font-semibold">
                  Kompresi HD Library: {viewingIncidentPhoto.sizes}
                </span>
              ) : (
                <span className="text-zinc-500">Pratinjau Foto Bukti Terlampir</span>
              )}
              <div className="flex items-center gap-2">
                <a
                  href={viewingIncidentPhoto.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs rounded-xl transition flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  Buka Gambar Asli
                </a>
                <button
                  type="button"
                  onClick={() => setViewingIncidentPhoto(null)}
                  className="px-4 py-1.5 bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs rounded-xl transition"
                >
                  Tutup Pratinjau
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

interface AdminRewardManagerSectionProps {
  rewardCatalog: RewardItem[];
  currentAdminId?: string;
  onCreateReward?: (item: Omit<RewardItem, 'id'>) => Promise<void> | void;
  onUpdateReward?: (rewardId: string, updates: Partial<Omit<RewardItem, 'id'>>) => Promise<void> | void;
  onRestockReward?: (rewardId: string, addStock: number) => Promise<void> | void;
  onDeleteReward?: (rewardId: string) => Promise<void> | void;
  showToast: (msg: string) => void;
}

export const AdminRewardManagerSection: React.FC<AdminRewardManagerSectionProps> = ({
  rewardCatalog,
  currentAdminId,
  onCreateReward,
  onUpdateReward,
  onRestockReward,
  onDeleteReward,
  showToast,
}) => {
  const [allRedemptions, setAllRedemptions] = useState<AdminRedemptionRecord[]>([]);
  const [loadingRedemptions, setLoadingRedemptions] = useState(false);
  const [rewardSubTab, setRewardSubTab] = useState<'catalog' | 'redemptions'>('catalog');
  const [rewardCategoryFilter, setRewardCategoryFilter] = useState('Semua');
  const [rewardSearch, setRewardSearch] = useState('');
  const [rewardLowStockOnly, setRewardLowStockOnly] = useState(false);
  const [redemptionSearch, setRedemptionSearch] = useState('');

  // Admin Reward Modals
  const [showRewardModal, setShowRewardModal] = useState(false);
  const [editingReward, setEditingReward] = useState<RewardItem | null>(null);
  const [showRestockModal, setShowRestockModal] = useState(false);
  const [restockRewardItem, setRestockRewardItem] = useState<RewardItem | null>(null);
  const [restockAddAmount, setRestockAddAmount] = useState<number>(10);
  const [fulfillingRewardId, setFulfillingRewardId] = useState<string | null>(null);

  // Form states
  const [rewardFormTitle, setRewardFormTitle] = useState('');
  const [rewardFormCategory, setRewardFormCategory] = useState<RewardItem['category']>('E-Wallet');
  const [rewardFormPoints, setRewardFormPoints] = useState<number>(500);
  const [rewardFormIcon, setRewardFormIcon] = useState<string>('Wallet');
  const [rewardFormDesc, setRewardFormDesc] = useState('');
  const [rewardFormStock, setRewardFormStock] = useState<number>(20);
  const [rewardFormMonthlyLimit, setRewardFormMonthlyLimit] = useState<number>(25);
  const [rewardFormMinTier, setRewardFormMinTier] = useState<TierType>('Novice Operational');
  const [rewardFormMaxClaims, setRewardFormMaxClaims] = useState<number>(1);
  const [rewardFormBadge, setRewardFormBadge] = useState('');
  const [rewardFormError, setRewardFormError] = useState<string | null>(null);
  const [rewardFormSubmitting, setRewardFormSubmitting] = useState(false);

  const loadAllRedemptions = () => {
    setLoadingRedemptions(true);
    fetchAllRedemptionHistory()
      .then(setAllRedemptions)
      .catch(console.warn)
      .finally(() => setLoadingRedemptions(false));
  };

  useEffect(() => {
    loadAllRedemptions();
  }, []);

  const handleFulfillFromAdmin = async (redemptionId: string) => {
    if (!window.confirm('Tandai voucher ini sebagai SUDAH DISERAHKAN ke pekerja?')) return;
    setFulfillingRewardId(redemptionId);
    try {
      await fulfillRedemption(redemptionId, currentAdminId || 'SYS-ADMIN');
      showToast('Voucher berhasil ditandai sebagai telah diserahkan.');
      loadAllRedemptions();
    } catch (err: any) {
      showToast(`Gagal memproses penyerahan: ${err.message}`);
    } finally {
      setFulfillingRewardId(null);
    }
  };

  const filteredAdminCatalog = useMemo(() => {
    return rewardCatalog.filter((item) => {
      const matchSearch =
        item.title.toLowerCase().includes(rewardSearch.toLowerCase()) ||
        item.description.toLowerCase().includes(rewardSearch.toLowerCase()) ||
        (item.badgeTag && item.badgeTag.toLowerCase().includes(rewardSearch.toLowerCase()));
      const matchCat = rewardCategoryFilter === 'Semua' || item.category === rewardCategoryFilter;
      const matchLowStock = !rewardLowStockOnly || item.availableStock <= 5;
      return matchSearch && matchCat && matchLowStock;
    });
  }, [rewardCatalog, rewardSearch, rewardCategoryFilter, rewardLowStockOnly]);

  const filteredAdminRedemptions = useMemo(() => {
    return allRedemptions.filter((log) => {
      const query = redemptionSearch.toLowerCase();
      return (
        log.itemTitle.toLowerCase().includes(query) ||
        log.redemptionCode.toLowerCase().includes(query) ||
        (log.workerName && log.workerName.toLowerCase().includes(query)) ||
        (log.workerEmployeeId && log.workerEmployeeId.toLowerCase().includes(query)) ||
        (log.workerDivision && log.workerDivision.toLowerCase().includes(query))
      );
    });
  }, [allRedemptions, redemptionSearch]);

  const redemptionColumns: DataTableColumn<AdminRedemptionRecord>[] = useMemo(() => [
    {
      key: 'workerName',
      header: 'Staf Pemohon',
      sortable: true,
      render: (log) => (
        <div>
          <div className="font-bold text-white">{log.workerName || log.workerId}</div>
          <div className="text-[10px] text-zinc-500 font-mono">NIK: {log.workerEmployeeId || '-'}</div>
        </div>
      ),
    },
    {
      key: 'workerDivision',
      header: 'Divisi',
      sortable: true,
      render: (log) => (
        <span className="bg-zinc-800 text-zinc-300 px-2 py-0.5 rounded text-[10px] font-bold">
          {log.workerDivision || '-'}
        </span>
      ),
    },
    { key: 'itemTitle', header: 'Item Reward', sortable: true },
    {
      key: 'pointsSpent',
      header: 'Poin Spent',
      sortable: true,
      align: 'right',
      render: (log) => (
        <span className="font-black text-amber-400">-{log.pointsSpent} PTS</span>
      ),
    },
    { key: 'redeemedAt', header: 'Waktu Penukaran', sortable: true },
    {
      key: 'redemptionCode',
      header: 'Kode Voucher Digital',
      sortable: true,
      render: (log) => (
        <span className="font-mono text-emerald-400 bg-zinc-950 border border-zinc-800 px-2 py-1 rounded text-xs font-bold select-all">
          {log.redemptionCode}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status Penyerahan',
      sortable: true,
      render: (log) => {
        const isCompleted = log.status === 'completed';
        return (
          <span
            className={`text-[9px] font-bold px-2 py-0.5 rounded-full inline-flex items-center gap-1 ${
              isCompleted
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                : 'bg-amber-500/10 text-amber-300 border border-amber-500/20'
            }`}
          >
            {isCompleted ? '✓ Diserahkan' : '⏳ Menunggu'}
          </span>
        );
      },
    },
    {
      key: 'id',
      header: 'Aksi Serahkan',
      align: 'center',
      render: (log) => {
        const isCompleted = log.status === 'completed';
        if (isCompleted) {
          return <span className="text-[10px] text-zinc-500">Selesai</span>;
        }
        return (
          <button
            onClick={() => handleFulfillFromAdmin(log.id)}
            disabled={fulfillingRewardId === log.id}
            className="px-2 py-1 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 rounded-lg text-[11px] font-bold transition flex items-center gap-1 disabled:opacity-50 mx-auto"
            title="Tandai voucher ini sudah diserahkan ke pekerja"
          >
            {fulfillingRewardId === log.id ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <Check className="w-3 h-3" />
            )}
            <span>Serahkan</span>
          </button>
        );
      },
    },
  ], [fulfillingRewardId]);

  const handleOpenCreateRewardModal = () => {
    setEditingReward(null);
    setRewardFormTitle('');
    setRewardFormCategory('E-Wallet');
    setRewardFormPoints(500);
    setRewardFormIcon('Wallet');
    setRewardFormDesc('');
    setRewardFormStock(20);
    setRewardFormMonthlyLimit(25);
    setRewardFormMinTier('Novice Operational');
    setRewardFormMaxClaims(1);
    setRewardFormBadge('');
    setRewardFormError(null);
    setShowRewardModal(true);
  };

  const handleOpenEditRewardModal = (item: RewardItem) => {
    setEditingReward(item);
    setRewardFormTitle(item.title);
    setRewardFormCategory(item.category);
    setRewardFormPoints(item.pointsRequired);
    setRewardFormIcon(item.iconName);
    setRewardFormDesc(item.description);
    setRewardFormStock(item.availableStock);
    setRewardFormMonthlyLimit(item.monthlyStockLimit || 25);
    setRewardFormMinTier(item.minTier || 'Novice Operational');
    setRewardFormMaxClaims(item.maxClaimsPerMonth || 1);
    setRewardFormBadge(item.badgeTag || '');
    setRewardFormError(null);
    setShowRewardModal(true);
  };

  const handleOpenRestockRewardModal = (item: RewardItem) => {
    setRestockRewardItem(item);
    setRestockAddAmount(10);
    setRewardFormError(null);
    setShowRestockModal(true);
  };

  const handleSaveRewardForm = async (e: React.FormEvent) => {
    e.preventDefault();
    setRewardFormError(null);

    const payload: Omit<RewardItem, 'id'> = {
      title: rewardFormTitle,
      category: rewardFormCategory,
      pointsRequired: Number(rewardFormPoints),
      iconName: rewardFormIcon,
      description: rewardFormDesc,
      availableStock: Number(rewardFormStock),
      monthlyStockLimit: Number(rewardFormMonthlyLimit),
      minTier: rewardFormMinTier,
      maxClaimsPerMonth: Number(rewardFormMaxClaims),
      badgeTag: rewardFormBadge.trim() || undefined,
    };

    const valErr = RewardEntity.validate(payload);
    if (valErr) {
      setRewardFormError(valErr);
      return;
    }

    setRewardFormSubmitting(true);
    try {
      if (editingReward) {
        if (onUpdateReward) await onUpdateReward(editingReward.id, payload);
        showToast(`Item reward "${payload.title}" berhasil diperbarui.`);
      } else {
        if (onCreateReward) await onCreateReward(payload);
        showToast(`Item reward baru "${payload.title}" berhasil ditambahkan.`);
      }
      setShowRewardModal(false);
    } catch (err) {
      setRewardFormError(err instanceof Error ? err.message : 'Gagal menyimpan item reward.');
    } finally {
      setRewardFormSubmitting(false);
    }
  };

  const handleConfirmRestockForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!restockRewardItem) return;
    setRewardFormError(null);

    if (!restockAddAmount || restockAddAmount <= 0 || !Number.isInteger(restockAddAmount)) {
      setRewardFormError('Jumlah isi stok harus berupa angka bulat positif.');
      return;
    }

    setRewardFormSubmitting(true);
    try {
      if (onRestockReward) await onRestockReward(restockRewardItem.id, Number(restockAddAmount));
      showToast(`Stok ${restockRewardItem.title} berhasil ditambah +${restockAddAmount} pcs.`);
      setShowRestockModal(false);
      setRestockRewardItem(null);
    } catch (err) {
      setRewardFormError(err instanceof Error ? err.message : 'Gagal mengisi stok reward.');
    } finally {
      setRewardFormSubmitting(false);
    }
  };

  const handleDeleteRewardItem = async (item: RewardItem) => {
    if (!window.confirm(`Apakah Anda yakin ingin menghapus reward "${item.title}"?`)) return;
    try {
      if (onDeleteReward) await onDeleteReward(item.id);
      showToast(`Reward "${item.title}" telah dihapus.`);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Gagal menghapus reward item.');
    }
  };

  return (
    <div className="space-y-5">
      {/* Metrics Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-zinc-900/90 border border-zinc-800 p-4 rounded-xl flex items-center justify-between">
          <div>
            <div className="text-[10px] text-zinc-400 font-semibold uppercase tracking-wider">Total Item Reward</div>
            <div className="text-xl font-black text-white mt-0.5">{rewardCatalog.length} Katalog</div>
          </div>
          <div className="w-10 h-10 bg-purple-500/10 border border-purple-500/20 rounded-xl flex items-center justify-center text-purple-400">
            <ShoppingBag className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-zinc-900/90 border border-zinc-800 p-4 rounded-xl flex items-center justify-between">
          <div>
            <div className="text-[10px] text-zinc-400 font-semibold uppercase tracking-wider">Total Stok Tersedia</div>
            <div className="text-xl font-black text-emerald-400 mt-0.5">
              {rewardCatalog.reduce((sum, r) => sum + r.availableStock, 0)} Pcs
            </div>
          </div>
          <div className="w-10 h-10 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center justify-center text-emerald-400">
            <PackageCheck className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-zinc-900/90 border border-zinc-800 p-4 rounded-xl flex items-center justify-between">
          <div>
            <div className="text-[10px] text-zinc-400 font-semibold uppercase tracking-wider">Stok Menipis (≤5)</div>
            <div className={`text-xl font-black mt-0.5 ${rewardCatalog.filter(r => r.availableStock <= 5).length > 0 ? 'text-amber-400' : 'text-zinc-400'
              }`}>
              {rewardCatalog.filter(r => r.availableStock <= 5).length} Item
            </div>
          </div>
          <div className="w-10 h-10 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-center justify-center text-amber-400">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-zinc-900/90 border border-zinc-800 p-4 rounded-xl flex items-center justify-between">
          <div>
            <div className="text-[10px] text-zinc-400 font-semibold uppercase tracking-wider">Total Penukaran Staf</div>
            <div className="text-xl font-black text-cyan-400 mt-0.5">{allRedemptions.length} Transaksi</div>
          </div>
          <div className="w-10 h-10 bg-cyan-500/10 border border-cyan-500/20 rounded-xl flex items-center justify-center text-cyan-400">
            <History className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Main Panel */}
      <div className="card p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setRewardSubTab('catalog')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${rewardSubTab === 'catalog'
                  ? 'bg-purple-600 text-white shadow-md shadow-purple-900/40'
                  : 'bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-700'
                }`}
            >
              Katalog & Manajemen Stok ({rewardCatalog.length})
            </button>
            <button
              onClick={() => setRewardSubTab('redemptions')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${rewardSubTab === 'redemptions'
                  ? 'bg-purple-600 text-white shadow-md shadow-purple-900/40'
                  : 'bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-700'
                }`}
            >
              <History className="w-3.5 h-3.5" />
              Audit Penukaran Staf ({allRedemptions.length})
            </button>
          </div>

          {rewardSubTab === 'catalog' && (
            <button
              onClick={handleOpenCreateRewardModal}
              className="px-3.5 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-lg shadow-purple-900/30 shrink-0"
            >
              <Plus className="w-4 h-4" />
              + Tambah Item Reward Baru
            </button>
          )}
        </div>

        {rewardSubTab === 'catalog' ? (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="relative w-full sm:w-64">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                <input
                  type="text"
                  value={rewardSearch}
                  onChange={(e) => setRewardSearch(e.target.value)}
                  placeholder="Cari item reward..."
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto">
                <select
                  value={rewardCategoryFilter}
                  onChange={(e) => setRewardCategoryFilter(e.target.value)}
                  className="bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-purple-500"
                >
                  <option value="Semua">Semua Kategori</option>
                  <option value="E-Wallet">E-Wallet</option>
                  <option value="Pulsa & Data">Pulsa & Data</option>
                  <option value="Safety Gear">Safety Gear</option>
                  <option value="Voucher & Perk">Voucher & Perk</option>
                </select>

                <button
                  onClick={() => setRewardLowStockOnly(!rewardLowStockOnly)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition flex items-center gap-1.5 ${rewardLowStockOnly
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                      : 'bg-zinc-900 text-zinc-400 border border-zinc-800 hover:text-white'
                    }`}
                >
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                  <span>Stok Menipis (≤5)</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {filteredAdminCatalog.map((item) => {
                const TIER_COLOR: Record<string, string> = {
                  'Novice Operational': 'text-zinc-400 border-zinc-700',
                  'Pro Specialist': 'text-blue-400 border-blue-700/50',
                  'Elite Logistician': 'text-purple-400 border-purple-700/50',
                  'Legendary Champion': 'text-amber-400 border-amber-700/50',
                };
                const tierColor = TIER_COLOR[item.minTier || 'Novice Operational'] || 'text-zinc-400 border-zinc-700';
                const stockPct = item.monthlyStockLimit
                  ? Math.min(100, Math.round((item.availableStock / item.monthlyStockLimit) * 100))
                  : 100;

                return (
                  <div
                    key={item.id}
                    className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-4 flex flex-col justify-between relative hover:border-zinc-700 transition group"
                  >
                    {/* Badge Tags */}
                    <div className="absolute top-3 right-3 flex flex-col items-end gap-1">
                      {item.badgeTag && (
                        <span className="bg-amber-500 text-zinc-950 text-[9px] font-black px-2 py-0.5 rounded uppercase tracking-wider">
                          {item.badgeTag}
                        </span>
                      )}
                      {item.minTier && item.minTier !== 'Novice Operational' && (
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded border bg-zinc-950 ${tierColor}`}>
                          🔒 {item.minTier}
                        </span>
                      )}
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-2.5">
                        <span className="text-[10px] font-mono text-zinc-500 bg-zinc-950 px-2 py-0.5 rounded border border-zinc-800">
                          {item.id}
                        </span>
                        <span className="text-[10px] text-purple-400 font-semibold">{item.category}</span>
                      </div>

                      <h4 className="font-bold text-white text-xs mb-1 leading-snug pr-20">{item.title}</h4>
                      <p className="text-[11px] text-zinc-400 leading-relaxed mb-3">{item.description}</p>
                    </div>

                    <div>
                      {/* Points & Stock Row */}
                      <div className="flex items-center justify-between py-2 border-t border-zinc-800 text-xs">
                        <div className="flex items-center gap-1">
                          <Coins className="w-3.5 h-3.5 text-amber-400" />
                          <span className="font-black text-amber-300">{item.pointsRequired.toLocaleString()} PTS</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-zinc-500 text-[11px]">Stok:</span>
                          <span className={`font-mono font-bold ${item.availableStock > 5 ? 'text-emerald-400' : item.availableStock > 0 ? 'text-amber-400' : 'text-rose-400'}`}>
                            {item.availableStock}{item.monthlyStockLimit ? `/${item.monthlyStockLimit}` : ''} pcs
                          </span>
                        </div>
                      </div>

                      {/* Stock Bar */}
                      {item.monthlyStockLimit && (
                        <div className="w-full h-1.5 bg-zinc-800 rounded-full mb-2 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${stockPct > 40 ? 'bg-emerald-500' : stockPct > 15 ? 'bg-amber-500' : 'bg-rose-500'}`}
                            style={{ width: `${stockPct}%` }}
                          />
                        </div>
                      )}

                      {/* Metadata Row */}
                      <div className="flex items-center gap-2 mb-3 text-[10px] text-zinc-500">
                        <span>Max {item.maxClaimsPerMonth || 1}x/bulan/user</span>
                        <span className="text-zinc-700">•</span>
                        <span>Reset tiap tgl 1</span>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleOpenRestockRewardModal(item)}
                          className="w-1/3 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 rounded-lg py-1.5 text-xs font-bold transition flex items-center justify-center gap-1"
                        >
                          <PackagePlus className="w-3.5 h-3.5" />
                          + Stok
                        </button>
                        <button
                          onClick={() => handleOpenEditRewardModal(item)}
                          className="w-1/3 bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-500/30 rounded-lg py-1.5 text-xs font-bold transition flex items-center justify-center gap-1"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteRewardItem(item)}
                          className="w-1/3 bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/30 rounded-lg py-1.5 text-xs font-bold transition flex items-center justify-center gap-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Hapus
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {filteredAdminCatalog.length === 0 && (
              <div className="text-center py-10 text-zinc-500 text-xs border border-zinc-800 rounded-xl bg-zinc-950/40">
                Tidak ada item reward yang sesuai dengan filter pencarian.
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <CustomDataTable
              columns={redemptionColumns}
              data={allRedemptions}
              searchPlaceholder="Cari staf, NIK, item reward, atau kode voucher..."
              defaultSortKey="redeemedAt"
              defaultSortDir="desc"
              exportFileName="Audit_Penukaran_Reward_Staf"
              emptyMessage={loadingRedemptions ? 'Memuat data penukaran...' : 'Belum ada riwayat penukaran reward.'}
            />
          </div>
        )}
      </div>

      {/* Add / Edit Reward Modal */}
      {showRewardModal && createPortal(
        <div className="fixed inset-0 z-[9999] overflow-y-auto bg-black/80 backdrop-blur-md p-4 sm:p-6 flex items-center justify-center min-h-screen animate-fade-in">
          <div className="card-elevated w-full max-w-lg p-6 relative">
            <button
              onClick={() => setShowRewardModal(false)}
              className="absolute top-4 right-4 text-zinc-400 hover:text-white transition"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 mb-4">
              <ShoppingBag className="w-5 h-5 text-purple-400" />
              <h3 className="text-sm font-bold text-white">
                {editingReward ? `Edit Item Reward: ${editingReward.title}` : 'Tambah Item Reward Baru'}
              </h3>
            </div>

            {rewardFormError && (
              <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-start gap-2 text-rose-300 text-xs">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{rewardFormError}</span>
              </div>
            )}

            <form onSubmit={handleSaveRewardForm} className="space-y-3.5">
              <div>
                <label className="block text-xs text-zinc-400 mb-1">Judul Reward *</label>
                <input
                  type="text"
                  value={rewardFormTitle}
                  onChange={(e) => setRewardFormTitle(e.target.value)}
                  placeholder="cth. Saldo GoPay Rp 100.000"
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">Kategori *</label>
                  <select
                    value={rewardFormCategory}
                    onChange={(e) => setRewardFormCategory(e.target.value as RewardItem['category'])}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
                  >
                    <option value="E-Wallet">E-Wallet</option>
                    <option value="Pulsa & Data">Pulsa & Data</option>
                    <option value="Safety Gear">Safety Gear</option>
                    <option value="Voucher & Perk">Voucher & Perk</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs text-zinc-400 mb-1">Biaya Poin (PTS) *</label>
                  <input
                    type="number"
                    min="1"
                    value={rewardFormPoints}
                    onChange={(e) => setRewardFormPoints(Number(e.target.value))}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">Syarat Minimal Tier</label>
                  <select
                    value={rewardFormMinTier}
                    onChange={(e) => setRewardFormMinTier(e.target.value as TierType)}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
                  >
                    <option value="Novice Operational">Novice Operational (Semua)</option>
                    <option value="Pro Specialist">Pro Specialist</option>
                    <option value="Elite Logistician">Elite Logistician</option>
                    <option value="Legendary Champion">Legendary Champion</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs text-zinc-400 mb-1">Batas Klaim / User / Bulan</label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={rewardFormMaxClaims}
                    onChange={(e) => setRewardFormMaxClaims(Number(e.target.value))}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">Stok Awal Saat Ini *</label>
                  <input
                    type="number"
                    min="0"
                    value={rewardFormStock}
                    onChange={(e) => setRewardFormStock(Number(e.target.value))}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs text-zinc-400 mb-1">Limit Kuota Bulanan Tgl 1</label>
                  <input
                    type="number"
                    min="1"
                    value={rewardFormMonthlyLimit}
                    onChange={(e) => setRewardFormMonthlyLimit(Number(e.target.value))}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">Ikon Tampilan</label>
                  <select
                    value={rewardFormIcon}
                    onChange={(e) => setRewardFormIcon(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
                  >
                    <option value="Wallet">Wallet (Dompet)</option>
                    <option value="CreditCard">CreditCard (Kartu/Topup)</option>
                    <option value="Wifi">Wifi (Paket Data)</option>
                    <option value="ShieldCheck">ShieldCheck (Safety APD)</option>
                    <option value="Award">Award (Penghargaan)</option>
                    <option value="ShoppingBag">ShoppingBag (Voucher)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs text-zinc-400 mb-1">Badge Tag (Opsional)</label>
                  <input
                    type="text"
                    value={rewardFormBadge}
                    onChange={(e) => setRewardFormBadge(e.target.value)}
                    placeholder="cth. Popular, Best Value, Exclusive, VIP"
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs text-zinc-400 mb-1">Deskripsi Reward *</label>
                <textarea
                  rows={2}
                  value={rewardFormDesc}
                  onChange={(e) => setRewardFormDesc(e.target.value)}
                  placeholder="Jelaskan detail voucher atau fisik reward..."
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
                  required
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowRewardModal(false)}
                  className="w-1/2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-semibold py-2 rounded-xl text-xs transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={rewardFormSubmitting}
                  className="w-1/2 bg-purple-600 hover:bg-purple-500 text-white font-bold py-2 rounded-xl text-xs transition flex items-center justify-center gap-2"
                >
                  {rewardFormSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{editingReward ? 'Simpan Perubahan' : 'Tambah Reward'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Restock Modal */}
      {showRestockModal && restockRewardItem && createPortal(
        <div className="fixed inset-0 z-[9999] overflow-y-auto bg-black/80 backdrop-blur-md p-4 sm:p-6 flex items-center justify-center min-h-screen animate-fade-in">
          <div className="card-elevated w-full max-w-sm p-6 relative">
            <button
              onClick={() => setShowRestockModal(false)}
              className="absolute top-4 right-4 text-zinc-400 hover:text-white transition"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 mb-3">
              <PackagePlus className="w-5 h-5 text-emerald-400" />
              <h3 className="text-sm font-bold text-white">Isi Stok Reward (Restock)</h3>
            </div>

            <div className="bg-zinc-900 p-3 rounded-xl border border-zinc-800 mb-4 text-xs">
              <div className="font-bold text-white">{restockRewardItem.title}</div>
              <div className="text-zinc-400 mt-1">Stok saat ini: <strong className="text-emerald-400">{restockRewardItem.availableStock} pcs</strong></div>
            </div>

            {rewardFormError && (
              <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-start gap-2 text-rose-300 text-xs">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{rewardFormError}</span>
              </div>
            )}

            <form onSubmit={handleConfirmRestockForm} className="space-y-4">
              <div>
                <label className="block text-xs text-zinc-400 mb-1">Jumlah Tambahan Stok (+)</label>
                <input
                  type="number"
                  min="1"
                  value={restockAddAmount}
                  onChange={(e) => setRestockAddAmount(Number(e.target.value))}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono font-bold"
                  required
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowRestockModal(false)}
                  className="w-1/2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-semibold py-2 rounded-xl text-xs transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={rewardFormSubmitting}
                  className="w-1/2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2 rounded-xl text-xs transition flex items-center justify-center gap-2"
                >
                  {rewardFormSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Tambah Stok</span>
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
