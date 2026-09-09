-- ==============================================================================
-- PATCH PERBAIKAN & PEMUTAKHIRAN SUPABASE (Phase 12-13 Hotfix)
-- Jalankan di: Supabase Dashboard > SQL Editor
-- ==============================================================================

-- 1. Perbaiki Bug Fatal rpc_process_monthly_points_reset (Kolom details -> detail)
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

  -- Catat riwayat audit log bagi pekerja yang poinnya hangus (kolom: detail)
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

-- 2. Pasang Stored Procedure Pruning Anti-Bloat (Skema 3)
CREATE OR REPLACE FUNCTION clean_ephemeral_activity_logs(p_days_retention INTEGER DEFAULT 7)
RETURNS INTEGER AS $$
DECLARE
  v_deleted INTEGER;
BEGIN
  DELETE FROM activity_log
  WHERE action IN ('login', 'logout')
    AND created_at < (now() - (p_days_retention || ' days')::INTERVAL);
  
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Sinkronisasi Smart Auto-Deduct pada Sanksi Disiplin K3
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

  -- Deduct Points via Smart Auto-Deduct (Harian dipotong duluan, sisa dari Prestasi)
  IF p_point_deduction > 0 THEN
    PERFORM deduct_worker_points(p_worker_id, p_point_deduction);
  END IF;

  INSERT INTO activity_log (worker_id, worker_name, action, detail)
  VALUES (p_worker_id, p_worker_name, 'disciplinary_issued', 'Penerbitan Sanksi ' || p_doc_ref || ' (-' || p_point_deduction || ' PTS)');

  RETURN jsonb_build_object(
    'success', true,
    'action_id', v_action_id,
    'document_ref', p_doc_ref,
    'points_deducted', p_point_deduction,
    'message', 'Surat sanksi / Berita Acara berhasil diterbitkan secara resmi.'
  );
END;
$$;

-- 4. Perbarui CHECK Constraint activity_log_action_check
ALTER TABLE activity_log DROP CONSTRAINT IF EXISTS activity_log_action_check;
ALTER TABLE activity_log ADD CONSTRAINT activity_log_action_check CHECK (
  action IN (
    'login', 'logout', 'password_reset', 'profile_update', 'badge_awarded',
    'quiz_completed', 'checklist_completed', 'incident_reported',
    'kudo_sent', 'kudo_received', 'shift_handover', 'sop_completed',
    'kaizen_submitted', 'kaizen_approved', 'disciplinary_issued',
    'disciplinary_retraining_completed', 'audit_5s_completed',
    'sio_registered', 'ppe_distributed', 'ppe_damaged',
    'notification_broadcast', 'role_mutated',
    'admin_created', 'admin_status_toggled', 'points_refunded', 'points_expired', 'redemption_rejected',
    'worker_offboarded', 'worker_reactivated'
  )
);

-- 5. Auto-Fill worker_name Trigger & Backfill Data Lama (Cegah 'Unknown' pada Audit Log)
UPDATE activity_log al
SET worker_name = w.name
FROM workers w
WHERE al.worker_id = w.id
  AND (al.worker_name IS NULL OR al.worker_name = 'Unknown');

CREATE OR REPLACE FUNCTION trg_activity_log_fill_worker_name()
RETURNS TRIGGER AS $$
BEGIN
  IF (NEW.worker_name IS NULL OR NEW.worker_name = 'Unknown') AND NEW.worker_id IS NOT NULL THEN
    SELECT name INTO NEW.worker_name FROM workers WHERE id = NEW.worker_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_fill_activity_log_worker_name ON activity_log;
CREATE TRIGGER trg_fill_activity_log_worker_name
BEFORE INSERT ON activity_log
FOR EACH ROW
EXECUTE FUNCTION trg_activity_log_fill_worker_name();

-- 6. Berikan Izin Eksekusi Fungsi
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated, service_role;
