import React, { useState, useEffect, useMemo } from 'react';
import {
  Shield,
  Plus,
  Search,
  Filter,
  Download,
  AlertTriangle,
  CheckCircle2,
  Clock,
  HardHat,
  Eye,
  Trash2,
  Edit2,
  RefreshCw,
  Package,
  Boxes,
  FileSpreadsheet,
  X,
  AlertCircle,
  HelpCircle,
  FileCheck,
  RotateCcw,
  Check,
  UserCheck
} from 'lucide-react';
import {
  PpeItemEntity,
  PpeDistributionEntity,
  PpeDamageReportEntity,
  PpeCategory,
  PpeDamageReason,
  PpeDamageAction,
} from '../types/ppe';
import { PpeService } from '../lib/ppeService';
import { WorkerProfile } from '../types/assessment';

interface PpeManagementPanelProps {
  workers: WorkerProfile[];
  currentUserName?: string;
  isSupervisor?: boolean;
}

const CATEGORY_LABELS: Record<PpeCategory, { label: string; icon: string }> = {
  head_protection: { label: 'Pelindung Kepala (Helmet)', icon: '⛑️' },
  foot_protection: { label: 'Pelindung Kaki (Safety Shoes)', icon: '🥾' },
  body_protection: { label: 'Pelindung Tubuh (Rompi/Wearpack)', icon: '🦺' },
  hand_protection: { label: 'Pelindung Tangan (Gloves)', icon: '🧤' },
  eye_face_protection: { label: 'Pelindung Mata & Wajah (Goggles/Shield)', icon: '🥽' },
  fall_protection: { label: 'Alat Pencegah Jatuh (Harness)', icon: '🪢' },
  respiratory: { label: 'Pelindung Pernapasan (Respirator)', icon: '😷' },
};

const DAMAGE_REASON_LABELS: Record<PpeDamageReason, string> = {
  damaged_operation: 'Rusak Akibat Pemakaian Operasional',
  damaged_accident: 'Rusak Akibat Insiden / Benturan K3',
  lost: 'Hilang di Area Kerja / Staging',
  worn_out: 'Usang / Habis Masa Pakai Standar',
};

