import React, { useState, useMemo } from 'react';
import {
  Building2,
  HardHat,
  Sparkles,
  ShoppingBag,
  FileCheck
} from 'lucide-react';
import { WorkerProfile, RewardItem } from '../types/assessment';
import { RoleEntity } from '../domain/RoleEntity';
import { PpeService } from '../lib/ppeService';

// Lazy-loaded specialized panels
const PpeManagementPanel = React.lazy(() =>
  import('./PpeManagementPanel').then((m) => ({ default: m.PpeManagementPanel }))
);
const Audit5sPanel = React.lazy(() =>
  import('./Audit5sPanel').then((m) => ({ default: m.Audit5sPanel }))
);
const AdminRewardCatalogPanel = React.lazy(() =>
  import('./admin/AdminRewardCatalogPanel').then((m) => ({ default: m.AdminRewardCatalogPanel }))
);
const ExecutiveReportPanel = React.lazy(() =>
  import('./ExecutiveReportPanel').then((m) => ({ default: m.ExecutiveReportPanel }))
);

interface GaConsoleProps {
  workers: WorkerProfile[];
  currentGaId?: string;
  currentUserName?: string;
  rewardCatalog?: RewardItem[];
  onCreateReward?: (item: Omit<RewardItem, 'id'>) => Promise<void> | void;
  onUpdateReward?: (rewardId: string, updates: Partial<Omit<RewardItem, 'id'>>) => Promise<void> | void;
  onRestockReward?: (rewardId: string, addStock: number) => Promise<void> | void;
  onDeleteReward?: (rewardId: string) => Promise<void> | void;
}

type GaTab = 'ppe-stock' | 'audit-5s' | 'rewards-fulfillment' | 'reports';

export const GaConsole: React.FC<GaConsoleProps> = ({
  workers = [],
  currentGaId,
  currentUserName = 'General Affairs Lead',
  rewardCatalog = [],
  onCreateReward,
  onUpdateReward,
  onRestockReward,
  onDeleteReward,
}) => {
  const [activeTab, setActiveTab] = useState<GaTab>('ppe-stock');

  const operationalWorkers = useMemo(() => {
    return workers.filter((w) => RoleEntity.isOperationalWorker(w.role) && w.division.toUpperCase() !== 'SYSTEM');
  }, [workers]);

  const ppeMaster = useMemo(() => PpeService.getAllMasterItems(), []);
  const ppeDamageReports = useMemo(() => PpeService.getAllDamageReports(), []);

  const totalRewardStock = useMemo(() => {
    return rewardCatalog.reduce((sum, item) => sum + (item.availableStock || 0), 0);
  }, [rewardCatalog]);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* GA Header Banner */}
      <div className="card-elevated p-5 sm:p-6 border border-cyan-500/30 bg-gradient-to-br from-cyan-950/30 via-zinc-950 to-zinc-900 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 relative z-10">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-cyan-500/15 border border-cyan-500/40 flex items-center justify-center text-cyan-400 shrink-0 shadow-lg">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg sm:text-xl font-black text-white tracking-tight">
                  Konsol Umum, Fasilitas & Sarana (General Affairs)
                </h1>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                  Facility & Assets
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-0.5">
                Pengelolaan Master Inventaris APD, Standarisasi 5R/5S Sarana Umum, dan Logistik Fulfillment Reward.
              </p>
            </div>
          </div>

          {/* Quick Vital Stats Strip */}
          <div className="grid grid-cols-3 gap-2.5 shrink-0">
            <div className="bg-zinc-900/90 border border-zinc-800 px-3 py-2 rounded-xl text-center min-w-[100px]">
              <div className="text-[9px] text-zinc-500 font-bold uppercase">Master APD</div>
              <div className="text-sm sm:text-base font-black text-cyan-400">
                {ppeMaster.length} <span className="text-[10px] font-normal text-zinc-500">Jenis</span>
              </div>
            </div>
            <div className="bg-zinc-900/90 border border-zinc-800 px-3 py-2 rounded-xl text-center min-w-[100px]">
              <div className="text-[9px] text-zinc-500 font-bold uppercase">Klaim Rusak</div>
              <div className="text-sm sm:text-base font-black text-amber-400">
                {ppeDamageReports.length} <span className="text-[10px] font-normal text-zinc-500">Unit</span>
              </div>
            </div>
            <div className="bg-zinc-900/90 border border-zinc-800 px-3 py-2 rounded-xl text-center min-w-[100px]">
              <div className="text-[9px] text-zinc-500 font-bold uppercase">Stok Fisik Reward</div>
              <div className="text-sm sm:text-base font-black text-emerald-400">
                {totalRewardStock} <span className="text-[10px] font-normal text-zinc-500">Unit</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* GA Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-zinc-800 pb-3 overflow-x-auto no-scrollbar">
        <button
          onClick={() => setActiveTab('ppe-stock')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-xs transition shrink-0 ${
            activeTab === 'ppe-stock'
              ? 'bg-cyan-500 text-zinc-950 shadow-md shadow-cyan-500/20'
              : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-800'
          }`}
        >
          <HardHat className="w-3.5 h-3.5" />
          <span>Master Inventaris & Distribusi APD</span>
        </button>

        <button
          onClick={() => setActiveTab('audit-5s')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-xs transition shrink-0 ${
            activeTab === 'audit-5s'
              ? 'bg-cyan-500 text-zinc-950 shadow-md shadow-cyan-500/20'
              : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-800'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Audit 5R / 5S Fasilitas & Area Umum</span>
        </button>

        <button
          onClick={() => setActiveTab('rewards-fulfillment')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-xs transition shrink-0 ${
            activeTab === 'rewards-fulfillment'
              ? 'bg-cyan-500 text-zinc-950 shadow-md shadow-cyan-500/20'
              : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-800'
          }`}
        >
          <ShoppingBag className="w-3.5 h-3.5" />
          <span>Logistik & Serah-Terima Reward</span>
        </button>

        <button
          onClick={() => setActiveTab('reports')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-xs transition shrink-0 ${
            activeTab === 'reports'
              ? 'bg-cyan-500 text-zinc-950 shadow-md shadow-cyan-500/20'
              : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-800'
          }`}
        >
          <FileCheck className="w-3.5 h-3.5" />
          <span>Laporan Inventaris & Pengeluaran</span>
        </button>
      </div>

      {/* Tab Panels */}
      <React.Suspense
        fallback={
          <div className="flex items-center justify-center py-20 text-zinc-500 gap-3 text-sm">
            <div className="w-5 h-5 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
            <span>Memuat modul General Affairs...</span>
          </div>
        }
      >
        {activeTab === 'ppe-stock' && (
          <PpeManagementPanel
            workers={operationalWorkers}
            isSupervisor={true}
            currentUserName={currentUserName}
          />
        )}

        {activeTab === 'audit-5s' && (
          <Audit5sPanel
            workers={operationalWorkers}
            isSupervisor={true}
            currentUserName={currentUserName}
          />
        )}

        {activeTab === 'rewards-fulfillment' && (
          <AdminRewardCatalogPanel
            rewardCatalog={rewardCatalog}
            currentAdminId={currentGaId}
            onCreateReward={onCreateReward}
            onUpdateReward={onUpdateReward}
            onRestockReward={onRestockReward}
            onDeleteReward={onDeleteReward}
            showToast={() => {}}
          />
        )}

        {activeTab === 'reports' && (
          <ExecutiveReportPanel
            workers={operationalWorkers}
            rewardCatalog={rewardCatalog}
            currentUserName={currentUserName}
          />
        )}
      </React.Suspense>
    </div>
  );
};
