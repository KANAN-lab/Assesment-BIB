// src/lib/sopService.ts
import { supabase } from './supabaseClient';
import defaultSopData from '../data/sopDeckData.json';
import {
  SopModule,
  WorkerSopProgress,
  SopComplianceOverview,
} from '../types/sop';

const LOCAL_STORAGE_SOP_PROGRESS_KEY = 'bib_sop_worker_progress_v2';
const LOCAL_STORAGE_SOP_CUSTOM_MODULES_KEY = 'bib_sop_custom_modules_v2';

/**
 * Fetch all SOP Modules with dynamic fallback to default seed data
 */
export async function fetchAllSopModules(
  workerDivision?: string,
  workerRole?: string
): Promise<SopModule[]> {
  try {
    const { data, error } = await supabase
      .from('sop_modules')
      .select('*')
      .eq('is_active', true)
      .order('code', { ascending: true });

    if (!error && data && data.length > 0) {
      const parsed: SopModule[] = data.map((row: any) => ({
        id: row.id,
        code: row.code,
        title: row.title,
        description: row.description || '',
        category: row.category,
        difficulty: row.difficulty || 'Beginner',
        targetDivisions: Array.isArray(row.target_divisions) ? row.target_divisions : ['ALL'],
        targetRoles: Array.isArray(row.target_roles) ? row.target_roles : ['ALL'],
        estimatedMinutes: row.estimated_minutes || 3,
        pointsReward: row.points_reward || 50,
        badgeIcon: row.badge_icon || 'BookOpen',
        slides: Array.isArray(row.slides_data) ? row.slides_data : [],
        isMandatory: !!row.is_mandatory,
        deadlineDays: row.deadline_days || 14,
        version: row.version || 'v1.0',
        isActive: row.is_active !== false,
        author: row.author || 'HSE & Ops Management',
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }));

      return filterSopByTarget(parsed, workerDivision, workerRole);
    }
  } catch (err) {
    console.warn('[SopService] Fallback to local default SOP data:', err);
  }

  // Fallback to local seed + custom local modules
  const localCustom = getLocalCustomModules();
  const combined = [...(defaultSopData as SopModule[]), ...localCustom];
  return filterSopByTarget(combined, workerDivision, workerRole);
}

/**
 * Filter modules by division and role
 */
function filterSopByTarget(
  modules: SopModule[],
  workerDivision?: string,
  workerRole?: string
): SopModule[] {
  if (!workerDivision && !workerRole) return modules;

  return modules.filter((mod) => {
    const divMatch =
      mod.targetDivisions.includes('ALL') ||
      (workerDivision && mod.targetDivisions.some((d) => d.toLowerCase() === workerDivision.toLowerCase()));

    const roleMatch =
      mod.targetRoles.includes('ALL') ||
      (workerRole && mod.targetRoles.some((r) => r.toLowerCase() === workerRole.toLowerCase()));

    return divMatch && roleMatch;
  });
}

/**
 * Fetch worker SOP progress list
 */
export async function fetchWorkerSopProgress(workerId: string): Promise<Record<string, WorkerSopProgress>> {
  const result: Record<string, WorkerSopProgress> = {};

  try {
    const { data, error } = await supabase
      .from('worker_sop_progress')
      .select('*')
      .eq('worker_id', workerId);

    if (!error && data) {
      data.forEach((row: any) => {
        result[row.sop_id] = {
          id: row.id,
          workerId: row.worker_id,
          sopId: row.sop_id,
          lastSlideViewed: row.last_slide_viewed || 1,
          isCompleted: !!row.is_completed,
          completedAt: row.completed_at || undefined,
          pointsAwarded: !!row.points_awarded,
          quizScore: row.quiz_score || 0,
          timeSpentSeconds: row.time_spent_seconds || 0,
          bookmarkedSlideIds: Array.isArray(row.bookmarked_slide_ids) ? row.bookmarked_slide_ids : [],
          personalNotes: row.personal_notes || undefined,
        };
      });
      // Save local cache backup
      saveLocalProgressCache(workerId, result);
      return result;
    }
  } catch (err) {
    console.warn('[SopService] Fetch progress fallback to local:', err);
  }

  return getLocalProgressCache(workerId);
}

/**
 * Mark an SOP as completed atomically and award +50 PTS
 */
