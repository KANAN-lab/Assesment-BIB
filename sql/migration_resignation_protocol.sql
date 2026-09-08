-- ==============================================================================
-- Migration: Enterprise Staff Offboarding & Resignation Management Protocol (Phase 54)
-- Preserves ISO 45001 & K3 Legal Compliance with Strict Soft-Deactivation
-- ==============================================================================

-- 1. Perbarui CHECK constraint pada status kolom workers
ALTER TABLE workers DROP CONSTRAINT IF EXISTS workers_status_check;
ALTER TABLE workers ADD CONSTRAINT workers_status_check 
  CHECK (status IN ('active', 'pending', 'pending_approval', 'rejected', 'inactive', 'resigned'));

-- 2. Tambahkan kolom metadata offboarding jika belum ada
ALTER TABLE workers ADD COLUMN IF NOT EXISTS resigned_at TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE workers ADD COLUMN IF NOT EXISTS resignation_reason TEXT DEFAULT NULL;
ALTER TABLE workers ADD COLUMN IF NOT EXISTS settlement_status TEXT DEFAULT 'settled';

-- 3. Composite index untuk mempercepat filter data aktif vs resign
CREATE INDEX IF NOT EXISTS idx_workers_status_division ON workers(status, division);
CREATE INDEX IF NOT EXISTS idx_workers_resigned_at ON workers(resigned_at) WHERE status = 'resigned';

-- 4. Komentar audit kepatuhan
COMMENT ON COLUMN workers.resigned_at IS 'Timestamp resmi ketika pekerja di-offboard / dinyatakan resign.';
COMMENT ON COLUMN workers.resignation_reason IS 'Alasan offboarding untuk arsip legal HR & HSE (ISO 45001).';
COMMENT ON COLUMN workers.settlement_status IS 'Status penyelesaian reward & hak operasional (pending / settled).';
