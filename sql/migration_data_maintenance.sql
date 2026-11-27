-- =============================================================================
-- MIGRATION: Data & Pemeliharaan (Backup / Reset / Pulihkan Nilai) — v1
-- =============================================================================
-- SIFAT: MURNI PENAMBAHAN. Hanya CREATE objek baru (tabel admin_* dan fungsi maint_*).
--        Tidak ada ALTER / DROP / UPDATE / DELETE terhadap tabel atau fungsi yang
--        sudah berjalan. Aman dijalankan ulang (idempotent).
-- Jalankan di: Supabase Dashboard > SQL Editor.
--
-- KEAMANAN:
--  * Tabel admin_* memakai RLS tanpa policy + REVOKE dari anon/authenticated,
--    sehingga TIDAK bisa dibaca/ditulis langsung lewat API publik.
--  * Reset & Pulihkan hanya bisa lewat fungsi SECURITY DEFINER yang mewajibkan
--    kode OTP (hash, berlaku 5 menit, sekali pakai, maks 3 salah, terikat pada
--    aksi + daftar user + data yang dipilih).
--  * Kode OTP dibuat & dikirim oleh Edge Function (service role). Fungsi yang
--    mendaftarkan OTP (maint_register_otp) TIDAK bisa dipanggil dari browser.
--  * Kolom password TIDAK ikut backup dan tidak pernah disentuh.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. TABEL
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.admin_backups (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by   TEXT,
  label        TEXT,
  kind         TEXT NOT NULL DEFAULT 'manual'
                 CHECK (kind IN ('manual', 'auto_before_reset', 'auto_before_restore')),
  worker_count INTEGER NOT NULL DEFAULT 0,
  total_points BIGINT  NOT NULL DEFAULT 0,
  payload      JSONB   NOT NULL
);

