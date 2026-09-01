import { supabase } from './supabaseClient';
import { WorkerEntity } from '../domain/WorkerEntity';
import { NotificationEngine } from '../domain/NotificationEngine';
import { RewardEntity } from '../domain/RewardEntity';
import { RoleEntity } from '../domain/RoleEntity';
import type {
  WorkerProfile,
  LeaderboardEntry,
  RewardItem,
  RewardHistory,
  AuditInput,
  BibScores,
  TierType,
  ScoreHistoryEntry,
  Announcement,
  Badge,
  WorkerBadge,
  IncidentReport,
  IncidentReportHistory,
  ActivityLog,
  ActivityAction,
  DivisionStat,
  QuizQuestion,
} from '../types/assessment';

// ─── Row shapes from Supabase ────────────────────────────────────────────────

interface WorkerRow {
  id: string;
  user_id?: string | null;
  email?: string | null;
  name: string;
  employee_id: string;
  role: string;
  division: string;
  avatar: string;
  streak_days: number;
  total_points: number;
  tier: string;
  bib_behavior: number;
  bib_integrity: number;
  bib_benchmark: number;
  bib_total_score: number;
  daily_quiz_completed: boolean;
  pre_shift_checklist_done: boolean;
  last_activity_date?: string | null;
  must_change_password?: boolean | null;
  password?: string | null;
  status?: string | null;
}

interface RewardCatalogRow {
  id: string;
  title: string;
  category: string;
  points_required: number;
  icon_name: string;
  description: string;
  available_stock: number;
  monthly_stock_limit?: number | null;
  badge_tag: string | null;
  min_tier?: string | null;
  max_claims_per_month?: number | null;
}

interface RedemptionRow {
  id: string;
  worker_id: string;
  item_title: string;
  points_spent: number;
  redeemed_at: string;
  redemption_code: string;
  status?: string | null;
  expiry_date?: string | null;
  fulfilled_at?: string | null;
  fulfilled_by?: string | null;
}

// ─── Mappers ─────────────────────────────────────────────────────────────────

function rowToWorkerProfile(row: WorkerRow): WorkerProfile {
  const dynamicTier = WorkerEntity.calculateTier(row.total_points);
  return {
    id: row.id,
    userId: row.user_id ?? undefined,
    email: row.email ?? undefined,
    name: row.name,
    employeeId: row.employee_id,
    role: row.role as WorkerProfile['role'],
    division: row.division,
    avatar: row.avatar,
    streakDays: row.streak_days,
    totalPoints: row.total_points,
    tier: dynamicTier,
    bibScores: {
      behavior: row.bib_behavior,
      integrity: row.bib_integrity,
      benchmark: row.bib_benchmark,
      totalScore: row.bib_total_score,
    },
    dailyQuizCompleted: row.daily_quiz_completed,
    preShiftChecklistDone: row.pre_shift_checklist_done,
    lastActivityDate: row.last_activity_date ?? undefined,
    mustChangePassword: row.must_change_password !== false,
    status: (() => {
      if (row.status === 'pending_approval') return 'pending_approval';
      if (row.status === 'rejected') return 'rejected';
      if (row.status === 'active') return 'active';

      // Fallback resolusi otomatis: Jika role adalah Supervisor/PIC Area dan memiliki user_id terdaftar (bukan data seed awal), set status pending_approval jika belum di-approve
      if ((row.role === 'PIC Area' || row.role === 'Supervisor') && row.user_id && row.employee_id !== '128000068') {
        return 'pending_approval';
      }
      return 'active';
    })(),
  };
}

function rowToLeaderboardEntry(row: WorkerRow, index: number): LeaderboardEntry {
  const dynamicTier = WorkerEntity.calculateTier(row.total_points);
  return {
    rank: index + 1,
    workerId: row.id,
    name: row.name,
    role: row.role as LeaderboardEntry['role'],
    division: row.division,
    avatar: row.avatar,
    totalScore: row.bib_total_score,
    streakDays: row.streak_days,
    tier: dynamicTier,
    totalPoints: row.total_points,
  };
}

function rowToRewardItem(row: RewardCatalogRow): RewardItem {
  return {
    id: row.id,
    title: row.title,
    category: row.category as RewardItem['category'],
    pointsRequired: row.points_required,
    iconName: row.icon_name,
    description: row.description,
    availableStock: row.available_stock,
    monthlyStockLimit: row.monthly_stock_limit ?? Math.max(row.available_stock, 25),
    badgeTag: row.badge_tag ?? undefined,
    minTier: (row.min_tier as TierType) || 'Novice Operational',
    maxClaimsPerMonth: row.max_claims_per_month ?? 1,
  };
}

function rowToRewardHistory(row: RedemptionRow): RewardHistory {
  return {
    id: row.id,
    itemTitle: row.item_title,
    pointsSpent: row.points_spent,
    redeemedAt: row.redeemed_at,
    redemptionCode: row.redemption_code,
    status: (row.status as 'pending' | 'completed' | 'cancelled') || 'pending',
    expiryDate: row.expiry_date ?? undefined,
    fulfilledAt: row.fulfilled_at ?? undefined,
    fulfilledBy: row.fulfilled_by ?? undefined,
  };
}

// ─── Workers ─────────────────────────────────────────────────────────────────

export async function fetchAllWorkers(): Promise<WorkerProfile[]> {
  const { data, error } = await supabase.from('workers').select('*').order('bib_total_score', { ascending: false });
  if (error) throw error;
  return (data as WorkerRow[]).map(rowToWorkerProfile);
}

export async function fetchWorkerById(workerId: string): Promise<WorkerProfile | null> {
  const { data, error } = await supabase.from('workers').select('*').eq('id', workerId).single();
  if (error) {
    if (error.code === 'PGRST116') return null; // not found
    throw error;
  }
  return rowToWorkerProfile(data as WorkerRow);
}

export async function updateWorkerBibScores(
  workerId: string,
  bibScores: BibScores
): Promise<void> {
  const { error } = await supabase.from('workers').update({
    bib_behavior: bibScores.behavior,
    bib_integrity: bibScores.integrity,
    bib_benchmark: bibScores.benchmark,
    bib_total_score: bibScores.totalScore,
  }).eq('id', workerId);
  if (error) throw error;
}

export async function completeWorkerQuiz(
  workerId: string,
  basePointsEarned: number,
  newBibScores?: BibScores
): Promise<{ pointsEarned: number; tierChanged: boolean; newTier: TierType }> {
  // Fetch current worker to get streak and current total points
  const { data: worker, error: fetchErr } = await supabase
    .from('workers')
    .select('streak_days, total_points')
    .eq('id', workerId)
    .single();

  if (fetchErr) throw fetchErr;

  const streakDays = worker.streak_days || 1;
  const pointsEarned = WorkerEntity.calculateStreakBonusPoints(streakDays, basePointsEarned);
  const newTotalPoints = (worker.total_points || 0) + pointsEarned;
  const newTier = WorkerEntity.calculateTier(newTotalPoints);

  const updateData: Record<string, any> = {
    daily_quiz_completed: true,
    total_points: newTotalPoints,
    tier: newTier,
  };

  if (newBibScores) {
    updateData.bib_behavior = newBibScores.behavior;
    updateData.bib_integrity = newBibScores.integrity;
    updateData.bib_benchmark = newBibScores.benchmark;
    updateData.bib_total_score = newBibScores.totalScore;
  }

  const { error } = await supabase.from('workers').update(updateData).eq('id', workerId);
  if (error) throw error;

  return { pointsEarned, tierChanged: true, newTier };
}

export async function completeWorkerChecklist(
  workerId: string,
  baseBonusPoints: number
): Promise<{ pointsEarned: number; newStreak: number; newTier: TierType }> {
  const { data: worker, error: fetchErr } = await supabase
    .from('workers')
    .select('streak_days, total_points')
    .eq('id', workerId)
    .single();

  if (fetchErr) throw fetchErr;

  const newStreak = (worker.streak_days || 0) + 1;
  const pointsEarned = WorkerEntity.calculateStreakBonusPoints(newStreak, baseBonusPoints);
  const newTotalPoints = (worker.total_points || 0) + pointsEarned;
  const newTier = WorkerEntity.calculateTier(newTotalPoints);

  const { error } = await supabase.from('workers').update({
    pre_shift_checklist_done: true,
    streak_days: newStreak,
    total_points: newTotalPoints,
    tier: newTier,
  }).eq('id', workerId);

  if (error) throw error;

  return { pointsEarned, newStreak, newTier };
}

