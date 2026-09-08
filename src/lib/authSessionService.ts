import { WorkerProfile } from '../types/assessment';

const CACHED_WORKER_KEY = 'komar_cached_worker_profile';
const SHARED_DEVICE_KEY = 'komar_shared_device_mode';
const AUTH_CHANNEL_NAME = 'komar_auth_channel';

export interface AuthBroadcastPayload {
  action: 'login' | 'logout';
  workerId?: string;
  timestamp: number;
}

export class AuthSessionService {
  private static channel: BroadcastChannel | null = (() => {
    try {
      return typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel(AUTH_CHANNEL_NAME) : null;
    } catch {
      return null;
    }
  })();

  /**
   * Menyimpan snapshot profil pekerja aktif ke cache lokal untuk ketahanan offline
   */
  public static saveCachedWorker(worker: WorkerProfile): void {
    try {
      localStorage.setItem(CACHED_WORKER_KEY, JSON.stringify(worker));
      localStorage.setItem('komar_active_worker_id', worker.id);
    } catch (err) {
      console.warn('[AuthSessionService] Gagal menyimpan cache profil pekerja:', err);
    }
  }

  /**
   * Mengambil snapshot profil pekerja aktif dari cache lokal
   */
  public static getCachedWorker(): WorkerProfile | null {
    try {
      const raw = localStorage.getItem(CACHED_WORKER_KEY);
      if (!raw) return null;
      return JSON.parse(raw) as WorkerProfile;
    } catch {
      return null;
    }
  }

  /**
   * Menghapus cache profil dan penanda sesi saat logout
   */
  public static clearCachedWorker(): void {
    try {
      localStorage.removeItem(CACHED_WORKER_KEY);
      localStorage.removeItem('komar_active_worker_id');
      localStorage.removeItem(SHARED_DEVICE_KEY);
    } catch (err) {
      console.warn('[AuthSessionService] Gagal membersihkan cache sesi:', err);
    }
  }

  /**
   * Mengatur preferensi mode komputer bersama (kiosk) vs perangkat pribadi
   */
  public static setSharedDeviceMode(isShared: boolean): void {
    try {
      if (isShared) {
        localStorage.setItem(SHARED_DEVICE_KEY, 'true');
      } else {
        localStorage.removeItem(SHARED_DEVICE_KEY);
      }
    } catch {
      // Fallback
    }
  }

  /**
   * Memeriksa apakah sesi saat ini berjalan pada mode komputer bersama (kiosk)
   */
  public static isSharedDeviceMode(): boolean {
    try {
      return localStorage.getItem(SHARED_DEVICE_KEY) === 'true';
    } catch {
      return false;
    }
  }

  /**
   * Menyiarkan event login ke seluruh tab browser lain
   */
  public static broadcastLogin(workerId: string): void {
    const payload: AuthBroadcastPayload = {
      action: 'login',
      workerId,
      timestamp: Date.now(),
    };
    try {
      this.channel?.postMessage(payload);
    } catch {
      // Fallback
    }
  }

  /**
   * Menyiarkan event logout ke seluruh tab browser lain
   */
  public static broadcastLogout(): void {
    const payload: AuthBroadcastPayload = {
      action: 'logout',
      timestamp: Date.now(),
    };
    try {
      this.channel?.postMessage(payload);
    } catch {
      // Fallback
    }
  }

  /**
   * Mendaftarkan pendengar sinkronisasi status autentikasi antartab browser
   */
  public static onAuthChange(
    callback: (event: 'login' | 'logout', workerId?: string) => void
  ): () => void {
    let lastProcessedTime = 0;
    let lastAction: string | null = null;
    let lastWorkerId: string | undefined = undefined;

    const dedupeCallback = (action: 'login' | 'logout', workerId?: string) => {
      const now = Date.now();
      // Mencegah double-trigger dalam interval 400ms jika BroadcastChannel dan storage event memicu bersamaan
      if (now - lastProcessedTime < 400 && lastAction === action && lastWorkerId === workerId) {
        return;
      }
      lastProcessedTime = now;
      lastAction = action;
      lastWorkerId = workerId;
      callback(action, workerId);
    };

    const handleChannelMessage = (e: MessageEvent<AuthBroadcastPayload>) => {
      if (e.data && (e.data.action === 'login' || e.data.action === 'logout')) {
        dedupeCallback(e.data.action, e.data.workerId);
      }
    };

    const handleStorageEvent = (e: StorageEvent) => {
      if (e.key === 'komar_active_worker_id') {
        if (!e.newValue) {
          dedupeCallback('logout');
        } else if (e.newValue !== e.oldValue) {
          dedupeCallback('login', e.newValue);
        }
      }
    };

    if (this.channel) {
      this.channel.addEventListener('message', handleChannelMessage);
    }
    window.addEventListener('storage', handleStorageEvent);

    return () => {
      if (this.channel) {
        this.channel.removeEventListener('message', handleChannelMessage);
      }
      window.removeEventListener('storage', handleStorageEvent);
    };
  }
}
