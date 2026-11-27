import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Database,
  Download,
  History,
  Loader2,
  RotateCcw,
  Search,
  ShieldAlert,
  ShieldCheck,
  Mail,
  CheckCircle2,
} from 'lucide-react';
import type { WorkerProfile } from '../types/assessment';
import {
  DataMaintenanceService,
  MAINT_PARTS,
  type BackupMeta,
  type MaintLogEntry,
  type MaintPart,
  type MaintResult,
} from '../lib/dataMaintenanceService';
import { SwalService } from '../domain/SwalService';

interface DataMaintenancePanelProps {
  workers: WorkerProfile[];
  currentAdminId?: string;
  onWorkersUpdated?: () => void;
  showToast?: (message: string) => void;
}

const KIND_LABEL: Record<BackupMeta['kind'], string> = {
  manual: 'Manual',
  auto_before_reset: 'Otomatis · sebelum reset',
  auto_before_restore: 'Otomatis · sebelum pulihkan',
};

const ACTION_LABEL: Record<string, string> = {
  backup: 'Backup',
  reset: 'Reset nilai',
  restore: 'Pulihkan',
};

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

const fmtNum = (n: number) => new Intl.NumberFormat('id-ID').format(n);

/* -------------------------------------------------------------------------- */
/*  OtpGate: kata konfirmasi -> kirim OTP ke email -> masukkan kode -> eksekusi */
/* -------------------------------------------------------------------------- */

interface OtpGateProps {
  confirmWord: string;
  summary: string;
  disabled: boolean;
  disabledReason?: string;
  submitLabel: string;
  /** Berubah => kode OTP yang sedang berjalan dibatalkan (OTP terikat pada pilihan). */
  scopeKey: string;
  requestOtp: () => Promise<{ ok: boolean; error?: string; maskedTo?: string; expiresInSec?: number }>;
  execute: (code: string) => Promise<MaintResult>;
  onSuccess: (result: MaintResult) => void;
}

