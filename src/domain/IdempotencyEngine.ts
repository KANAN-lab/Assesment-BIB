/**
 * OOP Domain Layer: IdempotencyEngine
 *
 * Mencegah double submit di semua form sensitif melalui:
 * 1. Content fingerprint hash (FNV-1a) dari kombinasi workerId + formType + isi form
 * 2. In-flight tracker (Set) — tolak request yang sedang berjalan dengan key sama
 * 3. Client-side TTL dedup window (localStorage) — tolak submit ulang dalam 60 detik
 *
 * Layer server-side: idempotency_key dikirim ke Supabase dan ditolak oleh UNIQUE constraint.
 */

const STORAGE_NS = 'bib_idemp_v1';
const CLIENT_TTL_MS = 60_000; // 60 detik dedup window

interface IdempotencyRecord {
  key: string;
  submittedAt: number;
  status: 'in-flight' | 'success' | 'failed';
}

export class IdempotencyEngine {
  /** Set key yang sedang dalam proses in-flight */
  private static inFlight = new Set<string>();

  // ─── PUBLIC API ──────────────────────────────────────────────────

  /**
   * Generate idempotency key dari kombinasi stabil konten form.
   * Output: string deterministik — input sama selalu → key sama.
   *
   * @param workerId  ID pekerja yang melakukan submit
   * @param formType  Nama form/modul (e.g. 'incident', 'kaizen', 'disciplinary')
   * @param payload   Object isi form (akan di-canonicalize sebelum di-hash)
   */
  public static generateKey(workerId: string, formType: string, payload: Record<string, unknown>): string {
    const canonical = this.canonicalize({ workerId, formType, ...payload });
    const hash = this.fnv1a32(canonical);
    return `${formType}_${workerId.slice(-6)}_${hash}`;
  }

  /**
   * Guard: cek apakah submit dengan key ini boleh dilanjutkan.
   *
   * Returns `{ allowed: true }` jika boleh.
   * Returns `{ allowed: false, reason: string }` jika harus ditolak.
   *
   * Jika allowed, secara otomatis mark key sebagai 'in-flight' untuk mencegah parallel submit.
   */
  public static guard(key: string): { allowed: boolean; reason?: string } {
    // 1. Cek in-flight (race condition: klik 2x cepat saat request belum selesai)
    if (this.inFlight.has(key)) {
      return { allowed: false, reason: 'Permintaan sedang diproses. Harap tunggu.' };
    }

    // 2. Cek client-side TTL dedup window
    const record = this.getRecord(key);
    if (record && record.status === 'success') {
      const elapsed = Date.now() - record.submittedAt;
      if (elapsed < CLIENT_TTL_MS) {
        return {
          allowed: false,
          reason: `Data ini sudah berhasil disubmit ${Math.ceil(elapsed / 1000)} detik lalu. Harap tunggu sebelum mengirim ulang.`,
        };
      }
    }

    // 3. Boleh — mark sebagai in-flight
    this.inFlight.add(key);
    this.saveRecord({ key, submittedAt: Date.now(), status: 'in-flight' });
    return { allowed: true };
  }

  /**
   * Bebaskan key setelah request selesai (sukses atau gagal).
   * Harus selalu dipanggil di finally block.
   */
  public static release(key: string, success: boolean): void {
    this.inFlight.delete(key);
    const record = this.getRecord(key);
    if (record) {
      this.saveRecord({ ...record, status: success ? 'success' : 'failed' });
    }

    // Bersihkan record lama (> 10 menit) agar localStorage tidak penuh
    this.pruneStale();
  }

  /**
   * Reset paksa key tertentu (dipakai jika user secara sengaja ingin submit ulang setelah gagal)
   */
  public static reset(key: string): void {
    this.inFlight.delete(key);
    const all = this.loadAll();
    const filtered = all.filter((r) => r.key !== key);
    this.saveAll(filtered);
  }

  /**
   * Cek apakah key ini sedang in-flight (untuk disable UI tombol Submit)
   */
  public static isInFlight(key: string): boolean {
    return this.inFlight.has(key);
  }

  // ─── PRIVATE HELPERS ─────────────────────────────────────────────

  /**
   * FNV-1a 32-bit hash — deterministik, cepat, zero dependency
   */
  private static fnv1a32(str: string): string {
    let hash = 0x811c9dc5;
    for (let i = 0; i < str.length; i++) {
      hash ^= str.charCodeAt(i);
      hash = (hash * 0x01000193) >>> 0;
    }
    return hash.toString(16).padStart(8, '0');
  }

  /**
   * Ubah objek menjadi string yang stabil (key diurutkan, tipe konsisten).
   * Menghapus field yang tidak stabil: timestamps, ID generated, file objects.
   */
  private static canonicalize(obj: Record<string, unknown>): string {
    const UNSTABLE_KEYS = new Set(['id', 'createdAt', 'updatedAt', 'timestamp', 'occurredAt', 'issuedAt', 'auditDate']);
    const clean = (o: unknown): unknown => {
      if (o === null || o === undefined) return null;
      if (o instanceof File || o instanceof Blob) return `[File:${(o as File).name ?? 'blob'}]`;
      if (Array.isArray(o)) return o.map(clean);
      if (typeof o === 'object') {
        return Object.fromEntries(
          Object.entries(o as Record<string, unknown>)
            .filter(([k]) => !UNSTABLE_KEYS.has(k))
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([k, v]) => [k, clean(v)])
        );
      }
      if (typeof o === 'string') return o.trim().toLowerCase();
      return o;
    };
    return JSON.stringify(clean(obj));
  }

  private static getRecord(key: string): IdempotencyRecord | null {
    return this.loadAll().find((r) => r.key === key) ?? null;
  }

  private static saveRecord(record: IdempotencyRecord): void {
    const all = this.loadAll();
    const idx = all.findIndex((r) => r.key === record.key);
    if (idx >= 0) all[idx] = record;
    else all.push(record);
    this.saveAll(all);
  }

  private static loadAll(): IdempotencyRecord[] {
    try {
      const raw = localStorage.getItem(STORAGE_NS);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  private static saveAll(records: IdempotencyRecord[]): void {
    try {
      localStorage.setItem(STORAGE_NS, JSON.stringify(records));
    } catch {
      // localStorage penuh — ignore, in-memory Set masih berfungsi
    }
  }

  private static pruneStale(): void {
    const STALE_THRESHOLD = 10 * 60 * 1000; // 10 menit
    const now = Date.now();
    const all = this.loadAll();
    const fresh = all.filter((r) => now - r.submittedAt < STALE_THRESHOLD);
    if (fresh.length < all.length) this.saveAll(fresh);
  }
}
