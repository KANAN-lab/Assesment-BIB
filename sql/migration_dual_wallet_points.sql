-- =============================================================================
-- Migration: Dual-Wallet Points Architecture & Smart Auto-Deduct Protocol (Phase 55)
-- Description:
--   1. Menambahkan kolom operational_points dan prestige_points pada tabel workers.
--   2. Memigrasikan saldo total_points lama secara aman ke prestige_points.
--   3. Menambahkan kolom deducted_operational dan deducted_prestige pada redemption_history.
--   4. Menyediakan stored procedure atomic rpc_process_monthly_points_reset.
--   5. Memutakhirkan RPC & trigger Supabase agar konsisten dengan Dual-Wallet.
-- =============================================================================

-- 1. Tambah kolom dual-wallet pada tabel workers
ALTER TABLE workers 
  ADD COLUMN IF NOT EXISTS operational_points INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS prestige_points    INTEGER NOT NULL DEFAULT 0;

-- 2. Migrasi data awal yang adil (Fair Initial Migration):
-- Seluruh total_points yang sudah ada saat ini dialokasikan ke prestige_points
-- agar saldo lama pekerja aman dari reset bulanan mendadak.
UPDATE workers
SET 
  prestige_points = COALESCE(total_points, 0),
  operational_points = 0
WHERE (operational_points = 0 AND prestige_points = 0 AND COALESCE(total_points, 0) > 0);

-- 3. Tambah rincian pemotongan pada tabel redemption_history
ALTER TABLE redemption_history
  ADD COLUMN IF NOT EXISTS deducted_operational INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS deducted_prestige    INTEGER NOT NULL DEFAULT 0;

-- 4. Stored Procedure untuk Reset Bulanan Poin Operasional (Atomic RPC)
CREATE OR REPLACE FUNCTION rpc_process_monthly_points_reset()
RETURNS TABLE(affected_workers INTEGER, total_points_expired INTEGER) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_affected INTEGER := 0;
  v_total_expired INTEGER := 0;
BEGIN
  -- Hitung total poin yang akan hangus
  SELECT COALESCE(SUM(operational_points), 0), COUNT(*)
  INTO v_total_expired, v_affected
  FROM workers
  WHERE operational_points > 0;

  -- Catat riwayat audit log bagi pekerja yang poinnya hangus
  INSERT INTO activity_log (worker_id, worker_name, action, detail, created_at)
  SELECT 
    id, 
    name, 
    'points_expired', 
    'Siklus Bulanan Berakhir: ' || operational_points || ' PTS Operasional hangus. Saldo Prestasi (' || prestige_points || ' PTS) tetap aman.',
    NOW()
  FROM workers
  WHERE operational_points > 0;

  -- Reset operational_points menjadi 0 dan update total_points = prestige_points
  UPDATE workers
  SET 
    operational_points = 0,
    total_points = prestige_points,
    updated_at = NOW()
  WHERE operational_points > 0;

  RETURN QUERY SELECT v_affected, v_total_expired;
END;
$$;

-- 5. RPC & Trigger Dual-Wallet Consistency Updates

CREATE OR REPLACE FUNCTION increment_worker_points(p_worker_id TEXT, p_points INTEGER)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  UPDATE workers
  SET total_points = total_points + p_points,
      prestige_points = COALESCE(prestige_points, 0) + p_points,
      updated_at = now()
  WHERE id = p_worker_id OR employee_id = p_worker_id;
END;
$$;

CREATE OR REPLACE FUNCTION increment_worker_streak_and_points(p_worker_id TEXT, p_points INTEGER)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  UPDATE workers SET
    streak_days = streak_days + 1,
    total_points = total_points + p_points,
    operational_points = COALESCE(operational_points, 0) + p_points,
    updated_at = now()
  WHERE id = p_worker_id OR employee_id = p_worker_id;
END;
$$;

CREATE OR REPLACE FUNCTION deduct_worker_points(p_worker_id TEXT, p_points INTEGER)
RETURNS void LANGUAGE plpgsql AS $$
DECLARE
  v_op INTEGER;
  v_pr INTEGER;
  v_deduct_op INTEGER;
  v_deduct_pr INTEGER;
BEGIN
  SELECT COALESCE(operational_points, 0), COALESCE(prestige_points, 0)
  INTO v_op, v_pr
  FROM workers
  WHERE id = p_worker_id OR employee_id = p_worker_id FOR UPDATE;

  IF FOUND THEN
    v_deduct_op := LEAST(v_op, p_points);
    v_deduct_pr := LEAST(v_pr, p_points - v_deduct_op);

    UPDATE workers SET
      operational_points = GREATEST(0, v_op - v_deduct_op),
      prestige_points = GREATEST(0, v_pr - v_deduct_pr),
      total_points = GREATEST(0, (v_op - v_deduct_op) + (v_pr - v_deduct_pr)),
      updated_at = now()
    WHERE id = p_worker_id OR employee_id = p_worker_id;
  END IF;