const OtpGate: React.FC<OtpGateProps> = ({
  confirmWord,
  summary,
  disabled,
  disabledReason,
  submitLabel,
  scopeKey,
  requestOtp,
  execute,
  onSuccess,
}) => {
  const [typed, setTyped] = useState('');
  const [stage, setStage] = useState<'confirm' | 'otp'>('confirm');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [maskedTo, setMaskedTo] = useState('');
  const [expiresAt, setExpiresAt] = useState<number | null>(null);
  const [resendAt, setResendAt] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());

  // Pilihan berubah => batalkan sesi OTP.
  useEffect(() => {
    setStage('confirm');
    setCode('');
    setError(null);
    setExpiresAt(null);
  }, [scopeKey]);

  useEffect(() => {
    if (stage !== 'otp') return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [stage]);

  const sendCode = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await requestOtp();
      if (!res.ok) {
        setError(res.error || 'Gagal meminta kode.');
        return;
      }
      setMaskedTo(res.maskedTo || '');
      const ttl = (res.expiresInSec ?? 300) * 1000;
      setExpiresAt(Date.now() + ttl);
      setResendAt(Date.now() + 60_000);
      setNow(Date.now());
      setCode('');
      setStage('otp');
    } finally {
      setBusy(false);
    }
  };

  const run = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await execute(code);
      if (!res.ok) {
        setError(res.error || 'Gagal menjalankan aksi.');
        if (/diblokir|kedaluwarsa|tidak ditemukan|Terlalu banyak/i.test(res.error || '')) {
          setStage('confirm');
          setCode('');
        }
        return;
      }
      setStage('confirm');
      setTyped('');
      setCode('');
      onSuccess(res);
    } finally {
      setBusy(false);
    }
  };

  const secLeft = expiresAt ? Math.max(0, Math.ceil((expiresAt - now) / 1000)) : 0;
  const resendLeft = resendAt ? Math.max(0, Math.ceil((resendAt - now) / 1000)) : 0;
  const expired = stage === 'otp' && secLeft === 0;
  const mmss = `${Math.floor(secLeft / 60)}:${String(secLeft % 60).padStart(2, '0')}`;

  return (
    <div className="space-y-3">
      <div className="bg-rose-950/20 border border-rose-900/40 rounded-xl p-3 text-xs text-rose-200 leading-relaxed">
        <b>Yang akan dilakukan:</b> {summary}
        <br />
        Backup otomatis dibuat tepat sebelum eksekusi, jadi tindakan ini bisa dipulihkan.
      </div>

      {stage === 'confirm' && (
        <div className="space-y-2">
          <label className="block text-xs font-bold text-zinc-300">
            Ketik <span className="font-mono text-rose-400">{confirmWord}</span> untuk melanjutkan
          </label>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              placeholder={confirmWord}
              autoComplete="off"
              className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-rose-500 font-mono"
            />
            <button
              type="button"
              onClick={sendCode}
              disabled={busy || disabled || typed.trim() !== confirmWord}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-black text-xs rounded-xl transition flex items-center justify-center gap-2"
            >
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
              <span>Kirim kode OTP ke email</span>
            </button>
          </div>
          {disabled && disabledReason && <p className="text-[11px] text-amber-400">{disabledReason}</p>}
        </div>
      )}

      {stage === 'otp' && (
        <div className="space-y-2">
          <p className="text-xs text-zinc-300">
            Kode 6 digit dikirim ke <b className="text-white font-mono">{maskedTo}</b>.{' '}
            {expired ? (
              <span className="text-amber-400 font-bold">Kode kedaluwarsa.</span>
            ) : (
              <span className="text-zinc-400">
                Berlaku <span className="font-mono text-zinc-200">{mmss}</span>
              </span>
            )}
          </p>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="000000"
              className="sm:w-40 bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-center text-sm tracking-[0.4em] text-white placeholder-zinc-700 focus:outline-none focus:border-rose-500 font-mono"
            />
            <button
              type="button"
              onClick={run}
              disabled={busy || expired || code.length !== 6}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-black text-xs rounded-xl transition flex items-center justify-center gap-2"
            >
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldAlert className="w-4 h-4" />}
              <span>{submitLabel}</span>
            </button>
            <button
              type="button"
              onClick={sendCode}
              disabled={busy || resendLeft > 0}
              className="px-3 py-2 bg-zinc-900 hover:bg-zinc-800 disabled:opacity-40 border border-zinc-700 text-zinc-300 font-bold text-xs rounded-xl transition"
            >
              {resendLeft > 0 ? `Kirim ulang (${resendLeft}d)` : 'Kirim ulang kode'}
            </button>
          </div>
        </div>
      )}

      {error && (
        <p className="text-xs text-rose-400 font-bold bg-rose-950/30 border border-rose-900/40 rounded-lg px-3 py-2">
          {error}
        </p>
      )}
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/*  Pemilih jenis data                                                         */
/* -------------------------------------------------------------------------- */

const PartPicker: React.FC<{
  value: MaintPart[];
  onChange: (v: MaintPart[]) => void;
}> = ({ value, onChange }) => (
  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
    {MAINT_PARTS.map((p) => {
      const checked = value.includes(p.key);
      return (
        <label
          key={p.key}
          className={`flex items-start gap-2 p-2.5 rounded-xl border cursor-pointer transition ${
            checked ? 'border-rose-700/60 bg-rose-950/20' : 'border-zinc-800 bg-zinc-950/60 hover:border-zinc-700'
          }`}
        >
          <input
            type="checkbox"
            checked={checked}
            onChange={() => onChange(checked ? value.filter((k) => k !== p.key) : [...value, p.key])}
            className="mt-0.5 accent-rose-500"
          />
          <span>
            <span className="block text-xs font-bold text-zinc-200">{p.label}</span>
            <span className="block text-[11px] text-zinc-500 leading-snug">{p.hint}</span>
          </span>
        </label>
      );
    })}
  </div>
);

/* -------------------------------------------------------------------------- */
/*  Panel utama                                                                */
/* -------------------------------------------------------------------------- */

