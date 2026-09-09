import React, { useState, useMemo, useEffect } from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  HardHat,
  Truck,
  FileCheck,
  Search,
  FileText,
  CheckCircle
} from 'lucide-react';
import { WorkerProfile, IncidentReport } from '../types/assessment';
import { RoleEntity } from '../domain/RoleEntity';
import { fetchIncidentReports, updateIncidentCapaAndStatus } from '../lib/supabaseService';
import { LicenseService } from '../lib/licenseService';
import { PpeService } from '../lib/ppeService';
import { ExecutivePDFReportGenerator } from '../lib/pdfReportService';

// Lazy-loaded specialized panels
const SupervisorIncidentKanban = React.lazy(() =>
  import('./SupervisorIncidentKanban').then((m) => ({ default: m.SupervisorIncidentKanban }))
);
const SupervisorIncidentValidationModal = React.lazy(() =>
  import('./SupervisorIncidentValidationModal').then((m) => ({ default: m.SupervisorIncidentValidationModal }))
);
const SafetyPatrolKanban = React.lazy(() =>
  import('./SafetyPatrolKanban').then((m) => ({ default: m.SafetyPatrolKanban }))
);
const MheLicensePanel = React.lazy(() =>
  import('./MheLicensePanel').then((m) => ({ default: m.MheLicensePanel }))
);
const PpeManagementPanel = React.lazy(() =>
  import('./PpeManagementPanel').then((m) => ({ default: m.PpeManagementPanel }))
);
const ExecutiveReportPanel = React.lazy(() =>
  import('./ExecutiveReportPanel').then((m) => ({ default: m.ExecutiveReportPanel }))
);

interface HseConsoleProps {
  workers: WorkerProfile[];
  currentHseId?: string;
  currentUserName?: string;
}

type HseTab = 'incidents' | 'gemba' | 'licenses' | 'ppe' | 'reports';

