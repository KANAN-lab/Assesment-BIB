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
  id              TEXT PRIMARY KEY,
  title           TEXT NOT NULL,
  category        TEXT NOT NULL CHECK (category IN ('E-Wallet', 'Pulsa & Data', 'Safety Gear', 'Voucher & Perk')),
  points_required INTEGER NOT NULL,
  icon_name       TEXT NOT NULL DEFAULT 'Gift',
  description     TEXT NOT NULL DEFAULT '',
  available_stock INTEGER NOT NULL DEFAULT 0,
  monthly_stock_limit INTEGER NOT NULL DEFAULT 25,
  badge_tag       TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Table: redemption_history
CREATE TABLE IF NOT EXISTS redemption_history (
  id               TEXT PRIMARY KEY,
  worker_id        TEXT NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
  item_title       TEXT NOT NULL,
  points_spent     INTEGER NOT NULL,
  redeemed_at      TEXT NOT NULL,
  redemption_code  TEXT NOT NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

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
  WHERE id = p_worker_id;
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
  v_reward_title TEXT;
  v_reward_points INTEGER;
  v_available_stock INTEGER;
  v_claims_this_month INTEGER;
  v_voucher_code TEXT;
  v_now_str TEXT;
BEGIN
  -- 1. Lock & check worker points
  SELECT total_points INTO v_worker_points
  FROM workers
  WHERE id = p_worker_id FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Worker dengan ID % tidak ditemukan.', p_worker_id;
  END IF;

  -- 2. Lock & check reward catalog (Atomic Lock)
  SELECT title, points_required, available_stock INTO v_reward_title, v_reward_points, v_available_stock
  FROM reward_catalog
  WHERE id = p_reward_id FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Reward dengan ID % tidak ditemukan.', p_reward_id;
  END IF;

  -- 3. Check stock availability (FCFS Check)
  IF v_available_stock <= 0 THEN
    RAISE EXCEPTION 'KUOTA_HABIS: Kuota bulanan untuk reward "%" telah habis! Silakan tunggu reset kuota bulan depan.', v_reward_title;
  END IF;

  -- 4. Check worker point balance
  IF v_worker_points < v_reward_points THEN
    RAISE EXCEPTION 'POIN_KURANG: Poin Anda (% PTS) tidak mencukupi untuk menukar % (% PTS).', v_worker_points, v_reward_title, v_reward_points;
  END IF;

  -- 5. Check monthly claim limit per worker (Max 1 claim per item per month)
  SELECT COUNT(*) INTO v_claims_this_month
  FROM redemption_history
  WHERE worker_id = p_worker_id
    AND item_title = v_reward_title
    AND DATE_TRUNC('month', created_at) = DATE_TRUNC('month', CURRENT_DATE);

  IF v_claims_this_month >= 1 THEN
    RAISE EXCEPTION 'BATAS_KLAIM: Anda telah mencapai batas maksimal klaim (1x per bulan) untuk item "%".', v_reward_title;
  END IF;

  -- 6. Perform Atomic Deductions & Record Transaction
  UPDATE workers
  SET total_points = total_points - v_reward_points,
      updated_at = now()
  WHERE id = p_worker_id;

  UPDATE reward_catalog
  SET available_stock = available_stock - 1
  WHERE id = p_reward_id;

  v_voucher_code := 'BIB-' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT), 1, 8));
  v_now_str := TO_CHAR(now(), 'YYYY-MM-DD HH24:MI');

  INSERT INTO redemption_history (id, worker_id, item_title, points_spent, redeemed_at, redemption_code)
  VALUES (
    'red-' || gen_random_uuid()::text,
    p_worker_id,
    v_reward_title,
    v_reward_points,
    v_now_str,
    v_voucher_code
  );

  RETURN jsonb_build_object(
    'success', true,
    'voucher_code', v_voucher_code,
    'points_spent', v_reward_points,
    'remaining_points', v_worker_points - v_reward_points,
    'remaining_stock', v_available_stock - 1,
    'message', 'Penukaran reward berhasil! Voucher siap digunakan.'
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

-- ─── 11. Incident Reports ────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS incident_reports (
  id              TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  worker_id       TEXT NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
  incident_type   TEXT NOT NULL CHECK (incident_type IN ('near_miss', 'injury', 'property_damage', 'unsafe_condition', 'other')),
  location        TEXT NOT NULL,
  description     TEXT NOT NULL,
  severity        TEXT NOT NULL DEFAULT 'low' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  status          TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'investigating', 'resolved', 'closed')),
  occurred_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at     TIMESTAMPTZ,
  resolution_note TEXT
);

CREATE INDEX IF NOT EXISTS idx_incident_reports_worker ON incident_reports(worker_id);
CREATE INDEX IF NOT EXISTS idx_incident_reports_status ON incident_reports(status, created_at DESC);

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
  action      TEXT NOT NULL CHECK (action IN ('login', 'logout', 'password_reset', 'profile_update', 'badge_awarded', 'quiz_completed', 'checklist_completed', 'incident_reported')),
  detail      TEXT,
  ip_hint     TEXT,  -- optional, from browser hints
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
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

-- ─── 15. Rewards & Redemption System ─────────────────────────────────────────────

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

-- Seed Default Reward Catalog
INSERT INTO rewards (id, title, category, points_required, icon_name, description, available_stock, badge_tag)
VALUES 
  ('r-1', 'Voucher Saldo GoPay Rp 50.000', 'E-Wallet', 500, 'Wallet', 'Voucher digital GoPay Rp 50.000 untuk transaksi harian.', 25, 'Popular'),
  ('r-2', 'Voucher Saldo OVO Rp 100.000', 'E-Wallet', 950, 'Wallet', 'Voucher digital OVO Rp 100.000.', 15, 'Best Value'),
  ('r-3', 'Paket Data Telkomsel 10 GB', 'Pulsa & Data', 600, 'Smartphone', 'Paket kuota internet Telkomsel 10 GB berlaku 30 hari.', 30, NULL),
  ('r-4', 'Rompi Safety K3 High-Vis Premium', 'Safety Gear', 1200, 'ShieldCheck', 'Rompi keselamatan kerja fosfor berstandar K3 nasional.', 10, 'Exclusive'),
  ('r-5', 'Sarung Tangan Safety Anti-Slip Cut 5', 'Safety Gear', 750, 'Hand', 'Sarung pelindung tangan anti-potong tingkat 5 untuk penanganan kargo.', 20, NULL),
  ('r-6', 'Voucher Belanja Indomaret Rp 100.000', 'Voucher & Perk', 950, 'Ticket', 'Voucher belanja fisik/digital Indomaret Rp 100.000.', 12, 'VIP Perk')
ON CONFLICT (id) DO NOTHING;

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

-- ─── 17. Atomic Database RPC Functions ─────────────────────────────────────────────

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
  -- Select worker points with row lock
  SELECT total_points INTO v_points FROM workers WHERE id = p_worker_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'Data pekerja tidak ditemukan.');
  END IF;

  -- Select reward details with row lock
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

-- ─── MIGRATION: Add photo_url column to incident_reports table ───────────────
ALTER TABLE incident_reports ADD COLUMN IF NOT EXISTS photo_url TEXT;




