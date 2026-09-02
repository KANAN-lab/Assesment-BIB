-- ==============================================================================
-- MIGRATION: Pusat Siaran & Notifikasi Terpadu (app_notifications)
-- Project: Gappy Assessment Platform (PT DAM Indonesia)
-- Description: Membuat tabel app_notifications, indeks pencarian penerima,
--              Row Level Security (RLS) terpadu, dan seed data default.
-- ==============================================================================

-- 1. Buat Tabel Notifikasi
CREATE TABLE IF NOT EXISTS app_notifications (
  id             TEXT PRIMARY KEY,
  recipient_id   TEXT NOT NULL DEFAULT 'all', -- 'all', 'worker', 'supervisor', 'admin', atau worker_id spesifik (UUID / NIK)
  recipient_role TEXT NOT NULL DEFAULT 'all' CHECK (recipient_role IN ('all', 'worker', 'supervisor', 'admin')),
  title          TEXT NOT NULL,
  message        TEXT NOT NULL,
  type           TEXT NOT NULL DEFAULT 'system' CHECK (type IN ('incident', 'quiz', 'reward', 'audit', 'system', 'license')),
  is_read        BOOLEAN NOT NULL DEFAULT false,
  metadata       JSONB DEFAULT '{}'::jsonb,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Buat Indeks Performa Tinggi untuk Query Real-Time
CREATE INDEX IF NOT EXISTS idx_app_notif_recipient ON app_notifications(recipient_role, recipient_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_app_notif_created ON app_notifications(created_at DESC);

-- 3. Konfigurasi Row Level Security (RLS)
ALTER TABLE app_notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all access to app_notifications" ON app_notifications;
CREATE POLICY "Allow all access to app_notifications" 
  ON app_notifications 
  FOR ALL 
  USING (true) 
  WITH CHECK (true);

-- 4. Perbarui Constraint Activity Log (Aktivitas Siaran Notifikasi)
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

-- 5. Seed Notifikasi Sistem Perdana (Opsional / Safe Upsert)
INSERT INTO app_notifications (id, recipient_id, recipient_role, title, message, type, is_read, created_at)
VALUES
  (
    'notif-sys-welcome',
    'all',
    'all',
    'Selamat Datang di Gappy Assessment Platform',
    'Gunakan kuis harian & pre-shift checklist untuk mengumpulkan poin reward K3 dan tingkatkan streak Anda.',
    'system',
    false,
    now()
  )
ON CONFLICT (id) DO NOTHING;