CREATE TABLE IF NOT EXISTS public.admin_otp_requests (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action     TEXT NOT NULL CHECK (action IN ('reset', 'restore')),
  scope_hash TEXT NOT NULL,
  code_hash  TEXT NOT NULL,
  attempts   INTEGER NOT NULL DEFAULT 0,
  used       BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_admin_otp_requests_created ON public.admin_otp_requests (created_at DESC);

CREATE TABLE IF NOT EXISTS public.admin_maintenance_log (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  action     TEXT NOT NULL,
  actor      TEXT,
  detail     JSONB NOT NULL DEFAULT '{}'::jsonb
);

ALTER TABLE public.admin_backups          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_otp_requests     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_maintenance_log  ENABLE ROW LEVEL SECURITY;
-- (sengaja TANPA policy: akses langsung dari API publik ditolak)

REVOKE ALL ON public.admin_backups         FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.admin_otp_requests    FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.admin_maintenance_log FROM PUBLIC, anon, authenticated;

-- -----------------------------------------------------------------------------
-- 2. FUNGSI INTERNAL (tidak dapat dipanggil dari browser)
-- -----------------------------------------------------------------------------

-- Hash cakupan tindakan: mengikat OTP pada aksi + user + data yang dipilih.
CREATE OR REPLACE FUNCTION public.maint_scope_hash(
  p_action     TEXT,
  p_worker_ids TEXT[],
  p_parts      TEXT[],
  p_backup_id  UUID
) RETURNS TEXT
LANGUAGE sql IMMUTABLE
SET search_path = public, pg_temp
AS $$
  SELECT encode(
    sha256(convert_to(
      jsonb_build_object(
        'a', p_action,
        'w', COALESCE((SELECT jsonb_agg(x ORDER BY x) FROM unnest(p_worker_ids) AS x), '"all"'::jsonb),
        'p', COALESCE((SELECT jsonb_agg(x ORDER BY x) FROM unnest(p_parts) AS x), '[]'::jsonb),
        'b', p_backup_id
      )::text, 'utf8')),
    'hex');
$$;

CREATE OR REPLACE FUNCTION public.maint_code_hash(p_code TEXT, p_otp_id UUID, p_scope_hash TEXT)
RETURNS TEXT
LANGUAGE sql IMMUTABLE
SET search_path = public, pg_temp
AS $$
  SELECT encode(sha256(convert_to(p_code || ':' || p_otp_id::text || ':' || p_scope_hash, 'utf8')), 'hex');
$$;

-- Dipanggil HANYA oleh Edge Function (service role). Membatasi laju permintaan.
CREATE OR REPLACE FUNCTION public.maint_register_otp(
  p_action     TEXT,
  p_worker_ids TEXT[],
  p_parts      TEXT[],
  p_backup_id  UUID,
  p_code       TEXT
) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_id    UUID := gen_random_uuid();
  v_scope TEXT;
BEGIN
  IF p_action NOT IN ('reset', 'restore') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Aksi tidak valid.');
  END IF;

  IF EXISTS (SELECT 1 FROM admin_otp_requests WHERE created_at > now() - interval '60 seconds') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Tunggu 60 detik sebelum meminta kode baru.');
  END IF;

  IF (SELECT count(*) FROM admin_otp_requests WHERE created_at > now() - interval '1 hour') >= 5 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Batas permintaan kode tercapai (5 per jam). Coba lagi nanti.');
  END IF;

  v_scope := maint_scope_hash(p_action, p_worker_ids, p_parts, p_backup_id);

  -- Kode lama yang belum terpakai dibatalkan; hanya kode terbaru yang berlaku.
  UPDATE admin_otp_requests SET used = true WHERE used = false;

  INSERT INTO admin_otp_requests (id, action, scope_hash, code_hash, expires_at)
  VALUES (v_id, p_action, v_scope, maint_code_hash(p_code, v_id, v_scope), now() + interval '5 minutes');

  RETURN jsonb_build_object('ok', true, 'expires_in_sec', 300);
END;
$$;

-- Verifikasi OTP. Mengembalikan NULL bila valid, atau pesan error.
-- (Tidak memakai RAISE agar penambahan hitungan salah tidak ikut ter-rollback.)
CREATE OR REPLACE FUNCTION public.maint_verify_otp(
  p_action     TEXT,
  p_worker_ids TEXT[],
  p_parts      TEXT[],
  p_backup_id  UUID,
  p_code       TEXT
) RETURNS TEXT
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_req   admin_otp_requests%ROWTYPE;
  v_scope TEXT := maint_scope_hash(p_action, p_worker_ids, p_parts, p_backup_id);
BEGIN
  IF p_code IS NULL OR p_code !~ '^[0-9]{6}$' THEN
    RETURN 'Kode OTP harus 6 digit angka.';
  END IF;

  -- Pengaman global terhadap tebak-tebakan: total salah dalam 1 jam.
  IF (SELECT COALESCE(sum(attempts), 0) FROM admin_otp_requests
      WHERE created_at > now() - interval '1 hour') >= 9 THEN
    RETURN 'Terlalu banyak percobaan salah. Coba lagi dalam 1 jam.';
  END IF;

  SELECT * INTO v_req
  FROM admin_otp_requests
  WHERE action = p_action AND scope_hash = v_scope AND used = false AND expires_at > now()
  ORDER BY created_at DESC
  LIMIT 1
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN 'Kode tidak ditemukan atau sudah kedaluwarsa. Minta kode baru.';
  END IF;

  IF v_req.attempts >= 3 THEN
    UPDATE admin_otp_requests SET used = true WHERE id = v_req.id;
    RETURN 'Kode diblokir karena 3 kali salah. Minta kode baru.';
  END IF;

  IF v_req.code_hash <> maint_code_hash(p_code, v_req.id, v_scope) THEN
    UPDATE admin_otp_requests SET attempts = attempts + 1 WHERE id = v_req.id;
    RETURN 'Kode OTP salah.';
  END IF;

  UPDATE admin_otp_requests SET used = true WHERE id = v_req.id;  -- sekali pakai
  RETURN NULL;
END;
$$;

-- Snapshot semua jenis nilai untuk user tertentu (NULL = semua user).
-- Kolom password TIDAK diambil.
CREATE OR REPLACE FUNCTION public.maint_snapshot(p_worker_ids TEXT[])
RETURNS JSONB
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT jsonb_build_object(
    'version', 1,
    'workers', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', w.id, 'employee_id', w.employee_id, 'name', w.name, 'division', w.division,
        'total_points', w.total_points, 'operational_points', w.operational_points,
        'prestige_points', w.prestige_points, 'tier', w.tier,
        'bib_behavior', w.bib_behavior, 'bib_integrity', w.bib_integrity,
        'bib_benchmark', w.bib_benchmark, 'bib_total_score', w.bib_total_score,
        'streak_days', w.streak_days,
        'daily_quiz_completed', w.daily_quiz_completed,
        'pre_shift_checklist_done', w.pre_shift_checklist_done))
      FROM workers w WHERE p_worker_ids IS NULL OR w.id = ANY(p_worker_ids)), '[]'::jsonb),
    'score_history', COALESCE((
      SELECT jsonb_agg(to_jsonb(s)) FROM score_history s
      WHERE p_worker_ids IS NULL OR s.worker_id = ANY(p_worker_ids)), '[]'::jsonb),
    'competency', COALESCE((
      SELECT jsonb_agg(to_jsonb(c)) FROM worker_competency_scores c
      WHERE p_worker_ids IS NULL OR c.worker_id = ANY(p_worker_ids)), '[]'::jsonb),
    'badges', COALESCE((
      SELECT jsonb_agg(to_jsonb(b)) FROM worker_badges b
      WHERE p_worker_ids IS NULL OR b.worker_id = ANY(p_worker_ids)), '[]'::jsonb),
    'sop_scores', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('id', p.id, 'worker_id', p.worker_id,
                                          'quiz_score', p.quiz_score, 'points_awarded', p.points_awarded))
      FROM worker_sop_progress p
      WHERE p_worker_ids IS NULL OR p.worker_id = ANY(p_worker_ids)), '[]'::jsonb)
  );
