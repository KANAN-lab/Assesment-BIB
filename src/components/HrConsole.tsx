import React, { useState, useMemo } from 'react';
import {
  Users,
  BookOpen,
  AlertOctagon,
  FileCheck,
  Search,
  GraduationCap,
  HelpCircle
} from 'lucide-react';
import { WorkerProfile } from '../types/assessment';
import { RoleEntity } from '../domain/RoleEntity';
import { WorkerAvatar } from './WorkerAvatar';
import { SystemConfigService } from '../domain/SystemConfigService';

// Lazy-loaded specialized panels
const SopManagementPanel = React.lazy(() =>
  import('./SopManagementPanel').then((m) => ({ default: m.SopManagementPanel }))
);
const QuizManagementPanel = React.lazy(() =>
  import('./QuizManagementPanel').then((m) => ({ default: m.QuizManagementPanel }))
);
const DisciplinaryPanel = React.lazy(() =>
  import('./DisciplinaryPanel').then((m) => ({ default: m.DisciplinaryPanel }))
);
const ExecutiveReportPanel = React.lazy(() =>
  import('./ExecutiveReportPanel').then((m) => ({ default: m.ExecutiveReportPanel }))
);
const CompetencyGapAnalysisModal = React.lazy(() =>
  import('./CompetencyGapAnalysisModal').then((m) => ({ default: m.CompetencyGapAnalysisModal }))
);

interface HrConsoleProps {
  workers: WorkerProfile[];
  currentHrId?: string;
  currentUserName?: string;
  onOpenMatrixAudit?: (worker: WorkerProfile) => void;
}

type HrTab = 'competency' | 'sop-curriculum' | 'quiz-bank' | 'disciplinary' | 'reports';

