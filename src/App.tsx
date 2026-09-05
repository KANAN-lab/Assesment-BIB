import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Navbar } from './components/Navbar';
import { BibRadarChart } from './components/BibRadarChart';
const DailyQuestModal = React.lazy(() => import('./components/DailyQuestModal').then(m => ({ default: m.DailyQuestModal })));
const ChecklistDetailModal = React.lazy(() => import('./components/ChecklistDetailModal').then(m => ({ default: m.ChecklistDetailModal })));
import { RewardMarketplace } from './components/RewardMarketplace';
import { LeaderboardSection } from './components/LeaderboardSection';
import { HandoverKanbanBoard } from './components/HandoverKanbanBoard';
const SupervisorConsole = React.lazy(() => import('./components/SupervisorConsole').then(m => ({ default: m.SupervisorConsole })));
import { LoginModal } from './components/LoginModal';
const CompetencyAuditModal = React.lazy(() => import('./components/CompetencyAuditModal').then(m => ({ default: m.CompetencyAuditModal })));
const AdminConsole = React.lazy(() => import('./components/AdminConsole').then(m => ({ default: m.AdminConsole })));
const ProfilePictureModal = React.lazy(() => import('./components/ProfilePictureModal').then(m => ({ default: m.ProfilePictureModal })));
import { ScoreHistoryChart } from './components/ScoreHistoryChart';
import { TierUpToast } from './components/TierUpToast';
import { FirstTimePasswordModal } from './components/FirstTimePasswordModal';
import { LazySkeletonBoundary } from './components/LazySkeletonBoundary';
import { WorkerAvatar } from './components/WorkerAvatar';
import { AnnouncementBanner } from './components/AnnouncementBanner';
import { BadgeShowcase } from './components/BadgeShowcase';
const IncidentReportModal = React.lazy(() => import('./components/IncidentReportModal').then(m => ({ default: m.IncidentReportModal })));
const SopLibraryModal = React.lazy(() => import('./components/SopLibraryModal').then(m => ({ default: m.SopLibraryModal })));
const OnboardingModal = React.lazy(() => import('./components/OnboardingModal').then(m => ({ default: m.OnboardingModal })));
import { PerformanceSummaryCard } from './components/PerformanceSummaryCard';
const WorkerCompetencyModal = React.lazy(() => import('./components/WorkerCompetencyModal').then(m => ({ default: m.WorkerCompetencyModal })));
import { WorkerIncidentHistory } from './components/WorkerIncidentHistory';
import { KudoWall } from './components/KudoWall';
import { IsoComplianceBanner } from './components/IsoComplianceBanner';
const KudoModal = React.lazy(() => import('./components/KudoModal').then(m => ({ default: m.KudoModal })));
const ShiftHandoverModal = React.lazy(() => import('./components/ShiftHandoverModal').then(m => ({ default: m.ShiftHandoverModal })));
const AcknowledgeHandoverModal = React.lazy(() => import('./components/AcknowledgeHandoverModal').then(m => ({ default: m.AcknowledgeHandoverModal })));
const KaizenSubmissionModal = React.lazy(() => import('./components/KaizenSubmissionModal').then(m => ({ default: m.KaizenSubmissionModal })));
const WorkerHistoryCenterModal = React.lazy(() => import('./components/WorkerHistoryCenterModal').then(m => ({ default: m.WorkerHistoryCenterModal })));
const WorkerDigitalIdModal = React.lazy(() => import('./components/WorkerDigitalIdModal').then(m => ({ default: m.WorkerDigitalIdModal })));
const WorkerSioUploadModal = React.lazy(() => import('./components/WorkerSioUploadModal').then(m => ({ default: m.WorkerSioUploadModal })));
const OfflineQueueDrawer = React.lazy(() => import('./components/OfflineQueueDrawer').then(m => ({ default: m.OfflineQueueDrawer })));
import { ShiftHandoverEntity } from './types/handover';
import { HandoverManager } from './lib/handoverService';
import { LicenseService } from './lib/licenseService';
import { MheLicenseEntity } from './types/license';


import {
  fetchWorkerById,
  fetchWorkerByUserId,
  fetchWorkerByEmployeeId,
  fetchAllWorkers,
  fetchLeaderboard,
  fetchRewardCatalog,
  createRewardCatalogItem,
  updateRewardCatalogItem,
  restockRewardCatalogItem,
  resetAllMonthlyRewardQuotas,
  deleteRewardCatalogItem,
  fetchRedemptionHistory,
  fulfillRedemption,
  completeWorkerQuiz,
  completeWorkerChecklist,
  insertRedemption,
  supervisorAuditWorker,
  signOutUser,
  fetchWorkerCompetencyScores,
  saveWorkerCompetencyScores,
  updateWorkerAvatar,
  updateWorkerStatus,
  checkAndResetDailyActivity,
  fetchScoreHistory,
  insertScoreHistory,
  fetchAnnouncements,
  fetchWorkerBadges,
  fetchAllBadges,
  checkAndAwardBadges,
  logActivity,
  checkLoginRateLimit,
  logLoginAttempt,
} from './lib/supabaseService';
import { supabase } from './lib/supabaseClient';
import { AtomicTransactionManager } from './lib/atomicService';
import { cleanExistingLocalStorageQuota } from './lib/storageSanitizer';

import { WorkerProfile, RewardItem, RewardHistory, AuditInput, LeaderboardEntry, ScoreHistoryEntry, TierType, Announcement, WorkerBadge, Badge, IncidentReport } from './types/assessment';
import { RoleEntity } from './domain/RoleEntity';
import { WorkerEntity } from './domain/WorkerEntity';
import { SystemConfigService } from './domain/SystemConfigService';

import { Zap, ShieldCheck, Flame, Coins, Trophy, CheckCircle2, AlertCircle, Loader2, Camera, ShieldAlert, BookOpen, Award, Sparkles, Lightbulb, History, QrCode, Truck } from 'lucide-react';

