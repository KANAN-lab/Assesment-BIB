// src/lib/sopService.ts
import { supabase } from './supabaseClient';
import defaultSopData from '../data/sopDeckData.json';
import {
  SopModule,
  WorkerSopProgress,
  SopComplianceOverview,
} from '../types/sop';
import { OfflineSopService } from './offlineSopService';

const LOCAL_STORAGE_SOP_PROGRESS_KEY = 'bib_sop_worker_progress_v2';
const LOCAL_STORAGE_SOP_CUSTOM_MODULES_KEY = 'bib_sop_custom_modules_v2';

/**
 * Fetch all SOP Modules with dynamic fallback to default seed data & offline cache
 */
export async function fetchAllSopModules(
  workerDivision?: string,
  workerRole?: string
): Promise<SopModule[]> {
  try {
    if (OfflineSopService.isOnline()) {
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

        // Cache locally for offline availability
        OfflineSopService.cacheModules(parsed);

        return filterSopByTarget(parsed, workerDivision, workerRole);
      }
    }
  } catch (err) {
    console.warn('[SopService] Fallback to local/cached SOP data:', err);
  }

  // Fallback 1: Cached modules from IndexedDB/LocalStorage
  const cached = OfflineSopService.getCachedModules();
  if (cached.length > 0) {
    return filterSopByTarget(cached, workerDivision, workerRole);
  }

  // Fallback 2: Local seed + interactive demo modules + custom local modules
  const localCustom = getLocalCustomModules();
  const combined = [...(defaultSopData as SopModule[]), ...BUILT_IN_ADVANCED_MODULES, ...localCustom];
  return filterSopByTarget(combined, workerDivision, workerRole);
}