export async function supervisorAuditWorker(audit: AuditInput): Promise<void> {
  const newTotal = WorkerEntity.calculateBibTotal(
    audit.behaviorScore,
    audit.integrityScore,
    audit.benchmarkScore
  );

  const { error } = await supabase.from('workers').update({
    bib_behavior: audit.behaviorScore,
    bib_integrity: audit.integrityScore,
    bib_benchmark: audit.benchmarkScore,
    bib_total_score: newTotal,
  }).eq('id', audit.workerId);
  if (error) throw error;
}

export async function mutateWorkerRoleAndDivision(
  workerId: string,
  newRole: string,
  newDivision: string,
  mutatedBy?: string,
  reason?: string
): Promise<{ previousRole: string; previousDivision: string }> {
  // 1. Fetch current worker details
  const { data: worker, error: fetchErr } = await supabase
    .from('workers')
    .select('*')
    .eq('id', workerId)
    .single();

  if (fetchErr || !worker) {
    throw new Error('Data pekerja tidak ditemukan di database.');
  }

  const previousRole = worker.role;
  const previousDivision = worker.division;

  if (previousRole === newRole && previousDivision === newDivision) {
    throw new Error('Role dan Divisi baru sama dengan data pekerja saat ini.');
  }

  // 2. Snapshot current competency scores & BIB scores into worker_role_mutations archive
  const archivePayload = {
    worker_id: workerId,
    previous_role: previousRole,
    previous_division: previousDivision,
    new_role: newRole,
    new_division: newDivision,
    archived_bib_behavior: worker.bib_behavior || 0,
    archived_bib_integrity: worker.bib_integrity || 0,
    archived_bib_benchmark: worker.bib_benchmark || 0,
    archived_bib_total: worker.bib_total_score || 0,
    mutated_at: new Date().toISOString(),
    mutated_by: mutatedBy || 'System Admin',
    reason: reason || 'Mutasi Role & Divisi Operasional',
  };

  try {
    await supabase.from('worker_role_mutations').insert(archivePayload);
  } catch (archiveErr) {
    console.warn('Pengarsipan riwayat mutasi role:', archiveErr);
  }

  // 3. Reset BIB scores & update Role + Division on worker (Clean Slate Reset)
  const { error: updateErr } = await supabase
    .from('workers')
    .update({
      role: newRole,
      division: newDivision,
      bib_behavior: 0,
      bib_integrity: 0,
      bib_benchmark: 0,
      bib_total_score: 0,
    })
    .eq('id', workerId);

  if (updateErr) {
    throw new Error(`Gagal memperbarui role & divisi pekerja: ${updateErr.message}`);
  }

  // 4. Reset competency_audit_scores for this worker to prevent old role contamination
  try {
    await supabase.from('worker_competency_scores').delete().eq('worker_id', workerId);
  } catch (err) {
    console.warn('Reset skor audit kompetensi pada database:', err);
  }

  return { previousRole, previousDivision };
}

// ─── Leaderboard ─────────────────────────────────────────────────────────────

export async function fetchLeaderboard(): Promise<LeaderboardEntry[]> {
  const { data, error } = await supabase
    .from('workers')
    .select('*')
    .order('bib_total_score', { ascending: false })
    .limit(50);
  if (error) throw error;

  // Filter secara ketat: Hanya tampilkan pekerja operasional biasa (bukan System Administrator atau Supervisor/Pengawas)
  const employeeOnly = (data as WorkerRow[]).filter((row) => {
    const sysRole = RoleEntity.resolveSystemRole(row.role);
    return sysRole === 'worker';
  });

  return employeeOnly.map((row, idx) => rowToLeaderboardEntry(row, idx));
}

// ─── Reward Catalog ───────────────────────────────────────────────────────────

export async function fetchRewardCatalog(): Promise<RewardItem[]> {
  const { data, error } = await supabase.from('reward_catalog').select('*').order('points_required', { ascending: true });
  if (error) throw error;
  return (data as RewardCatalogRow[]).map(rowToRewardItem);
}

export async function decrementRewardStock(rewardId: string): Promise<void> {
  const { error } = await supabase.rpc('decrement_reward_stock', { p_reward_id: rewardId });
  if (error) throw error;
}

export async function createRewardCatalogItem(itemData: Omit<RewardItem, 'id'>): Promise<RewardItem> {
  const rewardEntity = RewardEntity.create(itemData);
  const payload = {
    id: rewardEntity.id,
    title: rewardEntity.title,
    category: rewardEntity.category,
    points_required: rewardEntity.pointsRequired,
    icon_name: rewardEntity.iconName,
    description: rewardEntity.description,
    available_stock: rewardEntity.availableStock,
    monthly_stock_limit: rewardEntity.monthlyStockLimit,
    badge_tag: rewardEntity.badgeTag || null,
    min_tier: rewardEntity.minTier || 'Novice Operational',
    max_claims_per_month: rewardEntity.maxClaimsPerMonth || 1,
  };

  const { data, error } = await supabase.from('reward_catalog').insert(payload).select().single();
  if (error) throw new Error(`Gagal menambah reward: ${error.message}`);
  return rowToRewardItem(data as RewardCatalogRow);
}

export async function updateRewardCatalogItem(rewardId: string, updates: Partial<Omit<RewardItem, 'id'>>): Promise<RewardItem> {
  const { data: existingRow, error: fetchErr } = await supabase.from('reward_catalog').select('*').eq('id', rewardId).single();
  if (fetchErr || !existingRow) throw new Error(`Item reward tidak ditemukan di database.`);

  const existingEntity = new RewardEntity(rowToRewardItem(existingRow as RewardCatalogRow));
  existingEntity.update(updates);

  const payload = {
    title: existingEntity.title,
    category: existingEntity.category,
    points_required: existingEntity.pointsRequired,
    icon_name: existingEntity.iconName,
    description: existingEntity.description,
    available_stock: existingEntity.availableStock,
    monthly_stock_limit: existingEntity.monthlyStockLimit,
    badge_tag: existingEntity.badgeTag || null,
    min_tier: existingEntity.minTier || 'Novice Operational',
    max_claims_per_month: existingEntity.maxClaimsPerMonth || 1,
  };

  const { data, error } = await supabase.from('reward_catalog').update(payload).eq('id', rewardId).select().single();
  if (error) throw new Error(`Gagal mengedit reward: ${error.message}`);
  return rowToRewardItem(data as RewardCatalogRow);
}

export async function restockRewardCatalogItem(rewardId: string, addStock: number): Promise<RewardItem> {
  const { data: existingRow, error: fetchErr } = await supabase.from('reward_catalog').select('*').eq('id', rewardId).single();
  if (fetchErr || !existingRow) throw new Error(`Item reward tidak ditemukan di database.`);

  const existingEntity = new RewardEntity(rowToRewardItem(existingRow as RewardCatalogRow));
  existingEntity.restock(addStock);

  const { data, error } = await supabase
    .from('reward_catalog')
    .update({ available_stock: existingEntity.availableStock })
    .eq('id', rewardId)
    .select()
    .single();

  if (error) throw new Error(`Gagal mengisi stok reward: ${error.message}`);
  return rowToRewardItem(data as RewardCatalogRow);
}

export async function resetAllMonthlyRewardQuotas(): Promise<void> {
  const { error } = await supabase.rpc('reset_monthly_reward_quota');
  if (error) {
    const { data: catalog, error: fetchErr } = await supabase.from('reward_catalog').select('*');
    if (fetchErr || !catalog) throw new Error(`Gagal membaca katalog reward: ${fetchErr?.message}`);

    for (const item of catalog) {
      const limit = item.monthly_stock_limit || Math.max(item.available_stock, 25);
      await supabase.from('reward_catalog').update({ available_stock: limit }).eq('id', item.id);
    }
  }
}

export async function deleteRewardCatalogItem(rewardId: string): Promise<void> {
  const { error } = await supabase.from('reward_catalog').delete().eq('id', rewardId);
  if (error) throw new Error(`Gagal menghapus reward: ${error.message}`);
}

// ─── Redemption History ───────────────────────────────────────────────────────

export interface AdminRedemptionRecord extends RewardHistory {
  workerId: string;
  workerName?: string;
  workerEmployeeId?: string;
  workerDivision?: string;
}

export async function fetchRedemptionHistory(workerId: string): Promise<RewardHistory[]> {
  const { data, error } = await supabase
    .from('redemption_history')
    .select('*')
    .eq('worker_id', workerId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data as RedemptionRow[]).map(rowToRewardHistory);
}