END;
$$;

-- Smart Auto-Deduct di RPC Redeem FCFS
CREATE OR REPLACE FUNCTION rpc_redeem_reward_fcfs(
  p_worker_id TEXT,
  p_reward_id TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  v_worker_points INTEGER;
  v_worker_op INTEGER := 0;
  v_worker_pr INTEGER := 0;
  v_deduct_op INTEGER := 0;
  v_deduct_pr INTEGER := 0;
  v_worker_tier TEXT;
  v_reward_title TEXT;
  v_reward_points INTEGER;
  v_available_stock INTEGER;
  v_min_tier TEXT;
  v_max_claims INTEGER;
  v_claims_this_month INTEGER;
  v_voucher_code TEXT;
  v_now_str TEXT;
  v_expiry_date TIMESTAMPTZ;
  v_redemption_id TEXT;
BEGIN
  SELECT total_points, tier, COALESCE(operational_points, 0), COALESCE(prestige_points, 0)
  INTO v_worker_points, v_worker_tier, v_worker_op, v_worker_pr
  FROM workers
  WHERE id = p_worker_id FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Worker dengan ID % tidak ditemukan.', p_worker_id;
  END IF;

  SELECT title, points_required, available_stock, COALESCE(min_tier, 'Novice Operational'), COALESCE(max_claims_per_month, 1)
  INTO v_reward_title, v_reward_points, v_available_stock, v_min_tier, v_max_claims
  FROM reward_catalog
  WHERE id = p_reward_id FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Reward dengan ID % tidak ditemukan.', p_reward_id;
  END IF;

  IF get_tier_level(v_worker_tier) < get_tier_level(v_min_tier) THEN
    RAISE EXCEPTION 'TIER_KURANG: Reward ini membutuhkan tier minimal "%". Tier Anda saat ini adalah "%".', v_min_tier, v_worker_tier;
  END IF;

  IF v_available_stock <= 0 THEN
    RAISE EXCEPTION 'KUOTA_HABIS: Kuota bulanan untuk reward "%" telah habis! Silakan tunggu reset kuota bulan depan.', v_reward_title;
  END IF;

  IF v_worker_points < v_reward_points THEN
    RAISE EXCEPTION 'POIN_KURANG: Poin Anda (% PTS) tidak mencukupi untuk menukar % (% PTS).', v_worker_points, v_reward_title, v_reward_points;
  END IF;

  SELECT COUNT(*) INTO v_claims_this_month
  FROM redemption_history
  WHERE worker_id = p_worker_id
    AND item_title = v_reward_title
    AND (status IS NULL OR status != 'cancelled')
    AND DATE_TRUNC('month', created_at) = DATE_TRUNC('month', CURRENT_DATE);

  IF v_claims_this_month >= v_max_claims THEN
    RAISE EXCEPTION 'BATAS_KLAIM: Anda telah mencapai batas maksimal klaim (%x per bulan) untuk item "%".', v_max_claims, v_reward_title;
  END IF;

  -- Smart Auto-Deduct (FIFO Expiry-Priority)
  v_deduct_op := LEAST(v_worker_op, v_reward_points);
  v_deduct_pr := LEAST(v_worker_pr, v_reward_points - v_deduct_op);

  UPDATE workers
  SET operational_points = GREATEST(0, v_worker_op - v_deduct_op),
      prestige_points = GREATEST(0, v_worker_pr - v_deduct_pr),
      total_points = total_points - v_reward_points,
      updated_at = now()
  WHERE id = p_worker_id;

  UPDATE reward_catalog
  SET available_stock = available_stock - 1
  WHERE id = p_reward_id;

  v_voucher_code := 'BIB-' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT), 1, 8));
  v_now_str := TO_CHAR(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"');
  v_expiry_date := now() + INTERVAL '30 days';
  v_redemption_id := 'red-' || gen_random_uuid()::text;

  INSERT INTO redemption_history (
    id, worker_id, item_title, points_spent, deducted_operational, deducted_prestige, redeemed_at, redemption_code, status, expiry_date
  )
  VALUES (
    v_redemption_id,
    p_worker_id,
    v_reward_title,
    v_reward_points,
    v_deduct_op,
    v_deduct_pr,
    v_now_str,
    v_voucher_code,
    'pending',
    v_expiry_date
  );

  RETURN jsonb_build_object(
    'success', true,
    'id', v_redemption_id,
    'voucher_code', v_voucher_code,
    'redemption_code', v_voucher_code,
    'points_spent', v_reward_points,
    'deducted_operational', v_deduct_op,
    'deducted_prestige', v_deduct_pr,
    'remaining_points', v_worker_points - v_reward_points,
    'remaining_stock', v_available_stock - 1,
    'status', 'pending',
    'expiry_date', v_expiry_date,
    'message', 'Penukaran reward berhasil! Voucher siap digunakan.'
  );
END;
$$;
