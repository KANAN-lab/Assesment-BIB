/**
 * Zero-Base64 Storage Sanitizer & Quota Protector
 *
 * Mencegah QuotaExceededError pada LocalStorage (~5MB limit) dengan cara:
 * 1. Menolak dan menyaring string `data:image/...` (Base64) agar tidak pernah disimpan ke LocalStorage.
 * 2. Menyediakan wrapper `safeLocalStorageSetItem` dengan pemulihan otomatis saat kuota hampir penuh.
 * 3. Menyediakan fungsi migrasi `cleanExistingLocalStorageQuota` yang membersihkan sampah Base64 lama dari browser.
 */

export const FALLBACK_IMAGE_CDN =
  'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=800&q=80';

/**
 * Cek apakah sebuah string adalah Base64 data URL yang boros memori
 */
export function isBase64DataUrl(val: unknown): boolean {
  if (typeof val !== 'string') return false;
  return (
    val.startsWith('data:image/') ||
    val.startsWith('data:application/') ||
    val.startsWith('blob:') ||
    (val.startsWith('data:') && val.length > 500)
  );
}

/**
 * Sanitasi rekursif object atau array untuk membuang semua string Base64
 * dan menggantikannya dengan URL CDN ringkas.
 */
export function sanitizeDataForStorage<T>(input: T): T {
  if (input === null || input === undefined) return input;

  if (typeof input === 'string') {
    if (isBase64DataUrl(input)) {
      return FALLBACK_IMAGE_CDN as unknown as T;
    }
    return input;
  }

  if (Array.isArray(input)) {
    return input.map((item) => sanitizeDataForStorage(item)) as unknown as T;
  }

  if (typeof input === 'object') {
    const sanitizedObj: Record<string, any> = {};
    for (const [key, value] of Object.entries(input as Record<string, any>)) {
      if (isBase64DataUrl(value)) {
        // Ganti Base64 raksasa dengan URL CDN ringkas
        sanitizedObj[key] = FALLBACK_IMAGE_CDN;
      } else if (typeof value === 'object' && value !== null) {
        sanitizedObj[key] = sanitizeDataForStorage(value);
      } else {
        sanitizedObj[key] = value;
      }
    }
    return sanitizedObj as T;
  }

  return input;
}

/**
 * Penyimpanan LocalStorage aman yang anti-QuotaExceededError.
 * Otomatis sanitasi Base64 sebelum disimpan.
 */
export function safeLocalStorageSetItem(key: string, value: any): boolean {
  if (typeof window === 'undefined' || !window.localStorage) return false;

  try {
    // 1. Sanitasi data agar bebas dari Base64
    const cleanData = sanitizeDataForStorage(value);
    const serialized = typeof cleanData === 'string' ? cleanData : JSON.stringify(cleanData);

    // 2. Coba simpan
    localStorage.setItem(key, serialized);
    return true;
  } catch (err: any) {
    const isQuotaError =
      err?.name === 'QuotaExceededError' ||
      err?.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
      err?.code === 22 ||
      err?.code === 1014 ||
      err?.message?.includes('quota') ||
      err?.message?.includes('Quota');

    if (isQuotaError) {
      console.warn(`[storageSanitizer] LocalStorage kuota terlampaui saat menyimpan '${key}'. Menjalankan auto-cleanup...`);
      
      // Jalankan pembersihan sampah Base64 dari seluruh LocalStorage
      cleanExistingLocalStorageQuota();

      try {
        // Coba simpan ulang setelah pembersihan
        const cleanData = sanitizeDataForStorage(value);
        const serialized = typeof cleanData === 'string' ? cleanData : JSON.stringify(cleanData);
        localStorage.setItem(key, serialized);
        console.info(`[storageSanitizer] Berhasil menyimpan '${key}' setelah auto-cleanup kuota.`);
        return true;
      } catch (retryErr) {
        console.error(`[storageSanitizer] Tetap gagal menyimpan '${key}' setelah pembersihan:`, retryErr);
        return false;
      }
    }

    console.error(`[storageSanitizer] Error menyimpan '${key}' ke localStorage:`, err);
    return false;
  }
}

/**
 * Pindai seluruh isi LocalStorage saat aplikasi boot.
 * Jika ditemukan string `data:image/` yang menumpuk di modul SOP, 5R, Sanksi, dll,
 * otomatis bersihkan dan pulihkan kembali ruang LocalStorage yang tersumbat.
 */
export function cleanExistingLocalStorageQuota(): { freedEstimatedChars: number; cleanedKeys: string[] } {
  if (typeof window === 'undefined' || !window.localStorage) {
    return { freedEstimatedChars: 0, cleanedKeys: [] };
  }

  let totalFreedChars = 0;
  const cleanedKeys: string[] = [];

  const KNOWN_KEYS_TO_INSPECT = [
    'bib_sop_custom_modules_v2',
    'gappy_5s_audit_records_v2',
    'gappy_disciplinary_actions_v2',
    'bib_unified_offline_queue',
    'bib_offline_sop_sync_queue',
    'gappy_sio_records_v1',
  ];

  for (const key of KNOWN_KEYS_TO_INSPECT) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) continue;

      // Jika data mengandung string data:image/ raksasa
      if (raw.includes('data:image/') || raw.includes('data:application/')) {
        const origLength = raw.length;
        const parsed = JSON.parse(raw);
        const cleaned = sanitizeDataForStorage(parsed);
        const newRaw = JSON.stringify(cleaned);

        localStorage.setItem(key, newRaw);
        const freed = origLength - newRaw.length;
        totalFreedChars += freed;
        cleanedKeys.push(key);
        console.info(
          `[storageSanitizer] Dibersihkan key '${key}': membebaskan ~${Math.round(freed / 1024)} KB data Base64.`
        );
      }
    } catch (e) {
      console.warn(`[storageSanitizer] Gagal memindai key '${key}':`, e);
    }
  }

  return { freedEstimatedChars: totalFreedChars, cleanedKeys };
}