export async function completeSopModule(
  workerId: string,
  sopId: string,
  timeSpentSeconds = 180,
  quizScore = 100
): Promise<{ success: boolean; pointsAdded: number; message: string }> {
  // 1. Try Supabase Atomic RPC
  try {
    const { data, error } = await supabase.rpc('rpc_complete_sop_module', {
      p_worker_id: workerId,
      p_sop_id: sopId,
      p_time_spent: timeSpentSeconds,
      p_quiz_score: quizScore,
    });

    if (!error && data && typeof data === 'object') {
      const res = data as any;
      updateLocalProgressRecord(workerId, sopId, {
        isCompleted: true,
        completedAt: new Date().toISOString(),
        pointsAwarded: true,
        quizScore,
        timeSpentSeconds,
      });

      return {
        success: true,
        pointsAdded: res.points_added || 50,
        message: res.message || 'Selamat! Anda telah menyelesaikan modul SOP dan memperoleh +50 PTS.',
      };
    }
  } catch (err) {
    console.warn('[SopService] RPC complete SOP fallback to local simulation:', err);
  }

  // 2. Fallback local simulation
  updateLocalProgressRecord(workerId, sopId, {
    isCompleted: true,
    completedAt: new Date().toISOString(),
    pointsAwarded: true,
    quizScore,
    timeSpentSeconds,
  });

  return {
    success: true,
    pointsAdded: 50,
    message: 'Selamat! Anda telah menyelesaikan modul SOP dan memperoleh +50 PTS.',
  };
}

/**
 * Update bookmark or personal note for a slide
 */
export function toggleSlideBookmark(workerId: string, sopId: string, slideId: string): string[] {
  const currentProgress = getLocalProgressCache(workerId);
  const prog = currentProgress[sopId] || {
    id: `local-${Date.now()}`,
    workerId,
    sopId,
    lastSlideViewed: 1,
    isCompleted: false,
    pointsAwarded: false,
    timeSpentSeconds: 0,
    bookmarkedSlideIds: [],
  };

  const bookmarks = new Set(prog.bookmarkedSlideIds || []);
  if (bookmarks.has(slideId)) {
    bookmarks.delete(slideId);
  } else {
    bookmarks.add(slideId);
  }

  const updatedBookmarks = Array.from(bookmarks);
  prog.bookmarkedSlideIds = updatedBookmarks;
  currentProgress[sopId] = prog;
  saveLocalProgressCache(workerId, currentProgress);

  return updatedBookmarks;
}

/**
 * Calculate compliance overview
 */
export function calculateSopCompliance(
  allModules: SopModule[],
  progressMap: Record<string, WorkerSopProgress>
): SopComplianceOverview {
  const total = allModules.length;
  const completed = allModules.filter((m) => progressMap[m.id]?.isCompleted).length;
  const mandatoryModules = allModules.filter((m) => m.isMandatory);
  const mandatoryCompleted = mandatoryModules.filter((m) => progressMap[m.id]?.isCompleted).length;

  const mandatoryRatio = mandatoryModules.length > 0 ? mandatoryCompleted / mandatoryModules.length : 1.0;
  const totalPoints = completed * 50;
  const nextRecommended = allModules.find((m) => !progressMap[m.id]?.isCompleted);

  return {
    totalModules: total,
    completedCount: completed,
    mandatoryCompletedRatio: mandatoryRatio,
    totalPointsEarnedFromSop: totalPoints,
    nextRecommendedModule: nextRecommended,
  };
}

// ─── Local Storage Helpers ──────────────────────────────────────────────────

function getLocalProgressCache(workerId: string): Record<string, WorkerSopProgress> {
  try {
    const raw = localStorage.getItem(`${LOCAL_STORAGE_SOP_PROGRESS_KEY}_${workerId}`);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveLocalProgressCache(workerId: string, data: Record<string, WorkerSopProgress>) {
  try {
    localStorage.setItem(`${LOCAL_STORAGE_SOP_PROGRESS_KEY}_${workerId}`, JSON.stringify(data));
  } catch (e) {
    console.warn('Gagal menyimpan cache SOP progress:', e);
  }
}

function updateLocalProgressRecord(
  workerId: string,
  sopId: string,
  updates: Partial<WorkerSopProgress>
) {
  const current = getLocalProgressCache(workerId);
  current[sopId] = {
    ...(current[sopId] || {
      id: `prog-${sopId}-${Date.now()}`,
      workerId,
      sopId,
      lastSlideViewed: 1,
      isCompleted: false,
      pointsAwarded: false,
      timeSpentSeconds: 0,
      bookmarkedSlideIds: [],
    }),
    ...updates,
    sopId,
    workerId,
  };
  saveLocalProgressCache(workerId, current);
}

function getLocalCustomModules(): SopModule[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_SOP_CUSTOM_MODULES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}