export const BUILT_IN_ADVANCED_MODULES: SopModule[] = [
  {
    id: 'sop-sim-wms-01',
    code: 'SOP-SIM-01',
    title: 'Simulasi WMS: Alur Putaway Palet via Handheld Scanner',
    description: 'Modul simulasi interaktif langkah-demi-langkah penggunaan aplikasi WMS Handheld Scanner untuk konfirmasi putaway palet ke rak gudang.',
    category: 'Warehouse & Staging',
    difficulty: 'Intermediate',
    presentationFormat: 'interactive_simulator',
    targetDivisions: ['ALL', 'WFG', 'WRM'],
    targetRoles: ['ALL', 'Operator Forklift', 'Checker'],
    estimatedMinutes: 3,
    pointsReward: 75,
    badgeIcon: 'Smartphone',
    isMandatory: false,
    version: 'v1.0',
    isActive: true,
    author: 'WMS Solution & Ops Lead',
    createdAt: '2026-09-01T00:00:00.000Z',
    updatedAt: '2026-09-01T00:00:00.000Z',
    slides: [
      {
        id: 'sim-s1',
        slideNumber: 1,
        slideType: 'interactive_simulator',
        title: 'Langkah 1: Masuk ke Menu Putaway Inbound',
        subtitle: 'Buka menu penerimaan barang untuk memulai alur penempatan stok.',
        audioNarrationText: 'Pada layar utama terminal WMS, ketuk ikon menu Putaway berwarna biru untuk membuka daftar tugas penempatan barang.',
        imageUrl: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=1200&q=80',
        simulatorConfig: {
          taskInstruction: 'Tekan tombol menu [PUTAWAY STORAGE] di layar scanner untuk melanjutkan',
          targetXPercent: 20,
          targetYPercent: 40,
          targetWidthPercent: 60,
          targetHeightPercent: 20,
          hintText: 'Ketuk area tombol menu tengah [PUTAWAY STORAGE] berbingkai hijau menyala.',
          highlightLabel: '👉 [PUTAWAY STORAGE]',
          successMessage: 'Bagus! Menu Putaway Storage berhasil dibuka.',
        },
      },
      {
        id: 'sim-s2',
        slideNumber: 2,
        slideType: 'interactive_simulator',
        title: 'Langkah 2: Verifikasi & Konfirmasi Barcode Lokasi Rak',
        subtitle: 'Pastikan barcode rak penyimpanan sesuai dengan sistem sebelum menyimpan fisik palet.',
        audioNarrationText: 'Arahkan pemindai laser ke barcode tiang rak dan tekan tombol konfirmasi lokasi F4.',
        imageUrl: 'https://images.unsplash.com/photo-1553413077-190dd305871c?auto=format&fit=crop&w=1200&q=80',
        simulatorConfig: {
          taskInstruction: 'Klik tombol hijau [F4 - CONFIRM LOCATION] di bagian bawah layar untuk mengunci posisi palet',
          targetXPercent: 25,
          targetYPercent: 70,
          targetWidthPercent: 50,
          targetHeightPercent: 18,
          hintText: 'Cari tombol aksi utama [CONFIRM LOCATION] di baris bawah layar scanner.',
          highlightLabel: '⚡ [F4] CONFIRM',
          successMessage: 'Tepat! Lokasi rak RAK-A-04-02 berhasil terverifikasi.',
        },
      },
      {
        id: 'sim-s3',
        slideNumber: 3,
        slideType: 'quiz_checkpoint',
        title: 'Evaluasi: Integritas Data Sistem WMS',
        subtitle: 'Uji pemahaman prosedur saat terjadi selisih barcode.',
        audioNarrationText: 'Jawab pertanyaan kuis berikut untuk menyelesaikan modul simulasi dan mengklaim poin reward Anda.',
        quiz: {
          id: 'q-sim-01',
          question: 'Apa yang wajib dilakukan jika fisik palet ditaruh di rak A-02 tetapi sistem WMS merekomendasikan rak A-05?',
          options: [
            'Taruh saja di A-02 tanpa mengubah apapun di sistem scanner',
            'Scan barcode rak aktual A-02 lalu pilih opsi Overwrite/Relocate di WMS agar data stok tetap sinkron',
            'Matikan scanner dan selesaikan secara manual nanti sore',
            'Tinggalkan palet di lorong jalan gudang'
          ],
          correctAnswerIndex: 1,
          explanation: 'Setiap perpindahan fisik palet wajib di-scan ke barcode rak aktual di WMS untuk mencegah selisih stok (discrepancy) saat audit inventory.',
          points: 75,
        },
      }
    ]
  },
  {
    id: 'sop-spot-01',
    code: 'SOP-SPOT-01',
    title: 'Spot-the-Mistake: Hazard Hunt Area Staging Palet',
    description: 'Tantangan visual kejelian menemukan potensi bahaya K3 dan anomali susunan palet di area gudang dalam batas waktu tertentu.',
    category: 'K3 & Safety',
    difficulty: 'Intermediate',
    presentationFormat: 'spot_the_mistake',
    targetDivisions: ['ALL'],
    targetRoles: ['ALL'],
    estimatedMinutes: 2,
    pointsReward: 60,
    badgeIcon: 'ShieldAlert',
    isMandatory: false,
    version: 'v1.0',
    isActive: true,
    author: 'HSE Committee Lead',
    createdAt: '2026-09-01T00:00:00.000Z',
    updatedAt: '2026-09-01T00:00:00.000Z',
    slides: [
      {
        id: 'spot-s1',
        slideNumber: 1,
        slideType: 'spot_the_mistake',
        title: 'Tantangan 1: Inspeksi Kerapihan & Kestabilan Tumpukan Palet',
        subtitle: 'Perhatikan susunan palet pada foto berikut dan temukan anomali K3 yang membahayakan.',
        audioNarrationText: 'Amati gambar dengan seksama. Ketuk titik anomali atau tumpukan berbahaya yang dapat memicu kecelakaan kerja.',
        imageUrl: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=1200&q=80',
        spotMistakeConfig: {
          challengePrompt: '⚠️ Temukan 1 tumpukan muatan palet yang melebihi batas aman (Overhang) pada gambar!',
          targetXPercent: 55,
          targetYPercent: 35,
          toleranceRadiusPercent: 18,
          hazardName: 'Overhanging Pallet Load (> 10cm)',
          explanation: 'Muatan kardus melebihi bibir palet kayu dan miring tanpa pengikat wrapping plastik berisiko fatal jatuh menimpa personel di sekitarnya.',
          timeLimitSeconds: 25,
        },
      },
      {
        id: 'spot-s2',
        slideNumber: 2,
        slideType: 'quiz_checkpoint',
        title: 'Evaluasi: Batas Toleransi Tumpukan Gudang',
        subtitle: 'Konfirmasi pemahaman kaidah K3 penataan barang.',
        audioNarrationText: 'Selesaikan kuis evaluasi kepatuhan untuk mengklaim poin.',
        quiz: {
          id: 'q-spot-01',
          question: 'Berapakah batas maksimum kemiringan tumpukan palet yang diizinkan sebelum wajib ditata ulang?',
          options: [
            'Boleh miring hingga 45 derajat',
            'Maksimum kemiringan 2 derajat atau tidak terlihat kasat mata (tegak lurus sempurna)',
            'Tergantung berat jenis barang',
            'Tidak ada aturan baku selama tidak menyentuh tiang'
          ],
          correctAnswerIndex: 1,
          explanation: 'Tumpukan palet wajib tegak lurus sempurna dengan toleransi maksimal kemiringan sangat minim (2 derajat) untuk menjamin titik gravitasi stabil.',
          points: 60,
        },
      }
    ]
  }
];

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
 * Mark an SOP as completed atomically with idempotency protection and offline queue
 */
export async function completeSopModule(
  workerId: string,
  sopId: string,
  timeSpentSeconds = 180,
  quizScore = 100
): Promise<{ success: boolean; pointsAdded: number; message: string; isOfflineQueued?: boolean }> {
  const dateKey = new Date().toISOString().slice(0, 10);
  const idempotencyKey = `${workerId}_${sopId}_${dateKey}`;

  // 1. Try Supabase Atomic RPC if online
  if (OfflineSopService.isOnline()) {
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
      console.warn('[SopService] RPC complete SOP failed, falling back to offline queue:', err);
    }
  }

  // 2. Offline / Network blind-spot fallback: Enqueue for background sync
  OfflineSopService.enqueueCompletion({
    workerId,
    moduleId: sopId,
    score: quizScore,
    pointsAwarded: 50,
    idempotencyKey,
  });

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
    isOfflineQueued: true,
    message: 'Tersimpan Offline! Hasil evaluasi SOP akan disinkronkan otomatis saat terhubung internet.',
  };
}

/**
 * Flush and sync all offline completions to Supabase when network is restored
 */
export async function flushOfflineSopCompletions(): Promise<number> {
  if (!OfflineSopService.isOnline()) return 0;

  const res = await OfflineSopService.flushSyncQueue(async (item) => {
    try {
      const { error } = await supabase.rpc('rpc_complete_sop_module', {
        p_worker_id: item.workerId,
        p_sop_id: item.moduleId,
        p_time_spent: 180,
        p_quiz_score: item.score,
      });
      return !error;
    } catch {
      return false;
    }
  });

  return res.syncedCount;
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