$$;

-- Simpan backup + pangkas ke 10 terbaru.
CREATE OR REPLACE FUNCTION public.maint_store_backup(
  p_actor TEXT, p_label TEXT, p_kind TEXT, p_worker_ids TEXT[]
) RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_payload JSONB := maint_snapshot(p_worker_ids);
  v_id      UUID  := gen_random_uuid();
BEGIN
  INSERT INTO admin_backups (id, created_by, label, kind, worker_count, total_points, payload)
  VALUES (
    v_id, p_actor, p_label, p_kind,
    jsonb_array_length(v_payload->'workers'),
    COALESCE((SELECT sum((x->>'total_points')::bigint) FROM jsonb_array_elements(v_payload->'workers') x), 0),
    v_payload
  );

  DELETE FROM admin_backups
  WHERE id IN (SELECT id FROM admin_backups ORDER BY created_at DESC OFFSET 10);

  RETURN v_id;
END;
$$;

-- -----------------------------------------------------------------------------
-- 3. FUNGSI PUBLIK (dipanggil dari aplikasi)
-- -----------------------------------------------------------------------------

-- 3a. Buat backup manual (tanpa OTP: tidak merusak data).
CREATE OR REPLACE FUNCTION public.maint_create_backup(p_actor TEXT, p_label TEXT DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE v_id UUID;
BEGIN
  v_id := maint_store_backup(p_actor, NULLIF(trim(p_label), ''), 'manual', NULL);
  INSERT INTO admin_maintenance_log (action, actor, detail)
  VALUES ('backup', p_actor, jsonb_build_object('backup_id', v_id));
  RETURN jsonb_build_object('ok', true, 'backup_id', v_id);
END;
$$;

-- 3b. Daftar backup (metadata saja, tanpa payload).
CREATE OR REPLACE FUNCTION public.maint_list_backups()
RETURNS JSONB
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id', id, 'created_at', created_at, 'created_by', created_by, 'label', label,
    'kind', kind, 'worker_count', worker_count, 'total_points', total_points
  ) ORDER BY created_at DESC), '[]'::jsonb)
  FROM admin_backups;
