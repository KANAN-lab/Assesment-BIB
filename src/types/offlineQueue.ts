/**
 * Model & Definisi Tipe Antrean Sinkronisasi Offline (Phase 26)
 * Mendukung persistensi IndexedDB / LocalStorage saat operasional di area blind spot gudang.
 */

export type OfflineQueueItemType =
  | 'sop_completion'
  | 'pre_shift_checklist'
  | 'daily_quiz'
  | 'incident_report'
  | 'kudo'
  | 'kaizen_submission'
  | 'safety_patrol';

export type SyncStatus = 'pending' | 'syncing' | 'failed' | 'success';

export interface OfflineQueueItem<T = any> {
  id: string;
  type: OfflineQueueItemType;
  title: string;
  subtitle?: string;
  workerId: string;
  workerName?: string;
  payload: T;
  timestamp: string;
  status: SyncStatus;
  retryCount: number;
  lastError?: string;
  idempotencyKey: string;
  estimatedSizeBytes?: number;
}

export interface QueueSyncSummary {
  totalItems: number;
  pendingCount: number;
  syncingCount: number;
  failedCount: number;
  successCount: number;
  isOnline: boolean;
  lastSyncTimestamp: string | null;
  estimatedTotalSizeKb: number;
  hasDelayedItems: boolean;
}
