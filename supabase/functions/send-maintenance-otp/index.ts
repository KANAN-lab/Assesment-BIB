// Edge Function: send-maintenance-otp
// Membuat kode OTP 6 digit untuk aksi Reset / Pulihkan di menu "Data & Pemeliharaan",
// menyimpan HASH-nya lewat fungsi SQL maint_register_otp (hanya service_role),
// lalu mengirim kode ke email pemilik lewat Resend.
//
// Secret yang dibutuhkan (Supabase > Edge Functions > Secrets):
//   RESEND_API_KEY   : API key Resend (JANGAN ditaruh di kode / repo)
//   MAINT_OTP_TO     : alamat email penerima OTP
//   MAINT_OTP_FROM   : (opsional) pengirim, default "Gappy Assessment <onboarding@resend.dev>"
//   ALLOWED_ORIGIN   : (opsional) origin aplikasi, mis. https://assesment-bib.vercel.app
// SUPABASE_URL & SUPABASE_SERVICE_ROLE_KEY otomatis tersedia di Edge Functions.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

const ALLOWED_ORIGIN = Deno.env.get('ALLOWED_ORIGIN') || '*';
const corsHeaders = {
  'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const VALID_PARTS = ['core', 'score_history', 'competency', 'badges', 'daily_flags', 'sop_scores'];
const PART_LABEL: Record<string, string> = {
  core: 'Poin, tier, skor BIB, streak',
  score_history: 'Riwayat skor',
  competency: 'Skor kompetensi',
  badges: 'Badge',
  daily_flags: 'Flag kuis & checklist harian',
  sop_scores: 'Skor kuis SOP',
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

// 6 digit acak seragam (rejection sampling, tanpa bias modulo).
function generateCode(): string {
  const buf = new Uint32Array(1);
  const limit = Math.floor(0x100000000 / 1_000_000) * 1_000_000;
  let n: number;
  do {
    crypto.getRandomValues(buf);
    n = buf[0];
  } while (n >= limit);
  return String(n % 1_000_000).padStart(6, '0');
}

function maskEmail(email: string): string {
  const [user, domain] = email.split('@');
  if (!domain) return '***';
  const head = user.slice(0, 1);
  const tail = user.length > 2 ? user.slice(-1) : '';
  return `${head}${'*'.repeat(Math.max(3, user.length - 2))}${tail}@${domain}`;
}

const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ ok: false, error: 'Method tidak diizinkan.' }, 405);

  let body: any;
  try {
    body = await req.json();
  } catch {
    return json({ ok: false, error: 'Permintaan tidak valid.' }, 400);
  }

  const action = body?.action;
  const parts: string[] = Array.isArray(body?.parts) ? body.parts : [];
  const workerIds: string[] | null = Array.isArray(body?.workerIds) ? body.workerIds : null;
  const backupId: string | null = typeof body?.backupId === 'string' ? body.backupId : null;

  if (action !== 'reset' && action !== 'restore') {
    return json({ ok: false, error: 'Aksi tidak valid.' }, 400);
  }
  if (parts.length === 0 || !parts.every((p) => VALID_PARTS.includes(p))) {
    return json({ ok: false, error: 'Pilih minimal satu jenis data yang valid.' }, 400);
  }
  if (action === 'reset' && workerIds !== null && workerIds.length === 0) {
    return json({ ok: false, error: 'Pilih minimal satu user.' }, 400);
  }
  if (action === 'restore' && !backupId) {
    return json({ ok: false, error: 'Backup belum dipilih.' }, 400);
  }

  const resendKey = Deno.env.get('RESEND_API_KEY');
  const to = Deno.env.get('MAINT_OTP_TO');
  const from = Deno.env.get('MAINT_OTP_FROM') || 'Gappy Assessment <onboarding@resend.dev>';
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!resendKey || !to || !supabaseUrl || !serviceKey) {
    console.error('Konfigurasi secret belum lengkap.');
    return json({ ok: false, error: 'Layanan email belum dikonfigurasi di server.' }, 500);
  }

  const code = generateCode();
  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

  // Daftarkan OTP (hash saja yang disimpan) + terapkan pembatasan laju di sisi database.
  const { data: reg, error: regErr } = await admin.rpc('maint_register_otp', {
    p_action: action,
    p_worker_ids: workerIds,
    p_parts: parts,
    p_backup_id: backupId,
    p_code: code,
  });
  if (regErr) {
    console.error('maint_register_otp gagal:', regErr.message);
    return json({ ok: false, error: 'Gagal membuat kode. Pastikan migrasi SQL sudah dijalankan.' }, 500);
  }
  if (!reg?.ok) {
    return json({ ok: false, error: reg?.error || 'Permintaan ditolak.' }, 429);
  }

  const summary =
    action === 'reset'
      ? `Reset nilai untuk ${workerIds === null ? 'SEMUA user' : workerIds.length + ' user terpilih'}`
      : 'Pulihkan nilai dari backup';
  const partsText = parts.map((p) => PART_LABEL[p] || p).join(', ');

  const html = `
    <div style="font-family:Arial,Helvetica,sans-serif;max-width:480px;margin:auto;padding:24px;color:#111">
      <h2 style="margin:0 0 8px">Kode verifikasi Data &amp; Pemeliharaan</h2>
      <p style="margin:0 0 16px;color:#444">Seseorang meminta: <b>${escapeHtml(summary)}</b>.</p>
      <div style="font-size:34px;letter-spacing:10px;font-weight:700;background:#f4f4f5;border-radius:12px;padding:16px;text-align:center">${code}</div>
      <p style="margin:16px 0 4px;color:#444">Data yang terdampak: ${escapeHtml(partsText)}</p>
      <p style="margin:0 0 4px;color:#444">Berlaku <b>5 menit</b> dan hanya bisa dipakai <b>sekali</b>.</p>
      <p style="margin:16px 0 0;color:#b91c1c"><b>Jika bukan Anda yang meminta, abaikan email ini dan jangan bagikan kode.</b></p>
    </div>`;

  const mail = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from,
      to: [to],
      subject: `Kode OTP ${action === 'reset' ? 'Reset' : 'Pulihkan'} Nilai: ${code}`,
      html,
    }),
  });

  if (!mail.ok) {
    console.error('Resend gagal:', mail.status, await mail.text());
    return json({ ok: false, error: 'Email gagal dikirim. Periksa konfigurasi Resend.' }, 502);
  }

  return json({ ok: true, maskedTo: maskEmail(to), expiresInSec: reg.expires_in_sec ?? 300 });
});