export const PpeManagementPanel: React.FC<PpeManagementPanelProps> = ({
  workers = [],
  currentUserName = 'Petugas K3',
  isSupervisor = false,
}) => {
  // State
  const [activeTab, setActiveTab] = useState<'distribution' | 'catalog' | 'damage_reports'>('distribution');
  const [distributions, setDistributions] = useState<PpeDistributionEntity[]>([]);
  const [masterItems, setMasterItems] = useState<PpeItemEntity[]>([]);
  const [damageReports, setDamageReports] = useState<PpeDamageReportEntity[]>([]);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDivision, setSelectedDivision] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');

  // Modals
  const [isDistributeModalOpen, setIsDistributeModalOpen] = useState(false);
  const [isMasterModalOpen, setIsMasterModalOpen] = useState(false);
  const [isDamageModalOpen, setIsDamageModalOpen] = useState(false);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);

  // Selected for action
  const [selectedDistForDamage, setSelectedDistForDamage] = useState<PpeDistributionEntity | null>(null);
  const [selectedReportForReview, setSelectedReportForReview] = useState<PpeDamageReportEntity | null>(null);
  const [editingMasterItem, setEditingMasterItem] = useState<PpeItemEntity | null>(null);

  // Distribution Form
  const [distWorkerId, setDistWorkerId] = useState('');
  const [distPpeItemId, setDistPpeItemId] = useState('');
  const [distSize, setDistSize] = useState('');
  const [distQuantity, setDistQuantity] = useState(1);
  const [distDate, setDistDate] = useState(new Date().toISOString().split('T')[0]);
  const [distSerial, setDistSerial] = useState('');
  const [distNotes, setDistNotes] = useState('');

  // Master Item Form
  const [masterName, setMasterName] = useState('');
  const [masterCategory, setMasterCategory] = useState<PpeCategory | ''>('');
  const [masterBrand, setMasterBrand] = useState('');
  const [masterStandard, setMasterStandard] = useState('');
  const [masterStockTotal, setMasterStockTotal] = useState(50);
  const [masterUnit, setMasterUnit] = useState('Pcs');
  const [masterLifespan, setMasterLifespan] = useState(12);
  const [masterThreshold, setMasterThreshold] = useState(10);

  // Damage Report Form
  const [damageReason, setDamageReason] = useState<PpeDamageReason | ''>('');
  const [damageDescription, setDamageDescription] = useState('');

  // Review Form
  const [reviewAction, setReviewAction] = useState<PpeDamageAction>('replacement_issued');
  const [reviewNotes, setReviewNotes] = useState('');
  const [autoIssueReplacement, setAutoIssueReplacement] = useState(true);

  // Data Loading
  const loadData = () => {
    setDistributions(PpeService.getAllDistributions());
    setMasterItems(PpeService.getAllMasterItems());
    setDamageReports(PpeService.getAllDamageReports());
  };

  useEffect(() => {
    loadData();
    PpeService.checkAndDispatchPpeAlerts();

    const handleUpdate = () => loadData();
    window.addEventListener('gappy_ppe_updated', handleUpdate);
    return () => window.removeEventListener('gappy_ppe_updated', handleUpdate);
  }, []);

  // Stats
  const stats = useMemo(() => {
    return PpeService.getStats();
  }, [distributions, masterItems, damageReports]);

  // Unique divisions
  const divisions = useMemo(() => {
    const set = new Set<string>();
    workers.forEach((w) => {
      if (w.division) set.add(w.division);
    });
    return Array.from(set);
  }, [workers]);

  // Filtered Distributions
  const filteredDistributions = useMemo(() => {
    return distributions.filter((d) => {
      const matchSearch =
        !searchQuery ||
        d.workerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.employeeId.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.ppeName.toLowerCase().includes(searchQuery.toLowerCase());

      const matchDiv = selectedDivision === 'all' || d.division === selectedDivision;
      const matchCat = selectedCategory === 'all' || d.category === selectedCategory;
      const matchStatus = selectedStatus === 'all' || d.status === selectedStatus;

      return matchSearch && matchDiv && matchCat && matchStatus;
    });
  }, [distributions, searchQuery, selectedDivision, selectedCategory, selectedStatus]);

  // Filtered Master Items
  const filteredMasterItems = useMemo(() => {
    return masterItems.filter((item) => {
      const matchSearch =
        !searchQuery ||
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.brand.toLowerCase().includes(searchQuery.toLowerCase());

      const matchCat = selectedCategory === 'all' || item.category === selectedCategory;
      return matchSearch && matchCat;
    });
  }, [masterItems, searchQuery, selectedCategory]);

  // Filtered Damage Reports
  const filteredDamageReports = useMemo(() => {
    return damageReports.filter((r) => {
      const matchSearch =
        !searchQuery ||
        r.workerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.ppeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.employeeId.toLowerCase().includes(searchQuery.toLowerCase());

      return matchSearch;
    });
  }, [damageReports, searchQuery]);

  // Handlers
  const handleOpenDistributeModal = () => {
    setDistWorkerId('');
    setDistPpeItemId('');
    setDistSize('');
    setDistQuantity(1);
    setDistDate(new Date().toISOString().split('T')[0]);
    setDistSerial('');
    setDistNotes('');
    setIsDistributeModalOpen(true);
  };

  const handleOpenMasterModal = (item?: PpeItemEntity) => {
    if (item) {
      setEditingMasterItem(item);
      setMasterName(item.name);
      setMasterCategory(item.category);
      setMasterBrand(item.brand);
      setMasterStandard(item.standard);
      setMasterStockTotal(item.stockTotal);
      setMasterUnit(item.unit);
      setMasterLifespan(item.standardLifespanMonths);
      setMasterThreshold(item.minimumStockThreshold);
    } else {
      setEditingMasterItem(null);
      setMasterName('');
      setMasterCategory('');
      setMasterBrand('');
      setMasterStandard('');
      setMasterStockTotal(50);
      setMasterUnit('Pcs');
      setMasterLifespan(12);
      setMasterThreshold(10);
    }
    setIsMasterModalOpen(true);
  };

  const handleOpenDamageModal = (dist: PpeDistributionEntity) => {
    setSelectedDistForDamage(dist);
    setDamageReason('');
    setDamageDescription('');
    setIsDamageModalOpen(true);
  };

  const handleOpenReviewModal = (report: PpeDamageReportEntity) => {
    setSelectedReportForReview(report);
    setReviewAction('replacement_issued');
    setReviewNotes('');
    setAutoIssueReplacement(true);
    setIsReviewModalOpen(true);
  };

  const handleSubmitDistribution = (e: React.FormEvent) => {
    e.preventDefault();
    if (!distWorkerId) {
      alert('Silakan pilih pekerja penerima APD.');
      return;
    }
    if (!distPpeItemId) {
      alert('Silakan pilih jenis APD dari katalog.');
      return;
    }

    const worker = workers.find((w) => w.id === distWorkerId);
    if (!worker) {
      alert('Data pekerja tidak valid.');
      return;
    }

    try {
      PpeService.distributePpe({
        workerId: worker.id,
        workerName: worker.name,
        employeeId: worker.employeeId || 'N/A',
        division: worker.division || 'Umum',
        ppeItemId: distPpeItemId,
        size: distSize.trim() || undefined,
        quantity: distQuantity,
        serialOrBatchNumber: distSerial.trim() || undefined,
        distributionDate: distDate,
        handoverOfficer: currentUserName,
        notes: distNotes.trim() || undefined,
      });

      setIsDistributeModalOpen(false);
    } catch (err: any) {
      alert(err.message || 'Gagal menyerahkan APD.');
    }
  };

  const handleSubmitMasterItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!masterName.trim()) {
      alert('Nama APD wajib diisi.');
      return;
    }
    if (!masterCategory) {
      alert('Silakan pilih kategori APD.');
      return;
    }

    if (editingMasterItem) {
      PpeService.updateMasterItem(editingMasterItem.id, {
        name: masterName.trim(),
        category: masterCategory,
        brand: masterBrand.trim(),
        standard: masterStandard.trim(),
        stockTotal: masterStockTotal,
        stockAvailable: masterStockTotal - editingMasterItem.stockDistributed,
        unit: masterUnit,
        standardLifespanMonths: masterLifespan,
        minimumStockThreshold: masterThreshold,
      });
    } else {
      PpeService.addMasterItem({
        name: masterName.trim(),
        category: masterCategory,
        brand: masterBrand.trim(),
        standard: masterStandard.trim(),
        stockTotal: masterStockTotal,
        stockAvailable: masterStockTotal,
        unit: masterUnit,
        standardLifespanMonths: masterLifespan,
        minimumStockThreshold: masterThreshold,
      });
    }

    setIsMasterModalOpen(false);
  };

  const handleSubmitDamageReport = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDistForDamage) return;
    if (!damageReason) {
      alert('Silakan pilih penyebab kerusakan / penggantian.');
      return;
    }
    if (!damageDescription.trim()) {
      alert('Deskripsi kondisi kerusakan wajib diisi.');
      return;
    }

    try {
      PpeService.submitDamageReport({
        distributionId: selectedDistForDamage.id,
        damageReason,
        damageDescription: damageDescription.trim(),
      });
      setIsDamageModalOpen(false);
    } catch (err: any) {
      alert(err.message || 'Gagal membuat laporan kerusakan APD.');
    }
  };

  const handleSubmitReview = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReportForReview) return;

    try {
      PpeService.processDamageReport({
        reportId: selectedReportForReview.id,
        action: reviewAction,
        reviewedBy: currentUserName,
        reviewNotes: reviewNotes.trim() || undefined,
        issueNewReplacement: autoIssueReplacement,
      });
      setIsReviewModalOpen(false);
    } catch (err: any) {
      alert(err.message || 'Gagal memproses tiket penggantian APD.');
    }
  };

  const handleDeleteMasterItem = (id: string, name: string) => {
    if (confirm(`Hapus master APD "${name}"? Data distribusi terkait mungkin terpengaruh.`)) {
      PpeService.deleteMasterItem(id);
    }
  };

  return (
    <div className="space-y-6">
      {/* ─── HEADER PANEL ─── */}
      <div className="card p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 border-amber-500/20 bg-gradient-to-r from-zinc-950 via-zinc-900 to-zinc-950">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center shrink-0 shadow-inner">
            <HardHat className="w-6 h-6 text-amber-400" />
          </div>
          <div>
            <h2 className="text-base font-black text-white flex items-center gap-2">
              <span>Inventaris & Distribusi APD (Safety Gear Lifecycle)</span>
            </h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              Manajemen Siklus Hidup APD, Stok Gudang, Serah Terima Pekerja & Skema Penggantian APD Rusak/Hilang
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => PpeService.exportDistributionsCSV(distributions)}
            className="px-3.5 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
            title="Ekspor Rekap Distribusi APD ke CSV"
          >
            <Download className="w-3.5 h-3.5 text-emerald-400" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={() => handleOpenMasterModal()}
            className="px-3.5 py-2 bg-zinc-800 hover:bg-zinc-700 text-amber-300 border border-amber-500/40 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
          >
            <Package className="w-3.5 h-3.5 text-amber-400" />
            <span>Master APD</span>
          </button>
          <button
            onClick={handleOpenDistributeModal}
            className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-black font-black text-xs rounded-xl transition flex items-center gap-1.5 shadow-md shadow-amber-950"
          >
            <Plus className="w-4 h-4" />
            <span>Serah Terima APD Baru</span>
          </button>
        </div>
      </div>

      {/* ─── KPI STATS CARDS ─── */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="card p-3.5 space-y-1">
          <div className="flex items-center justify-between text-zinc-500 text-[11px] font-bold">
            <span>Katalog Master</span>
            <Boxes className="w-4 h-4 text-zinc-400" />
          </div>
          <div className="text-2xl font-black text-white">{stats.totalItems}</div>
          <div className="text-[10px] text-zinc-500">Jenis Alat Pelindung Diri</div>
        </div>

        <div className="card p-3.5 space-y-1 border-emerald-500/20 bg-emerald-950/10">
          <div className="flex items-center justify-between text-emerald-400 text-[11px] font-bold">
            <span>Terdistribusi Aktif</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-emerald-400">{stats.totalDistributedActive}</div>
          <div className="text-[10px] text-emerald-400/70">Digunakan Staf Lapangan</div>
        </div>

        <div className="card p-3.5 space-y-1 border-rose-500/20 bg-rose-950/10">
          <div className="flex items-center justify-between text-rose-400 text-[11px] font-bold">
            <span>Stok Menipis</span>
            <AlertTriangle className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-2xl font-black text-rose-400">{stats.lowStockCount}</div>
          <div className="text-[10px] text-rose-400/70">Perlu Restock Gudang</div>
        </div>

        <div className="card p-3.5 space-y-1 border-amber-500/20 bg-amber-950/10">
          <div className="flex items-center justify-between text-amber-400 text-[11px] font-bold">
            <span>Mendekati Usang (≤14h)</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-black text-amber-400">{stats.expiringSoonCount}</div>
          <div className="text-[10px] text-amber-400/70">Jatuh Tempo Penggantian</div>
        </div>

        <div className="card p-3.5 space-y-1 border-indigo-500/20 bg-indigo-950/10">
          <div className="flex items-center justify-between text-indigo-400 text-[11px] font-bold">
            <span>Tiket Rusak / Ganti</span>
            <RotateCcw className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-black text-indigo-400">{stats.pendingDamageReports}</div>
          <div className="text-[10px] text-indigo-400/70">Menunggu Verifikasi K3</div>
        </div>
      </div>

      {/* ─── NAVIGATION TABS ─── */}
      <div className="flex items-center gap-2 border-b border-zinc-800 pb-2">
        <button
          onClick={() => setActiveTab('distribution')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
            activeTab === 'distribution'
              ? 'bg-amber-500 text-black shadow-md shadow-amber-950'
              : 'bg-zinc-900 text-zinc-400 hover:text-white hover:bg-zinc-800'
          }`}
        >
          <UserCheck className="w-4 h-4" />
          <span>Rekap Distribusi Pekerja ({distributions.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('catalog')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
            activeTab === 'catalog'
              ? 'bg-amber-500 text-black shadow-md shadow-amber-950'
              : 'bg-zinc-900 text-zinc-400 hover:text-white hover:bg-zinc-800'
          }`}
        >
          <Package className="w-4 h-4" />
          <span>Katalog & Master Stok ({masterItems.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('damage_reports')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
            activeTab === 'damage_reports'
              ? 'bg-amber-500 text-black shadow-md shadow-amber-950'
              : 'bg-zinc-900 text-zinc-400 hover:text-white hover:bg-zinc-800'
          }`}
        >
          <RotateCcw className="w-4 h-4" />
          <span>Tiket APD Rusak & Penggantian ({damageReports.length})</span>
          {stats.pendingDamageReports > 0 && (
            <span className="w-5 h-5 rounded-full bg-rose-500 text-white font-black text-[10px] flex items-center justify-center">
              {stats.pendingDamageReports}
            </span>
          )}
        </button>
      </div>

      {/* ─── FILTER BAR ─── */}
      <div className="card p-3.5 flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari nama pekerja, NIP, atau nama APD..."
            className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-amber-500 font-medium"
          />
        </div>

        {activeTab === 'distribution' && (
          <select
            value={selectedDivision}
            onChange={(e) => setSelectedDivision(e.target.value)}
            className="bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500 font-semibold"
          >
            <option value="all">Semua Divisi</option>
            {divisions.map((div) => (
              <option key={div} value={div}>
                Divisi {div}
              </option>
            ))}
          </select>
        )}

        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500 font-semibold"
        >
          <option value="all">Semua Kategori APD</option>
          {Object.entries(CATEGORY_LABELS).map(([key, item]) => (
            <option key={key} value={key}>
              {item.icon} {item.label}
            </option>
          ))}
        </select>

        {activeTab === 'distribution' && (
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500 font-semibold"
          >
            <option value="all">Semua Status</option>
            <option value="active">🟢 Aktif Layak Pakai</option>
            <option value="expiring_soon">🟡 Mendekati Usang (≤14 Hari)</option>
            <option value="expired_replaced">⚪ Usang / Waktunya Ganti</option>
            <option value="damaged">🔴 Rusak</option>
            <option value="lost">⚫ Hilang</option>
          </select>
        )}
      </div>

      {/* ─── TAB 1: REKAP DISTRIBUSI PEKERJA ─── */}
      {activeTab === 'distribution' && (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-zinc-800 bg-zinc-950/60 text-zinc-400 text-[11px] font-bold uppercase tracking-wider">
                  <th className="p-3.5">Personel & NIP</th>
                  <th className="p-3.5">Divisi</th>
                  <th className="p-3.5">Alat Pelindung Diri (APD)</th>
                  <th className="p-3.5">Ukuran & Qty</th>
                  <th className="p-3.5">Tgl Serah Terima</th>
                  <th className="p-3.5">Jadwal Ganti (Sisa Hari)</th>
                  <th className="p-3.5 text-center">Status</th>
                  <th className="p-3.5 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60 text-xs">
                {filteredDistributions.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-zinc-500">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <HardHat className="w-8 h-8 text-zinc-700" />
                        <p className="font-semibold">Belum ada data serah terima APD.</p>
                        <p className="text-[11px] text-zinc-600">
                          Klik tombol <strong>"Serah Terima APD Baru"</strong> untuk mencatat penyerahan perlengkapan safety.
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredDistributions.map((item) => {
                    const catInfo = CATEGORY_LABELS[item.category] || { label: item.category, icon: '🛡️' };
                    return (
                      <tr key={item.id} className="hover:bg-zinc-800/40 transition">
                        <td className="p-3.5">
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center text-[10px] font-black text-amber-400 shrink-0">
                              {item.workerName.slice(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <div className="font-bold text-white text-xs">{item.workerName}</div>
                              <div className="text-[10px] font-mono text-zinc-500">{item.employeeId}</div>
                            </div>
                          </div>
                        </td>
                        <td className="p-3.5">
                          <span className="px-2 py-0.5 rounded-md bg-zinc-800 text-zinc-300 font-mono font-bold text-[10px] border border-zinc-700">
                            {item.division}
                          </span>
                        </td>
                        <td className="p-3.5">
                          <div className="font-bold text-white flex items-center gap-1.5">
                            <span>{catInfo.icon}</span>
                            <span>{item.ppeName}</span>
                          </div>
                          <div className="text-[10px] text-zinc-500">{catInfo.label}</div>
                        </td>
                        <td className="p-3.5">
                          <div className="font-bold text-zinc-200">
                            {item.quantity} Unit {item.size ? `(Uk: ${item.size})` : ''}
                          </div>
                          {item.serialOrBatchNumber && (
                            <div className="text-[10px] font-mono text-zinc-500">SN: {item.serialOrBatchNumber}</div>
                          )}
                        </td>
                        <td className="p-3.5">
                          <div className="font-medium text-zinc-300">{item.distributionDate}</div>
                          <div className="text-[10px] text-zinc-500">Oleh: {item.handoverOfficer}</div>
                        </td>
                        <td className="p-3.5">
                          <div className="font-semibold text-zinc-200">{item.expectedReplacementDate}</div>
                          <div className="text-[10px]">
                            {item.daysRemaining !== undefined && item.daysRemaining > 0 ? (
                              <span className={item.daysRemaining <= 14 ? 'text-amber-400 font-bold' : 'text-zinc-500'}>
                                Tersisa {item.daysRemaining} hari
                              </span>
                            ) : (
                              <span className="text-rose-400 font-bold">Lewat jatuh tempo</span>
                            )}
                          </div>
                        </td>
                        <td className="p-3.5 text-center">
                          {item.status === 'active' && (
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 inline-flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>Aktif</span>
                            </span>
                          )}
                          {item.status === 'expiring_soon' && (
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30 inline-flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              <span>Mendekati Usang</span>
                            </span>
                          )}
                          {item.status === 'expired_replaced' && (
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-zinc-700/30 text-zinc-400 border border-zinc-700 inline-flex items-center gap-1">
                              <span>Usang</span>
                            </span>
                          )}
                          {item.status === 'damaged' && (
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/30 inline-flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3" />
                              <span>Rusak</span>
                            </span>
                          )}
                          {item.status === 'lost' && (
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-purple-500/10 text-purple-400 border border-purple-500/30 inline-flex items-center gap-1">
                              <span>Hilang</span>
                            </span>
                          )}
                        </td>
                        <td className="p-3.5 text-center">
                          {item.status !== 'damaged' && item.status !== 'lost' && (
                            <button
                              onClick={() => handleOpenDamageModal(item)}
                              className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-rose-950/40 text-zinc-300 hover:text-rose-300 border border-zinc-700 hover:border-rose-500/40 text-[11px] font-bold transition inline-flex items-center gap-1"
                              title="Laporkan APD Rusak / Hilang untuk pengajuan penggantian"
                            >
                              <RotateCcw className="w-3 h-3 text-rose-400" />
                              <span>Lapor Rusak</span>
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─── TAB 2: KATALOG & MASTER STOK APD ─── */}
      {activeTab === 'catalog' && (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-zinc-800 bg-zinc-950/60 text-zinc-400 text-[11px] font-bold uppercase tracking-wider">
                  <th className="p-3.5">Nama APD & Brand</th>
                  <th className="p-3.5">Kategori</th>
                  <th className="p-3.5">Standar Regulasi K3</th>
                  <th className="p-3.5 text-center">Total Stok</th>
                  <th className="p-3.5 text-center">Tersedia di Gudang</th>
                  <th className="p-3.5 text-center">Terdistribusi</th>
                  <th className="p-3.5 text-center">Masa Pakai Standar</th>
                  <th className="p-3.5 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60 text-xs">
                {filteredMasterItems.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-zinc-500">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <Package className="w-8 h-8 text-zinc-700" />
                        <p className="font-semibold">Belum ada master APD di katalog.</p>
                        <p className="text-[11px] text-zinc-600">
                          Klik tombol <strong>"+ Master APD"</strong> untuk mendaftarkan jenis perlengkapan safety.
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredMasterItems.map((item) => {
                    const catInfo = CATEGORY_LABELS[item.category] || { label: item.category, icon: '🛡️' };
                    const isLowStock = item.stockAvailable <= item.minimumStockThreshold;
                    return (
                      <tr key={item.id} className="hover:bg-zinc-800/40 transition">
                        <td className="p-3.5">
                          <div className="font-bold text-white text-xs">{item.name}</div>
                          <div className="text-[10px] text-zinc-500">Brand: {item.brand || '-'}</div>
                        </td>
                        <td className="p-3.5">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-zinc-800 text-zinc-300 font-medium text-[11px] border border-zinc-700">
                            <span>{catInfo.icon}</span>
                            <span>{catInfo.label}</span>
                          </span>
                        </td>
                        <td className="p-3.5">
                          <span className="font-mono text-[11px] text-amber-400 bg-amber-950/20 px-2 py-0.5 rounded border border-amber-500/20">
                            {item.standard || 'SNI / ANSI'}
                          </span>
                        </td>
                        <td className="p-3.5 text-center font-bold text-white">
                          {item.stockTotal} {item.unit}
                        </td>
                        <td className="p-3.5 text-center">
                          <span
                            className={`px-2.5 py-1 rounded-full text-[11px] font-bold border ${
                              isLowStock
                                ? 'bg-rose-500/10 text-rose-400 border-rose-500/30 animate-pulse'
                                : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                            }`}
                          >
                            {item.stockAvailable} {item.unit}
                          </span>
                        </td>
                        <td className="p-3.5 text-center font-semibold text-zinc-300">
                          {item.stockDistributed} {item.unit}
                        </td>
                        <td className="p-3.5 text-center font-medium text-zinc-400">
                          {item.standardLifespanMonths} Bulan
                        </td>
                        <td className="p-3.5 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => handleOpenMasterModal(item)}
                              className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition"
                              title="Edit Master APD"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteMasterItem(item.id, item.name)}
                              className="p-1.5 rounded-lg bg-zinc-800 hover:bg-rose-900/40 text-zinc-400 hover:text-rose-300 transition"
                              title="Hapus Master APD"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─── TAB 3: TIKET APD RUSAK & PENGGANTIAN ─── */}
      {activeTab === 'damage_reports' && (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-zinc-800 bg-zinc-950/60 text-zinc-400 text-[11px] font-bold uppercase tracking-wider">
                  <th className="p-3.5">Tiket & Tgl Lapor</th>
                  <th className="p-3.5">Personel & NIP</th>
                  <th className="p-3.5">APD Rusak</th>
                  <th className="p-3.5">Penyebab Kerusakan</th>
                  <th className="p-3.5">Deskripsi Masalah</th>
                  <th className="p-3.5 text-center">Status Tiket</th>
                  <th className="p-3.5 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60 text-xs">
                {filteredDamageReports.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-zinc-500">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <CheckCircle2 className="w-8 h-8 text-emerald-600" />
                        <p className="font-semibold text-zinc-300">Tidak ada laporan APD rusak yang pending.</p>
                        <p className="text-[11px] text-zinc-500">
                          Semua perlengkapan safety staf operasional terpantau dalam kondisi layak pakai.
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredDamageReports.map((report) => (
                    <tr key={report.id} className="hover:bg-zinc-800/40 transition">
                      <td className="p-3.5">
                        <div className="font-mono font-bold text-amber-400 text-[11px]">{report.id}</div>
                        <div className="text-[10px] text-zinc-500">{report.reportDate}</div>
                      </td>
                      <td className="p-3.5">
                        <div className="font-bold text-white text-xs">{report.workerName}</div>
                        <div className="text-[10px] font-mono text-zinc-500">
                          {report.employeeId} ({report.division})
                        </div>
                      </td>
                      <td className="p-3.5 font-semibold text-zinc-200">{report.ppeName}</td>
                      <td className="p-3.5">
                        <span className="px-2 py-0.5 rounded-md bg-zinc-800 text-amber-300 font-medium text-[10px] border border-zinc-700">
                          {DAMAGE_REASON_LABELS[report.damageReason] || report.damageReason}
                        </span>
                      </td>
                      <td className="p-3.5 text-zinc-400 text-xs max-w-xs">{report.damageDescription}</td>
                      <td className="p-3.5 text-center">
                        {report.status === 'pending_review' && (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30">
                            Menunggu Review
                          </span>
                        )}
                        {report.status === 'replacement_issued' && (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                            Pengganti Diterbitkan
                          </span>
                        )}
                        {report.status === 'repaired' && (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/30">
                            Diperbaiki
                          </span>
                        )}
                        {report.status === 'rejected' && (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/30">
                            Ditolak
                          </span>
                        )}
                      </td>
                      <td className="p-3.5 text-center">
                        {report.status === 'pending_review' && (
                          <button
                            onClick={() => handleOpenReviewModal(report)}
                            className="px-3 py-1 bg-amber-500 hover:bg-amber-400 text-black font-black text-xs rounded-lg transition shadow"
                          >
                            Proses & Review
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─── MODAL 1: SERAH TERIMA APD BARU ─── */}
      {isDistributeModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl animate-fade-in">
            <div className="p-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-950">
              <div className="flex items-center gap-2.5">
                <HardHat className="w-5 h-5 text-amber-400" />
                <h3 className="font-bold text-white text-sm">Form Serah Terima APD ke Pekerja</h3>
              </div>
              <button
                onClick={() => setIsDistributeModalOpen(false)}
                className="text-zinc-500 hover:text-white p-1 rounded-lg hover:bg-zinc-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitDistribution} className="p-5 space-y-4">
              {/* Select Worker */}
              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1">Pekerja / Operator Penerima *</label>
                <select
                  value={distWorkerId}
                  onChange={(e) => setDistWorkerId(e.target.value)}
                  className={`w-full bg-zinc-950 border rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-amber-500 font-semibold ${
                    !distWorkerId ? 'text-zinc-500 border-zinc-800' : 'text-white border-amber-500/50'
                  }`}
                  required
                >
                  <option value="" disabled>
                    -- Pilih Pekerja / Penerima APD --
                  </option>
                  {workers.map((w) => (
                    <option key={w.id} value={w.id} className="text-white bg-zinc-900">
                      {w.name} ({w.employeeId}) — {w.division} / {w.role}
                    </option>
                  ))}
                </select>
              </div>

              {/* Select Master PPE */}
              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1">Pilih Jenis APD dari Stok *</label>
                <select
                  value={distPpeItemId}
                  onChange={(e) => setDistPpeItemId(e.target.value)}
                  className={`w-full bg-zinc-950 border rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-amber-500 font-semibold ${
                    !distPpeItemId ? 'text-zinc-500 border-zinc-800' : 'text-white border-amber-500/50'
                  }`}
                  required
                >
                  <option value="" disabled>
                    -- Pilih Jenis APD dari Stok Gudang --
                  </option>
                  {masterItems.map((item) => (
                    <option
                      key={item.id}
                      value={item.id}
                      disabled={item.stockAvailable <= 0}
                      className="text-white bg-zinc-900"
                    >
                      {item.name} — Tersedia: {item.stockAvailable} {item.unit}{' '}
                      {item.stockAvailable <= 0 ? '(STOK KOSONG)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Size & Qty */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-zinc-300 mb-1">Ukuran (Size)</label>
                  <input
                    type="text"
                    value={distSize}
                    onChange={(e) => setDistSize(e.target.value)}
                    placeholder="Contoh: 42, L, XL, All Size..."
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-amber-500 font-medium"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-300 mb-1">Jumlah (Qty) *</label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={distQuantity}
                    onChange={(e) => setDistQuantity(Number(e.target.value))}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500 font-bold"
                    required
                  />
                </div>
              </div>

              {/* Date & Serial */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-zinc-300 mb-1">Tanggal Serah Terima *</label>
                  <input
                    type="date"
                    value={distDate}
                    onChange={(e) => setDistDate(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500 font-semibold"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-300 mb-1">No. Seri / Batch (Opsional)</label>
                  <input
                    type="text"
                    value={distSerial}
                    onChange={(e) => setDistSerial(e.target.value)}
                    placeholder="SN-2026-XXXX"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-amber-500 font-mono"
                  />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1">Catatan Serah Terima (Opsional)</label>
                <input
                  type="text"
                  value={distNotes}
                  onChange={(e) => setDistNotes(e.target.value)}
                  placeholder="Contoh: Pembagian reguler tahunan Q1, kondisi segel baru..."
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex gap-2 pt-2 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsDistributeModalOpen(false)}
                  className="w-1/2 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl text-xs font-bold transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="w-1/2 py-2.5 bg-amber-500 hover:bg-amber-400 text-black rounded-xl text-xs font-black transition shadow-lg shadow-amber-950"
                >
                  Simpan & Potong Stok
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL 2: TAMBAH / EDIT MASTER APD ─── */}
      {isMasterModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-fade-in">
            <div className="p-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-950">
              <div className="flex items-center gap-2.5">
                <Package className="w-5 h-5 text-amber-400" />
                <h3 className="font-bold text-white text-sm">
                  {editingMasterItem ? 'Edit Master APD' : 'Tambah Master APD Baru'}
                </h3>
              </div>
              <button
                onClick={() => setIsMasterModalOpen(false)}
                className="text-zinc-500 hover:text-white p-1 rounded-lg hover:bg-zinc-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitMasterItem} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1">Nama APD / Model *</label>
                <input
                  type="text"
                  value={masterName}
                  onChange={(e) => setMasterName(e.target.value)}
                  placeholder="Contoh: Safety Helmet V-Gard, Safety Shoes Vulcan..."
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-amber-500 font-bold"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1">Kategori APD *</label>
                <select
                  value={masterCategory}
                  onChange={(e) => setMasterCategory(e.target.value as PpeCategory)}
                  className={`w-full bg-zinc-950 border rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-amber-500 font-semibold ${
                    !masterCategory ? 'text-zinc-500 border-zinc-800' : 'text-white border-amber-500/50'
                  }`}
                  required
                >
                  <option value="" disabled>
                    -- Pilih Kategori APD --
                  </option>
                  {Object.entries(CATEGORY_LABELS).map(([key, item]) => (
                    <option key={key} value={key} className="text-white bg-zinc-900">
                      {item.icon} {item.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-zinc-300 mb-1">Brand / Merek</label>
                  <input
                    type="text"
                    value={masterBrand}
                    onChange={(e) => setMasterBrand(e.target.value)}
                    placeholder="MSA, Krisbow, 3M, Cheetah..."
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-300 mb-1">Standar Uji K3</label>
                  <input
                    type="text"
                    value={masterStandard}
                    onChange={(e) => setMasterStandard(e.target.value)}
                    placeholder="SNI 13-0862-2005 / ANSI Z89.1"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-amber-500 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-zinc-300 mb-1">Total Stok *</label>
                  <input
                    type="number"
                    min="0"
                    value={masterStockTotal}
                    onChange={(e) => setMasterStockTotal(Number(e.target.value))}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500 font-bold"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-300 mb-1">Satuan Unit</label>
                  <select
                    value={masterUnit}
                    onChange={(e) => setMasterUnit(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500 font-semibold"
                  >
                    <option value="Pcs">Pcs</option>
                    <option value="Pasang">Pasang</option>
                    <option value="Set">Set</option>
                    <option value="Box">Box</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-zinc-300 mb-1">Masa Pakai Standar (Bulan)</label>
                  <input
                    type="number"
                    min="1"
                    value={masterLifespan}
                    onChange={(e) => setMasterLifespan(Number(e.target.value))}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500 font-medium"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-300 mb-1">Ambang Batas Minimum</label>
                  <input
                    type="number"
                    min="1"
                    value={masterThreshold}
                    onChange={(e) => setMasterThreshold(Number(e.target.value))}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500 font-medium"
                    required
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsMasterModalOpen(false)}
                  className="w-1/2 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl text-xs font-bold transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="w-1/2 py-2.5 bg-amber-500 hover:bg-amber-400 text-black rounded-xl text-xs font-black transition shadow-lg shadow-amber-950"
                >
                  {editingMasterItem ? 'Simpan Perubahan' : 'Tambahkan ke Katalog'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL 3: LAPOR APD RUSAK / HILANG ─── */}
      {isDamageModalOpen && selectedDistForDamage && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-fade-in">
            <div className="p-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-950">
              <div className="flex items-center gap-2.5">
                <RotateCcw className="w-5 h-5 text-rose-400" />
                <h3 className="font-bold text-white text-sm">Lapor APD Rusak / Hilang</h3>
              </div>
              <button
                onClick={() => setIsDamageModalOpen(false)}
                className="text-zinc-500 hover:text-white p-1 rounded-lg hover:bg-zinc-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitDamageReport} className="p-5 space-y-4">
              <div className="bg-zinc-950 p-3 rounded-xl border border-zinc-800">
                <div className="text-[11px] text-zinc-500 font-bold uppercase">Target APD Pekerja</div>
                <div className="text-sm font-bold text-white">{selectedDistForDamage.ppeName}</div>
                <div className="text-xs text-amber-400">
                  Penerima: {selectedDistForDamage.workerName} ({selectedDistForDamage.employeeId})
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1">Penyebab Kerusakan / Status *</label>
                <select
                  value={damageReason}
                  onChange={(e) => setDamageReason(e.target.value as PpeDamageReason)}
                  className={`w-full bg-zinc-950 border rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-rose-500 font-semibold ${
                    !damageReason ? 'text-zinc-500 border-zinc-800' : 'text-white border-rose-500/50'
                  }`}
                  required
                >
                  <option value="" disabled>
                    -- Pilih Alasan Kerusakan / Penggantian --
                  </option>
                  {Object.entries(DAMAGE_REASON_LABELS).map(([key, label]) => (
                    <option key={key} value={key} className="text-white bg-zinc-900">
                      {label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1">Deskripsi Kerusakan Fisik *</label>
                <textarea
                  rows={3}
                  value={damageDescription}
                  onChange={(e) => setDamageDescription(e.target.value)}
                  placeholder="Contoh: Sol safety shoes terkelupas terkena serpihan pallet, tali helm putus saat operasional..."
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-2.5 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-rose-500 resize-none"
                  required
                />
              </div>

              <div className="flex gap-2 pt-2 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsDamageModalOpen(false)}
                  className="w-1/2 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl text-xs font-bold transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="w-1/2 py-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-black transition shadow-lg shadow-rose-950"
                >
                  Kirim Tiket Kerusakan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL 4: REVIEW & PROSES TIKET RUSAK ─── */}
      {isReviewModalOpen && selectedReportForReview && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-fade-in">
            <div className="p-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-950">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-white text-sm">Verifikasi & Penggantian APD</h3>
              </div>
              <button
                onClick={() => setIsReviewModalOpen(false)}
                className="text-zinc-500 hover:text-white p-1 rounded-lg hover:bg-zinc-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitReview} className="p-5 space-y-4">
              <div className="bg-zinc-950 p-3.5 rounded-xl border border-zinc-800 space-y-1">
                <div className="text-xs text-zinc-400">
                  Pemohon: <strong className="text-white">{selectedReportForReview.workerName}</strong> (
                  {selectedReportForReview.employeeId})
                </div>
                <div className="text-xs text-zinc-400">
                  Item APD: <strong className="text-amber-300">{selectedReportForReview.ppeName}</strong>
                </div>
                <div className="text-xs text-zinc-400">
                  Alasan: <span>{DAMAGE_REASON_LABELS[selectedReportForReview.damageReason]}</span>
                </div>
                <div className="text-xs text-rose-300 italic pt-1">
                  "{selectedReportForReview.damageDescription}"
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1">Tindakan K3 / Keputusan *</label>
                <select
                  value={reviewAction}
                  onChange={(e) => setReviewAction(e.target.value as PpeDamageAction)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500 font-bold"
                  required
                >
                  <option value="replacement_issued">✅ Setujui & Terbitkan APD Pengganti Baru</option>
                  <option value="repaired">🛠️ Telah Diperbaiki (Tidak Perlu Unit Baru)</option>
                  <option value="rejected">❌ Tolak Permohonan</option>
                </select>
              </div>

              {reviewAction === 'replacement_issued' && (
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between text-xs">
                  <div>
                    <div className="font-bold text-amber-300">Otomatis Potong Stok & Distribusi Baru</div>
                    <div className="text-[11px] text-zinc-400">
                      Sistem akan membuat log distribusi APD baru untuk staf terkait.
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={autoIssueReplacement}
                    onChange={(e) => setAutoIssueReplacement(e.target.checked)}
                    className="w-4 h-4 rounded text-amber-500 bg-zinc-950 border-zinc-700"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1">Catatan Supervisor / Petugas K3</label>
                <input
                  type="text"
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  placeholder="Contoh: Unit rusak ditarik dan diganti unit baru dari rak B3..."
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex gap-2 pt-2 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsReviewModalOpen(false)}
                  className="w-1/2 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl text-xs font-bold transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="w-1/2 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black transition shadow-lg shadow-emerald-950"
                >
                  Konfirmasi Keputusan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
