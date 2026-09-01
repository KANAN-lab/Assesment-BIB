import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Navbar } from './components/Navbar';
import { BibRadarChart } from './components/BibRadarChart';
import { DailyQuestModal } from './components/DailyQuestModal';
import { ChecklistDetailModal } from './components/ChecklistDetailModal';
import { RewardMarketplace } from './components/RewardMarketplace';
import { LeaderboardSection } from './components/LeaderboardSection';
import { SupervisorConsole } from './components/SupervisorConsole';
import { LoginModal } from './components/LoginModal';
import { CompetencyAuditModal } from './components/CompetencyAuditModal';
import { AdminConsole } from './components/AdminConsole';
import { ProfilePictureModal } from './components/ProfilePictureModal';
import { ScoreHistoryChart } from './components/ScoreHistoryChart';
import { TierUpToast } from './components/TierUpToast';
import { FirstTimePasswordModal } from './components/FirstTimePasswordModal';
import { LazySkeletonBoundary } from './components/LazySkeletonBoundary';
import { WorkerAvatar } from './components/WorkerAvatar';
import { AnnouncementBanner } from './components/AnnouncementBanner';
import { BadgeShowcase } from './components/BadgeShowcase';
import { IncidentReportModal } from './components/IncidentReportModal';
import { SopLibraryModal } from './components/SopLibraryModal';
import { OnboardingModal } from './components/OnboardingModal';
import { PerformanceSummaryCard } from './components/PerformanceSummaryCard';
import { WorkerCompetencyModal } from './components/WorkerCompetencyModal';
import { WorkerIncidentHistory } from './components/WorkerIncidentHistory';

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

import { WorkerProfile, RewardItem, RewardHistory, AuditInput, LeaderboardEntry, ScoreHistoryEntry, TierType, Announcement, WorkerBadge, Badge, IncidentReport } from './types/assessment';
import { RoleEntity } from './domain/RoleEntity';
import { WorkerEntity } from './domain/WorkerEntity';

