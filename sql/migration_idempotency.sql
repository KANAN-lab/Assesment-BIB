-- ============================================================
-- Phase 30: Idempotency Key Migration
-- Project: BIB Komar Warehouse Assessment
-- Tanggal: 2026-09-03
--
-- INSTRUKSI:
-- 1. Buka Supabase Dashboard → SQL Editor
-- 2. Paste seluruh file ini
-- 3. Jalankan sekali (idempotent — aman dijalankan ulang)
--
-- Dampak: Hanya menambah kolom nullable + partial unique index.
--         Data existing TIDAK terpengaruh.
--         Tidak ada breaking change di aplikasi.
-- ============================================================

-- ── 1. incident_reports ─────────────────────────────────────
ALTER TABLE incident_reports
  ADD COLUMN IF NOT EXISTS idempotency_key TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_incident_reports_idempotency_key
  ON incident_reports (idempotency_key)
  WHERE idempotency_key IS NOT NULL;

COMMENT ON COLUMN incident_reports.idempotency_key IS
  'Client-generated key (formType_workerId_contentHash) untuk mencegah double submit.';

-- ── 2. kaizen_suggestions ───────────────────────────────────
ALTER TABLE kaizen_suggestions
  ADD COLUMN IF NOT EXISTS idempotency_key TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_kaizen_suggestions_idempotency_key
  ON kaizen_suggestions (idempotency_key)
  WHERE idempotency_key IS NOT NULL;

COMMENT ON COLUMN kaizen_suggestions.idempotency_key IS
  'Client-generated key untuk mencegah double submit usulan Kaizen.';

-- ── 3. safety_patrol_logs ───────────────────────────────────
ALTER TABLE safety_patrol_logs
  ADD COLUMN IF NOT EXISTS idempotency_key TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_safety_patrol_logs_idempotency_key
  ON safety_patrol_logs (idempotency_key)
  WHERE idempotency_key IS NOT NULL;

COMMENT ON COLUMN safety_patrol_logs.idempotency_key IS
  'Client-generated key untuk mencegah duplikasi record Safety Patrol.';

-- ── 4. shift_handovers ──────────────────────────────────────
ALTER TABLE shift_handovers
  ADD COLUMN IF NOT EXISTS idempotency_key TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_shift_handovers_idempotency_key
  ON shift_handovers (idempotency_key)
  WHERE idempotency_key IS NOT NULL;

COMMENT ON COLUMN shift_handovers.idempotency_key IS
  'Client-generated key untuk mencegah duplikasi log serah terima (shift handover).';

-- ── Verifikasi ───────────────────────────────────────────────
-- Jalankan query ini untuk memastikan kolom & index sudah ada:
--
-- SELECT table_name, column_name, data_type
-- FROM information_schema.columns
-- WHERE column_name = 'idempotency_key'
-- ORDER BY table_name;
--
-- SELECT indexname, indexdef
-- FROM pg_indexes
-- WHERE indexname LIKE '%idempotency%';
