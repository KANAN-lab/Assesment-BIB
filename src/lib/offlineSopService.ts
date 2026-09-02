import { SopModule } from '../types/sop';

export interface OfflineSopCompletion {
  id: string;
  workerId: string;
  moduleId: string;
  score: number;
  pointsAwarded: number;
  timestamp: string;
  idempotencyKey: string;
}

const STORAGE_KEYS = {
  CACHED_MODULES: 'bib_offline_cached_sop_modules',
  SYNC_QUEUE: 'bib_offline_sop_sync_queue',
  LAST_SYNC: 'bib_offline_sop_last_sync',
};

export const OfflineSopService = {
  /**
   * Cek apakah perangkat saat ini sedang terhubung ke internet
   */
  isOnline(): boolean {
    return typeof navigator !== 'undefined' && navigator.onLine;
  },

  /**
   * Menyimpan daftar modul SOP ke cache lokal perangkat
   */
  cacheModules(modules: SopModule[]): void {
    try {
      if (!modules || modules.length === 0) return;
      localStorage.setItem(STORAGE_KEYS.CACHED_MODULES, JSON.stringify(modules));
      localStorage.setItem(STORAGE_KEYS.LAST_SYNC, new Date().toISOString());
    } catch (e) {
      console.warn('[OfflineSopService] Gagal menyimpan cache modul SOP:', e);
    }
  },

  /**
   * Mengambil modul SOP dari cache lokal (digunakan saat offline/blind spot)
   */
  getCachedModules(): SopModule[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.CACHED_MODULES);
      if (!raw) return [];
      return JSON.parse(raw) as SopModule[];
    } catch (e) {
      console.warn('[OfflineSopService] Gagal membaca cache modul SOP:', e);
      return [];
    }
  },

  /**
   * Memasukkan hasil penyelesaian SOP saat offline ke antrean sinkronisasi
   */
  enqueueCompletion(completion: Omit<OfflineSopCompletion, 'id' | 'timestamp'>): void {
    try {
      const queue = this.getSyncQueue();
      const newEntry: OfflineSopCompletion = {
        ...completion,
        id: `offline_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        timestamp: new Date().toISOString(),
      };

      // Cegah duplikasi berdasarkan idempotencyKey
      if (!queue.some(q => q.idempotencyKey === newEntry.idempotencyKey)) {
        queue.push(newEntry);
        localStorage.setItem(STORAGE_KEYS.SYNC_QUEUE, JSON.stringify(queue));
      }
    } catch (e) {
      console.warn('[OfflineSopService] Gagal memasukkan completion ke antrean offline:', e);
    }
  },

  /**
   * Mengambil antrean sinkronisasi offline
   */
  getSyncQueue(): OfflineSopCompletion[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.SYNC_QUEUE);
      if (!raw) return [];
      return JSON.parse(raw) as OfflineSopCompletion[];
    } catch (e) {
      return [];
    }
  },

  /**
   * Mengirim seluruh antrean offline ke server saat online
   */
  async flushSyncQueue(
    syncHandler: (item: OfflineSopCompletion) => Promise<boolean>
  ): Promise<{ syncedCount: number; remainingCount: number }> {
    const queue = this.getSyncQueue();
    if (queue.length === 0) return { syncedCount: 0, remainingCount: 0 };

    const remaining: OfflineSopCompletion[] = [];
    let syncedCount = 0;

    for (const item of queue) {
      try {
        const success = await syncHandler(item);
        if (success) {
          syncedCount++;
        } else {
          remaining.push(item);
        }
      } catch {
        remaining.push(item);
      }
    }

    localStorage.setItem(STORAGE_KEYS.SYNC_QUEUE, JSON.stringify(remaining));
    return { syncedCount, remainingCount: remaining.length };
  },

  /**
   * Hapus antrean selesai
   */
  clearQueue(): void {
    localStorage.removeItem(STORAGE_KEYS.SYNC_QUEUE);
  }
};
