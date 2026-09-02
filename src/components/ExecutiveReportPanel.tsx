import React, { useState, useMemo } from 'react';
import {
  FileText,
  Download,
  FileSpreadsheet,
  CheckCircle2,
  ShieldCheck,
  Award,
  Truck,
  HardHat,
  Filter,
  Calendar,
  UserCheck,
  Building2,
  Eye,
  Sparkles,
  Printer,
  ChevronRight,
  HelpCircle,
  FileCheck
} from 'lucide-react';
import { WorkerProfile, IncidentReport, RewardItem } from '../types/assessment';
import { ExecutivePDFReportGenerator, ReportSigningConfig } from '../lib/pdfReportService';
import { LicenseService } from '../lib/licenseService';
import { PpeService } from '../lib/ppeService';
import { RoleEntity } from '../domain/RoleEntity';

interface ExecutiveReportPanelProps {
  workers: WorkerProfile[];
  incidents?: IncidentReport[];
  rewardCatalog?: RewardItem[];
  currentUserName?: string;
}

type ReportType = 'competency_matrix' | 'k3_incident' | 'mhe_sio' | 'ppe_inventory' | 'reward_budget';

interface ReportOptionMeta {
  id: ReportType;
  title: string;
  category: string;
  badge: string;
  description: string;
  icon: React.ElementType;
  accentColor: string;
  borderColor: string;
}

const REPORT_OPTIONS: ReportOptionMeta[] = [
  {
    id: 'competency_matrix',
    title: 'Matriks Kompetensi & Evaluasi Kinerja (BIB)',
    category: 'SDM & KINERJA',
    badge: 'Standard HRD',
    description: 'Rekapitulasi skor audit behavior, integrity, benchmark dan status kompetensi seluruh personel.',
    icon: FileCheck,
    accentColor: 'text-indigo-400 bg-indigo-500/10',
    borderColor: 'border-indigo-500/30 hover:border-indigo-500',
  },
  {
    id: 'k3_incident',
    title: 'Audit K3, Zero Incident & Monitoring CAPA',
    category: 'KESELAMATAN (HSE)',
    badge: 'Legal HSE',
    description: 'Laporan insiden keselamatan, zero-incident streak, analisis 5-why dan pemenuhan tindakan korektif CAPA.',
    icon: ShieldCheck,
    accentColor: 'text-amber-400 bg-amber-500/10',
    borderColor: 'border-amber-500/30 hover:border-amber-500',
  },
  {
    id: 'mhe_sio',
    title: 'Kepatuhan Lisensi SIO Alat Berat (MHE)',
    category: 'LEGALITAS ALAT BERAT',
    badge: 'Kemnaker RI',
    description: 'Status legalitas Surat Izin Operator (Forklift, Reach Truck, Truk), masa berlaku & monitoring kedaluwarsa.',
    icon: Truck,
    accentColor: 'text-cyan-400 bg-cyan-500/10',
    borderColor: 'border-cyan-500/30 hover:border-cyan-500',
  },
  {
    id: 'ppe_inventory',
    title: 'Inventaris & Siklus Hidup APD Pekerja',
    category: 'LOGISTIK & SAFETY GEAR',
    badge: 'Standar SNI',
    description: 'Rekap serah terima APD, kepatuhan masa pakai standar (H-14 hari) dan verifikasi tiket penggantian unit rusak.',
    icon: HardHat,
    accentColor: 'text-emerald-400 bg-emerald-500/10',
    borderColor: 'border-emerald-500/30 hover:border-emerald-500',
  },
  {
    id: 'reward_budget',
    title: 'Anggaran & Penyerapan Poin Reward',
    category: 'KOMPENSASI & REWARD',
    badge: 'Audit Finance',
    description: 'Evaluasi penerbitan poin insentif, klaim voucher/e-wallet yang telah di-redeem dan serapan anggaran.',
    icon: Award,
    accentColor: 'text-purple-400 bg-purple-500/10',
    borderColor: 'border-purple-500/30 hover:border-purple-500',
  },
];