$$;

-- 3c. Ambil isi satu backup (untuk unduh CSV).
CREATE OR REPLACE FUNCTION public.maint_get_backup(p_id UUID)
RETURNS JSONB
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT jsonb_build_object('id', id, 'created_at', created_at, 'label', label,
                            'kind', kind, 'payload', payload)
  FROM admin_backups WHERE id = p_id;
$$;

-- 3d. Log aktivitas pemeliharaan.
CREATE OR REPLACE FUNCTION public.maint_list_log(p_limit INT DEFAULT 20)
RETURNS JSONB
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT COALESCE(jsonb_agg(to_jsonb(l) ORDER BY l.created_at DESC), '[]'::jsonb)
  FROM (SELECT * FROM admin_maintenance_log ORDER BY created_at DESC LIMIT LEAST(GREATEST(p_limit, 1), 100)) l;
$$;

-- 3e. RESET nilai (wajib OTP). p_worker_ids NULL = semua user.
--     p_parts: core, score_history, competency, badges, daily_flags, sop_scores
CREATE OR REPLACE FUNCTION public.maint_reset(
  p_actor      TEXT,
  p_worker_ids TEXT[],
  p_parts      TEXT[],
  p_code       TEXT
) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_err      TEXT;
  v_backup   UUID;
  v_affected INT;
  v_valid    TEXT[] := ARRAY['core','score_history','competency','badges','daily_flags','sop_scores'];
BEGIN
  IF p_parts IS NULL OR cardinality(p_parts) = 0 OR NOT (p_parts <@ v_valid) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Pilih minimal satu jenis data yang valid.');
  END IF;
  IF p_worker_ids IS NOT NULL AND cardinality(p_worker_ids) = 0 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Pilih minimal satu user.');
  END IF;

  v_err := maint_verify_otp('reset', p_worker_ids, p_parts, NULL, p_code);
  IF v_err IS NOT NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', v_err);
  END IF;

  -- Backup otomatis SEBELUM menghapus apa pun (satu transaksi dengan reset).
  v_backup := maint_store_backup(p_actor, 'Otomatis sebelum reset', 'auto_before_reset', p_worker_ids);

  IF 'core' = ANY(p_parts) THEN
    UPDATE workers SET
      total_points = 0, operational_points = 0, prestige_points = 0,
      bib_behavior = 0, bib_integrity = 0, bib_benchmark = 0, bib_total_score = 0,
      streak_days = 0, tier = 'Novice Operational'
    WHERE p_worker_ids IS NULL OR id = ANY(p_worker_ids);
    GET DIAGNOSTICS v_affected = ROW_COUNT;
  ELSE
    SELECT count(*) INTO v_affected FROM workers WHERE p_worker_ids IS NULL OR id = ANY(p_worker_ids);
  END IF;

  IF 'daily_flags' = ANY(p_parts) THEN
    UPDATE workers SET daily_quiz_completed = false, pre_shift_checklist_done = false
    WHERE p_worker_ids IS NULL OR id = ANY(p_worker_ids);
  END IF;

  IF 'score_history' = ANY(p_parts) THEN
    DELETE FROM score_history WHERE p_worker_ids IS NULL OR worker_id = ANY(p_worker_ids);
  END IF;

  IF 'competency' = ANY(p_parts) THEN
    DELETE FROM worker_competency_scores WHERE p_worker_ids IS NULL OR worker_id = ANY(p_worker_ids);
  END IF;

  IF 'badges' = ANY(p_parts) THEN
    DELETE FROM worker_badges WHERE p_worker_ids IS NULL OR worker_id = ANY(p_worker_ids);
  END IF;

  IF 'sop_scores' = ANY(p_parts) THEN
    UPDATE worker_sop_progress SET quiz_score = 0, points_awarded = false
    WHERE p_worker_ids IS NULL OR worker_id = ANY(p_worker_ids);
  END IF;

  INSERT INTO admin_maintenance_log (action, actor, detail)
  VALUES ('reset', p_actor, jsonb_build_object(
    'backup_id', v_backup, 'parts', p_parts,
    'scope', CASE WHEN p_worker_ids IS NULL THEN 'all' ELSE 'selected' END,
    'workers', v_affected));

  RETURN jsonb_build_object('ok', true, 'backup_id', v_backup, 'workers_affected', v_affected);