import { Zap, ShieldCheck, Flame, Coins, Trophy, CheckCircle2, AlertCircle, Loader2, Camera, ShieldAlert, BookOpen } from 'lucide-react';

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
  const [showWorkerIncidentHistory, setShowWorkerIncidentHistory] = useState(false);
  const [showCompetencyModal, setShowCompetencyModal] = useState(false);
  const [showSopModal, setShowSopModal] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
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

      // Load announcements & badges
      fetchAnnouncements(true).then(setAnnouncements).catch(() => {});
      fetchWorkerBadges(worker.id).then(setWorkerBadges).catch(() => {});
      fetchAllBadges().then(setAllBadges).catch(() => {});

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

    const basePoints = 30;
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

        {activeView === 'worker' ? (
          <div className="space-y-6 animate-fade-in">

            {/* Worker Profile Header */}
            <div className="card p-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5">

                {/* Identity */}
                <div className="flex items-center gap-4">
                  <div
                    className="relative shrink-0 group cursor-pointer"
                    onClick={() => setShowProfilePicModal(true)}
                    title="Klik untuk ganti foto profil"
                  >
                    <WorkerAvatar
                      src={currentWorker.avatar}
                      name={currentWorker.name}
                      className="w-14 h-14 rounded-xl ring-1 ring-zinc-700 group-hover:ring-emerald-500 transition"
                    />
                    <div className="absolute inset-0 bg-black/40 rounded-xl opacity-0 group-hover:opacity-100 flex items-center justify-center transition">
                      <Camera className="w-4 h-4 text-white" />
                    </div>
                    <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-amber-500 rounded-md flex items-center justify-center shadow">
                      <Trophy className="w-3 h-3 text-zinc-950" />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-base font-black text-white">{currentWorker.name}</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${
                        currentWorker.tier.includes('Champion') ? 'tier-legendary' :
                        currentWorker.tier.includes('Elite')    ? 'tier-elite' :
                        currentWorker.tier.includes('Pro')      ? 'tier-pro' : 'tier-novice'
                      }`}>{currentWorker.tier}</span>
                    </div>
                    <p className="text-xs text-zinc-500 mt-0.5">
                      {currentWorker.employeeId} · {currentWorker.role} · {currentWorker.division}
                    </p>
                    <div className="flex items-center gap-3 mt-2 text-[11px]">
                      <span className="text-amber-400 font-bold flex items-center gap-1">
                        <Flame className="w-3 h-3" />{currentWorker.streakDays} hari
                      </span>
                      <span className="text-zinc-700">·</span>
                      <span className="text-emerald-400 font-bold flex items-center gap-1">
                        <Coins className="w-3 h-3" />{currentWorker.totalPoints.toLocaleString()} poin
                      </span>
                      <span className="text-zinc-700">·</span>
                      <span className="font-bold text-white">
                        BIB {currentWorker.bibScores.totalScore.toFixed(1)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Daily Actions */}
                <div className="flex gap-2 flex-wrap">
                  <button
                    onClick={() => setShowDailyQuizModal(true)}
                    disabled={currentWorker.dailyQuizCompleted}
                    className={`px-4 py-2.5 rounded-xl font-bold text-xs transition flex items-center gap-2 ${
                      currentWorker.dailyQuizCompleted
                        ? 'bg-zinc-900 border border-zinc-800 text-zinc-600 cursor-default'
                        : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                    }`}
                  >
                    <Zap className={`w-3.5 h-3.5 ${currentWorker.dailyQuizCompleted ? 'text-zinc-700' : 'text-emerald-100'}`} />
                    {currentWorker.dailyQuizCompleted ? 'Kuis Selesai' : 'Kuis Safety +50'}
                    {currentWorker.dailyQuizCompleted && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />}
                  </button>

                  <button
                    onClick={() => setShowChecklistModal(true)}
                    disabled={currentWorker.preShiftChecklistDone}
                    className={`px-4 py-2.5 rounded-xl font-bold text-xs transition flex items-center gap-2 ${
                      currentWorker.preShiftChecklistDone
                        ? 'bg-zinc-900 border border-zinc-800 text-zinc-600 cursor-default'
                        : 'bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-200'
                    }`}
                  >
                    <ShieldCheck className={`w-3.5 h-3.5 ${currentWorker.preShiftChecklistDone ? 'text-zinc-700' : 'text-cyan-400'}`} />
                    {currentWorker.preShiftChecklistDone ? 'Checklist OK' : 'Pre-Shift +30'}
                    {currentWorker.preShiftChecklistDone && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />}
                  </button>

                  <button
                    onClick={() => setShowSopModal(true)}
                    className="px-4 py-2.5 rounded-xl font-bold text-xs bg-purple-950/70 hover:bg-purple-900/80 border border-purple-500/40 text-purple-300 transition flex items-center gap-2"
                    title="Buka Pustaka SOP Micro-Deck & K3 Academy"
                  >
                    <BookOpen className="w-3.5 h-3.5 text-purple-400" />
                    SOP Micro-Deck
                  </button>

                  <button
                    onClick={() => setShowIncidentModal(true)}
                    className="px-4 py-2.5 rounded-xl font-bold text-xs bg-orange-950/70 hover:bg-orange-900/80 border border-orange-500/40 text-orange-300 transition flex items-center gap-2"
                    title="Laporkan Insiden / Near-Miss K3 Logistik"
                  >
                    <ShieldAlert className="w-3.5 h-3.5 text-orange-400" />
                    Laporan Insiden K3
                  </button>

                  <button
                    onClick={() => setShowWorkerIncidentHistory(true)}
                    className="px-3.5 py-2.5 rounded-xl font-bold text-xs bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-300 transition flex items-center gap-2"
                    title="Lihat riwayat laporan insiden yang pernah dibuat"
                  >
                    <ShieldAlert className="w-3.5 h-3.5 text-zinc-400" />
                    Riwayat Saya
                  </button>
                </div>
              </div>
            </div>

            {/* Announcement Banner */}
            {announcements.length > 0 && <AnnouncementBanner announcements={announcements} />}

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

          </div>
        ) : activeView === 'supervisor' ? (
          <div className="animate-fade-in">
            <SupervisorConsole
              workers={allWorkers}
              onUpdateWorkerScore={handleUpdateWorkerScore}
              onOpenMatrixAudit={handleOpenMatrixAudit}
            />
          </div>
        ) : (
          <div className="animate-fade-in">
            <AdminConsole
              workers={allWorkers}
              currentAdminId={currentWorker?.id}
              onApproveWorker={handleApproveWorker}
              onRejectWorker={handleRejectWorker}
              rewardCatalog={rewardCatalog}
              onCreateReward={handleCreateReward}
              onUpdateReward={handleUpdateReward}
              onRestockReward={handleRestockReward}
              onDeleteReward={handleDeleteReward}
            />
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

      {showWorkerIncidentHistory && currentWorker && (
        <WorkerIncidentHistory
          workerId={currentWorker.id}
          workerName={currentWorker.name}
          onClose={() => setShowWorkerIncidentHistory(false)}
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

    </div>
  );
};