export const HrConsole: React.FC<HrConsoleProps> = ({
  workers = [],
  currentHrId,
  currentUserName = 'HR Specialist',
  onOpenMatrixAudit,
}) => {
  const [activeTab, setActiveTab] = useState<HrTab>('competency');
  const [search, setSearch] = useState('');
  const [selectedDivision, setSelectedDivision] = useState('all');
  const [isGapModalOpen, setIsGapModalOpen] = useState(false);

  const operationalWorkers = useMemo(() => {
    return workers.filter((w) => RoleEntity.isOperationalWorker(w.role) && w.division.toUpperCase() !== 'SYSTEM');
  }, [workers]);

  const filteredWorkers = useMemo(() => {
    return operationalWorkers.filter((w) => {
      const matchSearch =
        w.name.toLowerCase().includes(search.toLowerCase()) ||
        w.employeeId.toLowerCase().includes(search.toLowerCase()) ||
        w.role.toLowerCase().includes(search.toLowerCase());
      const matchDiv = selectedDivision === 'all' || w.division === selectedDivision;
      return matchSearch && matchDiv;
    });
  }, [operationalWorkers, search, selectedDivision]);

  const divisions = useMemo(() => {
    const set = new Set<string>();
    operationalWorkers.forEach((w) => {
      if (w.division) set.add(w.division);
    });
    return Array.from(set).sort();
  }, [operationalWorkers]);

  const avgBibScore = useMemo(() => {
    if (!operationalWorkers.length) return '0.0';
    const sum = operationalWorkers.reduce((acc, w) => acc + (w.bibScores?.totalScore || 0), 0);
    return (sum / operationalWorkers.length).toFixed(1);
  }, [operationalWorkers]);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* HR Header Banner */}
      <div className="card-elevated p-5 sm:p-6 border border-purple-500/30 bg-gradient-to-br from-purple-950/30 via-zinc-950 to-zinc-900 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 relative z-10">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-purple-500/15 border border-purple-500/40 flex items-center justify-center text-purple-400 shrink-0 shadow-lg">
              <GraduationCap className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg sm:text-xl font-black text-white tracking-tight">
                  Konsol Personalia, Kompetensi & Disiplin (HR & Training)
                </h1>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  People Development
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-0.5">
                Pengembangan Kurikulum SOP, Pemantauan Matriks Kompetensi BIB, dan Ketertiban Tata Tertib Kerja.
              </p>
            </div>
          </div>

          {/* Quick Vital Stats Strip */}
          <div className="grid grid-cols-3 gap-2.5 shrink-0">
            <div className="bg-zinc-900/90 border border-zinc-800 px-3 py-2 rounded-xl text-center min-w-[100px]">
              <div className="text-[9px] text-zinc-500 font-bold uppercase">Total Karyawan</div>
              <div className="text-sm sm:text-base font-black text-purple-400">
                {operationalWorkers.length} <span className="text-[10px] font-normal text-zinc-500">Staf</span>
              </div>
            </div>
            <div className="bg-zinc-900/90 border border-zinc-800 px-3 py-2 rounded-xl text-center min-w-[100px]">
              <div className="text-[9px] text-zinc-500 font-bold uppercase">Rata-rata BIB</div>
              <div className="text-sm sm:text-base font-black text-emerald-400">
                {avgBibScore} <span className="text-[10px] font-normal text-zinc-500">/ 100</span>
              </div>
            </div>
            <div className="bg-zinc-900/90 border border-zinc-800 px-3 py-2 rounded-xl text-center min-w-[100px]">
              <div className="text-[9px] text-zinc-500 font-bold uppercase">Divisi Terdata</div>
              <div className="text-sm sm:text-base font-black text-indigo-400">
                {divisions.length} <span className="text-[10px] font-normal text-zinc-500">Divisi</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* HR Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-zinc-800 pb-3 overflow-x-auto no-scrollbar">
        <button
          onClick={() => setActiveTab('competency')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-xs transition shrink-0 ${
            activeTab === 'competency'
              ? 'bg-purple-600 text-white shadow-md shadow-purple-600/20'
              : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-800'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>Evaluasi Matriks & Kompetensi BIB</span>
        </button>

        <button
          onClick={() => setActiveTab('sop-curriculum')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-xs transition shrink-0 ${
            activeTab === 'sop-curriculum'
              ? 'bg-purple-600 text-white shadow-md shadow-purple-600/20'
              : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-800'
          }`}
        >
          <BookOpen className="w-3.5 h-3.5" />
          <span>Pustaka SOP & Kurikulum K3</span>
        </button>

        <button
          onClick={() => setActiveTab('quiz-bank')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-xs transition shrink-0 ${
            activeTab === 'quiz-bank'
              ? 'bg-purple-600 text-white shadow-md shadow-purple-600/20'
              : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-800'
          }`}
        >
          <HelpCircle className="w-3.5 h-3.5" />
          <span>Bank Soal Kuis Harian</span>
        </button>

        <button
          onClick={() => setActiveTab('disciplinary')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-xs transition shrink-0 ${
            activeTab === 'disciplinary'
              ? 'bg-purple-600 text-white shadow-md shadow-purple-600/20'
              : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-800'
          }`}
        >
          <AlertOctagon className="w-3.5 h-3.5" />
          <span>Tata Tertib & Sanksi Disipliner</span>
        </button>

        <button
          onClick={() => setActiveTab('reports')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-xs transition shrink-0 ${
            activeTab === 'reports'
              ? 'bg-purple-600 text-white shadow-md shadow-purple-600/20'
              : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-800'
          }`}
        >
          <FileCheck className="w-3.5 h-3.5" />
          <span>Laporan SDM & Matriks Eksekutif</span>
        </button>
      </div>

      {/* Tab Panels */}
      <React.Suspense
        fallback={
          <div className="flex items-center justify-center py-20 text-zinc-500 gap-3 text-sm">
            <div className="w-5 h-5 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
            <span>Memuat modul HR & Training...</span>
          </div>
        }
      >
        {activeTab === 'competency' && (
          <div className="space-y-4">
            {/* Filter & Search Bar */}
            <div className="card p-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Cari nama karyawan, NIP, atau jabatan operasional..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={selectedDivision}
                  onChange={(e) => setSelectedDivision(e.target.value)}
                  className="bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
                >
                  <option value="all">Semua Divisi ({operationalWorkers.length})</option>
                  {divisions.map((d) => (
                    <option key={d} value={d}>
                      Divisi {d}
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => setIsGapModalOpen(true)}
                  className="px-3 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-bold text-xs rounded-xl transition shrink-0"
                >
                  Analisis Gap Tim
                </button>
              </div>
            </div>

            {/* Workers Competency Table */}
            <div className="card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-zinc-900/80 border-b border-zinc-800 text-zinc-400 font-bold uppercase text-[10px]">
                    <tr>
                      <th className="px-4 py-3">Karyawan</th>
                      <th className="px-4 py-3">Divisi & Peran</th>
                      <th className="px-4 py-3">Tier</th>
                      <th className="px-4 py-3 text-center">Behavior</th>
                      <th className="px-4 py-3 text-center">Integrity</th>
                      <th className="px-4 py-3 text-center">Benchmark</th>
                      <th className="px-4 py-3 text-center">Total BIB</th>
                      <th className="px-4 py-3 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/60">
                    {filteredWorkers.map((w) => (
                      <tr key={w.id} className="hover:bg-zinc-900/40 transition">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <WorkerAvatar src={w.avatar} name={w.name} className="w-8 h-8 rounded-xl ring-1 ring-zinc-700" />
                            <div>
                              <div className="font-bold text-white text-xs">{w.name}</div>
                              <div className="text-[10px] text-zinc-500 font-mono">NIP: {w.employeeId}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-semibold text-zinc-300">{w.role}</div>
                          <div className="text-[10px] text-zinc-500">Divisi {w.division}</div>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className="text-[10px] font-bold px-2 py-0.5 rounded-md inline-block"
                            style={SystemConfigService.getTierBadgeStyle(w.tier)}
                          >
                            {w.tier}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center font-mono text-zinc-300">
                          {w.bibScores?.behavior || 0}
                        </td>
                        <td className="px-4 py-3 text-center font-mono text-zinc-300">
                          {w.bibScores?.integrity || 0}
                        </td>
                        <td className="px-4 py-3 text-center font-mono text-zinc-300">
                          {w.bibScores?.benchmark || 0}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="text-sm font-black text-emerald-400 font-mono">
                            {(w.bibScores?.totalScore || 0).toFixed(1)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {onOpenMatrixAudit && (
                              <button
                                onClick={() => onOpenMatrixAudit(w)}
                                className="px-2.5 py-1 bg-purple-600 hover:bg-purple-500 text-white rounded-lg font-bold text-[10px] transition shadow-sm"
                                title="Audit Matriks Kompetensi"
                              >
                                Audit Matriks
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                    {filteredWorkers.length === 0 && (
                      <tr>
                        <td colSpan={8} className="px-4 py-8 text-center text-zinc-500">
                          Tidak ditemukan karyawan yang sesuai dengan kriteria pencarian.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'sop-curriculum' && <SopManagementPanel />}

        {activeTab === 'quiz-bank' && <QuizManagementPanel />}

        {activeTab === 'disciplinary' && (
          <DisciplinaryPanel
            workers={operationalWorkers}
            isSupervisor={true}
            currentUserName={currentUserName}
          />
        )}

        {activeTab === 'reports' && (
          <ExecutiveReportPanel
            workers={operationalWorkers}
            currentUserName={currentUserName}
          />
        )}
      </React.Suspense>

      {/* Gap Analysis Modal */}
      {isGapModalOpen && (
        <React.Suspense fallback={null}>
          <CompetencyGapAnalysisModal
            isOpen={isGapModalOpen}
            workers={operationalWorkers}
            onClose={() => setIsGapModalOpen(false)}
          />
        </React.Suspense>
      )}
    </div>
  );
};