END;
$$;

-- 3f. PULIHKAN dari backup (wajib OTP). Hanya memperbarui user yang ada di backup
--     dan masih ada di sistem; user baru tidak tersentuh, akun tidak dibuat ulang.
CREATE OR REPLACE FUNCTION public.maint_restore(
  p_actor     TEXT,
  p_backup_id UUID,
  p_parts     TEXT[],
  p_code      TEXT
) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_err     TEXT;
  v_payload JSONB;
  v_ids     TEXT[];
  v_pre     UUID;
  v_valid   TEXT[] := ARRAY['core','score_history','competency','badges','daily_flags','sop_scores'];
BEGIN
  IF p_parts IS NULL OR cardinality(p_parts) = 0 OR NOT (p_parts <@ v_valid) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Pilih minimal satu jenis data yang valid.');
  END IF;

  SELECT payload INTO v_payload FROM admin_backups WHERE id = p_backup_id;
  IF v_payload IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Backup tidak ditemukan.');
  END IF;

  v_err := maint_verify_otp('restore', NULL, p_parts, p_backup_id, p_code);
  IF v_err IS NOT NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', v_err);
  END IF;

  -- Backup kondisi saat ini sebelum menimpa (agar pemulihan pun bisa dibatalkan).
  v_pre := maint_store_backup(p_actor, 'Otomatis sebelum pulihkan', 'auto_before_restore', NULL);

  -- Hanya user yang ada di backup DAN masih ada di tabel workers.
  SELECT COALESCE(array_agg(w.id), ARRAY[]::TEXT[]) INTO v_ids
  FROM workers w
  WHERE w.id IN (SELECT x->>'id' FROM jsonb_array_elements(v_payload->'workers') x);

  IF 'core' = ANY(p_parts) THEN
    UPDATE workers w SET
      total_points = r.total_points, operational_points = r.operational_points,
      prestige_points = r.prestige_points, tier = r.tier,
      bib_behavior = r.bib_behavior, bib_integrity = r.bib_integrity,
      bib_benchmark = r.bib_benchmark, bib_total_score = r.bib_total_score,
      streak_days = r.streak_days
    FROM jsonb_populate_recordset(NULL::workers, v_payload->'workers') r
    WHERE w.id = r.id;
  END IF;

  IF 'daily_flags' = ANY(p_parts) THEN
    UPDATE workers w SET
      daily_quiz_completed = r.daily_quiz_completed,
      pre_shift_checklist_done = r.pre_shift_checklist_done
    FROM jsonb_populate_recordset(NULL::workers, v_payload->'workers') r
    WHERE w.id = r.id;
  END IF;

  IF 'score_history' = ANY(p_parts) THEN
    DELETE FROM score_history WHERE worker_id = ANY(v_ids);
    INSERT INTO score_history
    SELECT * FROM jsonb_populate_recordset(NULL::score_history, v_payload->'score_history') r
    WHERE r.worker_id = ANY(v_ids)
    ON CONFLICT (id) DO NOTHING;
  END IF;

  IF 'competency' = ANY(p_parts) THEN
    DELETE FROM worker_competency_scores WHERE worker_id = ANY(v_ids);
    INSERT INTO worker_competency_scores
    SELECT * FROM jsonb_populate_recordset(NULL::worker_competency_scores, v_payload->'competency') r
    WHERE r.worker_id = ANY(v_ids)
    ON CONFLICT (worker_id, competency_id) DO NOTHING;
  END IF;

  IF 'badges' = ANY(p_parts) THEN
    DELETE FROM worker_badges WHERE worker_id = ANY(v_ids);
    INSERT INTO worker_badges
    SELECT * FROM jsonb_populate_recordset(NULL::worker_badges, v_payload->'badges') r
    WHERE r.worker_id = ANY(v_ids)
      AND EXISTS (SELECT 1 FROM badges b WHERE b.id = r.badge_id)
    ON CONFLICT DO NOTHING;
  END IF;

  IF 'sop_scores' = ANY(p_parts) THEN
    UPDATE worker_sop_progress p SET
      quiz_score = (x->>'quiz_score')::int,
      points_awarded = (x->>'points_awarded')::boolean
    FROM jsonb_array_elements(v_payload->'sop_scores') x
    WHERE p.id = x->>'id';
  END IF;

  INSERT INTO admin_maintenance_log (action, actor, detail)
  VALUES ('restore', p_actor, jsonb_build_object(
    'backup_id', p_backup_id, 'pre_restore_backup_id', v_pre,
    'parts', p_parts, 'workers', cardinality(v_ids)));

  RETURN jsonb_build_object('ok', true, 'pre_restore_backup_id', v_pre, 'workers_restored', cardinality(v_ids));
