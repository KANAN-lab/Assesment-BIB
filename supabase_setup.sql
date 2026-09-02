-- ============================================================
-- BIB Logistics Assessment Platform — Supabase Schema Setup
-- Project: sekmjwrbohjmlxpgydqx
-- Optimized Production Schema with Auto-Triggers & Performance Indexes
-- Run this in Supabase SQL Editor (Dashboard > SQL Editor)
-- ============================================================

-- ─── 0. Helper Functions & Extensions ─────────────────────────

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Reusable Auto-Update Timestamp Trigger Function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ─── 1. Tables Definition ─────────────────────────────────────

-- Table: workers
CREATE TABLE IF NOT EXISTS workers (
  id                       TEXT PRIMARY KEY,
  user_id                  UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  email                    TEXT UNIQUE,
  name                     TEXT NOT NULL,
  employee_id              TEXT UNIQUE NOT NULL,
  role                     TEXT NOT NULL,
  division                 TEXT NOT NULL,
  avatar                   TEXT DEFAULT '',
  streak_days              INTEGER NOT NULL DEFAULT 0,
  total_points             INTEGER NOT NULL DEFAULT 0,
  tier                     TEXT NOT NULL DEFAULT 'Novice Operational'
                             CHECK (tier IN ('Novice Operational', 'Pro Specialist', 'Elite Logistician', 'Legendary Champion')),
  bib_behavior             NUMERIC(5,2) NOT NULL DEFAULT 0,
  bib_integrity            NUMERIC(5,2) NOT NULL DEFAULT 0,
  bib_benchmark            NUMERIC(5,2) NOT NULL DEFAULT 0,
  bib_total_score          NUMERIC(5,2) NOT NULL DEFAULT 0,
  daily_quiz_completed     BOOLEAN NOT NULL DEFAULT false,
  pre_shift_checklist_done BOOLEAN NOT NULL DEFAULT false,
  last_activity_date       DATE,
  must_change_password     BOOLEAN NOT NULL DEFAULT true,
  password                 TEXT DEFAULT '123',
  status                   TEXT DEFAULT 'active' CHECK (status IN ('active', 'pending', 'pending_approval', 'rejected', 'inactive')),
  created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Ensure existing columns & constraints are in place
ALTER TABLE workers ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE workers ADD COLUMN IF NOT EXISTS email TEXT UNIQUE;
ALTER TABLE workers ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';
ALTER TABLE workers DROP CONSTRAINT IF EXISTS workers_status_check;
ALTER TABLE workers ADD CONSTRAINT workers_status_check CHECK (status IN ('active', 'pending', 'pending_approval', 'rejected', 'inactive'));
ALTER TABLE workers ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN DEFAULT true;
ALTER TABLE workers ADD COLUMN IF NOT EXISTS password TEXT DEFAULT '123';
ALTER TABLE workers ADD COLUMN IF NOT EXISTS last_activity_date DATE;
ALTER TABLE workers DROP CONSTRAINT IF EXISTS workers_role_check;
ALTER TABLE workers DROP CONSTRAINT IF EXISTS workers_user_id_fkey;

-- Table: reward_catalog
CREATE TABLE IF NOT EXISTS reward_catalog (
  id                  TEXT PRIMARY KEY,
  title               TEXT NOT NULL,
  category            TEXT NOT NULL CHECK (category IN ('E-Wallet', 'Pulsa & Data', 'Safety Gear', 'Voucher & Perk')),
  points_required     INTEGER NOT NULL,
  icon_name           TEXT NOT NULL DEFAULT 'Gift',
  description         TEXT NOT NULL DEFAULT '',
  available_stock     INTEGER NOT NULL DEFAULT 0,
  monthly_stock_limit INTEGER NOT NULL DEFAULT 25,
  badge_tag           TEXT,
  min_tier            TEXT NOT NULL DEFAULT 'Novice Operational'
                        CHECK (min_tier IN ('Novice Operational', 'Pro Specialist', 'Elite Logistician', 'Legendary Champion')),
  max_claims_per_month INTEGER NOT NULL DEFAULT 1,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE reward_catalog ADD COLUMN IF NOT EXISTS min_tier TEXT DEFAULT 'Novice Operational';
ALTER TABLE reward_catalog ADD COLUMN IF NOT EXISTS max_claims_per_month INTEGER DEFAULT 1;

-- Table: redemption_history
CREATE TABLE IF NOT EXISTS redemption_history (
  id               TEXT PRIMARY KEY,
  worker_id        TEXT NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
  item_title       TEXT NOT NULL,
  points_spent     INTEGER NOT NULL,
  redeemed_at      TEXT NOT NULL,
  redemption_code  TEXT NOT NULL,
  status           TEXT NOT NULL DEFAULT 'pending'
                     CHECK (status IN ('pending', 'completed', 'cancelled')),
  expiry_date      TIMESTAMPTZ DEFAULT (now() + INTERVAL '30 days'),
  fulfilled_at     TIMESTAMPTZ,
  fulfilled_by     TEXT REFERENCES workers(id) ON DELETE SET NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE redemption_history ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';
ALTER TABLE redemption_history ADD COLUMN IF NOT EXISTS expiry_date TIMESTAMPTZ DEFAULT (now() + INTERVAL '30 days');
ALTER TABLE redemption_history ADD COLUMN IF NOT EXISTS fulfilled_at TIMESTAMPTZ;
ALTER TABLE redemption_history ADD COLUMN IF NOT EXISTS fulfilled_by TEXT REFERENCES workers(id) ON DELETE SET NULL;

-- Table: worker_competency_scores
CREATE TABLE IF NOT EXISTS worker_competency_scores (
  worker_id     TEXT NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
  competency_id TEXT NOT NULL,
  score         NUMERIC(3,1) NOT NULL DEFAULT 0,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (worker_id, competency_id)
);

-- Table: score_history (30-day BIB score trend tracking)
CREATE TABLE IF NOT EXISTS score_history (
  id           TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  worker_id    TEXT NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
  bib_score    NUMERIC(5,2) NOT NULL,
  total_points INTEGER NOT NULL,
  recorded_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Table: quiz_questions (AI-generated quiz cache & dynamic bank)
CREATE TABLE IF NOT EXISTS quiz_questions (
  id                   TEXT PRIMARY KEY,
  question             TEXT NOT NULL,
  options              JSONB NOT NULL,
  correct_answer_index INTEGER NOT NULL,
  explanation          TEXT NOT NULL,
  points_reward        INTEGER NOT NULL DEFAULT 50,
  category             TEXT NOT NULL CHECK (category IN ('Safety & APD', 'SOP Logistics', 'Defensive Driving')),
  division             TEXT DEFAULT 'General',
  role                 TEXT DEFAULT 'General',
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── 2. Triggers ──────────────────────────────────────────────

DROP TRIGGER IF EXISTS trg_workers_updated_at ON workers;
CREATE TRIGGER trg_workers_updated_at
  BEFORE UPDATE ON workers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_worker_competency_scores_updated_at ON worker_competency_scores;
CREATE TRIGGER trg_worker_competency_scores_updated_at
  BEFORE UPDATE ON worker_competency_scores
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ─── 3. Indexes for Query Performance ─────────────────────────

CREATE INDEX IF NOT EXISTS idx_workers_user_id ON workers(user_id);
CREATE INDEX IF NOT EXISTS idx_workers_employee_id ON workers(employee_id);
CREATE INDEX IF NOT EXISTS idx_workers_division_role ON workers(division, role);
CREATE INDEX IF NOT EXISTS idx_workers_total_points ON workers(total_points DESC);
CREATE INDEX IF NOT EXISTS idx_workers_bib_total ON workers(bib_total_score DESC);

CREATE INDEX IF NOT EXISTS idx_redemption_history_worker_id ON redemption_history(worker_id);
CREATE INDEX IF NOT EXISTS idx_redemption_history_created_at ON redemption_history(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_score_history_worker_recorded ON score_history(worker_id, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_worker_competency_scores_worker ON worker_competency_scores(worker_id);

-- ─── 4. RPC Functions ─────────────────────────────────────────

CREATE OR REPLACE FUNCTION increment_worker_points(p_worker_id TEXT, p_points INTEGER)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  UPDATE workers
  SET total_points = total_points + p_points,
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
    updated_at = now()
  WHERE id = p_worker_id;
END;
$$;

CREATE OR REPLACE FUNCTION deduct_worker_points(p_worker_id TEXT, p_points INTEGER)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  UPDATE workers SET
    total_points = GREATEST(0, total_points - p_points),
    updated_at = now()
  WHERE id = p_worker_id;
END;
$$;

CREATE OR REPLACE FUNCTION decrement_reward_stock(p_reward_id TEXT)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  UPDATE reward_catalog SET
    available_stock = GREATEST(0, available_stock - 1)
  WHERE id = p_reward_id;
END;
$$;

-- ─── Helper: Get Tier Numeric Level ───────────────────────────
CREATE OR REPLACE FUNCTION get_tier_level(p_tier TEXT)
RETURNS INTEGER IMMUTABLE LANGUAGE sql AS $$
  SELECT CASE p_tier
    WHEN 'Novice Operational' THEN 1
    WHEN 'Pro Specialist' THEN 2
    WHEN 'Elite Logistician' THEN 3
    WHEN 'Legendary Champion' THEN 4
    ELSE 1
  END;
$$;

-- ─── RPC: Redeem Reward FCFS Atomic ────────────────────────────
CREATE OR REPLACE FUNCTION rpc_redeem_reward_fcfs(
  p_worker_id TEXT,
  p_reward_id TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  v_worker_points INTEGER;
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
  -- 1. Lock & check worker points and tier
  SELECT total_points, tier INTO v_worker_points, v_worker_tier
  FROM workers
  WHERE id = p_worker_id FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Worker dengan ID % tidak ditemukan.', p_worker_id;
  END IF;

  -- 2. Lock & check reward catalog (Atomic Lock)
  SELECT title, points_required, available_stock, COALESCE(min_tier, 'Novice Operational'), COALESCE(max_claims_per_month, 1)
  INTO v_reward_title, v_reward_points, v_available_stock, v_min_tier, v_max_claims
  FROM reward_catalog
  WHERE id = p_reward_id FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Reward dengan ID % tidak ditemukan.', p_reward_id;
  END IF;

  -- 3. Check Tier Requirement
  IF get_tier_level(v_worker_tier) < get_tier_level(v_min_tier) THEN
    RAISE EXCEPTION 'TIER_KURANG: Reward ini membutuhkan tier minimal "%". Tier Anda saat ini adalah "%".', v_min_tier, v_worker_tier;
  END IF;

  -- 4. Check stock availability (FCFS Check)
  IF v_available_stock <= 0 THEN
    RAISE EXCEPTION 'KUOTA_HABIS: Kuota bulanan untuk reward "%" telah habis! Silakan tunggu reset kuota bulan depan.', v_reward_title;
  END IF;

  -- 5. Check worker point balance
  IF v_worker_points < v_reward_points THEN
    RAISE EXCEPTION 'POIN_KURANG: Poin Anda (% PTS) tidak mencukupi untuk menukar % (% PTS).', v_worker_points, v_reward_title, v_reward_points;
  END IF;

  -- 6. Check monthly claim limit per worker
  SELECT COUNT(*) INTO v_claims_this_month
  FROM redemption_history
  WHERE worker_id = p_worker_id
    AND item_title = v_reward_title
    AND DATE_TRUNC('month', created_at) = DATE_TRUNC('month', CURRENT_DATE);

  IF v_claims_this_month >= v_max_claims THEN
    RAISE EXCEPTION 'BATAS_KLAIM: Anda telah mencapai batas maksimal klaim (%x per bulan) untuk item "%".', v_max_claims, v_reward_title;
  END IF;

  -- 7. Perform Atomic Deductions & Record Transaction
  UPDATE workers
  SET total_points = total_points - v_reward_points,
      updated_at = now()
  WHERE id = p_worker_id;

  UPDATE reward_catalog
  SET available_stock = available_stock - 1
  WHERE id = p_reward_id;

  v_voucher_code := 'BIB-' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT), 1, 8));
  v_now_str := TO_CHAR(now(), 'YYYY-MM-DD HH24:MI');
  v_expiry_date := now() + INTERVAL '30 days';
  v_redemption_id := 'red-' || gen_random_uuid()::text;

  INSERT INTO redemption_history (
    id, worker_id, item_title, points_spent, redeemed_at, redemption_code, status, expiry_date
  )
  VALUES (
    v_redemption_id,
    p_worker_id,
    v_reward_title,
    v_reward_points,
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
    'remaining_points', v_worker_points - v_reward_points,
    'remaining_stock', v_available_stock - 1,
    'status', 'pending',
    'expiry_date', v_expiry_date,
    'message', 'Penukaran reward berhasil! Voucher siap digunakan.'
  );
END;
$$;

-- ─── RPC: Fulfill Redemption (Admin / Supervisor) ─────────────
CREATE OR REPLACE FUNCTION rpc_fulfill_redemption(
  p_redemption_id TEXT,
  p_admin_worker_id TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  v_curr_status TEXT;
BEGIN
  SELECT status INTO v_curr_status
  FROM redemption_history
  WHERE id = p_redemption_id FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Data penukaran tidak ditemukan.';
  END IF;

  IF v_curr_status = 'completed' THEN
    RETURN jsonb_build_object('success', true, 'message', 'Voucher ini sudah diserahkan sebelumnya.');
  END IF;

  UPDATE redemption_history
  SET status = 'completed',
      fulfilled_at = now(),
      fulfilled_by = p_admin_worker_id
  WHERE id = p_redemption_id;

  RETURN jsonb_build_object(
    'success', true,
    'redemption_id', p_redemption_id,
    'status', 'completed',
    'message', 'Voucher berhasil ditandai sebagai telah diserahkan.'
  );
END;
$$;

-- ─── RPC: Reset Monthly Reward Quota (Tanggal 1 Setiap Bulan) ─────
CREATE OR REPLACE FUNCTION reset_monthly_reward_quota()
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  v_updated_count INTEGER;
BEGIN
  UPDATE reward_catalog
  SET available_stock = GREATEST(monthly_stock_limit, 1),
      updated_at = now();

  GET DIAGNOSTICS v_updated_count = ROW_COUNT;

  RETURN jsonb_build_object(
    'success', true,
    'updated_items', v_updated_count,
    'message', 'Kuota bulanan seluruh item reward berhasil di-reset!'
  );
END;
$$;

-- ─── 4.1 System Settings Table (Aman dari Static JS Exposure) ─────
CREATE TABLE IF NOT EXISTS system_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  DROP POLICY IF EXISTS "Allow public read system_settings" ON system_settings;
  DROP POLICY IF EXISTS "Allow authenticated full system_settings" ON system_settings;
END $$;

CREATE POLICY "Allow public read system_settings" ON system_settings
  FOR SELECT USING (true);

CREATE POLICY "Allow authenticated full system_settings" ON system_settings
  FOR ALL USING (true);

-- ─── 5. Seed Data ─────────────────────────────────────────────

-- Seed: Workers (Clean Setup — Only System Administrator)
INSERT INTO workers (id, name, employee_id, role, division, avatar, streak_days, total_points, tier, bib_behavior, bib_integrity, bib_benchmark, bib_total_score, daily_quiz_completed, pre_shift_checklist_done, status)
VALUES
  ('w-sysadmin',    'System Administrator',  'SYS-ADMIN', 'System Administrator', 'SYSTEM',   'https://ui-avatars.com/api/?name=System+Admin&background=6B21A8&color=fff&bold=true', 100, 9999, 'Legendary Champion', 100.0, 100.0, 100.0, 100.0, true, true, 'active')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  role = EXCLUDED.role,
  division = EXCLUDED.division;

-- Seed: Reward Catalog
INSERT INTO reward_catalog (id, title, category, points_required, icon_name, description, available_stock, badge_tag)
VALUES
  ('r-1', 'Saldo GoPay Rp 50.000',             'E-Wallet',       500,  'Wallet',      'Voucher saldo digital GoPay instant ke nomor HP terdaftar.',                                25, 'Popular'),
  ('r-2', 'Saldo OVO / ShopeePay Rp 100.000',  'E-Wallet',       950,  'CreditCard',  'Top-up saldo E-wallet pilihan untuk kebutuhan harian.',                                     14, 'Best Value'),
  ('r-3', 'Paket Data Telkomsel 15GB',          'Pulsa & Data',   400,  'Wifi',        'Kuota internet cepat untuk kelancaran update aplikasi driver/kurir.',                       40, NULL),
  ('r-4', 'Rompi Safety Premium High-Vis',      'Safety Gear',    1200, 'ShieldCheck', 'Rompi reflektif 3M kualitas tinggi dengan saku zipper & breathable mesh.',                  8,  'Exclusive'),
  ('r-5', 'Voucher Belanja Minimarket Rp 75k',  'Voucher & Perk', 700,  'ShoppingBag', 'Voucher fisik/digital Indomaret / Alfamart seluruh Indonesia.',                             19, NULL),
  ('r-6', 'Prioritas Rute Favorit (1 Minggu)',  'Voucher & Perk', 1500, 'Award',       'Hak istimewa memilih zona rute pengiriman sesuai preferensi kurir.',                        5,  'VIP Perk')
ON CONFLICT (id) DO NOTHING;

-- Seed: Quiz Questions (10 Fallback Questions)
INSERT INTO quiz_questions (id, question, options, correct_answer_index, explanation, points_reward, category)
VALUES
  ('q-s1', 'Sebelum mengoperasikan forklift, langkah pertama yang wajib dilakukan operator adalah?',
   '["Langsung menghidupkan mesin", "Melakukan pre-use inspection (pengecekan visual keliling)", "Memuat barang terlebih dahulu", "Menunggu perintah supervisor"]',
   1, 'Pre-use inspection adalah SOP wajib sebelum operasi untuk mendeteksi kerusakan tersembunyi.', 50, 'Safety & APD'),
  ('q-s2', 'Berapa tinggi maksimum tumpukan palet di area penyimpanan indoor gudang logistik standar?',
   '["Tidak ada batas selama forklift bisa menjangkau", "Maksimum 3 palet atau mengikuti marka garis tinggi di dinding", "Maksimum 10 palet jika dinding kokoh", "Sesuai kapasitas rak saja"]',
   1, 'Batas tumpukan menjaga stabilitas dan mencegah risiko jatuhnya barang pada pekerja di bawah.', 50, 'Safety & APD'),
  ('q-s3', 'APD lengkap yang wajib digunakan Operator Forklift selama beroperasi di area gudang adalah?',
   '["Helm proyek dan sepatu biasa", "Helm safety, rompi high-vis, sarung tangan, dan sepatu safety berujung besi", "Rompi saja sudah cukup", "Tidak ada APD wajib di dalam gedung"]',
   1, 'Kombinasi helm, rompi high-vis, sarung tangan, dan safety shoes melindungi dari risiko tertabrak dan tertimpa barang.', 50, 'Safety & APD'),
  ('q-l1', 'Saat menerima barang inbound, dokumen mana yang WAJIB dicocokkan dengan fisik barang?',
   '["Nota pembelian dari supplier", "Surat Jalan (Delivery Order) dan Packing List", "Kartu nama pengirim", "Bukti transfer pembayaran"]',
   1, 'Rekonsiliasi Surat Jalan dan Packing List adalah SOP penerimaan barang untuk mencegah discrepancy.', 50, 'SOP Logistics'),
  ('q-l2', 'Barang dengan label "FRAGILE — THIS SIDE UP" harus ditempatkan di mana dalam tumpukan?',
   '["Di bagian paling bawah agar tidak jatuh", "Di bagian paling atas, posisi label menghadap ke atas", "Acak saja, label hanya formalitas", "Di tengah tumpukan untuk perlindungan"]',
   1, 'Label "THIS SIDE UP" menunjukkan orientasi packing yang aman untuk mencegah kerusakan isi barang.', 50, 'SOP Logistics'),
  ('q-l3', 'Apa yang harus dilakukan jika ditemukan barang rusak saat proses inbound di gudang?',
   '["Terima saja dan laporkan nanti", "Tolak penerimaan dan buat Berita Acara Kerusakan (BAK) bersama pengirim", "Simpan di area khusus tanpa dokumen", "Langsung buang barang rusak"]',
   1, 'BAK (Berita Acara Kerusakan) adalah dokumen kritis untuk klaim asuransi dan akuntabilitas operasional.', 50, 'SOP Logistics'),
  ('q-d1', 'Jarak aman minimum kendaraan armada logistik saat berkendara di jalan raya dengan kecepatan 60 km/jam adalah?',
   '["5 meter", "10 meter", "30 meter (atau mengikuti aturan 3 detik)", "50 meter"]',
   2, 'Aturan 3 detik memberikan jarak reaksi dan pengereman yang cukup di berbagai kondisi jalan.', 50, 'Defensive Driving'),
  ('q-d2', 'Saat hujan deras dengan jarak pandang terbatas, tindakan defensive driving yang benar adalah?',
   '["Menambah kecepatan agar cepat sampai tujuan", "Menyalakan hazard dan terus berkendara normal", "Mengurangi kecepatan, nyalakan lampu, tingkatkan jarak aman", "Berhenti mendadak di bahu jalan"]',
   2, 'Kecepatan rendah dan jarak aman diperlukan karena rem lebih panjang di jalan basah (aquaplaning).', 50, 'Defensive Driving'),
  ('q-d3', 'Ketika merasa mengantuk saat berkendara dengan armada, tindakan yang paling tepat adalah?',
   '["Minum kopi dan teruskan perjalanan", "Putar musik keras agar tetap terjaga", "Berhenti di tempat aman, istirahat minimal 20 menit", "Membuka jendela saja sudah cukup"]',
   2, 'Microsleep adalah penyebab utama kecelakaan fatal. Berhenti istirahat adalah satu-satunya solusi aman.', 50, 'Defensive Driving'),
  ('q-d4', 'Saat memasuki tikungan tajam di jalan perkebunan/warehouse dengan truk besar, posisi yang benar adalah?',
   '["Ambil jalur dalam agar jarak lebih pendek", "Melambat sebelum tikungan, ambil jalur lebar dan selesaikan belokan dengan smooth", "Klakson terus agar kendaraan lain minggir", "Percepat agar momentum membawa kendaraan menikung"]',
   1, 'Slow-in fast-out adalah prinsip dasar menikung aman. Melambat sebelum tikungan mencegah rollover.', 50, 'Defensive Driving')
ON CONFLICT (id) DO NOTHING;

-- ─── 6. Row Level Security (RLS) ──────────────────────────────

ALTER TABLE workers                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE reward_catalog           ENABLE ROW LEVEL SECURITY;
ALTER TABLE redemption_history       ENABLE ROW LEVEL SECURITY;
ALTER TABLE worker_competency_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE score_history            ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_questions           ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  DROP POLICY IF EXISTS "allow_anon_all_workers"           ON workers;
  DROP POLICY IF EXISTS "allow_anon_all_reward_catalog"    ON reward_catalog;
  DROP POLICY IF EXISTS "allow_anon_all_redemption"        ON redemption_history;
  DROP POLICY IF EXISTS "allow_anon_all_competency_scores" ON worker_competency_scores;
  DROP POLICY IF EXISTS "allow_anon_all_score_history"     ON score_history;
  DROP POLICY IF EXISTS "allow_anon_all_quiz_questions"    ON quiz_questions;
END $$;

CREATE POLICY "allow_anon_all_workers"           ON workers                  FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "allow_anon_all_reward_catalog"    ON reward_catalog           FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "allow_anon_all_redemption"        ON redemption_history       FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "allow_anon_all_competency_scores" ON worker_competency_scores FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "allow_anon_all_score_history"     ON score_history            FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "allow_anon_all_quiz_questions"    ON quiz_questions           FOR ALL TO public USING (true) WITH CHECK (true);

-- ─── 7. Supabase Storage: Avatars Bucket Setup ────────────────

INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

DO $$ BEGIN
  DROP POLICY IF EXISTS "Public Access to Avatars" ON storage.objects;
END $$;

CREATE POLICY "Public Access to Avatars" ON storage.objects
  FOR ALL TO public
  USING (bucket_id = 'avatars')
  WITH CHECK (bucket_id = 'avatars');

-- ─── 8. Quiz Questions Table Migration ──────────────────────────────────────

ALTER TABLE quiz_questions ADD COLUMN IF NOT EXISTS division TEXT DEFAULT 'General';
ALTER TABLE quiz_questions ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'General';

-- ─── 9. Announcements Table ──────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS announcements (
  id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  title       TEXT NOT NULL,
  content     TEXT NOT NULL,
  priority    TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('normal', 'urgent', 'info')),
  created_by  TEXT REFERENCES workers(id) ON DELETE SET NULL,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  expires_at  TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_announcements_active ON announcements(is_active, created_at DESC);

-- ─── 10. Badges & Worker Badges ──────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS badges (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  description TEXT NOT NULL,
  icon        TEXT NOT NULL DEFAULT 'award',
  color       TEXT NOT NULL DEFAULT 'amber',
  condition   TEXT NOT NULL,  -- e.g. 'streak_7', 'points_1000', 'quiz_10'
  threshold   INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS worker_badges (
  id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  worker_id   TEXT NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
  badge_id    TEXT NOT NULL REFERENCES badges(id) ON DELETE CASCADE,
  awarded_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(worker_id, badge_id)
);

CREATE INDEX IF NOT EXISTS idx_worker_badges_worker ON worker_badges(worker_id);

-- Seed default badges
INSERT INTO badges (id, name, description, icon, color, condition, threshold) VALUES
  ('badge-streak-7',    'Streak Mingguan',     'Login & aktivitas 7 hari berturut-turut',        'flame',        'orange',  'streak_days',   7),
  ('badge-streak-30',   'Streak Bulanan',      'Login & aktivitas 30 hari berturut-turut',       'zap',          'yellow',  'streak_days',   30),
  ('badge-points-500',  'Kolektor Poin',       'Mengumpulkan 500 poin total',                    'coins',        'amber',   'total_points',  500),
  ('badge-points-2000', 'Juara Poin',          'Mengumpulkan 2.000 poin total',                  'trophy',       'gold',    'total_points',  2000),
  ('badge-quiz-5',      'Siswa Teladan',       'Menyelesaikan 5 kuis harian',                    'book-open',    'cyan',    'quiz_count',    5),
  ('badge-quiz-20',     'Gappy AI Master',     'Menyelesaikan 20 kuis harian',                   'brain',        'violet',  'quiz_count',    20),
  ('badge-bib-80',      'Performa Tinggi',     'BIB Total Score ≥ 80',                           'shield-check', 'emerald', 'bib_score',     80),
  ('badge-checklist-7', 'Safety Champion',     'Menyelesaikan pre-shift checklist 7 hari berturut', 'check-circle', 'green', 'checklist_streak', 7)
ON CONFLICT (id) DO NOTHING;

-- ─── 11. Incident Reports & CAPA ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS incident_reports (
  id                  TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  worker_id           TEXT NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
  incident_type       TEXT NOT NULL CHECK (incident_type IN ('near_miss', 'injury', 'property_damage', 'unsafe_condition', 'other')),
  location            TEXT NOT NULL,
  description         TEXT NOT NULL,
  severity            TEXT NOT NULL DEFAULT 'low' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  status              TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'investigating', 'resolved', 'closed')),
  photo_url           TEXT,
  gdrive_folder_id    TEXT,
  original_size_kb    INTEGER,
  compressed_size_kb  INTEGER,
  points_awarded      BOOLEAN DEFAULT FALSE,
  occurred_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at         TIMESTAMPTZ,
  resolution_note     TEXT,
  root_cause          TEXT,
  corrective_action   TEXT,
  assigned_pic        TEXT,
  due_date            DATE
);

ALTER TABLE incident_reports ADD COLUMN IF NOT EXISTS photo_url TEXT;
ALTER TABLE incident_reports ADD COLUMN IF NOT EXISTS gdrive_folder_id TEXT;
ALTER TABLE incident_reports ADD COLUMN IF NOT EXISTS original_size_kb INTEGER;
ALTER TABLE incident_reports ADD COLUMN IF NOT EXISTS compressed_size_kb INTEGER;
ALTER TABLE incident_reports ADD COLUMN IF NOT EXISTS points_awarded BOOLEAN DEFAULT FALSE;
ALTER TABLE incident_reports ADD COLUMN IF NOT EXISTS root_cause TEXT;
ALTER TABLE incident_reports ADD COLUMN IF NOT EXISTS corrective_action TEXT;
ALTER TABLE incident_reports ADD COLUMN IF NOT EXISTS assigned_pic TEXT;
ALTER TABLE incident_reports ADD COLUMN IF NOT EXISTS due_date DATE;

CREATE INDEX IF NOT EXISTS idx_incident_reports_worker ON incident_reports(worker_id);
CREATE INDEX IF NOT EXISTS idx_incident_reports_status ON incident_reports(status, created_at DESC);

-- ─── 11.1 Worker Role Mutations Archive (Audit Trail) ─────────────────────────

CREATE TABLE IF NOT EXISTS worker_role_mutations (
  id                     TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  worker_id              TEXT NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
  previous_role          TEXT NOT NULL,
  previous_division      TEXT NOT NULL,
  new_role               TEXT NOT NULL,
  new_division           TEXT NOT NULL,
  archived_bib_behavior  NUMERIC(5,2) DEFAULT 0,
  archived_bib_integrity NUMERIC(5,2) DEFAULT 0,
  archived_bib_benchmark NUMERIC(5,2) DEFAULT 0,
  archived_bib_total     NUMERIC(5,2) DEFAULT 0,
  mutated_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  mutated_by             TEXT DEFAULT 'System Admin',
  reason                 TEXT DEFAULT 'Mutasi Role & Divisi Operasional'
);

CREATE INDEX IF NOT EXISTS idx_worker_role_mutations_worker ON worker_role_mutations(worker_id, mutated_at DESC);

ALTER TABLE worker_role_mutations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all for worker_role_mutations" ON worker_role_mutations;
CREATE POLICY "Allow all for worker_role_mutations" ON worker_role_mutations FOR ALL TO public USING (true) WITH CHECK (true);

-- Automatic Database Trigger: Auto-Award +50 PTS di level Server PostgreSQL saat status berubah jadi disetujui
CREATE OR REPLACE FUNCTION trg_fn_award_incident_points()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_target_worker_id TEXT;
BEGIN
  IF (OLD.status = 'open' OR OLD.points_awarded = FALSE OR OLD.points_awarded IS NULL)
     AND (NEW.status IN ('investigating', 'resolved', 'closed')) THEN
     
     v_target_worker_id := NEW.worker_id;

     IF v_target_worker_id IS NOT NULL AND v_target_worker_id <> '' THEN
       UPDATE workers
       SET total_points = total_points + 50,
           updated_at = now()
       WHERE id = v_target_worker_id OR employee_id = v_target_worker_id;

       NEW.points_awarded := TRUE;
     END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_incident_reports_award_points ON incident_reports;
CREATE TRIGGER trg_incident_reports_award_points
  BEFORE UPDATE ON incident_reports
  FOR EACH ROW
  EXECUTE FUNCTION trg_fn_award_incident_points();

-- ─── 12. Login Attempts (Rate Limiting) ──────────────────────────────────────

CREATE TABLE IF NOT EXISTS login_attempts (
  id           TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  identifier   TEXT NOT NULL,  -- NIK or email
  success      BOOLEAN NOT NULL DEFAULT false,
  attempted_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_login_attempts_identifier ON login_attempts(identifier, attempted_at DESC);

-- Auto-clean login attempts older than 1 hour (via scheduled job or manual)
-- Note: cleanup dilakukan dari sisi aplikasi setiap kali cek rate limit

-- ─── 13. Activity Log ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS activity_log (
  id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  worker_id   TEXT REFERENCES workers(id) ON DELETE CASCADE,
  worker_name TEXT,
  action      TEXT NOT NULL CHECK (action IN (
    'login', 'logout', 'password_reset', 'profile_update', 'badge_awarded',
    'quiz_completed', 'checklist_completed', 'incident_reported',
    'kudo_sent', 'kudo_received', 'shift_handover', 'sop_completed'
  )),
  detail      TEXT,
  ip_hint     TEXT,  -- optional, from browser hints
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE activity_log DROP CONSTRAINT IF EXISTS activity_log_action_check;
ALTER TABLE activity_log ADD CONSTRAINT activity_log_action_check CHECK (
  action IN (
    'login', 'logout', 'password_reset', 'profile_update', 'badge_awarded',
    'quiz_completed', 'checklist_completed', 'incident_reported',
    'kudo_sent', 'kudo_received', 'shift_handover', 'sop_completed'
  )
);

CREATE INDEX IF NOT EXISTS idx_activity_log_worker ON activity_log(worker_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_log_recent ON activity_log(created_at DESC);

-- ─── 14. RLS Policies for New Tables ─────────────────────────────────────────

ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all for announcements" ON announcements;
CREATE POLICY "Allow all for announcements" ON announcements FOR ALL TO public USING (true) WITH CHECK (true);

ALTER TABLE badges ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all for badges" ON badges;
CREATE POLICY "Allow all for badges" ON badges FOR ALL TO public USING (true) WITH CHECK (true);

ALTER TABLE worker_badges ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all for worker_badges" ON worker_badges;
CREATE POLICY "Allow all for worker_badges" ON worker_badges FOR ALL TO public USING (true) WITH CHECK (true);

ALTER TABLE incident_reports ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all for incident_reports" ON incident_reports;
CREATE POLICY "Allow all for incident_reports" ON incident_reports FOR ALL TO public USING (true) WITH CHECK (true);

ALTER TABLE login_attempts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all for login_attempts" ON login_attempts;
CREATE POLICY "Allow all for login_attempts" ON login_attempts FOR ALL TO public USING (true) WITH CHECK (true);

ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all for activity_log" ON activity_log;
CREATE POLICY "Allow all for activity_log" ON activity_log FOR ALL TO public USING (true) WITH CHECK (true);

-- ─── 15. Rewards & Redemption — LEGACY TABLE DEPRECATION ─────────────────────
-- NOTE: Tabel `rewards` dan `reward_redemptions` di section ini adalah LEGACY.
-- Sistem aktif menggunakan `reward_catalog` (section 1) dan `redemption_history` (section 1).
-- Tabel di bawah ini dipertahankan hanya untuk backward-compatibility dengan data lama.
-- JANGAN gunakan tabel `rewards` untuk fitur baru. Gunakan `reward_catalog`.

CREATE TABLE IF NOT EXISTS rewards (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  points_required INTEGER NOT NULL CHECK (points_required > 0),
  icon_name TEXT NOT NULL DEFAULT 'Gift',
  description TEXT NOT NULL,
  available_stock INTEGER NOT NULL DEFAULT 0 CHECK (available_stock >= 0),
  badge_tag TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS reward_redemptions (
  id TEXT PRIMARY KEY,
  worker_id TEXT NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
  reward_id TEXT NOT NULL REFERENCES rewards(id) ON DELETE CASCADE,
  points_spent INTEGER NOT NULL CHECK (points_spent > 0),
  redemption_code TEXT NOT NULL UNIQUE,
  redeemed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reward_redemptions_worker ON reward_redemptions(worker_id, redeemed_at DESC);
CREATE INDEX IF NOT EXISTS idx_reward_redemptions_recent ON reward_redemptions(redeemed_at DESC);

ALTER TABLE rewards ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all for rewards" ON rewards;
CREATE POLICY "Allow all for rewards" ON rewards FOR ALL TO public USING (true) WITH CHECK (true);

ALTER TABLE reward_redemptions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all for reward_redemptions" ON reward_redemptions;
CREATE POLICY "Allow all for reward_redemptions" ON reward_redemptions FOR ALL TO public USING (true) WITH CHECK (true);

-- ─── 16. Database Level Rules: System Administrator & Operational Leaderboard View ─

UPDATE workers
SET total_points = 0, bib_total_score = 0, bib_behavior = 0, bib_integrity = 0, bib_benchmark = 0, tier = 'Novice Operational'
WHERE employee_id = 'SYS-ADMIN' OR LOWER(role) LIKE '%administrator%';

CREATE OR REPLACE VIEW v_operational_leaderboard AS
SELECT *
FROM workers
WHERE LOWER(role) NOT IN ('system administrator', 'administrator', 'sysadmin', 'supervisor logistik', 'supervisor', 'pengawas')
  AND UPPER(division) != 'SYSTEM'
  AND status = 'active'
ORDER BY bib_total_score DESC, total_points DESC;

-- ─── 17. Atomic Database RPC Functions (LEGACY — superseded by rpc_redeem_reward_fcfs) ───

CREATE OR REPLACE FUNCTION rpc_redeem_reward(p_worker_id TEXT, p_reward_id TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_points INT;
  v_stock INT;
  v_title TEXT;
  v_category TEXT;
  v_cost INT;
  v_code TEXT;
  v_new_points INT;
  v_new_stock INT;
BEGIN
  SELECT total_points INTO v_points FROM workers WHERE id = p_worker_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'Data pekerja tidak ditemukan.');
  END IF;

  SELECT title, category, points_required, available_stock INTO v_title, v_category, v_cost, v_stock
  FROM rewards WHERE id = p_reward_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'Data reward tidak ditemukan.');
  END IF;

  IF v_stock <= 0 THEN
    RETURN jsonb_build_object('success', false, 'message', 'Stok reward telah habis.');
  END IF;

  IF v_points < v_cost THEN
    RETURN jsonb_build_object('success', false, 'message', 'Poin tidak mencukupi.');
  END IF;

  v_code := 'BIB-' || UPPER(SUBSTRING(v_category FROM 1 FOR 3)) || '-' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 5));
  v_new_points := v_points - v_cost;
  v_new_stock := v_stock - 1;

  UPDATE workers SET total_points = v_new_points WHERE id = p_worker_id;
  UPDATE rewards SET available_stock = v_new_stock, updated_at = NOW() WHERE id = p_reward_id;

  INSERT INTO reward_redemptions (id, worker_id, reward_id, points_spent, redemption_code, redeemed_at)
  VALUES ('red-' || EXTRACT(EPOCH FROM NOW())::TEXT || '-' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 4)), p_worker_id, p_reward_id, v_cost, v_code, NOW());

  RETURN jsonb_build_object(
    'success', true,
    'redemptionCode', v_code,
    'remainingPoints', v_new_points,
    'remainingStock', v_new_stock,
    'message', 'Berhasil menukarkan reward!'
  );
END;
$$;

-- ─── 18. Additional Indexes untuk Reward System ──────────────────────────────

-- Index untuk query status pending penukaran (Fulfillment Queue Admin)
CREATE INDEX IF NOT EXISTS idx_redemption_history_status ON redemption_history(status, created_at DESC);

-- Index untuk batas klaim bulanan per worker (dipakai di rpc_redeem_reward_fcfs)
CREATE INDEX IF NOT EXISTS idx_redemption_history_worker_month ON redemption_history(worker_id, item_title, created_at DESC);

-- Index untuk leaderboard point queries
CREATE INDEX IF NOT EXISTS idx_workers_points_tier ON workers(total_points DESC, tier);

-- ─── 19. Sempurnakan Seed Reward Catalog dengan Kolom Baru ───────────────────
-- Update existing seed data yang mungkin belum punya min_tier dan max_claims_per_month

UPDATE reward_catalog SET
  min_tier = 'Novice Operational',
  max_claims_per_month = 2,
  monthly_stock_limit = 25
WHERE id = 'r-1';   -- GoPay Rp 50.000 — terbuka untuk semua tier

UPDATE reward_catalog SET
  min_tier = 'Pro Specialist',
  max_claims_per_month = 1,
  monthly_stock_limit = 15
WHERE id = 'r-2';   -- OVO/ShopeePay Rp 100.000 — butuh Pro Specialist

UPDATE reward_catalog SET
  min_tier = 'Novice Operational',
  max_claims_per_month = 2,
  monthly_stock_limit = 40
WHERE id = 'r-3';   -- Paket Data Telkomsel — terbuka semua

UPDATE reward_catalog SET
  min_tier = 'Elite Logistician',
  max_claims_per_month = 1,
  monthly_stock_limit = 8
WHERE id = 'r-4';   -- Rompi Safety Premium — hanya Elite ke atas

UPDATE reward_catalog SET
  min_tier = 'Novice Operational',
  max_claims_per_month = 1,
  monthly_stock_limit = 20
WHERE id = 'r-5';   -- Voucher Minimarket — terbuka semua

UPDATE reward_catalog SET
  min_tier = 'Legendary Champion',
  max_claims_per_month = 1,
  monthly_stock_limit = 5
WHERE id = 'r-6';   -- Prioritas Rute VIP — hanya Legendary Champion

-- ─── 20. Scheduled Monthly Quota Reset Note ──────────────────────────────────
-- Panggil fungsi ini di awal setiap bulan (tanggal 1) via:
--   a) Supabase Edge Function + pg_cron (rekomendasi production):
--      SELECT cron.schedule('monthly-reward-reset', '0 0 1 * *', $$SELECT reset_monthly_reward_quota()$$);
--   b) Manual melalui Supabase SQL Editor pada awal bulan

-- ─── 21. Interactive SOP Micro-Deck & Learning Academy ───────────────────────

CREATE TABLE IF NOT EXISTS sop_modules (
  id                TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  code              TEXT UNIQUE NOT NULL,
  title             TEXT NOT NULL,
  description       TEXT NOT NULL DEFAULT '',
  category          TEXT NOT NULL CHECK (category IN (
                      'K3 & Safety', 
                      'Operasional MHE', 
                      'Warehouse & Staging', 
                      'Inbound & Timbangan', 
                      'Outbound & Ekspedisi',
                      '5S & Continuous Improvement',
                      'Tanggap Darurat & Lingkungan'
                    )),
  difficulty        TEXT NOT NULL DEFAULT 'Beginner' CHECK (difficulty IN ('Beginner', 'Intermediate', 'Advanced', 'Mandatory Compliance')),
  target_divisions  JSONB NOT NULL DEFAULT '["ALL"]'::jsonb,
  target_roles      JSONB NOT NULL DEFAULT '["ALL"]'::jsonb,
  estimated_minutes INTEGER NOT NULL DEFAULT 3,
  points_reward     INTEGER NOT NULL DEFAULT 50,
  badge_icon        TEXT NOT NULL DEFAULT 'BookOpen',
  slides_data       JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_mandatory      BOOLEAN NOT NULL DEFAULT false,
  deadline_days     INTEGER DEFAULT 14,
  version           TEXT NOT NULL DEFAULT 'v1.0',
  is_active         BOOLEAN NOT NULL DEFAULT true,
  author            TEXT DEFAULT 'HSE & Ops Management',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS worker_sop_progress (
  id                   TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  worker_id            TEXT NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
  sop_id               TEXT NOT NULL REFERENCES sop_modules(id) ON DELETE CASCADE,
  last_slide_viewed    INTEGER NOT NULL DEFAULT 1,
  is_completed         BOOLEAN NOT NULL DEFAULT false,
  completed_at         TIMESTAMPTZ,
  points_awarded       BOOLEAN NOT NULL DEFAULT false,
  quiz_score           INTEGER DEFAULT 0,
  time_spent_seconds   INTEGER NOT NULL DEFAULT 0,
  bookmarked_slide_ids JSONB DEFAULT '[]'::jsonb,
  personal_notes       TEXT,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(worker_id, sop_id)
);

CREATE INDEX IF NOT EXISTS idx_sop_modules_category ON sop_modules(category, is_active);
CREATE INDEX IF NOT EXISTS idx_worker_sop_progress_worker ON worker_sop_progress(worker_id);
CREATE INDEX IF NOT EXISTS idx_worker_sop_progress_completed ON worker_sop_progress(worker_id, is_completed);

ALTER TABLE sop_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE worker_sop_progress ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all read active sop_modules" ON sop_modules;
CREATE POLICY "Allow all read active sop_modules" ON sop_modules FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "Allow all write sop_modules" ON sop_modules;
CREATE POLICY "Allow all write sop_modules" ON sop_modules FOR ALL TO public USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all for worker_sop_progress" ON worker_sop_progress;
CREATE POLICY "Allow all for worker_sop_progress" ON worker_sop_progress FOR ALL TO public USING (true) WITH CHECK (true);

-- RPC: Complete SOP Module & Atomic Award +50 PTS + BIB Benchmark Boost
CREATE OR REPLACE FUNCTION rpc_complete_sop_module(
  p_worker_id TEXT,
  p_sop_id TEXT,
  p_time_spent INTEGER DEFAULT 180,
  p_quiz_score INTEGER DEFAULT 100
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_points INTEGER;
  v_sop_title TEXT;
  v_sop_code TEXT;
  v_already_completed BOOLEAN;
  v_worker_exists BOOLEAN;
BEGIN
  SELECT points_reward, title, code INTO v_points, v_sop_title, v_sop_code 
  FROM sop_modules WHERE id = p_sop_id;
  
  IF NOT FOUND THEN
    v_points := 50;
    v_sop_title := 'Modul SOP Logistik';
    v_sop_code := p_sop_id;
  END IF;

  SELECT EXISTS(SELECT 1 FROM workers WHERE id = p_worker_id) INTO v_worker_exists;
  IF NOT v_worker_exists THEN
    RETURN jsonb_build_object('success', false, 'message', 'Pekerja tidak ditemukan.');
  END IF;

  SELECT is_completed INTO v_already_completed
  FROM worker_sop_progress
  WHERE worker_id = p_worker_id AND sop_id = p_sop_id;

  IF v_already_completed = TRUE THEN
    RETURN jsonb_build_object(
      'success', true, 
      'already_completed', true, 
      'points_added', 0,
      'message', 'Modul SOP ini sudah pernah diselesaikan sebelumnya.'
    );
  END IF;

  INSERT INTO worker_sop_progress (
    worker_id, sop_id, is_completed, completed_at, points_awarded, time_spent_seconds, quiz_score
  )
  VALUES (
    p_worker_id, p_sop_id, true, now(), true, p_time_spent, p_quiz_score
  )
  ON CONFLICT (worker_id, sop_id) DO UPDATE SET
    is_completed = true,
    completed_at = now(),
    points_awarded = true,
    time_spent_seconds = worker_sop_progress.time_spent_seconds + p_time_spent,
    quiz_score = p_quiz_score,
    updated_at = now();

  UPDATE workers
  SET total_points = total_points + v_points,
      bib_benchmark = LEAST(100.0, bib_benchmark + 2.5),
      bib_total_score = ROUND(((bib_behavior * 0.35) + (bib_integrity * 0.30) + (LEAST(100.0, bib_benchmark + 2.5) * 0.35))::numeric, 2),
      updated_at = now()
  WHERE id = p_worker_id;

  INSERT INTO activity_log (worker_id, action, detail)
  VALUES (p_worker_id, 'checklist_completed', 'Menyelesaikan modul SOP: ' || v_sop_code || ' — ' || v_sop_title || ' (+ ' || v_points || ' PTS)');

  RETURN jsonb_build_object(
    'success', true,
    'points_added', v_points,
    'sop_title', v_sop_title,
    'message', 'Selamat! Anda telah menyelesaikan ' || v_sop_title || ' dan memperoleh +' || v_points || ' PTS.'
  );
END;
$$;

-- ─── 19. Phase 10: Shift Handover ──────────────────────────────────────────

CREATE TABLE IF NOT EXISTS shift_handovers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  shift_date DATE NOT NULL DEFAULT CURRENT_DATE,
  shift_type TEXT NOT NULL CHECK (shift_type IN ('Pagi', 'Siang', 'Malam')),
  author_id TEXT NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
  next_supervisor_id TEXT REFERENCES workers(id) ON DELETE SET NULL,
  handover_category TEXT NOT NULL DEFAULT 'MHE & Peralatan' CHECK (handover_category IN ('MHE & Peralatan', 'Operasional & Target', 'Kebersihan & 5S', 'Administrasi & Dokumen', 'Infrastruktur Gudang', 'K3 & Insiden', 'Lainnya')),
  condition_status TEXT NOT NULL DEFAULT 'Aman' CHECK (condition_status IN ('Aman', 'Perlu Perhatian', 'Urgent')),
  status TEXT NOT NULL DEFAULT 'Tertunda' CHECK (status IN ('Tertunda', 'Proses', 'Selesai')),
  notes TEXT,
  acknowledged_at TIMESTAMPTZ,
  acknowledged_by TEXT REFERENCES workers(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE shift_handovers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow read all for shift_handovers" ON shift_handovers FOR SELECT TO public USING (true);
CREATE POLICY "Allow insert for shift_handovers" ON shift_handovers FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Allow update for shift_handovers" ON shift_handovers FOR UPDATE TO public USING (true) WITH CHECK (true);

-- ─── 20. Phase 9: Peer-to-Peer Recognition (Kudos) ─────────────────────────

CREATE TABLE IF NOT EXISTS worker_kudos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id TEXT NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
  receiver_id TEXT NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
  category TEXT NOT NULL CHECK (category IN ('Kerja Keras', 'Inisiatif', 'Teamwork', 'Safety First')),
  message TEXT NOT NULL,
  points_awarded INTEGER NOT NULL DEFAULT 10,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE worker_kudos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow read all for worker_kudos" ON worker_kudos FOR SELECT TO public USING (true);
CREATE POLICY "Allow insert for worker_kudos" ON worker_kudos FOR INSERT TO public WITH CHECK (true);

-- Update activity_log constraint safely
ALTER TABLE activity_log DROP CONSTRAINT IF EXISTS activity_log_action_check;
ALTER TABLE activity_log ADD CONSTRAINT activity_log_action_check CHECK (
  action IN (
    'login', 'logout', 'password_reset', 'profile_update', 'badge_awarded',
    'quiz_completed', 'checklist_completed', 'incident_reported',
    'kudo_sent', 'kudo_received', 'shift_handover', 'sop_completed'
  )
);

-- RPC for sending Kudos atomically
CREATE OR REPLACE FUNCTION rpc_send_kudo(
  p_sender_id TEXT,
  p_receiver_id TEXT,
  p_category TEXT,
  p_message TEXT,
  p_points INTEGER
) RETURNS void AS $$
BEGIN
  -- 1. Insert kudo record
  INSERT INTO worker_kudos (sender_id, receiver_id, category, message, points_awarded)
  VALUES (p_sender_id, p_receiver_id, p_category, p_message, p_points);

  -- 2. Add points to receiver
  UPDATE workers
  SET total_points = total_points + p_points,
      updated_at = now()
  WHERE id = p_receiver_id;

  -- 3. Log activity for receiver (kudo_received)
  INSERT INTO activity_log (worker_id, action, detail)
  VALUES (p_receiver_id, 'kudo_received', 'Menerima Kudo (' || p_category || ') dari Rekan (+10 PTS)');

  -- 4. Log activity for sender (kudo_sent, 0 points)
  INSERT INTO activity_log (worker_id, action, detail)
  VALUES (p_sender_id, 'kudo_sent', 'Memberikan Kudo ke Rekan');
END;
$$ LANGUAGE plpgsql;

-- ─── 21. Phase 11: Kaizen / Suggestion Box (Kotak Saran Inovasi) ────────────

CREATE TABLE IF NOT EXISTS kaizen_suggestions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  author_id TEXT NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('Safety / K3', 'Efisiensi Operasional', '5R & Kebersihan', 'Penghematan Biaya', 'Kualitas Layanan', 'Lainnya')),
  current_condition TEXT NOT NULL,
  proposed_solution TEXT NOT NULL,
  expected_impact TEXT,
  photo_before_url TEXT,
  photo_after_url TEXT,
  status TEXT NOT NULL DEFAULT 'Submitted' CHECK (status IN ('Submitted', 'Under Review', 'Approved', 'Implemented', 'Rejected')),
  reward_points INTEGER NOT NULL DEFAULT 0,
  reviewer_id TEXT REFERENCES workers(id) ON DELETE SET NULL,
  reviewer_feedback TEXT,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE kaizen_suggestions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow read all for kaizen_suggestions" ON kaizen_suggestions FOR SELECT TO public USING (true);
CREATE POLICY "Allow insert for kaizen_suggestions" ON kaizen_suggestions FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Allow update for kaizen_suggestions" ON kaizen_suggestions FOR UPDATE TO public USING (true) WITH CHECK (true);
CREATE POLICY "Allow delete for kaizen_suggestions" ON kaizen_suggestions FOR DELETE TO public USING (true);

-- Update activity_log check constraint to include kaizen actions
ALTER TABLE activity_log DROP CONSTRAINT IF EXISTS activity_log_action_check;
ALTER TABLE activity_log ADD CONSTRAINT activity_log_action_check CHECK (
  action IN (
    'login', 'logout', 'password_reset', 'profile_update', 'badge_awarded',
    'quiz_completed', 'checklist_completed', 'incident_reported',
    'kudo_sent', 'kudo_received', 'shift_handover', 'sop_completed',
    'kaizen_submitted', 'kaizen_approved'
  )
);

-- RPC for approving Kaizen, awarding points, and logging activity atomically
CREATE OR REPLACE FUNCTION rpc_approve_kaizen(
  p_suggestion_id UUID,
  p_reviewer_id TEXT,
  p_new_status TEXT,
  p_reward_points INTEGER,
  p_feedback TEXT
) RETURNS void AS $$
DECLARE
  v_author_id TEXT;
  v_title TEXT;
  v_prev_reward INTEGER;
  v_effective_reward INTEGER;
  v_point_diff INTEGER;
BEGIN
  -- 1. Ambil data author & previous reward
  SELECT author_id, title, reward_points INTO v_author_id, v_title, v_prev_reward
  FROM kaizen_suggestions
  WHERE id = p_suggestion_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Kaizen suggestion dengan ID % tidak ditemukan', p_suggestion_id;
  END IF;

  -- 2. Tentukan poin reward efektif: Hanya status Approved & Implemented yang berhak mendapat poin
  IF p_new_status IN ('Approved', 'Implemented') THEN
    v_effective_reward := GREATEST(p_reward_points, 0);
  ELSE
    v_effective_reward := 0; -- Jika di-reject atau dikembalikan, poin di-reset ke 0 (Refund)
  END IF;

  -- 3. Hitung selisih poin reward (positif = penambahan, negatif = refund)
  v_point_diff := v_effective_reward - COALESCE(v_prev_reward, 0);

  -- 3. Update status saran Kaizen
  UPDATE kaizen_suggestions
  SET status = p_new_status,
      reward_points = v_effective_reward,
      reviewer_id = p_reviewer_id,
      reviewer_feedback = p_feedback,
      reviewed_at = now(),
      updated_at = now()
  WHERE id = p_suggestion_id;

  -- 4. Lakukan penyesuaian saldo poin worker jika ada selisih (bisa topup atau refund)
  IF v_point_diff <> 0 THEN
    UPDATE workers
    SET total_points = GREATEST(total_points + v_point_diff, 0),
        updated_at = now()
    WHERE id = v_author_id;

    -- Catat log aktivitas untuk worker
    IF v_point_diff > 0 THEN
      INSERT INTO activity_log (worker_id, action, detail)
      VALUES (
        v_author_id,
        'kaizen_approved',
        'Inovasi Kaizen Disetujui: "' || SUBSTRING(v_title FROM 1 FOR 30) || '" (+' || v_point_diff || ' PTS)'
      );
    ELSE
      INSERT INTO activity_log (worker_id, action, detail)
      VALUES (
        v_author_id,
        'kaizen_approved',
        'Refund / Penyesuaian Poin Kaizen: "' || SUBSTRING(v_title FROM 1 FOR 30) || '" (' || v_point_diff || ' PTS)'
      );
    END IF;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- ─── 22. Phase 12: MHE & SIO Licenses Tracker (Lisensi Alat Berat) ──────────

CREATE TABLE IF NOT EXISTS mhe_licenses (
  id TEXT PRIMARY KEY,
  worker_id TEXT NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
  license_type TEXT NOT NULL,
  license_number TEXT NOT NULL,
  sio_category TEXT NOT NULL,
  issued_date DATE NOT NULL,
  expiry_date DATE NOT NULL,
  issuing_authority TEXT NOT NULL,
  document_url TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expiring_soon', 'expired')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mhe_licenses_worker ON mhe_licenses(worker_id);
CREATE INDEX IF NOT EXISTS idx_mhe_licenses_expiry ON mhe_licenses(expiry_date ASC);
CREATE INDEX IF NOT EXISTS idx_mhe_licenses_status ON mhe_licenses(status);

ALTER TABLE mhe_licenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow read for mhe_licenses" ON mhe_licenses FOR SELECT TO public USING (true);
CREATE POLICY "Allow insert for mhe_licenses" ON mhe_licenses FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Allow update for mhe_licenses" ON mhe_licenses FOR UPDATE TO public USING (true) WITH CHECK (true);
CREATE POLICY "Allow delete for mhe_licenses" ON mhe_licenses FOR DELETE TO public USING (true);

DROP TRIGGER IF EXISTS trg_mhe_licenses_updated_at ON mhe_licenses;
CREATE TRIGGER trg_mhe_licenses_updated_at
  BEFORE UPDATE ON mhe_licenses
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ─── 23. Phase 13: PPE Management & Lifecycle (Inventaris APD) ─────────────

CREATE TABLE IF NOT EXISTS ppe_items (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  standard_code TEXT NOT NULL,
  standard_lifetime_days INTEGER NOT NULL DEFAULT 180,
  stock_quantity INTEGER NOT NULL DEFAULT 0,
  minimum_stock_threshold INTEGER NOT NULL DEFAULT 5,
  unit TEXT NOT NULL DEFAULT 'Pcs',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ppe_distributions (
  id TEXT PRIMARY KEY,
  worker_id TEXT NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
  worker_name TEXT NOT NULL,
  worker_division TEXT NOT NULL,
  ppe_item_id TEXT NOT NULL REFERENCES ppe_items(id) ON DELETE CASCADE,
  ppe_item_name TEXT NOT NULL,
  serial_or_batch_number TEXT,
  distribution_date DATE NOT NULL,
  expected_replacement_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expiring_soon', 'expired_replaced', 'damaged_lost')),
  condition_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ppe_damage_reports (
  id TEXT PRIMARY KEY,
  distribution_id TEXT NOT NULL REFERENCES ppe_distributions(id) ON DELETE CASCADE,
  worker_id TEXT NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
  damage_type TEXT NOT NULL,
  incident_description TEXT NOT NULL,
  photo_url TEXT,
  status TEXT NOT NULL DEFAULT 'reported' CHECK (status IN ('reported', 'verified', 'replaced', 'rejected')),
  reviewed_by TEXT REFERENCES workers(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ppe_items_category ON ppe_items(category);
CREATE INDEX IF NOT EXISTS idx_ppe_distributions_worker ON ppe_distributions(worker_id);
CREATE INDEX IF NOT EXISTS idx_ppe_distributions_status ON ppe_distributions(status);
CREATE INDEX IF NOT EXISTS idx_ppe_distributions_replacement ON ppe_distributions(expected_replacement_date ASC);
CREATE INDEX IF NOT EXISTS idx_ppe_damage_worker ON ppe_damage_reports(worker_id);

ALTER TABLE ppe_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow read for ppe_items" ON ppe_items FOR SELECT TO public USING (true);
CREATE POLICY "Allow manage for ppe_items" ON ppe_items FOR ALL TO public USING (true);

ALTER TABLE ppe_distributions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow read for ppe_distributions" ON ppe_distributions FOR SELECT TO public USING (true);
CREATE POLICY "Allow manage for ppe_distributions" ON ppe_distributions FOR ALL TO public USING (true);

ALTER TABLE ppe_damage_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow read for ppe_damage_reports" ON ppe_damage_reports FOR SELECT TO public USING (true);
CREATE POLICY "Allow manage for ppe_damage_reports" ON ppe_damage_reports FOR ALL TO public USING (true);

-- RPC: Distribute PPE & Decrement Stock Atomically
CREATE OR REPLACE FUNCTION rpc_distribute_ppe(
  p_worker_id TEXT,
  p_worker_name TEXT,
  p_worker_division TEXT,
  p_ppe_item_id TEXT,
  p_serial TEXT,
  p_replacement_date DATE,
  p_notes TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  v_item_name TEXT;
  v_curr_stock INTEGER;
  v_dist_id TEXT;
BEGIN
  SELECT name, stock_quantity INTO v_item_name, v_curr_stock
  FROM ppe_items
  WHERE id = p_ppe_item_id FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Item APD tidak ditemukan.';
  END IF;

  IF v_curr_stock <= 0 THEN
    RAISE EXCEPTION 'Stok APD % habis.', v_item_name;
  END IF;

  UPDATE ppe_items
  SET stock_quantity = stock_quantity - 1,
      updated_at = now()
  WHERE id = p_ppe_item_id;

  v_dist_id := 'dist_' || gen_random_uuid()::text;

  INSERT INTO ppe_distributions (
    id, worker_id, worker_name, worker_division, ppe_item_id, ppe_item_name,
    serial_or_batch_number, distribution_date, expected_replacement_date, status, condition_notes
  ) VALUES (
    v_dist_id, p_worker_id, p_worker_name, p_worker_division, p_ppe_item_id, v_item_name,
    p_serial, CURRENT_DATE, p_replacement_date, 'active', p_notes
  );

  INSERT INTO activity_log (worker_id, action, detail)
  VALUES (p_worker_id, 'ppe_distributed', 'Penerimaan Distribusi APD: ' || v_item_name);

  RETURN jsonb_build_object(
    'success', true,
    'distribution_id', v_dist_id,
    'remaining_stock', v_curr_stock - 1,
    'message', 'Distribusi APD berhasil dicatat.'
  );
END;
$$;

-- ─── 24. Phase 15: Disciplinary Actions & SP K3 (Pembinaan & Sanksi) ────────

CREATE TABLE IF NOT EXISTS disciplinary_actions (
  id TEXT PRIMARY KEY,
  worker_id TEXT NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
  worker_name TEXT NOT NULL,
  worker_division TEXT NOT NULL,
  worker_role TEXT NOT NULL,
  document_ref_number TEXT UNIQUE NOT NULL,
  violation_level TEXT NOT NULL CHECK (violation_level IN ('coaching_verbal', 'written_warning_1', 'written_warning_2', 'written_warning_3', 'suspension', 'remedial_evaluation')),
  violation_category TEXT NOT NULL,
  incident_date DATE NOT NULL,
  location TEXT,
  description TEXT NOT NULL,
  action_plan TEXT,
  point_deduction INTEGER NOT NULL DEFAULT 0,
  issued_by TEXT NOT NULL,
  expiry_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'in_retraining', 'resolved', 'appealed')),
  mandatory_retraining_sop_id TEXT,
  mandatory_retraining_sop_title TEXT,
  is_retraining_completed BOOLEAN NOT NULL DEFAULT false,
  retraining_completed_at TIMESTAMPTZ,
  resolution_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_disciplinary_worker ON disciplinary_actions(worker_id);
CREATE INDEX IF NOT EXISTS idx_disciplinary_status ON disciplinary_actions(status);
CREATE INDEX IF NOT EXISTS idx_disciplinary_date ON disciplinary_actions(incident_date DESC);

ALTER TABLE disciplinary_actions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow read for disciplinary_actions" ON disciplinary_actions FOR SELECT TO public USING (true);
CREATE POLICY "Allow manage for disciplinary_actions" ON disciplinary_actions FOR ALL TO public USING (true);

DROP TRIGGER IF EXISTS trg_disciplinary_actions_updated_at ON disciplinary_actions;
CREATE TRIGGER trg_disciplinary_actions_updated_at
  BEFORE UPDATE ON disciplinary_actions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RPC: Issue Disciplinary Action & Deduct Points Atomically
CREATE OR REPLACE FUNCTION rpc_issue_disciplinary_action(
  p_worker_id TEXT,
  p_worker_name TEXT,
  p_worker_division TEXT,
  p_worker_role TEXT,
  p_doc_ref TEXT,
  p_level TEXT,
  p_category TEXT,
  p_incident_date DATE,
  p_location TEXT,
  p_description TEXT,
  p_action_plan TEXT,
  p_point_deduction INTEGER,
  p_issued_by TEXT,
  p_expiry_date DATE,
  p_mandatory_sop_id TEXT,
  p_mandatory_sop_title TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  v_action_id TEXT;
  v_initial_status TEXT;
BEGIN
  v_action_id := 'disc_' || gen_random_uuid()::text;
  v_initial_status := CASE WHEN p_mandatory_sop_id IS NOT NULL AND p_mandatory_sop_id <> '' THEN 'in_retraining' ELSE 'active' END;

  INSERT INTO disciplinary_actions (
    id, worker_id, worker_name, worker_division, worker_role, document_ref_number,
    violation_level, violation_category, incident_date, location, description, action_plan,
    point_deduction, issued_by, expiry_date, status, mandatory_retraining_sop_id,
    mandatory_retraining_sop_title, is_retraining_completed
  ) VALUES (
    v_action_id, p_worker_id, p_worker_name, p_worker_division, p_worker_role, p_doc_ref,
    p_level, p_category, p_incident_date, p_location, p_description, p_action_plan,
    p_point_deduction, p_issued_by, p_expiry_date, v_initial_status, p_mandatory_sop_id,
    p_mandatory_sop_title, false
  );

  -- Deduct Points from Worker balance if deduction > 0
  IF p_point_deduction > 0 THEN
    UPDATE workers
    SET total_points = GREATEST(0, total_points - p_point_deduction),
        updated_at = now()
    WHERE id = p_worker_id;
  END IF;

  INSERT INTO activity_log (worker_id, action, detail)
  VALUES (p_worker_id, 'disciplinary_issued', 'Penerbitan Sanksi ' || p_doc_ref || ' (-' || p_point_deduction || ' PTS)');

  RETURN jsonb_build_object(
    'success', true,
    'action_id', v_action_id,
    'document_ref', p_doc_ref,
    'points_deducted', p_point_deduction,
    'message', 'Surat sanksi / Berita Acara berhasil diterbitkan secara resmi.'
  );
END;
$$;

-- ─── 25. Phase 16: Audit Standar 5R / 5S Wilayah Gudang ────────────────────

CREATE TABLE IF NOT EXISTS warehouse_zones_5s (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  zone_type TEXT NOT NULL,
  division TEXT NOT NULL,
  pic_worker_id TEXT REFERENCES workers(id) ON DELETE SET NULL,
  pic_worker_name TEXT NOT NULL,
  last_audit_score NUMERIC(5,2) NOT NULL DEFAULT 0,
  badge_rating TEXT NOT NULL DEFAULT 'Perlu Perbaikan' CHECK (badge_rating IN ('Gold', 'Silver', 'Bronze', 'Perlu Perbaikan')),
  last_audited_date DATE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS audit_5s_records (
  id TEXT PRIMARY KEY,
  zone_id TEXT NOT NULL REFERENCES warehouse_zones_5s(id) ON DELETE CASCADE,
  zone_name TEXT NOT NULL,
  zone_type TEXT NOT NULL,
  division TEXT NOT NULL,
  auditor_id TEXT REFERENCES workers(id) ON DELETE SET NULL,
  auditor_name TEXT NOT NULL,
  pic_worker_name TEXT NOT NULL,
  audit_date DATE NOT NULL,
  ringkas_score NUMERIC(5,2) NOT NULL DEFAULT 0,
  rapi_score NUMERIC(5,2) NOT NULL DEFAULT 0,
  resik_score NUMERIC(5,2) NOT NULL DEFAULT 0,
  rawat_score NUMERIC(5,2) NOT NULL DEFAULT 0,
  rajin_score NUMERIC(5,2) NOT NULL DEFAULT 0,
  total_score NUMERIC(5,2) NOT NULL DEFAULT 0,
  rating TEXT NOT NULL CHECK (rating IN ('Gold', 'Silver', 'Bronze', 'Perlu Perbaikan')),
  reward_points_awarded INTEGER NOT NULL DEFAULT 0,
  findings_notes TEXT,
  corrective_actions TEXT,
  photo_urls JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_5s_zones_division ON warehouse_zones_5s(division);
CREATE INDEX IF NOT EXISTS idx_5s_records_zone ON audit_5s_records(zone_id);
CREATE INDEX IF NOT EXISTS idx_5s_records_date ON audit_5s_records(audit_date DESC);
CREATE INDEX IF NOT EXISTS idx_5s_records_rating ON audit_5s_records(rating);

ALTER TABLE warehouse_zones_5s ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow read for warehouse_zones_5s" ON warehouse_zones_5s FOR SELECT TO public USING (true);
CREATE POLICY "Allow manage for warehouse_zones_5s" ON warehouse_zones_5s FOR ALL TO public USING (true);

ALTER TABLE audit_5s_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow read for audit_5s_records" ON audit_5s_records FOR SELECT TO public USING (true);
CREATE POLICY "Allow manage for audit_5s_records" ON audit_5s_records FOR ALL TO public USING (true);

DROP TRIGGER IF EXISTS trg_warehouse_zones_5s_updated_at ON warehouse_zones_5s;
CREATE TRIGGER trg_warehouse_zones_5s_updated_at
  BEFORE UPDATE ON warehouse_zones_5s
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RPC: Submit 5S Audit Session & Award PIC Points Atomically
CREATE OR REPLACE FUNCTION rpc_submit_5s_audit(
  p_zone_id TEXT,
  p_auditor_id TEXT,
  p_auditor_name TEXT,
  p_audit_date DATE,
  p_ringkas NUMERIC,
  p_rapi NUMERIC,
  p_resik NUMERIC,
  p_rawat NUMERIC,
  p_rajin NUMERIC,
  p_total NUMERIC,
  p_rating TEXT,
  p_points_reward INTEGER,
  p_findings TEXT,
  p_corrective TEXT,
  p_photos JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  v_zone_name TEXT;
  v_zone_type TEXT;
  v_division TEXT;
  v_pic_name TEXT;
  v_pic_id TEXT;
  v_record_id TEXT;
BEGIN
  SELECT name, zone_type, division, pic_worker_name, pic_worker_id
  INTO v_zone_name, v_zone_type, v_division, v_pic_name, v_pic_id
  FROM warehouse_zones_5s
  WHERE id = p_zone_id FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Zona 5R tidak ditemukan.';
  END IF;

  v_record_id := 'audit5s_' || gen_random_uuid()::text;

  INSERT INTO audit_5s_records (
    id, zone_id, zone_name, zone_type, division, auditor_id, auditor_name,
    pic_worker_name, audit_date, ringkas_score, rapi_score, resik_score,
    rawat_score, rajin_score, total_score, rating, reward_points_awarded,
    findings_notes, corrective_actions, photo_urls
  ) VALUES (
    v_record_id, p_zone_id, v_zone_name, v_zone_type, v_division, p_auditor_id, p_auditor_name,
    v_pic_name, p_audit_date, p_ringkas, p_rapi, p_resik, p_rawat, p_rajin, p_total,
    p_rating, p_points_reward, p_findings, p_corrective, COALESCE(p_photos, '[]'::jsonb)
  );

  -- Update Zone Master record
  UPDATE warehouse_zones_5s
  SET last_audit_score = p_total,
      badge_rating = p_rating,
      last_audited_date = p_audit_date,
      updated_at = now()
  WHERE id = p_zone_id;

  -- Award reward points to PIC if applicable
  IF p_points_reward > 0 AND v_pic_id IS NOT NULL THEN
    UPDATE workers
    SET total_points = total_points + p_points_reward,
        updated_at = now()
    WHERE id = v_pic_id;

    INSERT INTO activity_log (worker_id, action, detail)
    VALUES (v_pic_id, 'audit_5s_completed', 'Reward Audit 5R Wilayah (' || v_zone_name || '): Predikat ' || p_rating || ' (+' || p_points_reward || ' PTS)');
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'record_id', v_record_id,
    'score', p_total,
    'rating', p_rating,
    'reward_points', p_points_reward,
    'message', 'Audit 5R berhasil dicatat dan nilai rating telah diperbarui.'
  );
END;
$$;

-- ─── 26. Phase 17: Dynamic System Points Configuration (Config Remote) ────

CREATE TABLE IF NOT EXISTS system_point_configs (
  id TEXT PRIMARY KEY DEFAULT 'default_config',
  config_data JSONB NOT NULL,
  updated_by TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE system_point_configs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow read for system_point_configs" ON system_point_configs FOR SELECT TO public USING (true);
CREATE POLICY "Allow manage for system_point_configs" ON system_point_configs FOR ALL TO public USING (true);

-- Seed Default Config Row
INSERT INTO system_point_configs (id, config_data, updated_by)
VALUES (
  'default_config',
  '{
    "dailyQuizPoints": 50,
    "dailyQuiz100Bonus": 25,
    "preShiftChecklistPoints": 30,
    "sopCompletionPoints": 50,
    "incidentReportPoints": 40,
    "nearMissBonusPoints": 20,
    "kaizenSubmissionPoints": 50,
    "kaizenApprovedPoints": 150,
    "kaizenImplementedPoints": 300,
    "kudoReceivedPoints": 10,
    "kudoSentPoints": 5,
    "audit5sGoldPoints": 100,
    "audit5sSilverPoints": 50,
    "audit5sBronzePoints": 25,
    "sioRegistrationPoints": 100,
    "sioRenewalPoints": 75,
    "verbalCoachingPenaltyPoints": 25,
    "warningLetter1PenaltyPoints": 100,
    "warningLetter2PenaltyPoints": 250,
    "warningLetter3PenaltyPoints": 500,
    "suspensionPenaltyPoints": 1000
  }'::jsonb,
  'SYS-ADMIN'
)
ON CONFLICT (id) DO UPDATE SET
  config_data = EXCLUDED.config_data;

-- ─── 27. Universal Activity Log Constraints & Indexes ──────────────────────

ALTER TABLE activity_log DROP CONSTRAINT IF EXISTS activity_log_action_check;
ALTER TABLE activity_log ADD CONSTRAINT activity_log_action_check CHECK (
  action IN (
    'login', 'logout', 'password_reset', 'profile_update', 'badge_awarded',
    'quiz_completed', 'checklist_completed', 'incident_reported',
    'kudo_sent', 'kudo_received', 'shift_handover', 'sop_completed',
    'kaizen_submitted', 'kaizen_approved', 'disciplinary_issued',
    'disciplinary_retraining_completed', 'audit_5s_completed',
    'sio_registered', 'ppe_distributed', 'ppe_damaged',
    'notification_broadcast'
  )
);

-- ─── 28. App Notifications Table (Pusat Siaran & Notifikasi Terpadu) ────────
CREATE TABLE IF NOT EXISTS app_notifications (
  id             TEXT PRIMARY KEY,
  recipient_id   TEXT NOT NULL DEFAULT 'all', -- 'all', 'worker', 'supervisor', 'admin', atau specific worker_id
  recipient_role TEXT NOT NULL DEFAULT 'all' CHECK (recipient_role IN ('all', 'worker', 'supervisor', 'admin')),
  title          TEXT NOT NULL,
  message        TEXT NOT NULL,
  type           TEXT NOT NULL DEFAULT 'system' CHECK (type IN ('incident', 'quiz', 'reward', 'audit', 'system', 'license')),
  is_read        BOOLEAN NOT NULL DEFAULT false,
  metadata       JSONB DEFAULT '{}'::jsonb,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_app_notif_recipient ON app_notifications(recipient_role, recipient_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_app_notif_created ON app_notifications(created_at DESC);

-- Row Level Security
ALTER TABLE app_notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all access to app_notifications" ON app_notifications;
CREATE POLICY "Allow all access to app_notifications" ON app_notifications FOR ALL USING (true) WITH CHECK (true);