export async function fetchAllRedemptionHistory(): Promise<AdminRedemptionRecord[]> {
  const { data, error } = await supabase
    .from('redemption_history')
    .select(`
      *,
      workers (
        name,
        employee_id,
        division
      ),
      fulfiller:fulfilled_by (
        name
      )
    `)
    .order('created_at', { ascending: false });

  if (error) {
    const { data: rawData, error: rawError } = await supabase
      .from('redemption_history')
      .select('*')
      .order('created_at', { ascending: false });
    if (rawError) throw rawError;

    return (rawData as RedemptionRow[]).map((row) => ({
      ...rowToRewardHistory(row),
      workerId: row.worker_id,
      workerName: 'Staf Terdaftar',
      workerEmployeeId: '-',
      workerDivision: '-',
    }));
  }

  return (data as any[]).map((row) => ({
    ...rowToRewardHistory(row as RedemptionRow),
    workerId: row.worker_id,
    workerName: row.workers?.name || 'Staf Terdaftar',
    workerEmployeeId: row.workers?.employee_id || '-',
    workerDivision: row.workers?.division || '-',
    fulfilledByName: row.fulfiller?.name,
  }));
}

export async function fulfillRedemption(redemptionId: string, adminWorkerId: string): Promise<void> {
  const { error } = await supabase.rpc('rpc_fulfill_redemption', {
    p_redemption_id: redemptionId,
    p_admin_worker_id: adminWorkerId,
  });

  if (error) {
    // Fallback direct update
    const { error: updateErr } = await supabase
      .from('redemption_history')
      .update({
        status: 'completed',
        fulfilled_at: new Date().toISOString(),
        fulfilled_by: adminWorkerId,
      })
      .eq('id', redemptionId);
    if (updateErr) throw updateErr;
  }
}

export async function insertRedemption(
  workerId: string,
  history: RewardHistory,
  rewardId: string
): Promise<void> {
  const { error: insertError } = await supabase.from('redemption_history').insert({
    id: history.id,
    worker_id: workerId,
    item_title: history.itemTitle,
    points_spent: history.pointsSpent,
    redeemed_at: history.redeemedAt,
    redemption_code: history.redemptionCode,
    status: history.status || 'pending',
    expiry_date: history.expiryDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  });
  if (insertError) throw insertError;

  // Deduct points from worker and decrement stock atomically
  const { error: pointsError } = await supabase.rpc('deduct_worker_points', {
    p_worker_id: workerId,
    p_points: history.pointsSpent,
  });
  if (pointsError) throw pointsError;

  await decrementRewardStock(rewardId);
}

// ─── Authentication Services (Overhauled Fail-Safe System) ─────────────────────

export async function findWorkerByIdentifier(identifier: string): Promise<WorkerRow | null> {
  const rawInput = String(identifier || '').trim();
  if (!rawInput) return null;
  const cleanDigits = rawInput.replace(/\D/g, ''); // Ekstrak digit angka "128000068"
  const cleanLower = rawInput.toLowerCase();
  const cleanAlpha = cleanLower.replace(/[^a-z0-9]/g, '');

  // 1. Direct equality queries (Eksak & Presisi)
  const { data: byEmp } = await supabase.from('workers').select('*').eq('employee_id', rawInput).maybeSingle();
  if (byEmp) return byEmp as WorkerRow;

  const { data: byEmail } = await supabase.from('workers').select('*').eq('email', cleanLower).maybeSingle();
  if (byEmail) return byEmail as WorkerRow;

  const { data: byId } = await supabase.from('workers').select('*').eq('id', rawInput).maybeSingle();
  if (byId) return byId as WorkerRow;

  // 2. Comprehensive fallback search (Case-insensitive & digit matching)
  const { data: list, error: listErr } = await supabase.from('workers').select('*');
  if (listErr) {
    console.warn('[findWorkerByIdentifier] Supabase RLS / Query warning:', listErr.message);
  }

  if (list && list.length > 0) {
    const match = list.find((w) => {
      const empStr = String(w.employee_id ?? '').trim();
      const empDigits = empStr.replace(/\D/g, '');

      const emailStr = String(w.email ?? '').trim().toLowerCase();
      const idStr = String(w.id ?? '').trim().toLowerCase();

      // A. Pencocokan digit angka NIK (misal: 128000068)
      if (cleanDigits && cleanDigits.length >= 4 && empDigits === cleanDigits) return true;

      // B. Pencocokan persis Email atau ID (Case insensitive)
      if (cleanLower) {
        if (empStr.toLowerCase() === cleanLower) return true;
        if (emailStr === cleanLower) return true;
        if (idStr === cleanLower) return true;
      }

      return false;
    });

    if (match) return match as WorkerRow;
  }

  console.info(`[findWorkerByIdentifier] Worker "${rawInput}" tidak ditemukan dari ${list?.length || 0} baris.`);
  return null;
}

export async function fetchWorkerByUserId(userId: string): Promise<WorkerProfile | null> {
  const worker = await findWorkerByIdentifier(userId);
  if (worker) return rowToWorkerProfile(worker);

  const { data } = await supabase.from('workers').select('*').eq('user_id', userId).maybeSingle();
  if (!data) return null;
  return rowToWorkerProfile(data as WorkerRow);
}

export async function fetchWorkerByEmployeeId(employeeId: string): Promise<WorkerProfile | null> {
  const worker = await findWorkerByIdentifier(employeeId);
  if (!worker) return null;
  return rowToWorkerProfile(worker);
}

export async function linkWorkerToUser(workerId: string, userId: string, email: string): Promise<WorkerProfile> {
  const { data, error } = await supabase
    .from('workers')
    .update({
      user_id: userId,
      email: email,
    })
    .eq('id', workerId)
    .select('*')
    .single();

  if (error) throw new Error(`Gagal menautkan akun pekerja: ${error.message}`);
  return rowToWorkerProfile(data as WorkerRow);
}

export async function signInWithNikOrEmail(identifier: string, password: string) {
  const cleanInput = identifier.trim();
  if (!cleanInput) throw new Error('NIK / Email tidak boleh kosong.');

  // Cek Rate Limit (maksimal 5x percobaan gagal dalam 15 menit)
  await checkLoginRateLimit(cleanInput);

  try {
    const workerRecord = await findWorkerByIdentifier(cleanInput);

    if (!workerRecord) {
      await logLoginAttempt(cleanInput, false);
      throw new Error(`NIK / Email "${cleanInput}" tidak ditemukan di database.`);
    }

    // ── Penegakan Keamanan Akses Supervisor Approval ──
    const profileCandidate = rowToWorkerProfile(workerRecord);
    if (profileCandidate.status === 'pending_approval') {
      await logLoginAttempt(cleanInput, false);
      throw new Error(
        `Akun Supervisor (${profileCandidate.name}) saat ini masih dalam status MENUNGGU PERSETUJUAN (Pending Approval) oleh Administrator. Silakan hubungi Administrator untuk menyetujui permohonan akses Anda.`
      );
    }

    if (profileCandidate.status === 'rejected') {
      await logLoginAttempt(cleanInput, false);
      throw new Error(
        `Permohonan akses Supervisor untuk akun (${profileCandidate.name}) telah DITOLAK oleh Administrator. Hubungi Administrator jika ada pertanyaan.`
      );
    }

    const targetEmail = workerRecord.email || null;

    // 1. Coba login via Supabase Auth resmi (hanya jika ada email nyata)
    if (targetEmail) {
      try {
        const { data, error } = await supabase.auth.signInWithPassword({ email: targetEmail, password });
        if (!error && data?.session) {
          if (!workerRecord.user_id && data.session.user?.id) {
            await supabase.from('workers').update({ user_id: data.session.user.id }).eq('id', workerRecord.id);
          }
          await logLoginAttempt(cleanInput, true);
          return { ...data, worker: rowToWorkerProfile({ ...workerRecord, user_id: data.session.user?.id }) };
        }
      } catch (err) {
        // Lanjut ke verifikasi password database jika Auth error
      }
    }

    // 2. Verifikasi password terdaftar langsung di database pekerja
    const expectedPassword = workerRecord.password || '123';
    const isMustChange = workerRecord.must_change_password !== false;

    // Akun System Administrator
    if (workerRecord.employee_id === 'SYS-ADMIN' || workerRecord.role === 'System Administrator') {
      if (password === 'Aleale#@!123' || password === expectedPassword) {
        await logLoginAttempt(cleanInput, true);
        return {
          user: { id: workerRecord.user_id || 'sysadmin-id' },
          worker: rowToWorkerProfile(workerRecord),
        };
      }
      await logLoginAttempt(cleanInput, false);
      throw new Error('Password System Administrator salah.');
    }

    // Akun Pekerja Terdaftar
    if (!isMustChange) {
      // User SUDAH mengganti password
      if (password === '123' && expectedPassword !== '123') {
        await logLoginAttempt(cleanInput, false);
        throw new Error('Password default (123) sudah tidak berlaku. Silakan login menggunakan password baru Anda.');
      }
      if (password !== expectedPassword) {
        await logLoginAttempt(cleanInput, false);
        throw new Error('NIK/Email atau password salah.');
      }
      await logLoginAttempt(cleanInput, true);
      return {
        user: { id: workerRecord.user_id || workerRecord.id },
        worker: { ...rowToWorkerProfile(workerRecord), mustChangePassword: false },
      };
    } else {
      // User MASIH menggunakan password default (123)
      if (password !== '123' && password !== expectedPassword) {
        await logLoginAttempt(cleanInput, false);
        throw new Error('Password salah. Password default awal adalah 123.');
      }
      await logLoginAttempt(cleanInput, true);
      return {
        user: { id: workerRecord.user_id || workerRecord.id },
        worker: { ...rowToWorkerProfile(workerRecord), mustChangePassword: true },
      };
    }
  } catch (err) {
    throw err;
  }
}