export const ExecutiveReportPanel: React.FC<ExecutiveReportPanelProps> = ({
  workers = [],
  incidents = [],
  rewardCatalog = [],
  currentUserName = 'System Administrator',
}) => {
  // Selected Report
  const [selectedReportType, setSelectedReportType] = useState<ReportType>('competency_matrix');

  // Form State with Placeholders
  const [period, setPeriod] = useState('Tahun Berjalan 2026');
  const [selectedDivision, setSelectedDivision] = useState('all');
  const [supervisorName, setSupervisorName] = useState(currentUserName || 'Supervisor Logistik & K3');
  const [supervisorTitle, setSupervisorTitle] = useState('Supervisor Operasional & HSE');
  const [managerName, setManagerName] = useState('Head of Operations & HSE Manager');
  const [managerTitle, setManagerTitle] = useState('PT DAM Indonesia Management');
  const [documentNumber, setDocumentNumber] = useState(
    `DAM/EXEC-REP/${new Date().getFullYear()}/${Math.floor(1000 + Math.random() * 9000)}`
  );

  // Live Domain Data
  const licenses = useMemo(() => LicenseService.getAllLicenses(), []);
  const ppeDistributions = useMemo(() => PpeService.getAllDistributions(), []);
  const ppeMaster = useMemo(() => PpeService.getAllMasterItems(), []);
  const ppeDamageReports = useMemo(() => PpeService.getAllDamageReports(), []);

  // Filtered Workers
  const operationalWorkers = useMemo(() => {
    let list = workers.filter((w) => RoleEntity.isOperationalWorker(w.role) && w.division.toUpperCase() !== 'SYSTEM');
    if (selectedDivision !== 'all') {
      list = list.filter((w) => w.division === selectedDivision);
    }
    return list;
  }, [workers, selectedDivision]);

  // Unique Divisions
  const divisions = useMemo(() => {
    const set = new Set<string>();
    workers.forEach((w) => {
      if (w.division && w.division.toUpperCase() !== 'SYSTEM') set.add(w.division);
    });
    return Array.from(set);
  }, [workers]);

  // Config object for generator
  const signingConfig: ReportSigningConfig = {
    documentNumber,
    periodLabel: period,
    supervisorName,
    supervisorTitle,
    managerName,
    managerTitle,
    divisionFilter: selectedDivision === 'all' ? 'Semua Divisi' : selectedDivision,
  };

  // Handlers for PDF Generation
  const handleGeneratePDF = () => {
    switch (selectedReportType) {
      case 'competency_matrix':
        ExecutivePDFReportGenerator.generateCompetencyMatrixPDF(operationalWorkers, signingConfig);
        break;
      case 'k3_incident':
        ExecutivePDFReportGenerator.generateK3ZeroIncidentPDF(incidents, operationalWorkers, signingConfig);
        break;
      case 'mhe_sio':
        ExecutivePDFReportGenerator.generateMheLicensesPDF(licenses, signingConfig);
        break;
      case 'ppe_inventory':
        ExecutivePDFReportGenerator.generatePpeLifecyclePDF(ppeDistributions, ppeMaster, ppeDamageReports, signingConfig);
        break;
      case 'reward_budget':
        ExecutivePDFReportGenerator.generateRewardBudgetPDF(rewardCatalog, operationalWorkers, signingConfig);
        break;
    }
  };

  const handleGenerateCSV = () => {
    switch (selectedReportType) {
      case 'competency_matrix': {
        const headers = ['NIP', 'Nama', 'Role', 'Divisi', 'Tier', 'Behavior', 'Integrity', 'Benchmark', 'Total BIB'];
        const rows = operationalWorkers.map((w) => [
          `"${w.employeeId}"`,
          `"${w.name}"`,
          `"${w.role}"`,
          `"${w.division}"`,
          `"${w.tier}"`,
          w.bibScores.behavior,
          w.bibScores.integrity,
          w.bibScores.benchmark,
          w.bibScores.totalScore,
        ]);
        downloadCSV('Rekap_Matriks_Kompetensi', headers, rows);
        break;
      }
      case 'k3_incident': {
        const headers = ['ID Insiden', 'Pelapor', 'Jenis', 'Severity', 'Lokasi', 'Waktu', 'Status', 'Root Cause', 'CAPA'];
        const rows = incidents.map((i) => [
          `"${i.id}"`,
          `"${i.workerName || i.workerId}"`,
          `"${i.incidentType}"`,
          `"${i.severity}"`,
          `"${i.location}"`,
          `"${i.occurredAt}"`,
          `"${i.status}"`,
          `"${(i.rootCause || '').replace(/"/g, '""')}"`,
          `"${(i.correctiveAction || '').replace(/"/g, '""')}"`,
        ]);
        downloadCSV('Rekap_Insiden_K3_CAPA', headers, rows);
        break;
      }
      case 'mhe_sio': {
        LicenseService.exportLicensesCSV(licenses);
        break;
      }
      case 'ppe_inventory': {
        PpeService.exportDistributionsCSV(ppeDistributions);
        break;
      }
      case 'reward_budget': {
        const headers = ['Nama Reward', 'Kategori', 'Poin', 'Min Tier', 'Stok Tersedia'];
        const rows = rewardCatalog.map((r) => [
          `"${r.title}"`,
          `"${r.category}"`,
          r.pointsRequired,
          `"${r.minTier || 'Semua'}"`,
          r.availableStock || 0,
        ]);
        downloadCSV('Rekap_Anggaran_Reward', headers, rows);
        break;
      }
    }
  };

  const downloadCSV = (filename: string, headers: string[], rows: any[][]) => {
    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${filename}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const selectedMeta = REPORT_OPTIONS.find((r) => r.id === selectedReportType)!;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* ─── HEADER BANNER ─── */}
      <div className="card p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 border-indigo-500/20 bg-gradient-to-r from-zinc-950 via-zinc-900 to-zinc-950">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center shrink-0 shadow-inner">
            <FileText className="w-6 h-6 text-indigo-400" />
          </div>
          <div>
            <h2 className="text-base font-black text-white flex items-center gap-2">
              <span>Generator Laporan Audit Eksekutif (Executive Compliance Report)</span>
            </h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              Pusat Penerbitan Dokumen Resmi Manajemen: Matriks Kompetensi, K3 Zero Incident, SIO MHE, APD, dan Anggaran Reward
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleGenerateCSV}
            className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
            title="Unduh Data Mentah Format CSV"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            <span>Unduh CSV</span>
          </button>
          <button
            onClick={handleGeneratePDF}
            className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs rounded-xl transition flex items-center gap-2 shadow-lg shadow-indigo-950"
            title="Cetak & Unduh Dokumen PDF Resmi"
          >
            <Printer className="w-4 h-4" />
            <span>Cetak PDF Resmi</span>
          </button>
        </div>
      </div>

      {/* ─── 1. PILIH JENIS DOKUMEN LAPORAN ─── */}
      <div className="space-y-2">
        <label className="text-xs font-bold text-zinc-400 block uppercase tracking-wider">
          1. Pilih Jenis Dokumen Laporan Eksekutif:
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
          {REPORT_OPTIONS.map((opt) => {
            const Icon = opt.icon;
            const isSelected = selectedReportType === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => setSelectedReportType(opt.id)}
                className={`p-4 rounded-2xl border text-left transition relative flex flex-col justify-between ${
                  isSelected
                    ? 'bg-zinc-900 border-indigo-500 ring-2 ring-indigo-500/20 shadow-lg'
                    : 'bg-zinc-950/60 border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900/40'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2.5">
                    <div className={`p-2 rounded-xl ${opt.accentColor}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700">
                      {opt.badge}
                    </span>
                  </div>
                  <h4 className="font-bold text-white text-xs leading-tight mb-1">{opt.title}</h4>
                  <p className="text-[11px] text-zinc-500 line-clamp-2">{opt.description}</p>
                </div>

                <div className="pt-3 mt-2 border-t border-zinc-800/80 flex items-center justify-between">
                  <span className="text-[10px] font-bold text-zinc-500 uppercase">{opt.category}</span>
                  {isSelected && <CheckCircle2 className="w-4 h-4 text-indigo-400" />}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ─── 2. KONFIGURASI PARAMETER & PENANDATANGAN ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Form Penandatangan & Parameter */}
        <div className="card p-5 space-y-4 lg:col-span-1">
          <div className="flex items-center gap-2 border-b border-zinc-800 pb-3">
            <UserCheck className="w-4 h-4 text-amber-400" />
            <h3 className="font-bold text-white text-xs">Konfigurasi Legalitas & Tanda Tangan</h3>
          </div>

          <div className="space-y-3.5">
            {/* Periode */}
            <div>
              <label className="block text-xs font-bold text-zinc-300 mb-1">Periode Waktu Laporan</label>
              <select
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 font-semibold"
              >
                <option value="" disabled>-- Pilih Periode Laporan --</option>
                <option value="Bulan Ini">Bulan Ini ({new Date().toLocaleString('id-ID', { month: 'long', year: 'numeric' })})</option>
                <option value="Triwulan I (Q1 2026)">Triwulan I (Q1 2026)</option>
                <option value="Triwulan II (Q2 2026)">Triwulan II (Q2 2026)</option>
                <option value="Triwulan III (Q3 2026)">Triwulan III (Q3 2026)</option>
                <option value="Triwulan IV (Q4 2026)">Triwulan IV (Q4 2026)</option>
                <option value="Tahun Berjalan 2026">Tahun Berjalan 2026 (Annual)</option>
                <option value="Seluruh Arsip (All-Time)">Seluruh Arsip (All-Time)</option>
              </select>
            </div>

            {/* Divisi */}
            <div>
              <label className="block text-xs font-bold text-zinc-300 mb-1">Filter Divisi Operasional</label>
              <select
                value={selectedDivision}
                onChange={(e) => setSelectedDivision(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 font-semibold"
              >
                <option value="all">Semua Divisi ({workers.length} Total Staf)</option>
                {divisions.map((d) => (
                  <option key={d} value={d}>
                    Divisi {d}
                  </option>
                ))}
              </select>
            </div>

            {/* Nomor Dokumen */}
            <div>
              <label className="block text-xs font-bold text-zinc-300 mb-1">Nomor Registrasi Dokumen (SK)</label>
              <input
                type="text"
                value={documentNumber}
                onChange={(e) => setDocumentNumber(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-indigo-500 font-mono font-bold"
              />
            </div>

            {/* Verifikator Kiri */}
            <div>
              <label className="block text-xs font-bold text-zinc-300 mb-1">Nama Petugas Pembuat / Verifikator</label>
              <input
                type="text"
                value={supervisorName}
                onChange={(e) => setSupervisorName(e.target.value)}
                placeholder="Nama Pengawas / Supervisor..."
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-indigo-500"
              />
            </div>

            {/* Penyetuju Kanan */}
            <div>
              <label className="block text-xs font-bold text-zinc-300 mb-1">Nama Pejabat Penyetuju (Manager/Head)</label>
              <input
                type="text"
                value={managerName}
                onChange={(e) => setManagerName(e.target.value)}
                placeholder="Nama Manager Operasional / HSE..."
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>
        </div>

        {/* Live Sheet Preview */}
        <div className="card p-5 space-y-4 lg:col-span-2 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-indigo-400" />
                <h3 className="font-bold text-white text-xs">Pratinjau Lembar Eksekutif (Live Preview)</h3>
              </div>
              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/20 px-2 py-0.5 rounded border border-emerald-500/20">
                Dokumen Resmi Terverifikasi
              </span>
            </div>

            {/* Paper Preview Card */}
            <div className="mt-4 bg-zinc-950 border border-zinc-800 rounded-2xl p-4 sm:p-6 space-y-4 shadow-inner">
              {/* Header Box */}
              <div className="border-b border-zinc-800 pb-3 flex items-start justify-between">
                <div>
                  <div className="text-[10px] font-bold text-indigo-400 tracking-wider">PT DAM INDONESIA</div>
                  <h3 className="text-sm font-black text-white mt-0.5">{selectedMeta.title}</h3>
                  <p className="text-[11px] text-zinc-400 mt-0.5">
                    No: <span className="font-mono text-zinc-300">{documentNumber}</span> | Periode:{' '}
                    <span className="text-zinc-300">{period}</span>
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-[10px] text-zinc-500">Tanggal Cetak:</div>
                  <div className="text-xs font-bold text-white">{new Date().toLocaleDateString('id-ID')}</div>
                </div>
              </div>

              {/* Summary KPIs */}
              <div className="grid grid-cols-3 gap-2.5">
                {selectedReportType === 'competency_matrix' && (
                  <>
                    <div className="bg-zinc-900 p-2.5 rounded-xl border border-zinc-800 text-center">
                      <div className="text-[10px] text-zinc-500 font-bold">Total Staf</div>
                      <div className="text-base font-black text-white">{operationalWorkers.length}</div>
                    </div>
                    <div className="bg-zinc-900 p-2.5 rounded-xl border border-zinc-800 text-center">
                      <div className="text-[10px] text-zinc-500 font-bold">Rata-rata BIB</div>
                      <div className="text-base font-black text-emerald-400">
                        {operationalWorkers.length
                          ? (
                              operationalWorkers.reduce((s, w) => s + w.bibScores.totalScore, 0) /
                              operationalWorkers.length
                            ).toFixed(1)
                          : 0}
                      </div>
                    </div>
                    <div className="bg-zinc-900 p-2.5 rounded-xl border border-zinc-800 text-center">
                      <div className="text-[10px] text-zinc-500 font-bold">Status Audit</div>
                      <div className="text-base font-black text-indigo-400">100% Valid</div>
                    </div>
                  </>
                )}

                {selectedReportType === 'k3_incident' && (
                  <>
                    <div className="bg-zinc-900 p-2.5 rounded-xl border border-zinc-800 text-center">
                      <div className="text-[10px] text-zinc-500 font-bold">Total Insiden</div>
                      <div className="text-base font-black text-white">{incidents.length}</div>
                    </div>
                    <div className="bg-zinc-900 p-2.5 rounded-xl border border-zinc-800 text-center">
                      <div className="text-[10px] text-zinc-500 font-bold">CAPA Selesai</div>
                      <div className="text-base font-black text-emerald-400">
                        {incidents.filter((i) => i.status === 'resolved' || i.status === 'closed').length}
                      </div>
                    </div>
                    <div className="bg-zinc-900 p-2.5 rounded-xl border border-zinc-800 text-center">
                      <div className="text-[10px] text-zinc-500 font-bold">Pending Open</div>
                      <div className="text-base font-black text-amber-400">
                        {incidents.filter((i) => i.status === 'open' || i.status === 'investigating').length}
                      </div>
                    </div>
                  </>
                )}

                {selectedReportType === 'mhe_sio' && (
                  <>
                    <div className="bg-zinc-900 p-2.5 rounded-xl border border-zinc-800 text-center">
                      <div className="text-[10px] text-zinc-500 font-bold">Operator MHE</div>
                      <div className="text-base font-black text-white">{licenses.length}</div>
                    </div>
                    <div className="bg-zinc-900 p-2.5 rounded-xl border border-zinc-800 text-center">
                      <div className="text-[10px] text-zinc-500 font-bold">SIO Aktif Legal</div>
                      <div className="text-base font-black text-emerald-400">
                        {licenses.filter((l) => l.status === 'active').length}
                      </div>
                    </div>
                    <div className="bg-zinc-900 p-2.5 rounded-xl border border-zinc-800 text-center">
                      <div className="text-[10px] text-zinc-500 font-bold">Perlu Perpanjangan</div>
                      <div className="text-base font-black text-amber-400">
                        {licenses.filter((l) => l.status !== 'active').length}
                      </div>
                    </div>
                  </>
                )}

                {selectedReportType === 'ppe_inventory' && (
                  <>
                    <div className="bg-zinc-900 p-2.5 rounded-xl border border-zinc-800 text-center">
                      <div className="text-[10px] text-zinc-500 font-bold">Katalog APD</div>
                      <div className="text-base font-black text-white">{ppeMaster.length} Jenis</div>
                    </div>
                    <div className="bg-zinc-900 p-2.5 rounded-xl border border-zinc-800 text-center">
                      <div className="text-[10px] text-zinc-500 font-bold">Terdistribusi Aktif</div>
                      <div className="text-base font-black text-emerald-400">{ppeDistributions.length} Unit</div>
                    </div>
                    <div className="bg-zinc-900 p-2.5 rounded-xl border border-zinc-800 text-center">
                      <div className="text-[10px] text-zinc-500 font-bold">Tiket Rusak/Ganti</div>
                      <div className="text-base font-black text-indigo-400">{ppeDamageReports.length}</div>
                    </div>
                  </>
                )}

                {selectedReportType === 'reward_budget' && (
                  <>
                    <div className="bg-zinc-900 p-2.5 rounded-xl border border-zinc-800 text-center">
                      <div className="text-[10px] text-zinc-500 font-bold">Poin Beredar</div>
                      <div className="text-base font-black text-amber-400">
                        {operationalWorkers.reduce((s, w) => s + (w.totalPoints || 0), 0).toLocaleString()} PTS
                      </div>
                    </div>
                    <div className="bg-zinc-900 p-2.5 rounded-xl border border-zinc-800 text-center">
                      <div className="text-[10px] text-zinc-500 font-bold">Katalog Reward</div>
                      <div className="text-base font-black text-white">{rewardCatalog.length} Item</div>
                    </div>
                    <div className="bg-zinc-900 p-2.5 rounded-xl border border-zinc-800 text-center">
                      <div className="text-[10px] text-zinc-500 font-bold">Total Stok Unit</div>
                      <div className="text-base font-black text-purple-400">
                        {rewardCatalog.reduce((s, r) => s + (r.availableStock || 0), 0)} Unit
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Sample Mini Table */}
              <div className="border border-zinc-800 rounded-xl overflow-hidden bg-zinc-900/60">
                <div className="p-2.5 bg-zinc-900 border-b border-zinc-800 text-[10px] font-bold text-zinc-400 uppercase">
                  Sampel Rekap Data Lampiran Dokumen:
                </div>
                <div className="p-3 text-xs text-zinc-400 space-y-1.5 font-mono text-[11px]">
                  {selectedReportType === 'competency_matrix' &&
                    operationalWorkers.slice(0, 3).map((w, i) => (
                      <div key={w.id} className="flex justify-between border-b border-zinc-800/40 pb-1">
                        <span>
                          {i + 1}. {w.name} ({w.employeeId})
                        </span>
                        <span className="text-emerald-400 font-bold">BIB: {w.bibScores.totalScore.toFixed(1)}</span>
                      </div>
                    ))}

                  {selectedReportType === 'k3_incident' &&
                    incidents.slice(0, 3).map((inc, i) => (
                      <div key={inc.id} className="flex justify-between border-b border-zinc-800/40 pb-1">
                        <span>
                          {i + 1}. {inc.location} ({inc.incidentType})
                        </span>
                        <span className="text-amber-400 font-bold">{inc.status.toUpperCase()}</span>
                      </div>
                    ))}

                  {selectedReportType === 'mhe_sio' &&
                    licenses.slice(0, 3).map((lic, i) => (
                      <div key={lic.id} className="flex justify-between border-b border-zinc-800/40 pb-1">
                        <span>
                          {i + 1}. {lic.workerName} - {lic.licenseType}
                        </span>
                        <span className="text-cyan-400 font-bold">{lic.expiryDate}</span>
                      </div>
                    ))}

                  {selectedReportType === 'ppe_inventory' &&
                    ppeDistributions.slice(0, 3).map((d, i) => (
                      <div key={d.id} className="flex justify-between border-b border-zinc-800/40 pb-1">
                        <span>
                          {i + 1}. {d.workerName} - {d.ppeName}
                        </span>
                        <span className="text-emerald-400 font-bold">{d.quantity} Unit</span>
                      </div>
                    ))}

                  {selectedReportType === 'reward_budget' &&
                    rewardCatalog.slice(0, 3).map((r, i) => (
                      <div key={r.id} className="flex justify-between border-b border-zinc-800/40 pb-1">
                        <span>
                          {i + 1}. {r.title}
                        </span>
                        <span className="text-purple-400 font-bold">{r.pointsRequired} PTS</span>
                      </div>
                    ))}
                </div>
              </div>

              {/* Signature Blocks Preview */}
              <div className="pt-4 border-t border-zinc-800 flex justify-between text-[11px] text-zinc-400">
                <div>
                  <div>Dibuat & Diverifikasi:</div>
                  <div className="font-bold text-white mt-4 underline">{supervisorName}</div>
                  <div className="text-[10px] text-zinc-500">{supervisorTitle}</div>
                </div>
                <div className="text-right">
                  <div>Disetujui Oleh:</div>
                  <div className="font-bold text-white mt-4 underline">{managerName}</div>
                  <div className="text-[10px] text-zinc-500">{managerTitle}</div>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-4 flex items-center justify-between border-t border-zinc-800">
            <div className="text-[11px] text-zinc-500">
              Dokumen resmi siap digenerate dengan penomoran unik otomatis.
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleGenerateCSV}
                className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold text-xs rounded-xl transition flex items-center gap-1.5"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                <span>Download CSV</span>
              </button>
              <button
                onClick={handleGeneratePDF}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs rounded-xl transition flex items-center gap-1.5 shadow-lg shadow-indigo-950"
              >
                <Download className="w-4 h-4" />
                <span>Download PDF Resmi</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