END;
$$;

-- -----------------------------------------------------------------------------
-- 4. HAK AKSES FUNGSI
--    (Supabase memberi EXECUTE ke anon secara default → dicabut dulu, lalu
--     diberikan hanya pada fungsi yang memang untuk aplikasi.)
-- -----------------------------------------------------------------------------
REVOKE ALL ON FUNCTION public.maint_scope_hash(TEXT, TEXT[], TEXT[], UUID)       FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.maint_code_hash(TEXT, UUID, TEXT)                  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.maint_register_otp(TEXT, TEXT[], TEXT[], UUID, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.maint_verify_otp(TEXT, TEXT[], TEXT[], UUID, TEXT)   FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.maint_snapshot(TEXT[])                             FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.maint_store_backup(TEXT, TEXT, TEXT, TEXT[])       FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.maint_register_otp(TEXT, TEXT[], TEXT[], UUID, TEXT) TO service_role;

REVOKE ALL ON FUNCTION public.maint_create_backup(TEXT, TEXT)          FROM PUBLIC;
REVOKE ALL ON FUNCTION public.maint_list_backups()                     FROM PUBLIC;
REVOKE ALL ON FUNCTION public.maint_get_backup(UUID)                   FROM PUBLIC;
REVOKE ALL ON FUNCTION public.maint_list_log(INT)                      FROM PUBLIC;
REVOKE ALL ON FUNCTION public.maint_reset(TEXT, TEXT[], TEXT[], TEXT)  FROM PUBLIC;
REVOKE ALL ON FUNCTION public.maint_restore(TEXT, UUID, TEXT[], TEXT)  FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.maint_create_backup(TEXT, TEXT)          TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.maint_list_backups()                     TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.maint_get_backup(UUID)                   TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.maint_list_log(INT)                      TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.maint_reset(TEXT, TEXT[], TEXT[], TEXT)  TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.maint_restore(TEXT, UUID, TEXT[], TEXT)  TO anon, authenticated;

-- =============================================================================
-- VERIFIKASI SETELAH DIJALANKAN (harus 3 baris, semua rls_aktif = true):
--   select relname, relrowsecurity as rls_aktif from pg_class
--   where relname in ('admin_backups','admin_otp_requests','admin_maintenance_log');
-- =============================================================================