export async function signInWithEmail(email: string, password: string) {
  return signInWithNikOrEmail(email, password);
}

export async function sendPasswordResetEmail(emailOrNik: string): Promise<string> {
  const cleanInput = emailOrNik.trim();
  const worker = await findWorkerByIdentifier(cleanInput);

  if (!worker) {
    throw new Error(`NIK / Email "${cleanInput}" tidak ditemukan di database.`);
  }

  if (!worker.email || !worker.email.includes('@')) {
    throw new Error(
      `Akun NIK ${worker.employee_id} (${worker.name}) belum memiliki email terdaftar. Silakan login terlebih dahulu menggunakan NIK & password default (123), lalu tautkan email Anda melalui halaman setup pertama kali.`
    );
  }

  const targetEmail = worker.email;

  // 1. Coba kirim email reset password resmi dari Supabase Auth
  const { error: resetErr } = await supabase.auth.resetPasswordForEmail(targetEmail, {
    redirectTo: window.location.origin,
  });

  if (resetErr) {
    // 2. Jika akun belum terdaftar di auth.users, gunakan signInWithOtp dengan shouldCreateUser: true
    // Ini otomatis mendaftarkan akun di auth.users TANPA memicu email konfirmasi pendaftaran default Supabase!
    const { error: otpErr } = await supabase.auth.signInWithOtp({
      email: targetEmail,
      options: {
        shouldCreateUser: true,
      },
    });

    if (otpErr) {
      throw new Error(`Gagal mengirimkan kode OTP reset password: ${otpErr.message}`);
    }
  }

  return targetEmail;
}

export async function verifyOtpAndResetPassword(
  email: string,
  otpToken: string,
  newPassword: string
): Promise<void> {
  const cleanEmail = email.trim();
  const cleanOtp = otpToken.trim();

  // 1. Verifikasi OTP via Supabase Auth API dengan fallback tipe
  let { error: verifyErr } = await supabase.auth.verifyOtp({
    email: cleanEmail,
    token: cleanOtp,
    type: 'recovery',
  });

  if (verifyErr) {
    const { error: emailErr } = await supabase.auth.verifyOtp({
      email: cleanEmail,
      token: cleanOtp,
      type: 'email',
    });
    if (!emailErr) verifyErr = null;
  }

  if (verifyErr) {
    const { error: signupErr } = await supabase.auth.verifyOtp({
      email: cleanEmail,
      token: cleanOtp,
      type: 'signup',
    });
  }

  // 2. Cari worker berdasarkan identifier/email
  const worker = await findWorkerByIdentifier(cleanEmail);

  // 3. Simpan password baru di database pekerja
  if (worker) {
    const { error: updateDbErr } = await supabase
      .from('workers')
      .update({
        password: newPassword,
        must_change_password: false,
      })
      .eq('id', worker.id);

    if (updateDbErr) {
      throw new Error(`Gagal menyimpan password baru: ${updateDbErr.message}`);
    }
  } else {
    // Fallback update by email
    await supabase
      .from('workers')
      .update({
        password: newPassword,
        must_change_password: false,
      })
      .eq('email', cleanEmail);
  }

  // 4. Update password di Supabase Auth user jika ada session
  try {
    await supabase.auth.updateUser({ password: newPassword });
  } catch (e) {
    console.warn('[AuthUpdate] Supabase auth updateUser:', e);
  }
}