export const HseConsole: React.FC<HseConsoleProps> = ({
  workers = [],
  currentHseId,
  currentUserName = 'HSE Specialist',
}) => {
  const [activeTab, setActiveTab] = useState<HseTab>('incidents');
  const [incidents, setIncidents] = useState<IncidentReport[]>([]);
  const [incidentsLoading, setIncidentsLoading] = useState(false);
  const [validatingIncident, setValidatingIncident] = useState<IncidentReport | null>(null);
  const [updatingIncidentId, setUpdatingIncidentId] = useState<string | null>(null);

  const operationalWorkers = useMemo(() => {
    return workers.filter((w) => RoleEntity.isOperationalWorker(w.role) && w.division.toUpperCase() !== 'SYSTEM');
  }, [workers]);

  const loadIncidents = () => {
    setIncidentsLoading(true);
    fetchIncidentReports()
      .then(setIncidents)
      .catch(() => {})
      .finally(() => setIncidentsLoading(false));
  };

  useEffect(() => {
    loadIncidents();
  }, []);

  const handleUpdateIncidentStatus = async (incidentId: string, newStatus: IncidentReport['status']) => {
    setUpdatingIncidentId(incidentId);
    const targetInc = incidents.find((i) => i.id === incidentId);
    try {
      await updateIncidentCapaAndStatus(incidentId, {
        status: newStatus,
        updatedBy: currentUserName || 'HSE Specialist',
        resolutionNote: newStatus === 'resolved' || newStatus === 'closed' ? 'Ditangani oleh HSE Specialist' : undefined,
        workerId: targetInc?.workerId,
      });
      setIncidents((prev) => prev.map((inc) => (inc.id === incidentId ? { ...inc, status: newStatus } : inc)));
    } catch (err) {
      console.error('Gagal update status insiden:', err);
    } finally {
      setUpdatingIncidentId(null);
    }
  };

  const openIncidents = useMemo(() => {
    return incidents.filter((i) => i.status === 'open' || i.status === 'investigating');
  }, [incidents]);

  const allLicenses = useMemo(() => LicenseService.getAllLicenses(), []);
  const expiringLicensesCount = useMemo(() => {
    return allLicenses.filter((l) => l.status === 'expiring_soon' || l.status === 'expired').length;
  }, [allLicenses]);

  const [isGeneratingDossier, setIsGeneratingDossier] = useState(false);
  const [dossierSuccess, setDossierSuccess] = useState(false);

  const handleQuickPrintDossier = () => {
    setIsGeneratingDossier(true);
    try {
      const ppeDist = PpeService.getAllDistributions();
      ExecutivePDFReportGenerator.generateMonthlyHseDossierPDF(
        operationalWorkers,
        incidents,
        allLicenses,
        ppeDist,
        {
          supervisorName: currentUserName || 'HSE Specialist & Ahli K3',
          supervisorTitle: 'HSE Specialist & Ahli K3',
          managerName: 'Operations & Logistics Manager',
          periodLabel: `Bulan ${new Date().toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}`,
        }
      );
      setDossierSuccess(true);
      setTimeout(() => setDossierSuccess(false), 3500);
    } catch (err) {
      console.error('Gagal generate Dossier K3:', err);
    } finally {
      setIsGeneratingDossier(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* HSE Header Banner */}
      <div className="card-elevated p-5 sm:p-6 border border-amber-500/30 bg-gradient-to-br from-amber-950/30 via-zinc-950 to-zinc-900 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 relative z-10">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0 shadow-lg">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg sm:text-xl font-black text-white tracking-tight">
                  Pusat Komando K3 & Lingkungan (HSE / EHS)
                </h1>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  ISO 45001 & SMK3
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-0.5">
                Pengawasan K3 Zero Incident, Investigasi CAPA, Kepatuhan SIO Kemnaker RI, dan Gemba Walk.
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
            {/* Quick One-Click Monthly HSE Dossier Button */}
            <button
              onClick={handleQuickPrintDossier}
              disabled={isGeneratingDossier}
              className={`px-4 py-2.5 rounded-xl font-bold text-xs transition flex items-center justify-center gap-2 shadow-lg shrink-0 ${
                dossierSuccess
                  ? 'bg-emerald-500 text-zinc-950 shadow-emerald-500/20'
                  : 'bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white shadow-emerald-600/30 border border-emerald-400/40'
              }`}
              title="Cetak Laporan Lengkap Dossier Bulanan K3 (Standar ISO 45001 & Disnaker RI) dalam Satu Klik"
            >
              {isGeneratingDossier ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Menyusun Dossier...</span>
                </>
              ) : dossierSuccess ? (
                <>
                  <CheckCircle className="w-4 h-4 text-zinc-950" />
                  <span>Dossier K3 Diunduh!</span>
                </>
              ) : (
                <>
                  <FileText className="w-4 h-4" />
                  <span>Cetak Dossier K3 (ISO 45001)</span>
                </>
              )}
            </button>

            {/* Quick Vital Stats Strip */}
            <div className="grid grid-cols-3 gap-2 shrink-0">
              <div className="bg-zinc-900/90 border border-zinc-800 px-3 py-2 rounded-xl text-center min-w-[90px]">
                <div className="text-[9px] text-zinc-500 font-bold uppercase">Investigasi</div>
                <div className="text-sm sm:text-base font-black text-amber-400">
                  {openIncidents.length} <span className="text-[10px] font-normal text-zinc-500">Tiket</span>
                </div>
              </div>
              <div className="bg-zinc-900/90 border border-zinc-800 px-3 py-2 rounded-xl text-center min-w-[90px]">
                <div className="text-[9px] text-zinc-500 font-bold uppercase">SIO Kritis</div>
                <div className="text-sm sm:text-base font-black text-rose-400">
                  {expiringLicensesCount} <span className="text-[10px] font-normal text-zinc-500">Unit</span>
                </div>
              </div>
              <div className="bg-zinc-900/90 border border-zinc-800 px-3 py-2 rounded-xl text-center min-w-[90px]">
                <div className="text-[9px] text-zinc-500 font-bold uppercase">Staf Terlindungi</div>
                <div className="text-sm sm:text-base font-black text-emerald-400">
                  {operationalWorkers.length} <span className="text-[10px] font-normal text-zinc-500">Org</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* HSE Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-zinc-800 pb-3 overflow-x-auto no-scrollbar">
        <button
          onClick={() => setActiveTab('incidents')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-xs transition shrink-0 ${
            activeTab === 'incidents'
              ? 'bg-amber-500 text-zinc-950 shadow-md shadow-amber-500/20'
              : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-800'
          }`}
        >
          <ShieldAlert className="w-3.5 h-3.5" />
          <span>Investigasi Insiden & CAPA</span>
          {openIncidents.length > 0 && (
            <span className="ml-1 px-1.5 py-0.2 text-[9px] bg-zinc-950 text-amber-300 font-black rounded-full">
              {openIncidents.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('gemba')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-xs transition shrink-0 ${
            activeTab === 'gemba'
              ? 'bg-amber-500 text-zinc-950 shadow-md shadow-amber-500/20'
              : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-800'
          }`}
        >
          <Search className="w-3.5 h-3.5" />
          <span>Safety Patrol (Gemba Walk)</span>
        </button>

        <button
          onClick={() => setActiveTab('licenses')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-xs transition shrink-0 ${
            activeTab === 'licenses'
              ? 'bg-amber-500 text-zinc-950 shadow-md shadow-amber-500/20'
              : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-800'
          }`}
        >
          <Truck className="w-3.5 h-3.5" />
          <span>Lisensi SIO MHE Alat Berat</span>
          {expiringLicensesCount > 0 && (
            <span className="ml-1 px-1.5 py-0.2 text-[9px] bg-rose-950 text-rose-300 border border-rose-500/30 font-black rounded-full">
              {expiringLicensesCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('ppe')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-xs transition shrink-0 ${
            activeTab === 'ppe'
              ? 'bg-amber-500 text-zinc-950 shadow-md shadow-amber-500/20'
              : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-800'
          }`}
        >
          <HardHat className="w-3.5 h-3.5" />
          <span>Audit Masa Pakai APD</span>
        </button>

        <button
          onClick={() => setActiveTab('reports')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-xs transition shrink-0 ${
            activeTab === 'reports'
              ? 'bg-amber-500 text-zinc-950 shadow-md shadow-amber-500/20'
              : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-800'
          }`}
        >
          <FileCheck className="w-3.5 h-3.5" />
          <span>Penerbitan Laporan K3 Resmi</span>
        </button>
      </div>

      {/* Tab Panels */}
      <React.Suspense
        fallback={
          <div className="flex items-center justify-center py-20 text-zinc-500 gap-3 text-sm">
            <div className="w-5 h-5 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
            <span>Memuat modul HSE...</span>
          </div>
        }
      >
        {activeTab === 'incidents' && (
          <SupervisorIncidentKanban
            incidents={incidents}
            onSelectIncident={(inc: IncidentReport) => setValidatingIncident(inc)}
            onUpdateStatus={handleUpdateIncidentStatus}
            updatingIncidentId={updatingIncidentId}
            loading={incidentsLoading}
          />
        )}

        {activeTab === 'gemba' && (
          <SafetyPatrolKanban
            workers={operationalWorkers}
            currentSupervisorName={currentUserName}
            currentSupervisorId={currentHseId}
            showToast={() => {}}
          />
        )}

        {activeTab === 'licenses' && <MheLicensePanel workers={operationalWorkers} />}

        {activeTab === 'ppe' && (
          <PpeManagementPanel
            workers={operationalWorkers}
            isSupervisor={true}
            currentUserName={currentUserName}
          />
        )}

        {activeTab === 'reports' && (
          <ExecutiveReportPanel
            workers={operationalWorkers}
            incidents={incidents}
            currentUserName={currentUserName}
          />
        )}
      </React.Suspense>

      {/* Validation Modal */}
      {validatingIncident && (
        <React.Suspense fallback={null}>
          <SupervisorIncidentValidationModal
            incident={validatingIncident}
            workers={operationalWorkers}
            onClose={() => setValidatingIncident(null)}
            onSuccess={() => {
              loadIncidents();
            }}
          />
        </React.Suspense>
      )}
    </div>
  );
};
