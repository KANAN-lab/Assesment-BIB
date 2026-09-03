/**
 * Hook: useIdempotentSubmit
 *
 * Drop-in wrapper untuk handleSubmit yang sudah ada di setiap komponen.
 * Otomatis inject IdempotencyEngine guard/release tanpa mengubah
 * struktur state/JSX komponen.
 *
 * Penggunaan:
 *   const { submit, isSubmitting, idempotencyError } = useIdempotentSubmit({
 *     workerId,
 *     formType: 'incident',
 *     getPayload: () => ({ incidentType, location, description, severity }),
 *   });
 *
 *   // Di handleSubmit:
 *   await submit(async () => {
 *     // logic submit asli
 *   });
 */

import { useState, useCallback, useRef } from 'react';
import { IdempotencyEngine } from '../domain/IdempotencyEngine';

interface UseIdempotentSubmitOptions {
  /** ID pekerja yang melakukan submit */
  workerId: string;
  /** Nama form/modul — harus unik per jenis form */
  formType: string;
  /**
   * Fungsi yang mengembalikan snapshot payload form saat dipanggil.
   * Dipanggil setiap kali `submit()` dieksekusi untuk mendapat fingerprint terkini.
   */
  getPayload: () => Record<string, unknown>;
}

interface UseIdempotentSubmitReturn {
  /**
   * Jalankan fungsi submit dengan perlindungan idempotency.
   * @param fn  Async function yang berisi logic submit asli
   * @returns   `true` jika submit berhasil, `false` jika ditolak/gagal
   */
  submit: (fn: () => Promise<void>) => Promise<boolean>;
  /** True selama request sedang berjalan */
  isSubmitting: boolean;
  /**
   * Pesan error dari idempotency guard (bukan dari API).
   * Null jika tidak ada konflik.
   */
  idempotencyError: string | null;
  /** Bersihkan idempotency error secara manual */
  clearIdempotencyError: () => void;
  /**
   * Reset idempotency key — pakai ini jika user sudah mengedit form
   * dan ingin submit ulang yang sebelumnya gagal.
   */
  resetKey: () => void;
  /** Idempotency key aktif saat ini (untuk dikirim ke server) */
  currentKey: string;
}

export function useIdempotentSubmit(opts: UseIdempotentSubmitOptions): UseIdempotentSubmitReturn {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [idempotencyError, setIdempotencyError] = useState<string | null>(null);
  const currentKeyRef = useRef<string>('');

  const getKey = useCallback((): string => {
    const payload = opts.getPayload();
    const key = IdempotencyEngine.generateKey(opts.workerId, opts.formType, payload);
    currentKeyRef.current = key;
    return key;
  }, [opts]);

  const submit = useCallback(async (fn: () => Promise<void>): Promise<boolean> => {
    setIdempotencyError(null);
    const key = getKey();

    const guard = IdempotencyEngine.guard(key);
    if (!guard.allowed) {
      setIdempotencyError(guard.reason ?? 'Permintaan duplikat ditolak.');
      return false;
    }

    setIsSubmitting(true);
    let success = false;
    try {
      await fn();
      success = true;
      return true;
    } catch (err) {
      // Biarkan error naik ke caller untuk ditangani komponen
      throw err;
    } finally {
      IdempotencyEngine.release(key, success);
      setIsSubmitting(false);
    }
  }, [getKey]);

  const clearIdempotencyError = useCallback(() => setIdempotencyError(null), []);

  const resetKey = useCallback(() => {
    const key = getKey();
    IdempotencyEngine.reset(key);
    setIdempotencyError(null);
  }, [getKey]);

  return {
    submit,
    isSubmitting,
    idempotencyError,
    clearIdempotencyError,
    resetKey,
    currentKey: currentKeyRef.current,
  };
}