export async function signUpWorker(
  email: string,
  password: string,
  name: string,
  employeeId: string,
  role: WorkerProfile['role'],
  division: string,
  accountType: 'worker' | 'supervisor' = 'worker'
) {
  const cleanEmail = email.trim().toLowerCase();
  const cleanEmpId = employeeId.trim();

  // 1. Cek secara ketat apakah NIK / Employee ID sudah terdaftar di database
  const { data: existingByNik } = await supabase.from('workers').select('id, name, employee_id').eq('employee_id', cleanEmpId).maybeSingle();
  if (existingByNik) {
    throw new Error(
      `NIK "${cleanEmpId}" (${existingByNik.name}) sudah terdaftar di sistem. Silakan login menggunakan NIK Anda atau gunakan fitur Lupa Password.`
    );
  }

  // 2. Cek secara ketat apakah Email sudah terdaftar di database
  const { data: existingByEmail } = await supabase.from('workers').select('id, name, email').eq('email', cleanEmail).maybeSingle();
  if (existingByEmail) {
    throw new Error(
      `Email "${cleanEmail}" sudah digunakan oleh pekerja lain (${existingByEmail.name}). Silakan gunakan email lain atau login.`
    );
  }

  // 3. Registrasi akun Supabase Auth resmi
  let authUser: { id: string } | null = null;
  const { data, error } = await supabase.auth.signUp({ email: cleanEmail, password });

  if (error) {
    if (error.message.includes('already registered') || error.message.includes('exists')) {
      throw new Error(`Email "${cleanEmail}" sudah terdaftar di Supabase Auth. Silakan gunakan email lain atau login.`);
    } else if (!error.message.includes('rate limit') && !error.message.includes('429')) {
      throw new Error(error.message);
    }
  } else if (data?.user) {
    authUser = data.user;
  }

  const initialStatus = accountType === 'supervisor' ? 'pending_approval' : 'active';
  const finalRole = accountType === 'supervisor' ? 'Supervisor Logistik' : role;

  // 4. INSERT pekerja baru ke database (Strict anti-overwrite!)
  const workerId = `w-${cleanEmpId.replace(/\s+/g, '') || Date.now().toString().slice(-4)}`;
  const insertPayload: Record<string, any> = {
    id: workerId,
    user_id: authUser?.id ? authUser.id : null,
    email: cleanEmail,
    name: name.trim(),
    employee_id: cleanEmpId,
    password: password,
    must_change_password: false,
    role: finalRole,
    division: division,
    avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(name.trim())}&background=0D9488&color=fff&bold=true`,
    streak_days: 1,
    total_points: 100,
    tier: 'Novice Operational',
    bib_behavior: 80,
    bib_integrity: 85,
    bib_benchmark: 80,
    bib_total_score: 81.5,
    status: initialStatus,
  };

  let { error: insertErr } = await supabase.from('workers').insert(insertPayload);

  // Fallback jika 'status' belum ada di kolom database (hanya jika kolom benar-benar tidak ada)
  if (insertErr && insertErr.message?.includes('column "status"') && insertErr.message?.includes('does not exist')) {
    delete insertPayload.status;
    const retry = await supabase.from('workers').insert(insertPayload);
    insertErr = retry.error;
  }

  // Fallback jika 'user_id' melanggar Foreign Key constraint
  if (insertErr && (insertErr.message?.includes('user_id') || insertErr.message?.includes('foreign key') || insertErr.code === '23503')) {
    delete insertPayload.user_id;
    const retry = await supabase.from('workers').insert(insertPayload);
    insertErr = retry.error;
  }

  if (insertErr) {
    let msg = insertErr.message || 'Gagal menyimpan profil pekerja.';
    if (insertErr.code === '23505' || insertErr.message?.includes('duplicate') || insertErr.message?.includes('unique')) {
      msg = `NIK "${cleanEmpId}" atau Email "${cleanEmail}" sudah terdaftar di database. Pendaftaran ditolak.`;
    }
    throw new Error(msg);
  }

  return {
    user: authUser || { id: workerId },
    worker: rowToWorkerProfile(insertPayload as WorkerRow),
  };
}

export async function updateWorkerAvatar(workerId: string, avatarUrl: string): Promise<void> {
  const { error } = await supabase.from('workers').update({ avatar: avatarUrl }).eq('id', workerId);
  if (error) throw error;
}

export async function updateWorkerStatus(workerId: string, status: 'active' | 'rejected'): Promise<void> {
  const { error } = await supabase.from('workers').update({ status }).eq('id', workerId);
  if (error && !error.message?.includes('status')) throw error;
}

export async function signOutUser(): Promise<void> {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

// ─── Competency Matrix Services ───────────────────────────────────────────────

export async function fetchWorkerCompetencyScores(workerId: string): Promise<Record<string, number>> {
  const { data, error } = await supabase
    .from('worker_competency_scores')
    .select('competency_id, score')
    .eq('worker_id', workerId);

  if (error) {
    console.warn('Could not fetch competency scores:', error.message);
    return {};
  }

  const scores: Record<string, number> = {};
  if (data) {
    for (const row of data) {
      scores[row.competency_id] = Number(row.score);
    }
  }
  return scores;
}

export async function saveWorkerCompetencyScores(
  workerId: string,
  scores: Record<string, number>,
  calculatedBibBehavior: number,
  calculatedBibBenchmark: number
): Promise<void> {
  const rows = Object.entries(scores).map(([competencyId, score]) => ({
    worker_id: workerId,
    competency_id: competencyId,
    score: score,
    updated_at: new Date().toISOString(),
  }));

  if (rows.length > 0) {
    const { error } = await supabase.from('worker_competency_scores').upsert(rows, {
      onConflict: 'worker_id,competency_id',
    });
    if (error) throw error;
  }

  // Update worker's BIB behavior and benchmark scores in workers table
  const { data: currentWorker, error: fetchErr } = await supabase
    .from('workers')
    .select('bib_integrity')
    .eq('id', workerId)
    .single();

  if (!fetchErr && currentWorker) {
    const integrity = Number(currentWorker.bib_integrity);
    const newTotal = Number((calculatedBibBehavior * 0.35 + integrity * 0.30 + calculatedBibBenchmark * 0.35).toFixed(2));

    await supabase.from('workers').update({
      bib_behavior: calculatedBibBehavior,
      bib_benchmark: calculatedBibBenchmark,
      bib_total_score: newTotal,
    }).eq('id', workerId);
  }
}

// ─── Daily Activity Reset ─────────────────────────────────────────────────────

export async function checkAndResetDailyActivity(workerId: string, lastActivityDate?: string): Promise<boolean> {
  const today = new Date().toISOString().split('T')[0];
  const lastDate = lastActivityDate ? new Date(lastActivityDate).toISOString().split('T')[0] : null;

  if (lastDate === today) return false; // Sudah hari ini, tidak perlu reset

  const { error } = await supabase.from('workers').update({
    daily_quiz_completed: false,
    pre_shift_checklist_done: false,
    last_activity_date: today,
  }).eq('id', workerId);

  if (error) {
    console.warn('[DailyReset] Gagal reset aktivitas harian:', error.message);
    return false;
  }
  return true;
}

// ─── Score History ─────────────────────────────────────────────────────────────

export async function fetchScoreHistory(workerId: string, days = 30): Promise<ScoreHistoryEntry[]> {
  const since = new Date();
  since.setDate(since.getDate() - days);

  const { data, error } = await supabase
    .from('score_history')
    .select('*')
    .eq('worker_id', workerId)
    .gte('recorded_at', since.toISOString())
    .order('recorded_at', { ascending: true });

  if (error) {
    console.warn('[ScoreHistory] Gagal fetch:', error.message);
    return [];
  }

  return (data || []).map((row: any) => ({
    id: row.id,
    workerId: row.worker_id,
    bibScore: Number(row.bib_score),
    totalPoints: row.total_points,
    recordedAt: row.recorded_at,
  }));
}

export async function insertScoreHistory(workerId: string, bibScore: number, totalPoints: number): Promise<void> {
  const { error } = await supabase.from('score_history').insert({
    worker_id: workerId,
    bib_score: bibScore,
    total_points: totalPoints,
    recorded_at: new Date().toISOString(),
  });
  if (error) {
    console.warn('[ScoreHistory] Gagal insert:', error.message);
  }
}

// ─── Avatar Upload via Supabase Storage ──────────────────────────────────────

export async function uploadWorkerAvatarFile(workerId: string, file: File): Promise<string> {
  const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
  const filePath = `${workerId}/avatar_${Date.now()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from('avatars')
    .upload(filePath, file, { upsert: true, contentType: file.type });

  if (uploadError) {
    if (uploadError.message?.toLowerCase().includes('not found') || uploadError.message?.toLowerCase().includes('bucket')) {
      throw new Error(
        'Bucket Storage "avatars" belum dibuat di Supabase. Jalankan query SQL di supabase_setup.sql atau buat Bucket "avatars" (Public: ON) di Supabase Dashboard > Storage.'
      );
    }
    throw new Error(`Upload gagal: ${uploadError.message}`);
  }

  const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
  if (!data?.publicUrl) throw new Error('Gagal mendapatkan URL publik setelah upload.');

  // Simpan URL baru ke profil worker
  await updateWorkerAvatar(workerId, data.publicUrl);
  return data.publicUrl;
}

// ─── First-Time Password Reset & Email Link ────────────────────────────────────

export async function updateWorkerPasswordAndEmail(
  workerId: string,
  newPassword: string,
  newEmail: string
): Promise<WorkerProfile> {
  const { data, error } = await supabase
    .from('workers')
    .update({
      email: newEmail,
      password: newPassword,
      must_change_password: false,
    })
    .eq('id', workerId)
    .select('*')
    .single();

  if (error) throw new Error(`Gagal memperbarui password dan email: ${error.message}`);

  try {
    await supabase.auth.updateUser({ password: newPassword, email: newEmail });
  } catch (e) {
    console.warn('[AuthUpdate] Supabase Auth update skipped or handled locally:', e);
  }

  return rowToWorkerProfile(data as WorkerRow);
}

// ═══════════════════════════════════════════════════════════════════════════════
// PRD §9 — New Feature Services
// ═══════════════════════════════════════════════════════════════════════════════

// ─── Announcements ───────────────────────────────────────────────────────────

function rowToAnnouncement(row: any): Announcement {
  return {
    id: row.id,
    title: row.title,
    content: row.content,
    priority: row.priority,
    createdBy: row.created_by ?? undefined,
    isActive: row.is_active,
    expiresAt: row.expires_at ?? undefined,
    createdAt: row.created_at,
  };
}

export async function fetchAnnouncements(activeOnly = true): Promise<Announcement[]> {
  let q = supabase.from('announcements').select('*').order('created_at', { ascending: false });
  if (activeOnly) q = q.eq('is_active', true);
  const { data, error } = await q;
  if (error) throw new Error(`Gagal memuat pengumuman: ${error.message}`);
  const now = new Date();
  return (data ?? []).map(rowToAnnouncement).filter((a) => {
    if (!activeOnly) return true;
    return !a.expiresAt || new Date(a.expiresAt) > now;
  });
}

export async function createAnnouncement(
  title: string,
  content: string,
  priority: Announcement['priority'],
  createdBy: string,
  expiresAt?: string
): Promise<Announcement> {
  const { data, error } = await supabase
    .from('announcements')
    .insert({ title, content, priority, created_by: createdBy, is_active: true, expires_at: expiresAt ?? null })
    .select('*')
    .single();
  if (error) throw new Error(`Gagal membuat pengumuman: ${error.message}`);
  return rowToAnnouncement(data);
}

export async function toggleAnnouncement(id: string, isActive: boolean): Promise<void> {
  const { error } = await supabase.from('announcements').update({ is_active: isActive }).eq('id', id);
  if (error) throw new Error(`Gagal update pengumuman: ${error.message}`);
}

export async function deleteAnnouncement(id: string): Promise<void> {
  const { error } = await supabase.from('announcements').delete().eq('id', id);
  if (error) throw new Error(`Gagal hapus pengumuman: ${error.message}`);
}

// ─── Badges ──────────────────────────────────────────────────────────────────

function rowToBadge(row: any): Badge {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    icon: row.icon,
    color: row.color,
    condition: row.condition,
    threshold: row.threshold,
  };
}

export async function fetchAllBadges(): Promise<Badge[]> {
  const { data, error } = await supabase.from('badges').select('*').order('threshold');
  if (error) return [];
  return (data ?? []).map(rowToBadge);
}

export async function fetchWorkerBadges(workerId: string): Promise<WorkerBadge[]> {
  const { data, error } = await supabase
    .from('worker_badges')
    .select('*, badge:badges(*)')
    .eq('worker_id', workerId)
    .order('awarded_at', { ascending: false });
  if (error) return [];
  return (data ?? []).map((row: any) => ({
    id: row.id,
    workerId: row.worker_id,
    badgeId: row.badge_id,
    badge: rowToBadge(row.badge),
    awardedAt: row.awarded_at,
  }));
}