export const App: React.FC = () => {
  const [activeView, setActiveView] = useState<'worker' | 'supervisor' | 'admin'>('worker');

  // ── Core state ──
  const [currentWorker, setCurrentWorker] = useState<WorkerProfile | null>(null);
  const [allWorkers, setAllWorkers] = useState<WorkerProfile[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [rewardCatalog, setRewardCatalog] = useState<RewardItem[]>([]);
  const [redemptionHistory, setRedemptionHistory] = useState<RewardHistory[]>([]);
  const [scoreHistory, setScoreHistory] = useState<ScoreHistoryEntry[]>([]);
  const [tierUpData, setTierUpData] = useState<{ oldTier: TierType; newTier: TierType; pointsAwarded: number } | null>(null);

  // ── PRD §9 New State ──
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [workerBadges, setWorkerBadges] = useState<WorkerBadge[]>([]);
  const [allBadges, setAllBadges] = useState<Badge[]>([]);
  const [showIncidentModal, setShowIncidentModal] = useState(false);
  const [showCompetencyModal, setShowCompetencyModal] = useState(false);
  const [showSopModal, setShowSopModal] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showKudoModal, setShowKudoModal] = useState(false);
  const [showShiftHandoverModal, setShowShiftHandoverModal] = useState(false);
  const [showKaizenModal, setShowKaizenModal] = useState(false);
  const [showHistoryCenterModal, setShowHistoryCenterModal] = useState(false);
  const [showDigitalIdModal, setShowDigitalIdModal] = useState(false);
  const [showWorkerSioModal, setShowWorkerSioModal] = useState(false);
  const [workerLicense, setWorkerLicense] = useState<MheLicenseEntity | undefined>(() =>
    currentWorker ? (LicenseService.getLicenseByWorkerId(currentWorker.id) || LicenseService.getLicenseByWorkerId(currentWorker.employeeId)) : undefined
  );

  useEffect(() => {
    const updateLic = () => {
      if (currentWorker) {
        setWorkerLicense(LicenseService.getLicenseByWorkerId(currentWorker.id) || LicenseService.getLicenseByWorkerId(currentWorker.employeeId));
      }
    };
    updateLic();
    window.addEventListener('gappy_licenses_updated', updateLic);
    return () => {
      window.removeEventListener('gappy_licenses_updated', updateLic);
    };
  }, [currentWorker]);

  const isMheOperator = useMemo(() => {
    if (!currentWorker?.role) return false;
    const r = currentWorker.role.toLowerCase();
    return r.includes('forklift') || r.includes('reach truck') || r.includes('timbangan') || r.includes('mhe');
  }, [currentWorker?.role]);

  const [unacknowledgedHandovers, setUnacknowledgedHandovers] = useState<ShiftHandoverEntity[]>([]);
  const lastActiveRef = useRef<number>(Date.now());

  // ── Auth & UI state ──
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showDailyQuizModal, setShowDailyQuizModal] = useState(false);
  const [showChecklistModal, setShowChecklistModal] = useState(false);
  const [showProfilePicModal, setShowProfilePicModal] = useState(false);

  // ── Competency Matrix Audit state ──
  const [matrixAuditWorker, setMatrixAuditWorker] = useState<WorkerProfile | null>(null);
  const [matrixInitialScores, setMatrixInitialScores] = useState<Record<string, number>>({});

  // ── Auto-Clean Bloated Base64 Storage on Boot ──
  useEffect(() => {
    cleanExistingLocalStorageQuota();
  }, []);

  // ── Strict RBAC Enforcement Effect ──
  useEffect(() => {
    if (!currentWorker) return;
    const sysRole = RoleEntity.resolveSystemRole(currentWorker.role);
    if (sysRole === 'worker' && activeView !== 'worker') {
      setActiveView('worker');
    } else if (sysRole === 'supervisor' && activeView === 'admin') {
      setActiveView('supervisor');
    }
  }, [currentWorker, activeView]);

  // ── Load data for specific worker ──
  const loadDataForWorker = useCallback(async (workerId: string) => {
    setLoading(true);
    setError(null);
    try {
      const [worker, workers, lb, catalog, history, competencyScores, scoresHist] = await Promise.all([
        fetchWorkerById(workerId),
        fetchAllWorkers(),
        fetchLeaderboard(),
        fetchRewardCatalog(),
        fetchRedemptionHistory(workerId),
        fetchWorkerCompetencyScores(workerId).catch(() => ({})),
        fetchScoreHistory(workerId).catch(() => []),
      ]);

      if (!worker) throw new Error(`Worker dengan ID ${workerId} tidak ditemukan di database.`);

      if (worker.status === 'pending_approval') {
        localStorage.removeItem('komar_active_worker_id');
        setCurrentWorker(null);
        setShowLoginModal(true);
        throw new Error(`Akun Supervisor (${worker.name}) saat ini masih dalam status MENUNGGU PERSETUJUAN (Pending Approval) oleh Administrator.`);
      }

      if (worker.status === 'rejected') {
        localStorage.removeItem('komar_active_worker_id');
        setCurrentWorker(null);
        setShowLoginModal(true);
        throw new Error(`Permohonan akses Supervisor (${worker.name}) telah DITOLAK oleh Administrator.`);
      }

      // Check & reset daily activity if date has rolled over
      const wasReset = await checkAndResetDailyActivity(worker.id, worker.lastActivityDate).catch(() => false);
      if (wasReset) {
        worker.dailyQuizCompleted = false;
        worker.preShiftChecklistDone = false;
      }

      localStorage.setItem('komar_active_worker_id', worker.id);
      setCurrentWorker(worker);
      setAllWorkers(workers);
      setLeaderboard(lb);
      setRewardCatalog(catalog);
      setRedemptionHistory(history);
      setMatrixInitialScores(competencyScores);
      setScoreHistory(scoresHist);

      // Load announcements & badges & unacknowledged handovers
      fetchAnnouncements(true).then(setAnnouncements).catch(() => {});
      fetchWorkerBadges(worker.id).then(setWorkerBadges).catch(() => {});
      fetchAllBadges().then(setAllBadges).catch(() => {});
      HandoverManager.getUnacknowledgedHandovers(worker.id).then(setUnacknowledgedHandovers).catch(() => {});

      // Log login activity
      logActivity(worker.id, worker.name, 'login').catch(() => {});

      // Auto-show onboarding tour if first time
      if (localStorage.getItem('komar_onboarding_done') !== 'true') {
        setShowOnboarding(true);
      }

      // Auto-set view mode to match user's authorized role
      const sysRole = RoleEntity.resolveSystemRole(worker.role);
      setActiveView(sysRole);

      setShowLoginModal(false);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Gagal terhubung ke database.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Session Expiry Timer (8 jam tidak aktif → auto logout) ──
  useEffect(() => {
    if (!currentWorker) return;
    const updateActivity = () => { lastActiveRef.current = Date.now(); };
    window.addEventListener('click', updateActivity);
    window.addEventListener('keydown', updateActivity);

    const expireCheck = setInterval(() => {
      const idleMs = Date.now() - lastActiveRef.current;
      const EIGHT_HOURS = 8 * 60 * 60 * 1000;
      if (idleMs > EIGHT_HOURS) {
        logActivity(currentWorker.id, currentWorker.name, 'logout', 'Session expired (8h idle)').catch(() => {});
        signOutUser().catch(() => {});
        localStorage.removeItem('komar_active_worker_id');
        setCurrentWorker(null);
        setShowLoginModal(true);
      }
    }, 60 * 1000); // cek setiap 1 menit

    return () => {
      window.removeEventListener('click', updateActivity);
      window.removeEventListener('keydown', updateActivity);
      clearInterval(expireCheck);
    };
  }, [currentWorker]);

  // ── Auto background sync for offline SOP queue when network returns ──
  useEffect(() => {
    const handleOnline = () => {
      import('./lib/sopService').then(({ flushOfflineSopCompletions }) => {
        flushOfflineSopCompletions().then((count) => {
          if (count > 0) {
            console.log(`[OfflineSync] Berhasil mensinkronkan ${count} penyelesaian SOP offline.`);
          }
        });
      });
    };
    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, []);

  // ── Auto-Sync Realtime Pengumuman Tim (Lintas View & Cross-Tab Broadcast) ──
  useEffect(() => {
    const refreshAnnouncements = () => {
      fetchAnnouncements(true).then(setAnnouncements).catch(() => {});
    };

    refreshAnnouncements();

    const bc = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('gappy_announcements_channel') : null;
    if (bc) {
      bc.onmessage = () => refreshAnnouncements();
    }

    window.addEventListener('gappy_announcement_updated', refreshAnnouncements);
    window.addEventListener('storage', refreshAnnouncements);

    return () => {
      if (bc) bc.close();
      window.removeEventListener('gappy_announcement_updated', refreshAnnouncements);
      window.removeEventListener('storage', refreshAnnouncements);
    };
  }, []);

  // ── Auto Sync Effect: Tarik poin & data worker terbaru dari Supabase setiap 8 detik ──
  useEffect(() => {
    if (!currentWorker) return;

    const syncWorkerData = async () => {
      try {
        const [updatedWorker, updatedWorkers, updatedLb] = await Promise.all([
          fetchWorkerById(currentWorker.id).catch(() => null),
          fetchAllWorkers().catch(() => []),
          fetchLeaderboard().catch(() => []),
        ]);

        if (updatedWorker) {
          setCurrentWorker((prev) => {
            if (!prev) return updatedWorker;
            if (
              prev.totalPoints !== updatedWorker.totalPoints ||
              prev.tier !== updatedWorker.tier ||
              prev.streakDays !== updatedWorker.streakDays ||
              prev.dailyQuizCompleted !== updatedWorker.dailyQuizCompleted ||
              prev.preShiftChecklistDone !== updatedWorker.preShiftChecklistDone
            ) {
              return updatedWorker;
            }
            return prev;
          });
        }
        if (updatedWorkers.length > 0) setAllWorkers(updatedWorkers);
        if (updatedLb.length > 0) setLeaderboard(updatedLb);
      } catch {
        // silent sync
      }
    };

    const interval = setInterval(syncWorkerData, 8000);
    return () => clearInterval(interval);
  }, [currentWorker]);

  // Listen for real-time points_awarded events to update local React state instantly
  useEffect(() => {
    const handlePointsAwarded = (e: Event) => {
      const customEvt = e as CustomEvent;
      const { workerId, employeeId, newTotalPoints } = customEvt.detail || {};

      if (currentWorker && (currentWorker.id === workerId || currentWorker.employeeId === employeeId || currentWorker.id === employeeId)) {
        setCurrentWorker((prev) => {
          if (!prev) return null;
          const updatedPts = newTotalPoints || (prev.totalPoints + 50);
          return {
            ...prev,
            totalPoints: updatedPts,
            tier: WorkerEntity.calculateTier(updatedPts),
          };
        });
      }
    };

    window.addEventListener('gappy_points_awarded', handlePointsAwarded);
    return () => window.removeEventListener('gappy_points_awarded', handlePointsAwarded);
  }, [currentWorker]);

  // Initial load with session restoration
  useEffect(() => {
    const initApp = async () => {
      try {
        // 1. Primary: Restore saved worker session from localStorage
        const savedWorkerId = localStorage.getItem('komar_active_worker_id');
        if (savedWorkerId) {
          const savedWorker = await fetchWorkerById(savedWorkerId).catch(() => null);
          if (savedWorker) {
            await loadDataForWorker(savedWorker.id);
            return;
          }
        }

        // 2. Secondary: Restore from Supabase Auth session if linked
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const linkedWorker = await fetchWorkerByUserId(session.user.id).catch(() => null);
          if (linkedWorker) {
            await loadDataForWorker(linkedWorker.id);
            return;
          }
        }

        // 3. Fallback: Fetch worker list for LoginModal
        const workers = await fetchAllWorkers();
        setAllWorkers(workers);
        setLoading(false);
      } catch (err) {
        setError('Gagal menginisialisasi aplikasi.');
        setLoading(false);
      }
    };

    initApp();
  }, [loadDataForWorker]);

  // ── Realtime Data Subscription ──
  useEffect(() => {
    const channel = supabase
      .channel('komar-realtime-sync')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'workers' },
        () => {
          fetchLeaderboard().then(setLeaderboard).catch(console.warn);
          fetchAllWorkers().then(setAllWorkers).catch(console.warn);
          if (currentWorker?.id) {
            fetchWorkerById(currentWorker.id).then((updated) => {
              if (updated) setCurrentWorker(updated);
            }).catch(console.warn);
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'reward_catalog' },
        () => {
          fetchRewardCatalog().then(setRewardCatalog).catch(console.warn);
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'announcements' },
        () => {
          fetchAnnouncements(true).then(setAnnouncements).catch(console.warn);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentWorker?.id]);

  // Handle Logout
  const handleLogout = async () => {
    try {
      if (currentWorker) {
        await logActivity(currentWorker.id, currentWorker.name, 'logout').catch(() => {});
      }
      await signOutUser();
    } catch (e) {
      console.warn('Logout error:', e);
    }
    localStorage.removeItem('komar_active_worker_id');
    setCurrentWorker(null);
    setAnnouncements([]);
    setWorkerBadges([]);
    setUnacknowledgedHandovers([]);
    setShowLoginModal(true);
  };

  // Profile Picture Update
  const handleSaveAvatar = async (newAvatarUrl: string) => {
    if (!currentWorker) return;
    const oldAvatar = currentWorker.avatar;
    
    // Optimistic update
    setCurrentWorker(prev => prev ? { ...prev, avatar: newAvatarUrl } : null);
    setAllWorkers(prev => prev.map(w => w.id === currentWorker.id ? { ...w, avatar: newAvatarUrl } : w));
    setLeaderboard(prev => prev.map(e => e.workerId === currentWorker.id ? { ...e, avatar: newAvatarUrl } : e));

    try {
      await updateWorkerAvatar(currentWorker.id, newAvatarUrl);
    } catch (err) {
      // Rollback on error
      setCurrentWorker(prev => prev ? { ...prev, avatar: oldAvatar } : null);
    }
  };

  // Supervisor Approvals
  const handleApproveWorker = async (workerId: string) => {
    try {
      await updateWorkerStatus(workerId, 'active');
      const updated = await fetchAllWorkers();
      setAllWorkers(updated);
    } catch (err) {
      setError('Gagal menyetujui pendaftaran supervisor.');
    }
  };

  const handleRejectWorker = async (workerId: string) => {
    try {
      await updateWorkerStatus(workerId, 'rejected');
      const updated = await fetchAllWorkers();
      setAllWorkers(updated);
    } catch (err) {
      setError('Gagal menolak pendaftaran.');
    }
  };

  // Daily Quiz Complete
  const handleCompleteQuiz = async (basePoints: number) => {
    if (!currentWorker || currentWorker.dailyQuizCompleted) return;

    const oldWorker = { ...currentWorker };
    const bonusAwarded = WorkerEntity.calculateStreakBonusPoints(currentWorker.streakDays, basePoints);
    const newTotal = currentWorker.totalPoints + bonusAwarded;
    const newTier = WorkerEntity.calculateTier(newTotal);

    if (oldWorker.tier !== newTier) {
      setTierUpData({ oldTier: oldWorker.tier, newTier, pointsAwarded: bonusAwarded });
    }

    setCurrentWorker((prev) =>
      prev
        ? {
            ...prev,
            dailyQuizCompleted: true,
            totalPoints: newTotal,
            tier: newTier,
          }
        : null
    );

    try {
      const res = await completeWorkerQuiz(currentWorker.id, basePoints);
      if (res?.pointsEarned) {
        if (oldWorker.tier !== res.newTier) {
          setTierUpData({ oldTier: oldWorker.tier, newTier: res.newTier, pointsAwarded: res.pointsEarned });
        }
      }
      // Insert score history snapshot
      await insertScoreHistory(currentWorker.id, currentWorker.bibScores.totalScore, newTotal).catch(() => {});
      const [lb, scoresHist] = await Promise.all([
        fetchLeaderboard(),
        fetchScoreHistory(currentWorker.id).catch(() => []),
      ]);
      setLeaderboard(lb);
      setScoreHistory(scoresHist);
    } catch (err) {
      setCurrentWorker(oldWorker);
      setError('Gagal menyinkronkan poin kuis ke server.');
    }
  };

  // Pre-Shift Checklist Complete
  const handleCompleteChecklist = async () => {
    if (!currentWorker || currentWorker.preShiftChecklistDone) return;

    const basePoints = SystemConfigService.getConfig().preShiftRewardPoints;
    const oldWorker = { ...currentWorker };
    const newStreak = currentWorker.streakDays + 1;
    const bonusAwarded = WorkerEntity.calculateStreakBonusPoints(newStreak, basePoints);
    const newTotal = currentWorker.totalPoints + bonusAwarded;
    const newTier = WorkerEntity.calculateTier(newTotal);

    if (oldWorker.tier !== newTier) {
      setTierUpData({ oldTier: oldWorker.tier, newTier, pointsAwarded: bonusAwarded });
    }

    setCurrentWorker((prev) =>
      prev
        ? {
            ...prev,
            preShiftChecklistDone: true,
            streakDays: newStreak,
            totalPoints: newTotal,
            tier: newTier,
          }
        : null
    );

    try {
      const res = await completeWorkerChecklist(currentWorker.id, basePoints);
      if (res?.pointsEarned && oldWorker.tier !== res.newTier) {
        setTierUpData({ oldTier: oldWorker.tier, newTier: res.newTier, pointsAwarded: res.pointsEarned });
      }
      await insertScoreHistory(currentWorker.id, currentWorker.bibScores.totalScore, newTotal).catch(() => {});
      const [lb, scoresHist] = await Promise.all([
        fetchLeaderboard(),
        fetchScoreHistory(currentWorker.id).catch(() => []),
      ]);
      setLeaderboard(lb);
      setScoreHistory(scoresHist);
    } catch (err) {
      setCurrentWorker(oldWorker);
      setError('Gagal menyinkronkan checklist safety ke server.');
    }
  };

  // Redeem Reward (Atomic ACID Transaction)
  const handleRedeemReward = async (item: RewardItem, _fallbackCode: string) => {
    if (!currentWorker) return;

    try {
      const result = await AtomicTransactionManager.redeemRewardAtomically(currentWorker.id, item.id);

      setCurrentWorker((prev) =>
        prev ? { ...prev, totalPoints: result.remainingPoints } : null
      );

      const [updatedCatalog, updatedHistory] = await Promise.all([
        fetchRewardCatalog(),
        fetchRedemptionHistory(currentWorker.id),
      ]);
      setRewardCatalog(updatedCatalog);
      setRedemptionHistory(updatedHistory);

      return result;
    } catch (err: any) {
      const msg = err.message || 'Gagal melakukan penukaran reward.';
      setError(msg);
      throw err;
    }
  };

  // Fulfill Redemption (Admin / Supervisor)
  const handleFulfillRedemption = async (redemptionId: string) => {
    if (!currentWorker) return;
    try {
      await fulfillRedemption(redemptionId, currentWorker.id);
      const updatedHistory = await fetchRedemptionHistory(currentWorker.id);
      setRedemptionHistory(updatedHistory);
    } catch (err: any) {
      setError(err.message || 'Gagal menandai penyerahan voucher.');
      throw err;
    }
  };

  // Admin Reward Catalog Actions
  const handleCreateReward = async (itemData: Omit<RewardItem, 'id'>) => {
    try {
      await createRewardCatalogItem(itemData);
      const updatedCatalog = await fetchRewardCatalog();
      setRewardCatalog(updatedCatalog);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Gagal membuat reward item.';
      setError(msg);
    }
  };

  const handleUpdateReward = async (rewardId: string, updates: Partial<Omit<RewardItem, 'id'>>) => {
    try {
      await updateRewardCatalogItem(rewardId, updates);
      const updatedCatalog = await fetchRewardCatalog();
      setRewardCatalog(updatedCatalog);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Gagal memperbarui reward item.';
      setError(msg);
    }
  };

  const handleRestockReward = async (rewardId: string, addStock: number) => {
    try {
      await restockRewardCatalogItem(rewardId, addStock);
      const updatedCatalog = await fetchRewardCatalog();
      setRewardCatalog(updatedCatalog);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Gagal mengisi stok reward item.';
      setError(msg);
    }
  };

  const handleDeleteReward = async (rewardId: string) => {
    try {
      await deleteRewardCatalogItem(rewardId);
      const updatedCatalog = await fetchRewardCatalog();
      setRewardCatalog(updatedCatalog);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Gagal menghapus reward item.';
      setError(msg);
    }
  };

  const handleResetMonthlyQuota = async () => {
    try {
      await resetAllMonthlyRewardQuotas();
      const updatedCatalog = await fetchRewardCatalog();
      setRewardCatalog(updatedCatalog);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Gagal mereset kuota bulanan.';
      setError(msg);
    }
  };

  // Supervisor score update
  const handleUpdateWorkerScore = async (auditData: AuditInput) => {
    try {
      await supervisorAuditWorker(auditData);
      const updatedWorkers = await fetchAllWorkers();
      setAllWorkers(updatedWorkers);

      const newBibTotal = WorkerEntity.calculateBibTotal(auditData.behaviorScore, auditData.integrityScore, auditData.benchmarkScore);
      const auditedWorker = updatedWorkers.find((w) => w.id === auditData.workerId);
      if (auditedWorker) {
        await insertScoreHistory(auditData.workerId, newBibTotal, auditedWorker.totalPoints).catch(() => {});
      }

      if (currentWorker && currentWorker.id === auditData.workerId) {
        const refreshedWorker = updatedWorkers.find((w) => w.id === auditData.workerId);
        if (refreshedWorker) setCurrentWorker(refreshedWorker);
        const scoresHist = await fetchScoreHistory(currentWorker.id).catch(() => []);
        setScoreHistory(scoresHist);
      }

      const lb = await fetchLeaderboard();
      setLeaderboard(lb);
    } catch (err) {
      setError('Gagal memperbarui skor evaluasi supervisor.');
    }
  };

  // Open Matrix Audit modal
  const handleOpenMatrixAudit = async (worker: WorkerProfile) => {
    setMatrixAuditWorker(worker);
    const scores = await fetchWorkerCompetencyScores(worker.id).catch(() => ({}));
    setMatrixInitialScores(scores);
  };

  // Save Matrix Audit scores
  const handleSaveMatrixScores = async (
    scores: Record<string, number>,
    calculatedBehavior: number,
    calculatedBenchmark: number
  ) => {
    if (!matrixAuditWorker) return;
    const workerId = matrixAuditWorker.id;

    try {
      await saveWorkerCompetencyScores(
        workerId,
        scores,
        calculatedBehavior,
        calculatedBenchmark
      );

      setMatrixAuditWorker(null);

      const updatedWorkers = await fetchAllWorkers();
      setAllWorkers(updatedWorkers);

      const refreshed = updatedWorkers.find((w) => w.id === workerId);
      if (refreshed) {
        await insertScoreHistory(workerId, refreshed.bibScores.totalScore, refreshed.totalPoints).catch(() => {});
      }

      if (currentWorker && currentWorker.id === workerId) {
        if (refreshed) setCurrentWorker(refreshed);
        const scoresHist = await fetchScoreHistory(currentWorker.id).catch(() => []);
        setScoreHistory(scoresHist);
      }

      const lb = await fetchLeaderboard();
      setLeaderboard(lb);
    } catch (err) {
      setError('Gagal menyimpan audit matriks kompetensi.');
    }
  };

  // ── Loading & Error states ──

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 p-8 max-w-7xl mx-auto flex items-center justify-center">
        <LazySkeletonBoundary isLoading={true} type="dashboard">
          <div />
        </LazySkeletonBoundary>
      </div>
    );
  }

  if (showLoginModal || !currentWorker) {
    return (
      <LoginModal
        onLoginSuccess={async (empIdOrEmail) => {
          if (empIdOrEmail) {
            const worker = await fetchWorkerByEmployeeId(empIdOrEmail).catch(() => null);
            if (worker) {
              await loadDataForWorker(worker.id);
              return;
            }
          }
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user) {
            const linked = await fetchWorkerByUserId(session.user.id).catch(() => null);
            if (linked) await loadDataForWorker(linked.id);
          }
        }}
      />
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950 px-4">
        <div className="max-w-md w-full bg-zinc-900 border border-rose-500/30 rounded-2xl p-8 text-center">
          <AlertCircle className="w-10 h-10 text-rose-400 mx-auto mb-4" />
          <h2 className="text-white font-bold text-base mb-2">Koneksi Gagal</h2>
          <p className="text-zinc-400 text-sm mb-6">{error ?? 'Terjadi kesalahan.'}</p>
          <button
            onClick={() => currentWorker && loadDataForWorker(currentWorker.id)}
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-6 py-2.5 rounded-xl text-sm transition"
          >
            Coba Lagi
          </button>
        </div>
      </div>
    );
  }

  // ── Main render ──
  return (
    <div className="min-h-screen flex flex-col bg-zinc-950 text-zinc-100">

      {/* Error toast */}
      {error && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-rose-950/90 border border-rose-500/40 text-rose-200 text-xs px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
          <button onClick={() => setError(null)} className="ml-2 text-rose-400 hover:text-white font-bold">✕</button>
        </div>
      )}

      {/* Top Navigation */}
      <Navbar
        currentWorker={currentWorker}
        activeView={activeView}
        setActiveView={setActiveView}
        onOpenDailyQuiz={() => setShowDailyQuizModal(true)}
        onOpenProfilePicModal={() => setShowProfilePicModal(true)}
        onOpenSopLibrary={() => setShowSopModal(true)}
        onOpenOnboarding={() => setShowOnboarding(true)}
        onLogout={handleLogout}
      />

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">

        {/* Global Broadcast Announcement Banner (Tampil di semua view: Worker, Supervisor, Admin) */}
        {announcements.length > 0 && (
          <div className="mb-6">
            <AnnouncementBanner announcements={announcements} />
          </div>
        )}

        {activeView === 'worker' ? (
          <div className="space-y-6 animate-fade-in">

            {/* Worker Profile & Action Command Banner */}
            <div className="card-elevated p-4 sm:p-5 lg:p-6 border border-zinc-800/90 bg-gradient-to-br from-zinc-900/95 via-zinc-950 to-zinc-900/80 shadow-2xl relative overflow-hidden">
              {/* Subtle ambient accent */}
              <div className="absolute top-0 right-0 -mr-24 -mt-24 w-80 h-80 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

              {/* TOP ROW: Profile Identity (Left) + KPI Vital Stats Strip (Right) */}
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-4 border-b border-zinc-800/80 relative z-10">
                {/* Identity Block */}
                <div className="flex items-center gap-3.5 min-w-0">
                  <div
                    className="relative shrink-0 group cursor-pointer"
                    onClick={() => setShowProfilePicModal(true)}
                    title="Klik untuk ganti foto profil"
                  >
                    <WorkerAvatar
                      src={currentWorker.avatar}
                      name={currentWorker.name}
                      className="w-13 h-13 sm:w-14 sm:h-14 rounded-2xl ring-2 ring-zinc-700/80 group-hover:ring-emerald-500 transition shadow-lg"
                    />
                    <div className="absolute inset-0 bg-black/50 rounded-2xl opacity-0 group-hover:opacity-100 flex items-center justify-center transition backdrop-blur-xs">
                      <Camera className="w-4 h-4 text-white" />
                    </div>
                    <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-amber-500 rounded-lg flex items-center justify-center shadow-md">
                      <Trophy className="w-3 h-3 text-zinc-950" />
                    </div>
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h1 className="text-base sm:text-lg font-black text-white truncate tracking-tight">
                        {currentWorker.name}
                      </h1>
                      <span
                        className="text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1"
                        style={SystemConfigService.getTierBadgeStyle(currentWorker.tier)}
                      >
                        <span>{SystemConfigService.getTierByName(currentWorker.tier)?.icon || '🔰'}</span>
                        <span>{currentWorker.tier}</span>
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-zinc-400 font-mono mt-0.5 flex-wrap">
                      <span>NIP: <strong className="text-zinc-300 font-bold">{currentWorker.employeeId}</strong></span>
                      <span className="text-zinc-600">•</span>
                      {currentWorker.name.trim().toLowerCase() !== currentWorker.role.trim().toLowerCase() && (
                        <>
                          <span className="text-zinc-300 font-sans">{currentWorker.role}</span>
                          <span className="text-zinc-600">•</span>
                        </>
                      )}
                      <span className="font-sans">Divisi: <strong className="text-zinc-300 font-semibold">{currentWorker.division}</strong></span>
                    </div>

                    <div className="mt-1.5 flex items-center gap-2 flex-wrap">
                      <button
                        type="button"
                        onClick={() => setShowDigitalIdModal(true)}
                        className="px-2.5 py-1 bg-cyan-950/60 hover:bg-cyan-900/80 border border-cyan-500/40 rounded-lg text-[10px] font-bold text-cyan-300 flex items-center gap-1.5 transition shadow-sm hover:scale-[1.02] active:scale-[0.98]"
                        title="Tampilkan Kartu ID & QR Code SIO Digital"
                      >
                        <QrCode className="w-3.5 h-3.5 text-cyan-400" />
                        <span>Kartu ID & SIO Digital</span>
                      </button>

                      {/* Shortcut Unggah SIO Mandiri jika Operator MHE belum memiliki SIO atau Expired */}
                      {isMheOperator && (!workerLicense || workerLicense.status === 'expired' || workerLicense.status === 'expiring_soon') && (
                        <button
                          type="button"
                          onClick={() => setShowWorkerSioModal(true)}
                          className="px-2.5 py-1 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 rounded-lg text-[10px] font-bold text-amber-300 flex items-center gap-1.5 transition shadow-sm animate-pulse hover:scale-[1.02] active:scale-[0.98]"
                          title="Unggah Lisensi SIO Mandiri via AI Scan & raih reward +100 PTS"
                        >
                          <Truck className="w-3.5 h-3.5 text-amber-400" />
                          <span>{workerLicense ? 'Perbarui SIO' : 'Unggah SIO (+100 PTS)'}</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right: 3 KPI Vital Stats Strip */}
                <div className="grid grid-cols-3 gap-2 sm:gap-3 w-full lg:w-auto shrink-0">
                  <div className="bg-zinc-900/90 border border-zinc-800 px-3.5 py-2 sm:py-2.5 rounded-xl text-center lg:text-left flex flex-col lg:flex-row items-center gap-2 lg:gap-3 min-w-[95px] sm:min-w-[115px]">
                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
                      <Flame className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    </div>
                    <div>
                      <div className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider">Streak</div>
                      <div className="text-xs sm:text-sm font-black text-amber-300 leading-tight">
                        {currentWorker.streakDays} <span className="text-[10px] font-normal text-zinc-500">Hari</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-zinc-900/90 border border-zinc-800 px-3.5 py-2 sm:py-2.5 rounded-xl text-center lg:text-left flex flex-col lg:flex-row items-center gap-2 lg:gap-3 min-w-[95px] sm:min-w-[115px]">
                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
                      <Coins className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    </div>
                    <div>
                      <div className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider">Poin</div>
                      <div className="text-xs sm:text-sm font-black text-emerald-400 leading-tight">
                        {currentWorker.totalPoints.toLocaleString()} <span className="text-[10px] font-normal text-zinc-500">PTS</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-zinc-900/90 border border-zinc-800 px-3.5 py-2 sm:py-2.5 rounded-xl text-center lg:text-left flex flex-col lg:flex-row items-center gap-2 lg:gap-3 min-w-[95px] sm:min-w-[115px]">
                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 shrink-0">
                      <Award className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    </div>
                    <div>
                      <div className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider">Skor BIB</div>
                      <div className="text-xs sm:text-sm font-black text-white leading-tight">
                        {currentWorker.bibScores.totalScore.toFixed(1)} <span className="text-[10px] font-normal text-zinc-500">/ 5.0</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* BOTTOM ROW: Action Command Hub (Clean Symmetrical Grid) */}
              <div className="pt-3.5 relative z-10">
                <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Zap className="w-3 h-3 text-zinc-400" />
                  <span>Aksi Cepat & Kepatuhan Operasional</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
                  {/* 1. Kuis Safety */}
                  <button
                    onClick={() => setShowDailyQuizModal(true)}
                    disabled={currentWorker.dailyQuizCompleted}
                    className={`h-10 sm:h-11 px-2.5 rounded-xl font-bold text-xs transition flex items-center justify-center gap-1.5 shadow-sm ${
                      currentWorker.dailyQuizCompleted
                        ? 'bg-zinc-900/80 border border-zinc-800 text-zinc-500 cursor-default'
                        : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-950/40 hover:scale-[1.02] active:scale-[0.98]'
                    }`}
                  >
                    <Zap className={`w-3.5 h-3.5 shrink-0 ${currentWorker.dailyQuizCompleted ? 'text-zinc-600' : 'text-emerald-100'}`} />
                    <span className="truncate">
                      {currentWorker.dailyQuizCompleted
                        ? 'Kuis Selesai'
                        : `Kuis Safety +${SystemConfigService.getConfig().dailyQuizRewardPoints}`}
                    </span>
                    {currentWorker.dailyQuizCompleted && <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" />}
                  </button>

                  {/* 2. Pre-Shift */}
                  <button
                    onClick={() => setShowChecklistModal(true)}
                    disabled={currentWorker.preShiftChecklistDone}
                    className={`h-10 sm:h-11 px-2.5 rounded-xl font-bold text-xs transition flex items-center justify-center gap-1.5 shadow-sm ${
                      currentWorker.preShiftChecklistDone
                        ? 'bg-zinc-900/80 border border-zinc-800 text-zinc-500 cursor-default'
                        : 'bg-zinc-900 hover:bg-zinc-850 border border-cyan-500/50 text-cyan-300 hover:scale-[1.02] active:scale-[0.98]'
                    }`}
                  >
                    <ShieldCheck className={`w-3.5 h-3.5 shrink-0 ${currentWorker.preShiftChecklistDone ? 'text-zinc-600' : 'text-cyan-400'}`} />
                    <span className="truncate">
                      {currentWorker.preShiftChecklistDone
                        ? 'Checklist OK'
                        : `Pre-Shift +${SystemConfigService.getConfig().preShiftRewardPoints}`}
                    </span>
                    {currentWorker.preShiftChecklistDone && <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" />}
                  </button>

                  {/* 3. SOP Micro-Deck */}
                  <button
                    onClick={() => setShowSopModal(true)}
                    className="h-10 sm:h-11 px-2.5 rounded-xl font-bold text-xs bg-zinc-900 hover:bg-zinc-850 border border-purple-500/40 text-purple-300 transition flex items-center justify-center gap-1.5 shadow-sm hover:scale-[1.02] active:scale-[0.98]"
                    title="Buka Pustaka SOP Micro-Deck & K3 Academy"
                  >
                    <BookOpen className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                    <span className="truncate">SOP Deck</span>
                  </button>

                  {/* 4. Lapor Insiden K3 */}
                  <button
                    onClick={() => setShowIncidentModal(true)}
                    className="h-10 sm:h-11 px-2.5 rounded-xl font-bold text-xs bg-zinc-900 hover:bg-zinc-850 border border-orange-500/40 text-orange-300 transition flex items-center justify-center gap-1.5 shadow-sm hover:scale-[1.02] active:scale-[0.98]"
                    title="Laporkan Insiden / Near-Miss K3 Logistik"
                  >
                    <ShieldAlert className="w-3.5 h-3.5 text-orange-400 shrink-0" />
                    <span className="truncate">Lapor Insiden</span>
                  </button>

                  {/* 5. Beri Kudo */}
                  <button
                    onClick={() => setShowKudoModal(true)}
                    className="h-10 sm:h-11 px-2.5 rounded-xl font-bold text-xs bg-zinc-900 hover:bg-zinc-850 border border-sky-500/40 text-sky-300 transition flex items-center justify-center gap-1.5 shadow-sm hover:scale-[1.02] active:scale-[0.98]"
                    title="Kirim Apresiasi ke Rekan Kerja"
                  >
                    <Award className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                    <span className="truncate">Beri Kudo</span>
                  </button>

                  {/* 6. Serah Terima Shift */}
                  <button
                    onClick={() => setShowShiftHandoverModal(true)}
                    className="h-10 sm:h-11 px-2.5 rounded-xl font-bold text-xs bg-zinc-900 hover:bg-zinc-850 border border-indigo-500/40 text-indigo-300 transition flex items-center justify-center gap-1.5 shadow-sm hover:scale-[1.02] active:scale-[0.98]"
                    title="Catat Serah Terima (Handover) Antar Shift"
                  >
                    <AlertCircle className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                    <span className="truncate">Serah Terima</span>
                  </button>

                  {/* 7. Kaizen Inovasi */}
                  <button
                    onClick={() => setShowKaizenModal(true)}
                    className="h-10 sm:h-11 px-2.5 rounded-xl font-bold text-xs bg-zinc-900 hover:bg-zinc-850 border border-amber-500/40 text-amber-300 transition flex items-center justify-center gap-1.5 shadow-sm hover:scale-[1.02] active:scale-[0.98]"
                    title="Ajukan Ide Kaizen & Raih Reward Poin!"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span className="truncate">Kaizen</span>
                  </button>

                  {/* 8. Riwayat & Arsip */}
                  <button
                    onClick={() => setShowHistoryCenterModal(true)}
                    className="h-10 sm:h-11 px-2.5 rounded-xl font-bold text-xs bg-zinc-900 hover:bg-zinc-850 border border-zinc-700 text-zinc-300 transition flex items-center justify-center gap-1.5 shadow-sm hover:scale-[1.02] active:scale-[0.98]"
                    title="Pusat Riwayat Terpadu: Kaizen, Insiden, Handover, Kudo, & Reward"
                  >
                    <History className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                    <span className="truncate">Riwayat</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Shift Handover Kanban Board */}
            <div className="mb-6">
              <HandoverKanbanBoard />
            </div>

            {/* Target & Performance Summary Card */}
            <PerformanceSummaryCard
              worker={currentWorker}
              onOpenCompetencyModal={() => setShowCompetencyModal(true)}
            />

            {/* Grid: Radar BIB & Leaderboard */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <BibRadarChart worker={currentWorker} competencyScores={matrixInitialScores} />
              <LeaderboardSection entries={leaderboard} currentWorkerId={currentWorker.id} />
            </div>

            {/* Score History 30-Day Trend Chart */}
            <ScoreHistoryChart history={scoreHistory} currentBibScore={currentWorker.bibScores.totalScore} />

            {/* Reward Marketplace */}
            <RewardMarketplace
              userPoints={currentWorker.totalPoints}
              userTier={currentWorker.tier}
              catalog={rewardCatalog}
              onRedeemReward={handleRedeemReward}
              redemptionHistory={redemptionHistory}
              isAdmin={RoleEntity.resolveSystemRole(currentWorker.role) === 'admin'}
              onCreateReward={handleCreateReward}
              onUpdateReward={handleUpdateReward}
              onRestockReward={handleRestockReward}
              onDeleteReward={handleDeleteReward}
              onResetMonthlyQuota={handleResetMonthlyQuota}
              onFulfillRedemption={handleFulfillRedemption}
            />

            {/* Badge Showcase */}
            {allBadges.length > 0 && (
              <BadgeShowcase workerBadges={workerBadges} allBadges={allBadges} />
            )}

            {/* Kudo Wall / Tembok Apresiasi */}
            <KudoWall />

            {/* Standar & Kepatuhan ISO & Regulasi K3 (Paling Bawah) */}
            <IsoComplianceBanner />

          </div>
        ) : activeView === 'supervisor' ? (
          <div className="animate-fade-in">
            <React.Suspense fallback={
              <div className="flex items-center justify-center py-24 text-zinc-500 gap-3 text-sm">
                <svg className="animate-spin w-5 h-5 text-emerald-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                <span>Memuat Supervisor Console...</span>
              </div>
            }>
              <SupervisorConsole
                workers={allWorkers}
                currentSupervisorId={currentWorker?.id}
                onUpdateWorkerScore={handleUpdateWorkerScore}
                onOpenMatrixAudit={handleOpenMatrixAudit}
              />
            </React.Suspense>
          </div>
        ) : (
          <div className="animate-fade-in">
            <React.Suspense fallback={
              <div className="flex items-center justify-center py-24 text-zinc-500 gap-3 text-sm">
                <svg className="animate-spin w-5 h-5 text-purple-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                <span>Memuat Administrator Console...</span>
              </div>
            }>
              <AdminConsole
                workers={allWorkers}
                currentAdminId={currentWorker?.id}
                onApproveWorker={handleApproveWorker}
                onRejectWorker={handleRejectWorker}
                onWorkersUpdated={() => currentWorker && loadDataForWorker(currentWorker.id)}
                rewardCatalog={rewardCatalog}
                onCreateReward={handleCreateReward}
                onUpdateReward={handleUpdateReward}
                onRestockReward={handleRestockReward}
                onDeleteReward={handleDeleteReward}
              />
            </React.Suspense>
          </div>
        )}

      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-900 py-5 text-center">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-zinc-600">
          <span>© 2026 Gappy Assessment — Enterprise Operational & K3 Platform</span>
          <div className="flex items-center gap-3">
            <span>ISO 45001</span>
            <span>·</span>
            <span>Zero Accident Logistics</span>
          </div>
        </div>
      </footer>

      {/* Modals & Notifications */}
      <React.Suspense fallback={null}>
        {showDailyQuizModal && currentWorker && (
          <DailyQuestModal
            workerDivision={currentWorker.division}
            workerRole={currentWorker.role}
            workerId={currentWorker.id}
            workerName={currentWorker.name}
            workerTier={currentWorker.tier}
            onClose={() => setShowDailyQuizModal(false)}
            onCompleteQuiz={handleCompleteQuiz}
          />
        )}

        {showChecklistModal && currentWorker && (
          <ChecklistDetailModal
            streakDays={currentWorker.streakDays}
            workerRole={currentWorker.role}
            workerDivision={currentWorker.division}
            onClose={() => setShowChecklistModal(false)}
            onCompleteChecklist={handleCompleteChecklist}
          />
        )}

        {showProfilePicModal && currentWorker && (
          <ProfilePictureModal
            currentAvatar={currentWorker.avatar}
            workerName={currentWorker.name}
            workerId={currentWorker.id}
            onClose={() => setShowProfilePicModal(false)}
            onSaveAvatar={handleSaveAvatar}
          />
        )}

        {tierUpData && (
          <TierUpToast
            oldTier={tierUpData.oldTier}
            newTier={tierUpData.newTier}
            pointsAwarded={tierUpData.pointsAwarded}
            onDismiss={() => setTierUpData(null)}
          />
        )}

        {matrixAuditWorker && (
          <CompetencyAuditModal
            worker={matrixAuditWorker}
            initialScores={matrixInitialScores}
            onClose={() => setMatrixAuditWorker(null)}
            onSaveScores={handleSaveMatrixScores}
          />
        )}

        {currentWorker && currentWorker.mustChangePassword && (
          <FirstTimePasswordModal
            worker={currentWorker}
            onSuccess={(updatedWorker) => setCurrentWorker(updatedWorker)}
          />
        )}

        {showIncidentModal && currentWorker && (
          <IncidentReportModal
            workerId={currentWorker.id}
            workerName={currentWorker.name}
            onClose={() => setShowIncidentModal(false)}
            onSuccess={(report) => {
              setShowIncidentModal(false);
              logActivity(currentWorker.id, currentWorker.name, 'incident_reported', `Jenis: ${report.incidentType} · Lokasi: ${report.location}`).catch(() => {});
            }}
          />
        )}

        {currentWorker && (
          <WorkerHistoryCenterModal
            isOpen={showHistoryCenterModal}
            onClose={() => setShowHistoryCenterModal(false)}
            workerId={currentWorker.id}
            workerName={currentWorker.name}
          />
        )}

        {showCompetencyModal && currentWorker && (
          <WorkerCompetencyModal
            worker={currentWorker}
            competencyScores={matrixInitialScores}
            onClose={() => setShowCompetencyModal(false)}
          />
        )}

        {showSopModal && currentWorker && (
          <SopLibraryModal
            workerId={currentWorker.id}
            workerName={currentWorker.name}
            workerDivision={currentWorker.division}
            workerRole={currentWorker.role}
            onClose={() => setShowSopModal(false)}
            onRewardEarned={(points, message) => {
              if (currentWorker) {
                loadDataForWorker(currentWorker.id);
              }
            }}
          />
        )}

        {showOnboarding && currentWorker && (
          <OnboardingModal
            workerName={currentWorker.name}
            onClose={() => {
              localStorage.setItem('komar_onboarding_done', 'true');
              setShowOnboarding(false);
            }}
          />
        )}

        {currentWorker && (
          <KudoModal 
            isOpen={showKudoModal} 
            onClose={() => setShowKudoModal(false)} 
            currentWorkerId={currentWorker.id} 
          />
        )}

        {currentWorker && (
          <ShiftHandoverModal
            isOpen={showShiftHandoverModal}
            onClose={() => setShowShiftHandoverModal(false)}
            currentWorkerId={currentWorker.id}
          />
        )}

        {currentWorker && (
          <KaizenSubmissionModal
            isOpen={showKaizenModal}
            onClose={() => setShowKaizenModal(false)}
            currentWorkerId={currentWorker.id}
            currentWorkerName={currentWorker.name}
            onSubmitted={() => {
              loadDataForWorker(currentWorker.id);
            }}
          />
        )}

        {currentWorker && unacknowledgedHandovers.length > 0 && (
          <AcknowledgeHandoverModal
            handovers={unacknowledgedHandovers}
            currentWorkerId={currentWorker.id}
            onAllAcknowledged={() => setUnacknowledgedHandovers([])}
          />
        )}

        {showDigitalIdModal && currentWorker && (
          <WorkerDigitalIdModal
            isOpen={showDigitalIdModal}
            onClose={() => setShowDigitalIdModal(false)}
            worker={currentWorker}
          />
        )}

        {showWorkerSioModal && currentWorker && (
          <WorkerSioUploadModal
            isOpen={showWorkerSioModal}
            onClose={() => setShowWorkerSioModal(false)}
            worker={currentWorker}
            onSuccess={(newLic) => {
              setWorkerLicense(newLic);
              if (currentWorker) {
                loadDataForWorker(currentWorker.id);
              }
            }}
          />
        )}

        <OfflineQueueDrawer />
      </React.Suspense>

    </div>
  );
};
