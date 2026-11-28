import { supabase } from './supabaseClient';

/**
 * Layanan "Data & Pemeliharaan" (Backup / Reset / Pulihkan nilai).
 * Semua operasi destruktif dijalankan di SERVER (fungsi SQL maint_*) dan
 * mewajibkan OTP yang dikirim ke email pemilik oleh Edge Function.
 * Browser tidak pernah menerima kode OTP.
 */

export type MaintPart =
  | 'core'
  | 'operational_points'
  | 'score_history'
  | 'competency'
  | 'badges'
  | 'daily_flags'
  | 'sop_scores';

export const MAINT_PARTS: { key: MaintPart; label: string; hint: string }[] = [
  { key: 'core', label: 'Poin, tier, skor BIB & streak', hint: 'Saldo poin (total/operasional/prestise), tier kembali ke Novice, skor BIB 0, streak 0' },
  { key: 'operational_points', label: 'Poin operasional bulanan saja', hint: 'Hanya reset saldo poin harian ke 0 (poin prestasi, tier, skor BIB & streak tetap utuh)' },
  { key: 'score_history', label: 'Riwayat skor (grafik tren)', hint: 'Menghapus riwayat skor BIB & poin' },
  { key: 'competency', label: 'Skor kompetensi', hint: 'Menghapus skor audit kompetensi per pekerja' },
  { key: 'badges', label: 'Badge yang diraih', hint: 'Menghapus badge milik pekerja (katalog badge tetap)' },
  { key: 'daily_flags', label: 'Flag kuis & checklist harian', hint: 'Pekerja bisa mengisi ulang kuis dan checklist hari ini' },
  { key: 'sop_scores', label: 'Skor kuis SOP', hint: 'Nilai kuis SOP jadi 0 dan penanda poin SOP direset (status selesai tetap)' },
];

export interface BackupMeta {
  id: string;
  created_at: string;
  created_by: string | null;
  label: string | null;
  kind: 'manual' | 'auto_before_reset' | 'auto_before_restore';
  worker_count: number;
  total_points: number;
}

export interface MaintLogEntry {
  id: string;
  created_at: string;
  action: string;
  actor: string | null;
  detail: Record<string, unknown>;
}

export interface MaintResult {
  ok: boolean;
  error?: string;
  [key: string]: unknown;
}

const GENERIC_ERROR = 'Terjadi kesalahan. Pastikan migrasi SQL "Data & Pemeliharaan" sudah dijalankan.';

export class DataMaintenanceService {
  static async listBackups(): Promise<BackupMeta[]> {
    const { data, error } = await supabase.rpc('maint_list_backups');
    if (error) throw new Error(error.message || GENERIC_ERROR);
    return (data as BackupMeta[]) || [];
  }

  static async listLog(limit = 15): Promise<MaintLogEntry[]> {
    const { data, error } = await supabase.rpc('maint_list_log', { p_limit: limit });
    if (error) throw new Error(error.message || GENERIC_ERROR);
    return (data as MaintLogEntry[]) || [];
  }

  static async createBackup(actor: string, label?: string): Promise<MaintResult> {
    const { data, error } = await supabase.rpc('maint_create_backup', {
      p_actor: actor,
      p_label: label?.trim() || null,
    });
    if (error) return { ok: false, error: error.message || GENERIC_ERROR };
    return data as MaintResult;
  }

  /** Meminta server mengirim OTP ke email pemilik. Kode TIDAK dikembalikan ke browser. */
  static async requestOtp(params: {
    action: 'reset' | 'restore';
    workerIds: string[] | null;
    parts: MaintPart[];
    backupId?: string | null;
  }): Promise<{ ok: boolean; error?: string; maskedTo?: string; expiresInSec?: number }> {
    const { data, error } = await supabase.functions.invoke('send-maintenance-otp', {
      body: {
        action: params.action,
        workerIds: params.workerIds,
        parts: params.parts,
        backupId: params.backupId ?? null,
      },
    });
    if (error) {
      // Tampilkan penyebab asli: jenis error, kode HTTP, dan pesan dari server (jika ada).
      const err = error as any;
      const ctx = err?.context;
      const status: number | undefined = typeof ctx?.status === 'number' ? ctx.status : undefined;
      let serverMsg = '';
      try {
        if (ctx && typeof ctx.text === 'function') {
          const raw: string = await (typeof ctx.clone === 'function' ? ctx.clone() : ctx).text();
          try {
            const parsed = JSON.parse(raw);
            serverMsg = String(parsed?.error ?? parsed?.message ?? '');
          } catch {
            serverMsg = raw.slice(0, 160);
          }
        }
      } catch {
        /* isi respons tidak terbaca; lanjut dengan info yang ada */
      }
      const kind = err?.name || 'Error';
      const detail = serverMsg || err?.message || 'tidak ada detail';
      return {
        ok: false,
        error: `Gagal meminta kode OTP [${kind}${status ? ` · HTTP ${status}` : ''}]: ${detail}`,
      };
    }

    // Jaga-jaga bila respons 200 tiba sebagai teks, bukan objek.
    let result: any = data;
    if (typeof result === 'string') {
      try {
        result = JSON.parse(result);
      } catch {
        return { ok: false, error: 'Respons server tidak dapat dibaca.' };
      }
    }
    if (!result || typeof result !== 'object') {
      return { ok: false, error: 'Respons server kosong. Coba lagi.' };
    }
    return result as { ok: boolean; error?: string; maskedTo?: string; expiresInSec?: number };
  }

  static async reset(params: {
    actor: string;
    workerIds: string[] | null;
    parts: MaintPart[];
    code: string;
  }): Promise<MaintResult> {
    const { data, error } = await supabase.rpc('maint_reset', {
      p_actor: params.actor,
      p_worker_ids: params.workerIds,
      p_parts: params.parts,
      p_code: params.code,
    });
    if (error) return { ok: false, error: error.message || GENERIC_ERROR };
    return data as MaintResult;
  }

  static async restore(params: {
    actor: string;
    backupId: string;
    parts: MaintPart[];
    code: string;
  }): Promise<MaintResult> {
    const { data, error } = await supabase.rpc('maint_restore', {
      p_actor: params.actor,
      p_backup_id: params.backupId,
      p_parts: params.parts,
      p_code: params.code,
    });
    if (error) return { ok: false, error: error.message || GENERIC_ERROR };
    return data as MaintResult;
  }

  /** Unduh CSV ringkasan nilai pekerja dari satu backup. */
  static async downloadBackupCsv(backupId: string): Promise<void> {
    const { data, error } = await supabase.rpc('maint_get_backup', { p_id: backupId });
    if (error || !data) throw new Error(error?.message || 'Backup tidak ditemukan.');

    const rows: any[] = data.payload?.workers || [];
    const cols = [
      'employee_id', 'name', 'division', 'total_points', 'operational_points', 'prestige_points',
      'tier', 'bib_behavior', 'bib_integrity', 'bib_benchmark', 'bib_total_score', 'streak_days',
    ];
    const esc = (v: unknown) => {
      const s = v === null || v === undefined ? '' : String(v);
      // Cegah formula injection di Excel/Sheets.
      const safe = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
      return /[",\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
    };
    const csv = [cols.join(','), ...rows.map((r) => cols.map((c) => esc(r[c])).join(','))].join('\r\n');

    const stamp = String(data.created_at || '').slice(0, 19).replace(/[:T]/g, '-');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `backup-nilai-${stamp || backupId}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }
}