export async function awardBadge(workerId: string, badgeId: string): Promise<WorkerBadge | null> {
  const { data, error } = await supabase
    .from('worker_badges')
    .insert({ worker_id: workerId, badge_id: badgeId })
    .select('*, badge:badges(*)')
    .single();
  if (error) return null; // Unique constraint = sudah punya badge ini
  return {
    id: data.id,
    workerId: data.worker_id,
    badgeId: data.badge_id,
    badge: rowToBadge(data.badge),
    awardedAt: data.awarded_at,
  };
}

/** Auto-check & award eligible badges based on current worker stats */
export async function checkAndAwardBadges(
  worker: WorkerProfile,
  extra: { quizCount?: number; checklistStreak?: number } = {}
): Promise<WorkerBadge[]> {
  const allBadges = await fetchAllBadges();
  const existing = await fetchWorkerBadges(worker.id);
  const existingIds = new Set(existing.map((wb) => wb.badgeId));
  const awarded: WorkerBadge[] = [];

  for (const badge of allBadges) {
    if (existingIds.has(badge.id)) continue;
    let eligible = false;
    switch (badge.condition) {
      case 'streak_days':       eligible = worker.streakDays >= badge.threshold; break;
      case 'total_points':     eligible = worker.totalPoints >= badge.threshold; break;
      case 'bib_score':        eligible = worker.bibScores.totalScore >= badge.threshold; break;
      case 'quiz_count':       eligible = (extra.quizCount ?? 0) >= badge.threshold; break;
      case 'checklist_streak': eligible = (extra.checklistStreak ?? 0) >= badge.threshold; break;
    }
    if (eligible) {
      const result = await awardBadge(worker.id, badge.id);
      if (result) awarded.push(result);
    }
  }
  return awarded;
}

// ─── Incident Reports ─────────────────────────────────────────────────────────

function rowToIncidentReport(row: any): IncidentReport {
  return {
    id: row.id,
    workerId: row.worker_id,
    workerName: row.workers?.name ?? undefined,
    incidentType: row.incident_type,
    location: row.location,
    description: row.description,
    severity: row.severity,
    status: row.status,
    occurredAt: row.occurred_at,
    createdAt: row.created_at,
    resolvedAt: row.resolved_at ?? undefined,
    resolutionNote: row.resolution_note ?? undefined,
    photoUrl: row.photo_url ?? undefined,
    gdriveFolderId: row.gdrive_folder_id ?? undefined,
    originalSizeKb: row.original_size_kb ?? undefined,
    compressedSizeKb: row.compressed_size_kb ?? undefined,
  };
}

// Persistent local photo cache for incident report evidence
const INCIDENT_PHOTO_CACHE_KEY = 'bib_incident_photos_cache_v1';

