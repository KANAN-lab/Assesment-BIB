import React, { useState, useMemo, useEffect } from 'react';
import {
  Settings, UserCheck, TableProperties, ShieldAlert, Award,
  CheckCircle2, Building2, UserPlus, Zap, Megaphone,
  BarChart2, ShoppingBag, History, Sparkles, HelpCircle,
  BookOpen, Bell, Truck, HardHat, FileText, ShieldCheck, Users
} from 'lucide-react';
import { WorkerProfile, CompetencyItem, RewardItem, ActivityLog } from '../types/assessment';
import { DivisionEntity } from '../domain/DivisionEntity';
import { RoleEntity } from '../domain/RoleEntity';
import { fetchActivityLog } from '../lib/supabaseService';
import matrixData from '../data/matrixData.json';
import { SkeletonLoader } from './SkeletonLoader';

// ─── Granular Lazy-Loaded Admin Panels (Vite Code Splitting) ───
const AdminStaffPanel = React.lazy(() => import('./admin/AdminStaffPanel').then(m => ({ default: m.AdminStaffPanel })));
const AdminSupervisorApprovalPanel = React.lazy(() => import('./admin/AdminSupervisorApprovalPanel').then(m => ({ default: m.AdminSupervisorApprovalPanel })));
const AdminMasterDataPanel = React.lazy(() => import('./admin/AdminMasterDataPanel').then(m => ({ default: m.AdminMasterDataPanel })));
const AdminCompetencyMatrixPanel = React.lazy(() => import('./admin/AdminCompetencyMatrixPanel').then(m => ({ default: m.AdminCompetencyMatrixPanel })));
const AdminRewardCatalogPanel = React.lazy(() => import('./admin/AdminRewardCatalogPanel').then(m => ({ default: m.AdminRewardCatalogPanel })));
const AdminIncidentPanel = React.lazy(() => import('./admin/AdminIncidentPanel').then(m => ({ default: m.AdminIncidentPanel })));
const AdminAnnouncementPanel = React.lazy(() => import('./admin/AdminAnnouncementPanel').then(m => ({ default: m.AdminAnnouncementPanel })));
const AdminAiQuizPanel = React.lazy(() => import('./admin/AdminAiQuizPanel').then(m => ({ default: m.AdminAiQuizPanel })));

// Existing Module Panels
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

// Backward compatibility alias for lazy reward panel
const AdminRewardManagerSection = AdminRewardCatalogPanel;