export const DataMaintenancePanel: React.FC<DataMaintenancePanelProps> = ({
  workers,
  currentAdminId,
  onWorkersUpdated,
  showToast,
}) => {
  const actor = useMemo(
    () => workers.find((w) => w.id === currentAdminId)?.name || 'Administrator',
    [workers, currentAdminId]
  );
  const toast = useCallback((m: string) => showToast?.(m), [showToast]);

  const [backups, setBackups] = useState<BackupMeta[]>([]);
  const [log, setLog] = useState<MaintLogEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [backupLabel, setBackupLabel] = useState('');
  const [creating, setCreating] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const loadedOnce = useRef(false);

  // Reset
  const [scopeMode, setScopeMode] = useState<'all' | 'selected'>('all');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [division, setDivision] = useState('');
  const [resetParts, setResetParts] = useState<MaintPart[]>(['core', 'score_history', 'competency']);

  // Pulihkan
  const [restoreBackup, setRestoreBackup] = useState<BackupMeta | null>(null);
  const [restoreParts, setRestoreParts] = useState<MaintPart[]>(MAINT_PARTS.map((p) => p.key));

  const refresh = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const [b, l] = await Promise.all([DataMaintenanceService.listBackups(), DataMaintenanceService.listLog()]);
      setBackups(b);
      setLog(l);
    } catch (e: any) {
      setLoadError(e?.message || 'Gagal memuat data pemeliharaan.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (loadedOnce.current) return;
    loadedOnce.current = true;
    refresh();
  }, [refresh]);

  const divisions = useMemo(
    () => Array.from(new Set(workers.map((w) => w.division).filter(Boolean))).sort(),
    [workers]
  );

  const visibleWorkers = useMemo(() => {
    const q = search.trim().toLowerCase();
    return workers.filter((w) => {
      if (division && w.division !== division) return false;
      if (!q) return true;
      return w.name.toLowerCase().includes(q) || (w.employeeId || '').toLowerCase().includes(q);
    });
  }, [workers, search, division]);

  const targetWorkers = useMemo(
    () => (scopeMode === 'all' ? workers : workers.filter((w) => selectedIds.includes(w.id))),
    [scopeMode, workers, selectedIds]
  );
  const targetPoints = useMemo(
    () => targetWorkers.reduce((sum, w) => sum + (w.totalPoints || 0), 0),
    [targetWorkers]
  );

  const toggleWorker = (id: string) =>
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const allVisibleSelected = visibleWorkers.length > 0 && visibleWorkers.every((w) => selectedIds.includes(w.id));
  const toggleAllVisible = () => {
    const ids = visibleWorkers.map((w) => w.id);
    setSelectedIds((prev) =>
      allVisibleSelected ? prev.filter((id) => !ids.includes(id)) : Array.from(new Set([...prev, ...ids]))
    );
  };

  const resetWorkerIds: string[] | null = scopeMode === 'all' ? null : [...selectedIds].sort();
  const sortedResetParts = [...resetParts].sort();
  const resetScopeKey = `${scopeMode}|${(resetWorkerIds || []).join(',')}|${sortedResetParts.join(',')}`;

  const resetInvalid =
    resetParts.length === 0 || (scopeMode === 'selected' && selectedIds.length === 0);
  const resetInvalidReason =
    resetParts.length === 0
      ? 'Pilih minimal satu jenis data.'
      : scopeMode === 'selected' && selectedIds.length === 0
      ? 'Pilih minimal satu user.'
      : undefined;

  const partNames = (parts: MaintPart[]) =>
    MAINT_PARTS.filter((p) => parts.includes(p.key))
      .map((p) => p.label)
      .join(', ');

  const handleCreateBackup = async () => {
    setCreating(true);
    try {
      const res = await DataMaintenanceService.createBackup(actor, backupLabel);
      if (res.ok) {
        toast('Backup nilai berhasil dibuat.');
        setBackupLabel('');
        await refresh();
      } else {
        toast(res.error || 'Gagal membuat backup.');
      }
    } finally {
      setCreating(false);
    }
  };

  const handleDownload = async (id: string) => {
    setDownloadingId(id);
    try {
      await DataMaintenanceService.downloadBackupCsv(id);
    } catch (e: any) {
      toast(e?.message || 'Gagal mengunduh CSV.');
    } finally {
      setDownloadingId(null);
    }
  };

  const startRestore = async (b: BackupMeta) => {
    const ok = await SwalService.confirm({
      title: 'Pulihkan dari backup ini?',
      text: `Backup ${fmtDate(b.created_at)} (${b.worker_count} user). Nilai saat ini akan ditimpa. Anda akan diminta kode OTP.`,
      confirmButtonText: 'Lanjutkan',
      cancelButtonText: 'Batal',
      isDestructive: false,
    });
    if (ok) {
      setRestoreBackup(b);
      setRestoreParts(MAINT_PARTS.map((p) => p.key));
    }
  };

  const afterSuccess = async (message: string) => {
    toast(message);
    await refresh();
    onWorkersUpdated?.();
  };

  return (
    <div className="mt-8 space-y-5">
      <div className="flex items-center gap-2">
        <Database className="w-5 h-5 text-sky-400" />
        <div>
          <h3 className="text-sm font-black text-white tracking-tight">Data &amp; Pemeliharaan</h3>
          <p className="text-[11px] text-zinc-500">
            Backup, reset, dan pulihkan nilai pekerja. Reset &amp; pulihkan wajib kode OTP yang dikirim ke email pemilik.
          </p>
        </div>
      </div>

      {loadError && (
        <div className="bg-amber-950/20 border border-amber-900/40 rounded-xl p-3 text-xs text-amber-300">
          {loadError}
        </div>
      )}

      {/* ---------------- BACKUP ---------------- */}
      <div className="bg-zinc-900/60 p-4 rounded-2xl border border-zinc-800 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h4 className="text-xs font-black text-zinc-200 uppercase tracking-wider">Backup nilai</h4>
          <span className="text-[11px] text-zinc-500">Disimpan maksimal 10 terakhir · password tidak ikut</span>
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <input
            value={backupLabel}
            onChange={(e) => setBackupLabel(e.target.value)}
            maxLength={80}
            placeholder="Keterangan (opsional), mis. Sebelum reset akhir tahun"
            className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-sky-500"
          />
          <button
            type="button"
            onClick={handleCreateBackup}
            disabled={creating}
            className="px-4 py-2 bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white font-black text-xs rounded-xl transition flex items-center justify-center gap-2"
          >
            {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Database className="w-4 h-4" />}
            <span>Buat backup sekarang</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-zinc-500 border-b border-zinc-800">
                <th className="py-2 pr-3 font-bold">Waktu</th>
                <th className="py-2 pr-3 font-bold">Jenis</th>
                <th className="py-2 pr-3 font-bold text-right">User</th>
                <th className="py-2 pr-3 font-bold text-right">Total poin</th>
                <th className="py-2 font-bold text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {backups.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-4 text-center text-zinc-600">
                    {loading ? 'Memuat…' : 'Belum ada backup.'}
                  </td>
                </tr>
              )}
              {backups.map((b) => (
                <tr key={b.id} className="border-b border-zinc-800/60 align-top">
                  <td className="py-2 pr-3 text-zinc-300 whitespace-nowrap">
                    {fmtDate(b.created_at)}
                    {b.created_by && <div className="text-[10px] text-zinc-600">oleh {b.created_by}</div>}
                  </td>
                  <td className="py-2 pr-3 text-zinc-300">
                    {KIND_LABEL[b.kind]}
                    {b.label && <div className="text-[10px] text-zinc-500">{b.label}</div>}
                  </td>
                  <td className="py-2 pr-3 text-right text-zinc-300 font-mono">{fmtNum(b.worker_count)}</td>
                  <td className="py-2 pr-3 text-right text-zinc-300 font-mono">{fmtNum(Number(b.total_points))}</td>
                  <td className="py-2 text-right whitespace-nowrap">
                    <button
                      type="button"
                      onClick={() => handleDownload(b.id)}
                      disabled={downloadingId === b.id}
                      className="px-2.5 py-1 mr-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-300 font-bold rounded-lg transition inline-flex items-center gap-1"
                    >
                      {downloadingId === b.id ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <Download className="w-3 h-3" />
                      )}
                      CSV
                    </button>
                    <button
                      type="button"
                      onClick={() => startRestore(b)}
                      className="px-2.5 py-1 bg-amber-900/30 hover:bg-amber-900/50 border border-amber-800/60 text-amber-300 font-bold rounded-lg transition inline-flex items-center gap-1"
                    >
                      <RotateCcw className="w-3 h-3" />
                      Pulihkan
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ---------------- PULIHKAN ---------------- */}
      {restoreBackup && (
        <div className="bg-zinc-900/60 p-4 rounded-2xl border border-amber-800/50 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h4 className="text-xs font-black text-amber-300 uppercase tracking-wider">
              Pulihkan dari backup {fmtDate(restoreBackup.created_at)}
            </h4>
            <button
              type="button"
              onClick={() => setRestoreBackup(null)}
              className="text-[11px] text-zinc-400 hover:text-white underline"
            >
              Batal
            </button>
          </div>
          <p className="text-[11px] text-zinc-500 leading-relaxed">
            Hanya user yang ada di backup dan masih terdaftar yang diperbarui. User baru dan akun lain tidak
            tersentuh, dan password tidak diubah.
          </p>
          <PartPicker value={restoreParts} onChange={setRestoreParts} />
          <OtpGate
            confirmWord="PULIHKAN"
            summary={`Menimpa ${partNames(restoreParts) || '—'} milik ${restoreBackup.worker_count} user dengan data backup ${fmtDate(
              restoreBackup.created_at
            )}.`}
            disabled={restoreParts.length === 0}
            disabledReason="Pilih minimal satu jenis data."
            submitLabel="Pulihkan sekarang"
            scopeKey={`${restoreBackup.id}|${[...restoreParts].sort().join(',')}`}
            requestOtp={() =>
              DataMaintenanceService.requestOtp({
                action: 'restore',
                workerIds: null,
                parts: restoreParts,
                backupId: restoreBackup.id,
              })
            }
            execute={(code) =>
              DataMaintenanceService.restore({
                actor,
                backupId: restoreBackup.id,
                parts: restoreParts,
                code,
              })
            }
            onSuccess={(res) => {
              setRestoreBackup(null);
              afterSuccess(`Pemulihan selesai untuk ${res.workers_restored ?? 0} user.`);
            }}
          />
        </div>
      )}

      {/* ---------------- RESET ---------------- */}
      <div className="bg-zinc-900/60 p-4 rounded-2xl border border-rose-900/50 space-y-4">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-rose-400" />
          <h4 className="text-xs font-black text-rose-300 uppercase tracking-wider">Reset nilai</h4>
        </div>
        <p className="text-[11px] text-zinc-500 leading-relaxed">
          Hanya mengosongkan nilai yang dipilih. Akun, role, password, katalog reward, riwayat penukaran, SP/sanksi,
          insiden, SOP, APD, SIO, dan audit 5R tidak disentuh.
        </p>

        <div>
          <p className="text-xs font-bold text-zinc-300 mb-2">1. Pilih user</p>
          <div className="flex gap-2 mb-2">
            {(['all', 'selected'] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setScopeMode(m)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition ${
                  scopeMode === m
                    ? 'bg-rose-600 border-rose-500 text-white'
                    : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                }`}
              >
                {m === 'all' ? `Semua user (${workers.length})` : 'Pilih user tertentu'}
              </button>
            ))}
          </div>

          {scopeMode === 'selected' && (
            <div className="space-y-2">
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                  <Search className="w-3.5 h-3.5 text-zinc-600 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Cari nama / NIK"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-8 pr-3 py-2 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-rose-500"
                  />
                </div>
                <select
                  value={division}
                  onChange={(e) => setDivision(e.target.value)}
                  className="bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-rose-500"
                >
                  <option value="">Semua divisi</option>
                  {divisions.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>
              <div className="max-h-56 overflow-y-auto rounded-xl border border-zinc-800 bg-zinc-950/60 divide-y divide-zinc-900">
                <label className="flex items-center gap-2 px-3 py-2 text-xs font-bold text-zinc-300 cursor-pointer sticky top-0 bg-zinc-950">
                  <input
                    type="checkbox"
                    checked={allVisibleSelected}
                    onChange={toggleAllVisible}
                    className="accent-rose-500"
                  />
                  Pilih semua yang tampil ({visibleWorkers.length})
                </label>
                {visibleWorkers.map((w) => (
                  <label
                    key={w.id}
                    className="flex items-center gap-2 px-3 py-1.5 text-xs text-zinc-300 cursor-pointer hover:bg-zinc-900/60"
                  >
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(w.id)}
                      onChange={() => toggleWorker(w.id)}
                      className="accent-rose-500"
                    />
                    <span className="flex-1 truncate">
                      {w.name} <span className="text-zinc-600">· {w.employeeId}</span>
                    </span>
                    <span className="text-[10px] text-zinc-500 hidden sm:inline">{w.division}</span>
                    <span className="font-mono text-zinc-400">{fmtNum(w.totalPoints || 0)}</span>
                  </label>
                ))}
                {visibleWorkers.length === 0 && (
                  <p className="px-3 py-3 text-xs text-zinc-600 text-center">Tidak ada user yang cocok.</p>
                )}
              </div>
            </div>
          )}
        </div>

        <div>
          <p className="text-xs font-bold text-zinc-300 mb-2">2. Pilih data yang direset</p>
          <PartPicker value={resetParts} onChange={setResetParts} />
        </div>

        <div className="flex items-center gap-4 bg-zinc-950/60 border border-zinc-800 rounded-xl px-3 py-2.5 text-xs">
          <ShieldCheck className="w-4 h-4 text-sky-400 shrink-0" />
          <span className="text-zinc-300">
            Dampak: <b className="text-white">{fmtNum(targetWorkers.length)}</b> user ·{' '}
            <b className="text-white">{fmtNum(targetPoints)}</b> total poin
            {resetParts.includes('core') ? ' akan hilang' : ' (poin tidak diubah)'}
          </span>
        </div>

        <div>
          <p className="text-xs font-bold text-zinc-300 mb-2">3. Verifikasi</p>
          <OtpGate
            confirmWord="RESET"
            summary={`Mereset ${partNames(resetParts) || '—'} untuk ${
              scopeMode === 'all' ? `SEMUA ${workers.length} user` : `${selectedIds.length} user terpilih`
            }.`}
            disabled={resetInvalid}
            disabledReason={resetInvalidReason}
            submitLabel="Eksekusi reset"
            scopeKey={resetScopeKey}
            requestOtp={() =>
              DataMaintenanceService.requestOtp({
                action: 'reset',
                workerIds: resetWorkerIds,
                parts: resetParts,
              })
            }
            execute={(code) =>
              DataMaintenanceService.reset({
                actor,
                workerIds: resetWorkerIds,
                parts: resetParts,
                code,
              })
            }
            onSuccess={(res) => afterSuccess(`Reset selesai untuk ${res.workers_affected ?? 0} user. Backup otomatis tersimpan.`)}
          />
        </div>
      </div>

      {/* ---------------- LOG ---------------- */}
      <div className="bg-zinc-900/60 p-4 rounded-2xl border border-zinc-800 space-y-2">
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-zinc-400" />
          <h4 className="text-xs font-black text-zinc-200 uppercase tracking-wider">Riwayat pemeliharaan</h4>
        </div>
        {log.length === 0 ? (
          <p className="text-xs text-zinc-600">Belum ada aktivitas.</p>
        ) : (
          <ul className="space-y-1.5">
            {log.map((l) => (
              <li key={l.id} className="flex items-center gap-2 text-xs text-zinc-400">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <span className="font-bold text-zinc-200">{ACTION_LABEL[l.action] || l.action}</span>
                <span>oleh {l.actor || '—'}</span>
                {typeof l.detail?.workers === 'number' && <span>· {l.detail.workers as number} user</span>}
                <span className="ml-auto text-zinc-600 whitespace-nowrap">{fmtDate(l.created_at)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};
