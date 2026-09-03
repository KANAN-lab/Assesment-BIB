import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  ShieldAlert,
  AlertTriangle,
  FileText,
  UserX,
  BookOpen,
  CheckCircle2,
  Clock,
  Plus,
  Search,
  Filter,
  Download,
  Trash2,
  Printer,
  ChevronRight,
  Sparkles,
  HelpCircle,
  Award,
  Calendar,
  Building2,
  UserCheck,
  RotateCcw,
  Eye,
  CheckCircle
} from 'lucide-react';
import { WorkerProfile } from '../types/assessment';
import {
  DisciplinaryActionEntity,
  ViolationLevel,
  ViolationCategory,
  SanctionStatus,
} from '../types/disciplinary';
import {
  DisciplinaryService,
  VIOLATION_META,
  CATEGORY_META,
} from '../lib/disciplinaryService';
import { fetchAllSopModules } from '../lib/sopService';
import { SopModule } from '../types/sop';

interface DisciplinaryPanelProps {
  workers: WorkerProfile[];
  currentUserName?: string;
  isSupervisor?: boolean;
}

export const DisciplinaryPanel: React.FC<DisciplinaryPanelProps> = ({
  workers = [],
  currentUserName = 'Petugas K3 & Pengawas',
  isSupervisor = false,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'list' | 'create' | 'matrix'>('list');
  const [actions, setActions] = useState<DisciplinaryActionEntity[]>([]);
  const [sopModules, setSopModules] = useState<SopModule[]>([]);

  // Search & Filter State
  const [search, setSearch] = useState('');
  const [levelFilter, setLevelFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [divisionFilter, setDivisionFilter] = useState('all');

  // Form State
  const [selectedWorkerId, setSelectedWorkerId] = useState('');
  const [violationLevel, setViolationLevel] = useState<ViolationLevel | ''>('');
  const [violationCategory, setViolationCategory] = useState<ViolationCategory | ''>('');
  const [incidentDate, setIncidentDate] = useState(new Date().toISOString().slice(0, 10));
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [pointDeduction, setPointDeduction] = useState(25);
  const [mandatoryRetrainingSopId, setMandatoryRetrainingSopId] = useState('');
  const [actionPlan, setActionPlan] = useState('');
  const [evidencePhotoUrl, setEvidencePhotoUrl] = useState('');
  const [issuerName, setIssuerName] = useState(currentUserName);

  // Modal / Verification State
  const [verifyingAction, setVerifyingAction] = useState<DisciplinaryActionEntity | null>(null);
  const [verificationNotes, setVerificationNotes] = useState('');

  // Load Data
  const reloadData = () => {
    setActions(DisciplinaryService.getAllActions());
  };

  useEffect(() => {
    reloadData();
    fetchAllSopModules().then(setSopModules).catch(() => {});

    const handler = () => reloadData();
    window.addEventListener('gappy_disciplinary_updated', handler);
    return () => window.removeEventListener('gappy_disciplinary_updated', handler);
  }, []);

  // Sync point deduction when violation level changes
  const handleLevelChange = (lvl: ViolationLevel) => {
    setViolationLevel(lvl);
    if (lvl) {
      setPointDeduction(DisciplinaryService.getDefaultPointDeduction(lvl));
    }
  };

  // KPI Stats
  const stats = useMemo(() => DisciplinaryService.getStats(), [actions]);

  // Unique Divisions
  const divisions = useMemo(() => {
    const set = new Set<string>();
    workers.forEach((w) => {
      if (w.division && w.division.toUpperCase() !== 'SYSTEM') set.add(w.division);
    });
    return Array.from(set);
  }, [workers]);

  // Filtered Actions
  const filteredActions = useMemo(() => {
    return actions.filter((a) => {
      if (levelFilter !== 'all' && a.violationLevel !== levelFilter) return false;
      if (categoryFilter !== 'all' && a.violationCategory !== categoryFilter) return false;
      if (statusFilter !== 'all' && a.status !== statusFilter) return false;
      if (divisionFilter !== 'all' && a.division !== divisionFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          a.workerName.toLowerCase().includes(q) ||
          a.employeeId.toLowerCase().includes(q) ||
          a.documentRefNumber.toLowerCase().includes(q) ||
          a.location.toLowerCase().includes(q) ||
          a.description.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [actions, levelFilter, categoryFilter, statusFilter, divisionFilter, search]);

  // Submit New Action
  const handleSubmitNewAction = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWorkerId) {
      alert('Pilih pekerja logistik terlebih dahulu!');
      return;
    }
    if (!violationLevel) {
      alert('Pilih tingkat sanksi / pembinaan terlebih dahulu!');
      return;
    }
    if (!violationCategory) {
      alert('Pilih kategori pelanggaran terlebih dahulu!');
      return;
    }
    if (!location.trim() || !description.trim()) {
      alert('Isi lokasi kejadian dan kronologi pelanggaran secara lengkap!');
      return;
    }

    const worker = workers.find((w) => w.id === selectedWorkerId);
    if (!worker) return;

    const sop = sopModules.find((s) => s.id === mandatoryRetrainingSopId);

    DisciplinaryService.issueSanction({
      workerId: worker.id,
      workerName: worker.name,
      employeeId: worker.employeeId,
      division: worker.division,
      role: worker.role,
      violationLevel,
      violationCategory,
      incidentDate,
      location,
      description,
      pointDeduction: Number(pointDeduction) || 0,
      mandatoryRetrainingSopId: sop?.id,
      mandatoryRetrainingSopTitle: sop ? `[${sop.code}] ${sop.title}` : undefined,
      issuedBy: issuerName || 'Supervisor HSE',
      actionPlan: actionPlan || undefined,
      evidencePhotoUrl: evidencePhotoUrl || undefined,
    });

    // Reset Form
    setSelectedWorkerId('');
    setViolationLevel('');
    setViolationCategory('');
    setLocation('');
    setDescription('');
    setMandatoryRetrainingSopId('');
    setActionPlan('');
    setEvidencePhotoUrl('');
    setActiveSubTab('list');
  };

  // Complete Retraining Action
  const handleVerifyRetraining = () => {
    if (!verifyingAction) return;
    DisciplinaryService.completeRetraining(verifyingAction.id, verificationNotes);
    setVerifyingAction(null);
    setVerificationNotes('');
    reloadData();
  };

  const handleDelete = (id: string) => {
    if (confirm('Apakah Anda yakin ingin menghapus arsip sanksi ini?')) {
      DisciplinaryService.deleteAction(id);
      reloadData();
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* ─── HEADER BANNER ─── */}
      <div className="card p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 border-rose-500/20 bg-gradient-to-r from-zinc-950 via-zinc-900 to-zinc-950">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center shrink-0 shadow-inner">
            <ShieldAlert className="w-6 h-6 text-rose-400" />
          </div>
          <div>
            <h2 className="text-base font-black text-white flex items-center gap-2">
              <span>Konseling & Sanksi K3 (Safety Coaching & Disciplinary Matrix)</span>
            </h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              Pusat Penegakan Kepatuhan K3, Penerbitan Surat Peringatan (SP 1/2/3), Konseling Lisan & Remedial Retraining SOP
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => DisciplinaryService.exportActionsCSV(actions)}
            className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
            title="Unduh Rekap Sanksi Format CSV"
          >
            <Download className="w-4 h-4 text-emerald-400" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={() => setActiveSubTab('create')}
            className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-black text-xs rounded-xl transition flex items-center gap-1.5 shadow-lg shadow-rose-950"
          >
            <Plus className="w-4 h-4" />
            <span>Terbitkan Sanksi Baru</span>
          </button>
        </div>
      </div>

      {/* ─── KPI METRIC STATS CARDS ─── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="card p-3.5 bg-zinc-900/60 border-zinc-800">
          <div className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Total Tindakan</div>
          <div className="text-xl font-black text-white mt-1">{stats.totalActions}</div>
          <div className="text-[10px] text-zinc-400 mt-0.5">Seluruh Arsip</div>
        </div>

        <div className="card p-3.5 bg-zinc-900/60 border-amber-500/20">
          <div className="text-[10px] text-amber-400/80 font-bold uppercase tracking-wider">Sanksi Aktif</div>
          <div className="text-xl font-black text-amber-400 mt-1">{stats.activeSanctions}</div>
          <div className="text-[10px] text-zinc-500 mt-0.5">Dalam Pemantauan</div>
        </div>

        <div className="card p-3.5 bg-zinc-900/60 border-indigo-500/20">
          <div className="text-[10px] text-indigo-400/80 font-bold uppercase tracking-wider">Konseling Lisan</div>
          <div className="text-xl font-black text-indigo-400 mt-1">{stats.verbalCoachings}</div>
          <div className="text-[10px] text-zinc-500 mt-0.5">Pembinaan 1-on-1</div>
        </div>

        <div className="card p-3.5 bg-zinc-900/60 border-rose-500/20">
          <div className="text-[10px] text-rose-400/80 font-bold uppercase tracking-wider">Surat Peringatan</div>
          <div className="text-xl font-black text-rose-400 mt-1">{stats.warningLetters}</div>
          <div className="text-[10px] text-zinc-500 mt-0.5">SP 1 / SP 2 / SP 3</div>
        </div>

        <div className="card p-3.5 bg-zinc-900/60 border-cyan-500/20">
          <div className="text-[10px] text-cyan-400/80 font-bold uppercase tracking-wider">Wajib Retraining</div>
          <div className="text-xl font-black text-cyan-400 mt-1">{stats.pendingRetrainings}</div>
          <div className="text-[10px] text-zinc-500 mt-0.5">Modul SOP Belum Selesai</div>
        </div>

        <div className="card p-3.5 bg-zinc-900/60 border-red-500/20">
          <div className="text-[10px] text-red-400/80 font-bold uppercase tracking-wider">Poin Terpotong</div>
          <div className="text-xl font-black text-red-400 mt-1">-{stats.totalPointsDeducted}</div>
          <div className="text-[10px] text-zinc-500 mt-0.5">Akumulasi Penalti</div>
        </div>
      </div>

      {/* ─── SUB-TABS NAVIGATION ─── */}
      <div className="flex items-center gap-1.5 border-b border-zinc-800 pb-3">
        <button
          onClick={() => setActiveSubTab('list')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
            activeSubTab === 'list'
              ? 'bg-rose-600 text-white shadow-lg shadow-rose-950'
              : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Rekap Sanksi & Pembinaan ({actions.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('create')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
            activeSubTab === 'create'
              ? 'bg-rose-600 text-white shadow-lg shadow-rose-950'
              : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
          }`}
        >
          <Plus className="w-4 h-4" />
          <span>Terbitkan Sanksi Baru</span>
        </button>

        <button
          onClick={() => setActiveSubTab('matrix')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
            activeSubTab === 'matrix'
              ? 'bg-rose-600 text-white shadow-lg shadow-rose-950'
              : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
          }`}
        >
          <RotateCcw className="w-4 h-4" />
          <span>Matriks Disiplin K3 & Aturan Sanksi</span>
        </button>
      </div>

      {/* ─── SUB-TAB 1: REKAP SANKSI & PEMBINAAN ─── */}
      {activeSubTab === 'list' && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="card p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-zinc-900/60">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari nama pekerja, NIP, nomor SK, lokasi, atau deskripsi..."
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-rose-500"
              />
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Filter Tingkat */}
              <select
                value={levelFilter}
                onChange={(e) => setLevelFilter(e.target.value)}
                className="bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-rose-500"
              >
                <option value="all">Semua Tingkat Sanksi</option>
                <option value="coaching_verbal">Pembinaan Lisan</option>
                <option value="written_warning_1">Surat Peringatan 1 (SP1)</option>
                <option value="written_warning_2">Surat Peringatan 2 (SP2)</option>
                <option value="written_warning_3">Surat Peringatan 3 (SP3)</option>
                <option value="suspension">Skorsing</option>
                <option value="remedial_evaluation">Remedial Evaluasi</option>
              </select>

              {/* Filter Kategori */}
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-rose-500"
              >
                <option value="all">Semua Kategori</option>
                <option value="ppe_violation">Pelanggaran APD</option>
                <option value="mhe_reckless">MHE / Forklift Ceroboh</option>
                <option value="sop_breach">Penyimpangan SOP</option>
                <option value="unauthorized_area">Area Terlarang</option>
                <option value="hazard_negligence">Pembiaran Bahaya</option>
                <option value="cellphone_in_staging">Penggunaan HP</option>
                <option value="late_absent">Mangkir Briefing</option>
              </select>

              {/* Filter Status */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-rose-500"
              >
                <option value="all">Semua Status</option>
                <option value="active">Aktif</option>
                <option value="in_retraining">Wajib Retraining</option>
                <option value="resolved">Selesai / Tuntas</option>
                <option value="appealed">Banding</option>
              </select>
            </div>
          </div>

          {/* Table List */}
          {filteredActions.length === 0 ? (
            <div className="card p-12 text-center text-zinc-500 space-y-2">
              <ShieldAlert className="w-10 h-10 mx-auto text-zinc-700" />
              <div className="text-sm font-bold text-zinc-400">Belum Ada Catatan Sanksi & Pembinaan K3</div>
              <p className="text-xs text-zinc-600">Semua personel saat ini mematuhi standar keselamatan kerja.</p>
            </div>
          ) : (
            <div className="card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-zinc-950 text-zinc-400 border-b border-zinc-800 font-bold uppercase text-[10px] tracking-wider">
                    <tr>
                      <th className="p-3.5">No SK & Waktu</th>
                      <th className="p-3.5">Pekerja & Divisi</th>
                      <th className="p-3.5">Tingkat & Kategori Pelanggaran</th>
                      <th className="p-3.5">Lokasi & Kronologi</th>
                      <th className="p-3.5">Penalti Poin</th>
                      <th className="p-3.5">Mandatory Retraining</th>
                      <th className="p-3.5">Status</th>
                      <th className="p-3.5 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/60">
                    {filteredActions.map((action) => {
                      const meta = VIOLATION_META[action.violationLevel];
                      const cat = CATEGORY_META[action.violationCategory];
                      return (
                        <tr key={action.id} className="hover:bg-zinc-900/40 transition">
                          <td className="p-3.5 align-top">
                            <div className="font-mono font-bold text-white text-xs">{action.documentRefNumber}</div>
                            <div className="text-[11px] text-zinc-500 mt-0.5">{action.incidentDate}</div>
                            <div className="text-[10px] text-zinc-600">Oleh: {action.issuedBy}</div>
                          </td>

                          <td className="p-3.5 align-top">
                            <div className="font-bold text-white">{action.workerName}</div>
                            <div className="text-[11px] text-zinc-400 font-mono">{action.employeeId}</div>
                            <div className="text-[10px] text-zinc-500">
                              {action.division} · {action.role}
                            </div>
                          </td>

                          <td className="p-3.5 align-top space-y-1">
                            <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold border ${meta.badgeCls}`}>
                              {meta.label}
                            </span>
                            <div className="text-xs text-zinc-300 flex items-center gap-1">
                              <span>{cat?.icon}</span>
                              <span>{cat?.label || action.violationCategory}</span>
                            </div>
                          </td>

                          <td className="p-3.5 align-top max-w-xs">
                            <div className="font-semibold text-zinc-300 text-xs">📍 {action.location}</div>
                            <p className="text-[11px] text-zinc-400 line-clamp-2 mt-0.5">{action.description}</p>
                            {action.actionPlan && (
                              <div className="text-[10px] text-indigo-400 mt-1">
                                Komitmen: {action.actionPlan.slice(0, 45)}...
                              </div>
                            )}
                          </td>

                          <td className="p-3.5 align-top">
                            <span className="font-black text-rose-400 font-mono text-xs">
                              -{action.pointDeduction} PTS
                            </span>
                          </td>

                          <td className="p-3.5 align-top">
                            {action.mandatoryRetrainingSopTitle ? (
                              <div className="space-y-1">
                                <div className="text-xs font-semibold text-cyan-300 line-clamp-1">
                                  {action.mandatoryRetrainingSopTitle}
                                </div>
                                {action.isRetrainingCompleted ? (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-500/20">
                                    <CheckCircle className="w-3 h-3" /> Selesai
                                  </span>
                                ) : (
                                  <button
                                    onClick={() => setVerifyingAction(action)}
                                    className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-400 bg-amber-950/40 hover:bg-amber-900/60 px-2 py-0.5 rounded border border-amber-500/30 transition"
                                  >
                                    <Clock className="w-3 h-3" /> Verifikasi Lulus
                                  </button>
                                )}
                              </div>
                            ) : (
                              <span className="text-zinc-600 text-[11px]">-</span>
                            )}
                          </td>

                          <td className="p-3.5 align-top">
                            {action.status === 'resolved' ? (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                                Selesai
                              </span>
                            ) : action.status === 'in_retraining' ? (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                                Retraining
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30">
                                Aktif
                              </span>
                            )}
                          </td>

                          <td className="p-3.5 align-top text-right space-x-1.5 whitespace-nowrap">
                            <button
                              onClick={() => DisciplinaryService.generateWarningLetterPDF(action)}
                              className="p-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg transition inline-flex items-center"
                              title="Cetak Surat Peringatan / Berita Acara PDF"
                            >
                              <Printer className="w-3.5 h-3.5 text-indigo-400" />
                            </button>
                            <button
                              onClick={() => handleDelete(action.id)}
                              className="p-1.5 bg-zinc-800 hover:bg-rose-900/40 text-zinc-400 hover:text-rose-400 rounded-lg transition inline-flex items-center"
                              title="Hapus Catatan"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─── SUB-TAB 2: FORM TERBITKAN SANKSI BARU ─── */}
      {activeSubTab === 'create' && (
        <form onSubmit={handleSubmitNewAction} className="card p-6 space-y-5 bg-zinc-950 border-rose-500/30 shadow-xl max-w-4xl mx-auto">
          <div className="border-b border-zinc-800 pb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-rose-400" />
              <h3 className="font-bold text-white text-sm">Form Penerbitan Konseling & Sanksi K3</h3>
            </div>
            <span className="text-[11px] text-zinc-500">Nomor SK akan digenerate otomatis</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 1. Pilih Pekerja */}
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-zinc-300 mb-1">
                Pilih Personel Logistik yang Melakukan Pelanggaran <span className="text-rose-400">*</span>
              </label>
              <select
                value={selectedWorkerId}
                onChange={(e) => setSelectedWorkerId(e.target.value)}
                required
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-rose-500 font-semibold"
              >
                <option value="" disabled>-- Pilih Pekerja Logistik --</option>
                {workers
                  .filter((w) => w.division.toUpperCase() !== 'SYSTEM')
                  .map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name} ({w.employeeId}) — {w.division} / {w.role}
                    </option>
                  ))}
              </select>
            </div>

            {/* 2. Tingkat Sanksi */}
            <div>
              <label className="block text-xs font-bold text-zinc-300 mb-1">
                Tingkat Sanksi / Tindakan Disiplin <span className="text-rose-400">*</span>
              </label>
              <select
                value={violationLevel}
                onChange={(e) => handleLevelChange(e.target.value as ViolationLevel)}
                required
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-rose-500 font-semibold"
              >
                <option value="" disabled>-- Pilih Tingkat Sanksi / Pembinaan --</option>
                <option value="coaching_verbal">Level 1: Pembinaan Lisan (Konseling 1-on-1)</option>
                <option value="written_warning_1">Level 2: Surat Peringatan Pertama (SP 1)</option>
                <option value="written_warning_2">Level 3: Surat Peringatan Kedua (SP 2)</option>
                <option value="written_warning_3">Level 4: Surat Peringatan Ketiga (SP 3)</option>
                <option value="suspension">Level 5: Skorsing Operasional Sementara</option>
                <option value="remedial_evaluation">Level Khusus: Remedial & Uji Ulang Kompetensi</option>
              </select>
            </div>

            {/* 3. Kategori Pelanggaran */}
            <div>
              <label className="block text-xs font-bold text-zinc-300 mb-1">
                Kategori Pelanggaran K3 <span className="text-rose-400">*</span>
              </label>
              <select
                value={violationCategory}
                onChange={(e) => setViolationCategory(e.target.value as ViolationCategory)}
                required
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-rose-500 font-semibold"
              >
                <option value="" disabled>-- Pilih Kategori Pelanggaran K3 --</option>
                <option value="ppe_violation">Pelanggaran APD Wajib (Helm/Sepatu/Rompi/Harness)</option>
                <option value="mhe_reckless">Operasional MHE / Forklift Ceroboh & Laju Tinggi</option>
                <option value="sop_breach">Penyimpangan SOP & Bypass Prosedur Keselamatan</option>
                <option value="unauthorized_area">Masuk Area Terlarang / Staging Tanpa Izin</option>
                <option value="hazard_negligence">Pembiaran Bahaya / Tumpahan Cairan & Racking Rusak</option>
                <option value="cellphone_in_staging">Penggunaan Gadget / HP saat Mengoperasikan Alat</option>
                <option value="late_absent">Mangkir Safety Briefing Pre-Shift / Terlambat</option>
                <option value="other">Pelanggaran Operasional Lainnya</option>
              </select>
            </div>

            {/* 4. Tanggal & Lokasi */}
            <div>
              <label className="block text-xs font-bold text-zinc-300 mb-1">Tanggal Kejadian</label>
              <input
                type="date"
                value={incidentDate}
                onChange={(e) => setIncidentDate(e.target.value)}
                required
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-rose-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-300 mb-1">
                Lokasi Kejadian di Gudang <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Misal: Loading Dock 3, Aisle B-12, Charging Station..."
                required
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-rose-500"
              />
            </div>

            {/* 5. Penalti Poin & SOP Retraining */}
            <div>
              <label className="block text-xs font-bold text-zinc-300 mb-1">
                Penalti Pengurangan Poin BIB (Points)
              </label>
              <input
                type="number"
                value={pointDeduction}
                onChange={(e) => setPointDeduction(Number(e.target.value))}
                min="0"
                max="1000"
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-rose-400 font-bold font-mono focus:outline-none focus:border-rose-500"
              />
              <span className="text-[10px] text-zinc-500">Nilai rekomendasi berdasarkan tingkat sanksi</span>
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-300 mb-1">
                Penugasan Mandatory Retraining Modul SOP (Opsional)
              </label>
              <select
                value={mandatoryRetrainingSopId}
                onChange={(e) => setMandatoryRetrainingSopId(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-rose-500"
              >
                <option value="">-- Tidak Ada Penugasan Retraining --</option>
                {sopModules.map((sop) => (
                  <option key={sop.id} value={sop.id}>
                    [{sop.code}] {sop.title} ({sop.category})
                  </option>
                ))}
              </select>
            </div>

            {/* 6. Deskripsi Kronologi */}
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-zinc-300 mb-1">
                Deskripsi Kronologi Pelanggaran <span className="text-rose-400">*</span>
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                required
                placeholder="Jelaskan secara detail tindakan tidak aman yang dilakukan pekerja dan dampaknya..."
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-rose-500"
              />
            </div>

            {/* 7. Action Plan & Bukti */}
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-zinc-300 mb-1">
                Komitmen Tindakan Perbaikan Pekerja (Action Plan)
              </label>
              <input
                type="text"
                value={actionPlan}
                onChange={(e) => setActionPlan(e.target.value)}
                placeholder="Pekerja berjanji mematuhi SOP dan melakukan inspeksi pre-shift secara teliti..."
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-rose-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-300 mb-1">Nama Petugas Pemeriksa / Pengawas</label>
              <input
                type="text"
                value={issuerName}
                onChange={(e) => setIssuerName(e.target.value)}
                required
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-rose-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-300 mb-1">URL Bukti Foto Kejadian (Opsional)</label>
              <input
                type="text"
                value={evidencePhotoUrl}
                onChange={(e) => setEvidencePhotoUrl(e.target.value)}
                placeholder="https://..."
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-rose-500"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-zinc-800 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setActiveSubTab('list')}
              className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold text-xs rounded-xl transition"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-black text-xs rounded-xl transition flex items-center gap-1.5 shadow-lg shadow-rose-950"
            >
              <ShieldAlert className="w-4 h-4" />
              <span>Terbitkan Dokumen Sanksi</span>
            </button>
          </div>
        </form>
      )}

      {/* ─── SUB-TAB 3: MATRIKS DISIPLIN K3 & ATURAN ─── */}
      {activeSubTab === 'matrix' && (
        <div className="space-y-4">
          <div className="card p-5 bg-zinc-900/60 border-zinc-800 space-y-2">
            <h3 className="text-sm font-black text-white flex items-center gap-2">
              <RotateCcw className="w-4 h-4 text-rose-400" />
              Panduan Matriks Eskalasi Disiplin & Sanksi K3 PT. DAYA ANUGRAH MULYA
            </h3>
            <p className="text-xs text-zinc-400">
              Sistem penegakan disiplin bertingkat berlandaskan prinsip pembinaan korektif, perbaikan kompetensi melalui retraining SOP, dan penyesuaian bobot poin penilaian BIB.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(VIOLATION_META).map(([key, val]) => (
              <div key={key} className="card p-4 space-y-3 bg-zinc-950 border-zinc-800">
                <div className="flex items-start justify-between">
                  <span className={`px-2.5 py-1 rounded-lg text-xs font-bold border ${val.badgeCls}`}>
                    {val.label}
                  </span>
                  <span className="text-xs font-mono font-black text-rose-400">
                    -{DisciplinaryService.getDefaultPointDeduction(key as ViolationLevel)} PTS
                  </span>
                </div>

                <div className="text-xs text-zinc-400 space-y-1.5 pt-1">
                  <div className="flex justify-between border-b border-zinc-800/60 pb-1">
                    <span className="text-zinc-500">Masa Berlaku SK:</span>
                    <span className="font-bold text-white">{val.validityMonths} Bulan</span>
                  </div>
                  <div className="flex justify-between border-b border-zinc-800/60 pb-1">
                    <span className="text-zinc-500">Tindakan Remedial:</span>
                    <span className="font-bold text-cyan-400">Wajib SOP Retraining</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Kewenangan SK:</span>
                    <span className="font-bold text-zinc-300">Supervisor & HSE</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─── MODAL: VERIFIKASI SELESAI RETRAINING ─── */}
      {verifyingAction && createPortal(
        <div
          className="fixed inset-0 z-[9999] overflow-y-auto bg-black/90 backdrop-blur-xl p-4 sm:p-6 flex items-center justify-center min-h-screen animate-fade-in"
          onClick={() => setVerifyingAction(null)}
        >
          <div
            className="card p-6 w-full max-w-md bg-zinc-950 border-cyan-500/30 space-y-4 shadow-2xl relative"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="border-b border-zinc-800 pb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-cyan-400" />
                <h3 className="font-bold text-white text-sm">Verifikasi Selesai Retraining SOP</h3>
              </div>
              <button onClick={() => setVerifyingAction(null)} className="text-zinc-500 hover:text-white">✕</button>
            </div>

            <div className="bg-zinc-900/60 p-3 rounded-xl border border-zinc-800 text-xs space-y-1 text-zinc-300">
              <div>Pekerja: <span className="font-bold text-white">{verifyingAction.workerName}</span></div>
              <div>No SK: <span className="font-mono text-indigo-400">{verifyingAction.documentRefNumber}</span></div>
              <div>Modul SOP: <span className="font-semibold text-cyan-400">{verifyingAction.mandatoryRetrainingSopTitle}</span></div>
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-300 mb-1">Catatan Hasil Evaluasi / Konseling</label>
              <textarea
                value={verificationNotes}
                onChange={(e) => setVerificationNotes(e.target.value)}
                rows={3}
                placeholder="Pekerja telah mempelajari ulang materi SOP, lulus kuis checkpoints dan berkomitmen tidak mengulangi..."
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-zinc-800">
              <button
                onClick={() => setVerifyingAction(null)}
                className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold text-xs rounded-xl"
              >
                Batal
              </button>
              <button
                onClick={handleVerifyRetraining}
                className="px-5 py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-black text-xs rounded-xl transition flex items-center gap-1.5 shadow-lg shadow-cyan-950"
              >
                <CheckCircle className="w-4 h-4" />
                <span>Konfirmasi Lulus & Tutup Sanksi</span>
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