type AdminTab =
  | 'workers'
  | 'approvals'
  | 'divisions'
  | 'roles'
  | 'matrix'
  | 'ai-quiz'
  | 'analytics'
  | 'announcements'
  | 'incidents'
  | 'kaizen'
  | 'activity'
  | 'rewards'
  | 'badges'
  | 'quiz'
  | 'config'
  | 'sop'
  | 'notifications'
  | 'licenses'
  | 'ppe'
  | 'reports'
  | 'disciplinary'
  | 'audit-5s';

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
  const [activeTab, setActiveTab] = useState<AdminTab>('workers');
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Master Data State
  const [divisions, setDivisions] = useState<DivisionEntity[]>(DivisionEntity.createDefaultDivisions());
  const [roles, setRoles] = useState<RoleEntity[]>(RoleEntity.createDefaultRoles());

  const competencyItems: CompetencyItem[] = matrixData.competencyMatrix;
  const pendingSupervisors = useMemo(() => workers.filter((w) => w.status === 'pending_approval'), [workers]);

  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [activityLoading, setActivityLoading] = useState(false);

  const loadActivity = () => {
    setActivityLoading(true);
    fetchActivityLog(100).then(setActivityLogs).catch(() => {}).finally(() => setActivityLoading(false));
  };

  useEffect(() => {
    if (activeTab === 'activity' && activityLogs.length === 0) {
      loadActivity();
    }
  }, [activeTab]);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  const handleAddDivision = (newDiv: DivisionEntity) => {
    setDivisions((prev) => [...prev, newDiv]);
  };

  const handleAddRole = (newRole: RoleEntity) => {
    setRoles((prev) => [...prev, newRole]);
  };

  interface AdminTabItem {
    key: AdminTab;
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
      ],
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
        { key: 'incidents', label: 'Laporan Insiden', icon: ShieldAlert },
      ],
    },
    {
      groupLabel: 'MASTER SETUP DATA',
      tabs: [
        { key: 'divisions', label: 'Master Divisi', icon: Building2, badge: divisions.length },
        { key: 'roles', label: 'Master Role', icon: UserPlus, badge: roles.length },
        { key: 'matrix', label: 'Matriks Kompetensi', icon: TableProperties, badge: competencyItems.length },
        { key: 'config', label: 'Aturan & Config System', icon: Settings },
      ],
    },
    {
      groupLabel: 'AI ENGINE & EDUKASI SOP',
      tabs: [
        { key: 'sop', label: 'Modul SOP Micro-Deck', icon: BookOpen },
        { key: 'ai-quiz', label: 'Gappy AI Engine', icon: Zap },
        { key: 'quiz', label: 'Bank Soal Quiz', icon: HelpCircle },
        { key: 'announcements', label: 'Pengumuman Tim', icon: Megaphone },
        { key: 'notifications', label: 'Manajemen Notifikasi', icon: Bell },
      ],
    },
  ];

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-emerald-950/90 border border-emerald-500/40 text-emerald-200 text-xs px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2 animate-fade-in">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Executive Administrator Navigation Header */}
      <div className="card p-5 space-y-4">
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
            <span className="font-semibold text-zinc-300">
              Hak Akses: <strong className="text-white">Full Administrator</strong>
            </span>
          </div>
        </div>

        {/* Desktop Categorized Executive Tab Navigation Suite */}
        <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
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
                      type="button"
                      onClick={() => setActiveTab(t.key)}
                      className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-bold transition ${
                        isActive
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
                          className={`text-[9px] font-mono font-bold px-1.5 py-0.2 rounded shrink-0 ${
                            t.alert
                              ? 'bg-amber-500 text-zinc-950 font-black animate-pulse'
                              : isActive
                              ? 'bg-purple-800 text-purple-100'
                              : 'bg-zinc-800 text-zinc-400'
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

        {/* Mobile Horizontal Scrollable Tab Bar */}
        <div className="md:hidden flex items-center gap-1.5 overflow-x-auto pb-1 custom-scrollbar">
          {TAB_GROUPS.flatMap((g) => g.tabs).map((t) => {
            const isActive = activeTab === t.key;
            const Icon = t.icon;
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => setActiveTab(t.key)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition shrink-0 ${
                  isActive
                    ? 'bg-purple-600 text-white'
                    : 'bg-zinc-900 text-zinc-400 hover:text-white'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{t.label}</span>
                {t.badge !== undefined && (
                  <span className="text-[9px] font-mono font-bold px-1 rounded bg-zinc-800 text-zinc-300">
                    {t.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ─── MODULAR TAB CONTENTS (ISOLATED LAZY PANELS) ─── */}
      <React.Suspense fallback={<SkeletonLoader />}>
        {/* SDM & AKSES PEKERJA */}
        {activeTab === 'workers' && (
          <AdminStaffPanel
            workers={workers}
            divisions={divisions}
            roles={roles}
            currentAdminId={currentAdminId}
            showToast={showToast}
          />
        )}

        {activeTab === 'approvals' && (
          <AdminSupervisorApprovalPanel
            pendingSupervisors={pendingSupervisors}
            workers={workers}
            onApproveWorker={onApproveWorker}
            onRejectWorker={onRejectWorker}
            showToast={showToast}
          />
        )}

        {activeTab === 'activity' && (
          <div className="card p-5">
            <ActivityLogPanel logs={activityLogs} onRefresh={loadActivity} loading={activityLoading} />
          </div>
        )}

        {activeTab === 'disciplinary' && <DisciplinaryPanel workers={workers} />}
        {activeTab === 'licenses' && <MheLicensePanel workers={workers} />}
        {activeTab === 'ppe' && <PpeManagementPanel workers={workers} />}

        {/* PERFORMANSI & REWARD */}
        {activeTab === 'rewards' && (
          <AdminRewardCatalogPanel
            rewardCatalog={rewardCatalog}
            currentAdminId={currentAdminId}
            onCreateReward={onCreateReward}
            onUpdateReward={onUpdateReward}
            onRestockReward={onRestockReward}
            onDeleteReward={onDeleteReward}
            showToast={showToast}
          />
        )}

        {activeTab === 'reports' && <ExecutiveReportPanel workers={workers} />}
        {activeTab === 'audit-5s' && <Audit5sPanel workers={workers} />}
        {activeTab === 'badges' && <BadgeManagementPanel />}
        {activeTab === 'kaizen' && (
          <KaizenKanbanBoard currentUserId={currentAdminId} isAdmin={true} />
        )}
        {activeTab === 'analytics' && (
          <div className="card p-5">
            <AdminAnalytics workers={workers} />
          </div>
        )}
        {activeTab === 'incidents' && <AdminIncidentPanel showToast={showToast} />}

        {/* MASTER SETUP DATA */}
        {activeTab === 'divisions' && (
          <AdminMasterDataPanel
            divisions={divisions}
            roles={roles}
            onAddDivision={handleAddDivision}
            onAddRole={handleAddRole}
            showToast={showToast}
            initialSubTab="divisions"
          />
        )}

        {activeTab === 'roles' && (
          <AdminMasterDataPanel
            divisions={divisions}
            roles={roles}
            onAddDivision={handleAddDivision}
            onAddRole={handleAddRole}
            showToast={showToast}
            initialSubTab="roles"
          />
        )}

        {activeTab === 'matrix' && (
          <AdminCompetencyMatrixPanel competencyItems={competencyItems} />
        )}

        {activeTab === 'config' && <SystemConfigPanel />}

        {/* AI ENGINE & EDUKASI SOP */}
        {activeTab === 'sop' && <SopManagementPanel />}
        {activeTab === 'ai-quiz' && <AdminAiQuizPanel showToast={showToast} />}
        {activeTab === 'quiz' && <QuizManagementPanel />}
        {activeTab === 'announcements' && (
          <AdminAnnouncementPanel currentAdminId={currentAdminId} showToast={showToast} />
        )}
        {activeTab === 'notifications' && <AdminNotificationPanel workers={workers} />}
      </React.Suspense>
    </div>
  );
};