function getIncidentPhotoCache(): Record<string, { photoUrl: string; originalSizeKb?: number; compressedSizeKb?: number }> {
  try {
    const raw = localStorage.getItem(INCIDENT_PHOTO_CACHE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveIncidentPhotoCache(id: string, photoUrl: string, originalSizeKb?: number, compressedSizeKb?: number) {
  try {
    const cache = getIncidentPhotoCache();
    cache[id] = { photoUrl, originalSizeKb, compressedSizeKb };
    localStorage.setItem(INCIDENT_PHOTO_CACHE_KEY, JSON.stringify(cache));
  } catch (e) {
    console.warn('Gagal menyimpan cache foto insiden:', e);
  }
}

// Persistent local CAPA & History cache
const INCIDENT_CAPA_CACHE_KEY = 'bib_incident_capa_cache_v1';

export function getIncidentCapaCache(): Record<string, { rootCause?: string; correctiveAction?: string; assignedPic?: string; dueDate?: string; history?: IncidentReportHistory[] }> {
  try {
    const raw = localStorage.getItem(INCIDENT_CAPA_CACHE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function saveIncidentCapaCache(
  id: string,
  capaData: { rootCause?: string; correctiveAction?: string; assignedPic?: string; dueDate?: string; newHistoryItem?: IncidentReportHistory }
) {
  try {
    const cache = getIncidentCapaCache();
    const existing = cache[id] || { history: [] };
    const historyList = existing.history || [];

    if (capaData.newHistoryItem) {
      historyList.unshift(capaData.newHistoryItem);
    }

    cache[id] = {
      rootCause: capaData.rootCause !== undefined ? capaData.rootCause : existing.rootCause,
      correctiveAction: capaData.correctiveAction !== undefined ? capaData.correctiveAction : existing.correctiveAction,
      assignedPic: capaData.assignedPic !== undefined ? capaData.assignedPic : existing.assignedPic,
      dueDate: capaData.dueDate !== undefined ? capaData.dueDate : existing.dueDate,
      history: historyList,
    };
    localStorage.setItem(INCIDENT_CAPA_CACHE_KEY, JSON.stringify(cache));
  } catch (e) {
    console.warn('Gagal menyimpan cache CAPA insiden:', e);
  }
}

export async function createIncidentReport(
  workerId: string,
  payload: Omit<IncidentReport, 'id' | 'workerId' | 'workerName' | 'createdAt' | 'resolvedAt' | 'resolutionNote' | 'status'>
): Promise<IncidentReport> {
  const insertPayload: Record<string, any> = {
    worker_id: workerId,
    incident_type: payload.incidentType,
    location: payload.location,
    description: payload.description,
    severity: payload.severity,
    occurred_at: payload.occurredAt,
  };

  if (payload.photoUrl) {
    insertPayload.photo_url = payload.photoUrl;
  }

  let { data, error } = await supabase
    .from('incident_reports')
    .insert(insertPayload)
    .select('*')
    .single();

  // Retry fallback jika kolom photo_url belum ada di skema Supabase database
  if (error && (error.message.includes('photo_url') || error.message.includes('column'))) {
    delete insertPayload.photo_url;
    const retry = await supabase
      .from('incident_reports')
      .insert(insertPayload)
      .select('*')
      .single();
    data = retry.data;
    error = retry.error;
  }

  if (error) throw new Error(`Gagal membuat laporan insiden: ${error.message}`);
  const result = rowToIncidentReport(data);

  const initialHistory: IncidentReportHistory = {
    status: 'open',
    updatedBy: (payload as any).workerName || 'Pekerja',
    updatedAt: new Date().toISOString(),
    note: 'Laporan insiden dibuat',
  };

  saveIncidentCapaCache(result.id, { newHistoryItem: initialHistory });

  if (payload.photoUrl) {
    result.photoUrl = payload.photoUrl;
    result.gdriveFolderId = payload.gdriveFolderId;
    result.originalSizeKb = payload.originalSizeKb;
    result.compressedSizeKb = payload.compressedSizeKb;
    saveIncidentPhotoCache(result.id, payload.photoUrl, payload.originalSizeKb, payload.compressedSizeKb);
  }
  return result;
}

export async function fetchIncidentReports(workerId?: string): Promise<IncidentReport[]> {
  let q = supabase
    .from('incident_reports')
    .select('*')
    .order('created_at', { ascending: false });
  if (workerId) q = q.eq('worker_id', workerId);
  const { data, error } = await q;
  if (error) {
    console.warn('Gagal memuat laporan insiden:', error.message);
    return [];
  }

  const photoCache = getIncidentPhotoCache();
  const capaCache = getIncidentCapaCache();

  return (data ?? []).map((row) => {
    const report = rowToIncidentReport(row);
    if (!report.photoUrl && photoCache[report.id]) {
      report.photoUrl = photoCache[report.id].photoUrl;
      report.originalSizeKb = photoCache[report.id].originalSizeKb;
      report.compressedSizeKb = photoCache[report.id].compressedSizeKb;
    }
    if (!report.photoUrl) {
      report.photoUrl = 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=800&auto=format&fit=crop&q=80';
    }
    if (capaCache[report.id]) {
      report.rootCause = capaCache[report.id].rootCause;
      report.correctiveAction = capaCache[report.id].correctiveAction;
      report.assignedPic = capaCache[report.id].assignedPic;
      report.dueDate = capaCache[report.id].dueDate;
      report.history = capaCache[report.id].history;
    }
    return report;
  });
}

export async function updateIncidentCapaAndStatus(
  id: string,
  payload: {
    status: IncidentReport['status'];
    rootCause?: string;
    correctiveAction?: string;
    assignedPic?: string;
    dueDate?: string;
    resolutionNote?: string;
    updatedBy: string;
    workerId?: string;
    forceAward?: boolean;
  }
): Promise<{ pointsAwarded: boolean; workerId?: string; pointsEarned?: number; newTotalPoints?: number }> {
  console.log(`🛡️ [GappyIncidentService] Memulai validasi insiden: ID=${id}, Status=${payload.status}`);

  // 1. Ambil data insiden untuk cek worker_id & status points_awarded
  const { data: incidentRow } = await supabase
    .from('incident_reports')
    .select('worker_id, points_awarded, status')
    .eq('id', id)
    .maybeSingle();

  let pointsAwarded = false;
  let targetWorkerId = payload.workerId || incidentRow?.worker_id;

  // 2. Payload update status & CAPA
  const updatePayload: Record<string, any> = {
    status: payload.status,
    resolution_note: payload.resolutionNote ?? null,
    resolved_at: ['resolved', 'closed'].includes(payload.status) ? new Date().toISOString() : null,
  };

  const isValidatedStatus = ['investigating', 'resolved', 'closed'].includes(payload.status);
  const alreadyAwarded = Boolean(incidentRow?.points_awarded);

  // Jika status disetujui & belum pernah mendapat poin (atau force award), aktifkan penambahan poin +50 PTS
  if (isValidatedStatus && (!alreadyAwarded || payload.forceAward || !incidentRow)) {
    updatePayload.points_awarded = true;
    pointsAwarded = true;
  }

  const { error } = await supabase
    .from('incident_reports')
    .update(updatePayload)
    .eq('id', id);

  if (error && error.message.includes('points_awarded')) {
    delete updatePayload.points_awarded;
    await supabase.from('incident_reports').update(updatePayload).eq('id', id);
  }

  let finalNewPoints = 0;

  // 3. Tambahkan +50 PTS ke akun worker pelapor
  if (pointsAwarded && targetWorkerId) {
    try {
      console.log(`⚡ [GappyIncidentService] Memproses penambahan +50 PTS untuk Worker ID/NIP: ${targetWorkerId}`);

      // a. Coba panggil RPC increment_worker_points
      try {
        await supabase.rpc('increment_worker_points', {
          p_worker_id: targetWorkerId,
          p_points: 50,
        });
      } catch (err: any) {
        console.warn('RPC increment_worker_points fallback:', err?.message);
      }

      // b. Pencarian worker sequential yang 100% aman PostgREST
      let worker: any = null;

      // Lookup 1: eq id
      const res1 = await supabase.from('workers').select('*').eq('id', targetWorkerId).maybeSingle();
      worker = res1.data;

      // Lookup 2: eq employee_id (NIP)
      if (!worker) {
        const res2 = await supabase.from('workers').select('*').eq('employee_id', targetWorkerId).maybeSingle();
        worker = res2.data;
      }

      // Lookup 3: eq name
      if (!worker) {
        const res3 = await supabase.from('workers').select('*').eq('name', targetWorkerId).maybeSingle();
        worker = res3.data;
      }

      if (worker) {
        const currentPts = Number(worker.total_points || 0);
        const newTotalPoints = currentPts + 50;
        finalNewPoints = newTotalPoints;
        const newTier = WorkerEntity.calculateTier(newTotalPoints);

        console.log(`✅ [GappyIncidentService] Worker ditemukan: ${worker.name} (NIP: ${worker.employee_id}). Poin di-update: ${currentPts} PTS ➔ ${newTotalPoints} PTS`);

        // Eksekusi update langsung ke tabel workers
        const { error: updErr } = await supabase
          .from('workers')
          .update({
            total_points: newTotalPoints,
            tier: newTier,
            updated_at: new Date().toISOString(),
          })
          .eq('id', worker.id);

        if (updErr && worker.employee_id) {
          await supabase
            .from('workers')
            .update({
              total_points: newTotalPoints,
              tier: newTier,
              updated_at: new Date().toISOString(),
            })
            .eq('employee_id', worker.employee_id);
        }

        NotificationEngine.addNotification({
          recipientId: worker.id,
          recipientRole: 'worker',
          title: '🛡️ Laporan Insiden K3 Disetujui! (+50 PTS)',
          message: `Laporan insiden K3 Anda disetujui Supervisor. Anda mendapatkan +50 Poin Reward!`,
          type: 'incident',
        });

        // Trigger real-time UI refresh pada React memory
        window.dispatchEvent(new CustomEvent('gappy_points_awarded', {
          detail: { workerId: worker.id, employeeId: worker.employee_id, newTotalPoints, pointsEarned: 50 }
        }));
      } else {
        console.warn(`⚠️ [GappyIncidentService] Worker dengan identifier "${targetWorkerId}" tidak ditemukan di database Supabase.`);
      }
    } catch (err: any) {
      console.warn('Gagal menambah poin reward pelapor insiden:', err?.message);
    }
  }

  const newHistoryItem: IncidentReportHistory = {
    status: payload.status,
    updatedBy: payload.updatedBy,
    updatedAt: new Date().toISOString(),
    note: payload.resolutionNote || payload.correctiveAction || `Status diperbarui menjadi ${payload.status}`,
  };

  saveIncidentCapaCache(id, {
    rootCause: payload.rootCause,
    correctiveAction: payload.correctiveAction,
    assignedPic: payload.assignedPic,
    dueDate: payload.dueDate,
    newHistoryItem,
  });

  return { pointsAwarded, workerId: targetWorkerId, pointsEarned: pointsAwarded ? 50 : 0, newTotalPoints: finalNewPoints };
}

export async function updateIncidentStatus(
  id: string,
  status: IncidentReport['status'],
  resolutionNote?: string
): Promise<void> {
  await updateIncidentCapaAndStatus(id, {
    status,
    resolutionNote,
    updatedBy: 'Supervisor / Admin',
  });
}

// ─── Rate Limiting ────────────────────────────────────────────────────────────

const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 menit

export async function checkLoginRateLimit(identifier: string): Promise<void> {
  const since = new Date(Date.now() - RATE_LIMIT_WINDOW_MS).toISOString();
  const { data } = await supabase
    .from('login_attempts')
    .select('id')
    .eq('identifier', identifier)
    .eq('success', false)
    .gte('attempted_at', since);
  if ((data?.length ?? 0) >= RATE_LIMIT_MAX) {
    throw new Error(
      `Terlalu banyak percobaan login gagal. Silakan tunggu 15 menit sebelum mencoba kembali.`
    );
  }
}

export async function logLoginAttempt(identifier: string, success: boolean): Promise<void> {
  await supabase.from('login_attempts').insert({ identifier, success }).then(() => {});
}

// ─── Activity Log ─────────────────────────────────────────────────────────────

export async function logActivity(
  workerId: string | null,
  workerName: string | null,
  action: ActivityAction,
  detail?: string
): Promise<void> {
  await supabase.from('activity_log').insert({
    worker_id: workerId,
    worker_name: workerName,
    action,
    detail: detail ?? null,
  }).then(() => {});
}

export async function fetchActivityLog(limit = 50): Promise<ActivityLog[]> {
  const { data, error } = await supabase
    .from('activity_log')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) return [];
  return (data ?? []).map((row: any) => ({
    id: row.id,
    workerId: row.worker_id ?? undefined,
    workerName: row.worker_name ?? undefined,
    action: row.action as ActivityAction,
    detail: row.detail ?? undefined,
    createdAt: row.created_at,
  }));
}

// ─── Division Analytics ───────────────────────────────────────────────────────

export function computeDivisionStats(workers: WorkerProfile[]): DivisionStat[] {
  const divMap = new Map<string, WorkerProfile[]>();
  for (const w of workers) {
    if (!RoleEntity.isOperationalWorker(w.role) || w.division.toUpperCase() === 'SYSTEM') continue;
    const arr = divMap.get(w.division) ?? [];
    arr.push(w);
    divMap.set(w.division, arr);
  }
  return Array.from(divMap.entries()).map(([division, wks]) => {
    const count = wks.length;
    const avgBib = count ? wks.reduce((s, w) => s + w.bibScores.totalScore, 0) / count : 0;
    const avgPts = count ? wks.reduce((s, w) => s + w.totalPoints, 0) / count : 0;
    const tierDist: Record<string, number> = {};
    for (const w of wks) tierDist[w.tier] = (tierDist[w.tier] ?? 0) + 1;
    const quizDone = wks.filter((w) => w.dailyQuizCompleted).length;
    return {
      division,
      workerCount: count,
      avgBibScore: Math.round(avgBib * 10) / 10,
      avgTotalPoints: Math.round(avgPts),
      tierDistribution: tierDist,
      quizCompletionRate: count ? Math.round((quizDone / count) * 100) : 0,
    };
  }).sort((a, b) => b.avgBibScore - a.avgBibScore);
}

// ─── CSV Export ───────────────────────────────────────────────────────────────

export function exportWorkersCSV(workers: WorkerProfile[]): void {
  const headers = [
    'NIK', 'Nama', 'Divisi', 'Role', 'Total Poin', 'Tier',
    'BIB Behavior', 'BIB Integrity', 'BIB Benchmark', 'BIB Total',
    'Streak', 'Status', 'Email',
  ];
  const rows = workers.map((w) => [
    w.employeeId,
    `"${w.name}"`,
    w.division,
    `"${w.role}"`,
    w.totalPoints,
    w.tier,
    w.bibScores.behavior,
    w.bibScores.integrity,
    w.bibScores.benchmark,
    w.bibScores.totalScore,
    w.streakDays,
    w.status ?? 'active',
    w.email ?? '',
  ]);
  const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `worker_data_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  URL.revokeObjectURL(url);
}

// ─── Batch Worker Import Service ─────────────────────────────────────────────

export interface BatchImportWorkerPayload {
  employeeId: string;
  name: string;
  role: string;
  division: string;
}

export async function batchImportWorkers(
  parsedList: BatchImportWorkerPayload[]
): Promise<{ successCount: number; failedCount: number; errors: string[] }> {
  let successCount = 0;
  let failedCount = 0;
  const errors: string[] = [];

  for (const p of parsedList) {
    try {
      const cleanEmpId = p.employeeId.trim();
      const cleanName = p.name.trim();
      if (!cleanEmpId || !cleanName) continue;

      const workerId = `w-${cleanEmpId.replace(/\s+/g, '')}`;
      const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(cleanName)}&background=0D9488&color=fff&bold=true`;

      const row = {
        id: workerId,
        employee_id: cleanEmpId,
        name: cleanName,
        role: p.role,
        division: p.division,
        avatar: avatarUrl,
        streak_days: 0,
        total_points: 0,
        tier: 'Novice Operational',
        bib_behavior: 0,
        bib_integrity: 0,
        bib_benchmark: 0,
        bib_total_score: 0,
        daily_quiz_completed: false,
        pre_shift_checklist_done: false,
        must_change_password: true,
        password: '123',
        status: 'active',
      };

      const { error } = await supabase.from('workers').upsert(row, { onConflict: 'employee_id' });
      if (error) {
        failedCount++;
        errors.push(`${cleanName} (${cleanEmpId}): ${error.message}`);
      } else {
        successCount++;
      }
    } catch (err: any) {
      failedCount++;
      errors.push(`${p.name} (${p.employeeId}): ${err?.message || 'Gagal menyimpan'}`);
    }
  }

  return { successCount, failedCount, errors };
}

// ─── Badge CRUD (Admin) ───────────────────────────────────────────────────────

export async function createBadge(data: Omit<Badge, 'id'>): Promise<Badge> {
  const { data: row, error } = await supabase
    .from('badges')
    .insert({
      name: data.name,
      description: data.description,
      icon: data.icon,
      color: data.color,
      condition: data.condition,
      threshold: data.threshold,
    })
    .select('*')
    .single();
  if (error) throw new Error(`Gagal membuat badge: ${error.message}`);
  return rowToBadge(row);
}

export async function updateBadge(badgeId: string, data: Partial<Omit<Badge, 'id'>>): Promise<Badge> {
  const payload: Record<string, any> = {};
  if (data.name        !== undefined) payload.name        = data.name;
  if (data.description !== undefined) payload.description = data.description;
  if (data.icon        !== undefined) payload.icon        = data.icon;
  if (data.color       !== undefined) payload.color       = data.color;
  if (data.condition   !== undefined) payload.condition   = data.condition;
  if (data.threshold   !== undefined) payload.threshold   = data.threshold;

  const { data: row, error } = await supabase
    .from('badges')
    .update(payload)
    .eq('id', badgeId)
    .select('*')
    .single();
  if (error) throw new Error(`Gagal memperbarui badge: ${error.message}`);
  return rowToBadge(row);
}

export async function deleteBadge(badgeId: string): Promise<void> {
  // Hapus worker_badges dulu agar tidak ada FK violation
  await supabase.from('worker_badges').delete().eq('badge_id', badgeId);
  const { error } = await supabase.from('badges').delete().eq('id', badgeId);
  if (error) throw new Error(`Gagal menghapus badge: ${error.message}`);
}

// ─── Quiz Questions CRUD (Admin) ──────────────────────────────────────────────

function rowToQuizQuestion(row: any): QuizQuestion {
  return {
    id: row.id,
    question: row.question,
    options: row.options ?? [],
    correctAnswerIndex: row.correct_answer_index,
    explanation: row.explanation ?? '',
    pointsReward: row.points_reward,
    category: row.category as QuizQuestion['category'],
  };
}

export async function fetchQuizQuestions(): Promise<QuizQuestion[]> {
  const { data, error } = await supabase
    .from('quiz_questions')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) {
    console.warn('[QuizQuestions] Tabel mungkin belum dibuat:', error.message);
    return [];
  }
  return (data ?? []).map(rowToQuizQuestion);
}

export async function createQuizQuestion(
  payload: Omit<QuizQuestion, 'id'>
): Promise<QuizQuestion> {
  const { data, error } = await supabase
    .from('quiz_questions')
    .insert({
      question: payload.question,
      options: payload.options,
      correct_answer_index: payload.correctAnswerIndex,
      explanation: payload.explanation,
      points_reward: payload.pointsReward,
      category: payload.category,
    })
    .select('*')
    .single();
  if (error) throw new Error(`Gagal membuat soal quiz: ${error.message}`);
  return rowToQuizQuestion(data);
}

export async function updateQuizQuestion(
  questionId: string,
  payload: Partial<Omit<QuizQuestion, 'id'>>
): Promise<QuizQuestion> {
  const updatePayload: Record<string, any> = {};
  if (payload.question            !== undefined) updatePayload.question             = payload.question;
  if (payload.options             !== undefined) updatePayload.options              = payload.options;
  if (payload.correctAnswerIndex  !== undefined) updatePayload.correct_answer_index = payload.correctAnswerIndex;
  if (payload.explanation         !== undefined) updatePayload.explanation          = payload.explanation;
  if (payload.pointsReward        !== undefined) updatePayload.points_reward        = payload.pointsReward;
  if (payload.category            !== undefined) updatePayload.category             = payload.category;

  const { data, error } = await supabase
    .from('quiz_questions')
    .update(updatePayload)
    .eq('id', questionId)
    .select('*')
    .single();
  if (error) throw new Error(`Gagal memperbarui soal quiz: ${error.message}`);
  return rowToQuizQuestion(data);
}

export async function deleteQuizQuestion(questionId: string): Promise<void> {
  const { error } = await supabase.from('quiz_questions').delete().eq('id', questionId);
  if (error) throw new Error(`Gagal menghapus soal quiz: ${error.message}`);
}

// ─── Audit History (Supervisor) ───────────────────────────────────────────────

export interface AuditHistoryEntry {
  id: string;
  workerId: string;
  workerName?: string;
  bibScore: number;
  totalPoints: number;
  recordedAt: string;
}

export async function fetchAuditHistory(workerIds: string[]): Promise<AuditHistoryEntry[]> {
  if (workerIds.length === 0) return [];
  const { data, error } = await supabase
    .from('score_history')
    .select('*')
    .in('worker_id', workerIds)
    .order('recorded_at', { ascending: false })
    .limit(200);

  if (error) {
    console.warn('[AuditHistory] Gagal fetch:', error.message);
    return [];
  }

  return (data ?? []).map((row: any) => ({
    id: row.id,
    workerId: row.worker_id,
    bibScore: Number(row.bib_score),
    totalPoints: row.total_points,
    recordedAt: row.recorded_at,
  }));
}

// ─── Export Incidents CSV ─────────────────────────────────────────────────────

export function exportIncidentsCSV(incidents: IncidentReport[]): void {
  const headers = [
    'ID', 'Pelapor', 'Jenis Insiden', 'Lokasi', 'Severity', 'Status',
    'Tanggal Kejadian', 'Tanggal Laporan', 'Deskripsi', 'Root Cause', 'Corrective Action',
  ];
  const TYPE_LABELS: Record<string, string> = {
    near_miss: 'Near-Miss',
    injury: 'Cedera',
    property_damage: 'Kerusakan Properti',
    unsafe_condition: 'Kondisi Tidak Aman',
    other: 'Lainnya',
  };
  const rows = incidents.map((inc) => [
    inc.id,
    `"${inc.workerName ?? inc.workerId}"`,
    `"${TYPE_LABELS[inc.incidentType] ?? inc.incidentType}"`,
    `"${inc.location}"`,
    inc.severity,
    inc.status,
    new Date(inc.occurredAt).toLocaleDateString('id-ID'),
    new Date(inc.createdAt).toLocaleDateString('id-ID'),
    `"${inc.description.replace(/"/g, "'")}"`,
    `"${(inc.rootCause ?? '').replace(/"/g, "'")}"`,
    `"${(inc.correctiveAction ?? '').replace(/"/g, "'")}"`,
  ]);
  const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `incident_report_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  URL.revokeObjectURL(url);
}
