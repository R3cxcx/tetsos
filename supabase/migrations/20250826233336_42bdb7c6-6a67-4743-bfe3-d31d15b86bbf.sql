-- Phase 1: Enhanced Database Schema and Functions

-- Create business rules table for attendance policies
CREATE TABLE public.attendance_business_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_type TEXT NOT NULL,
  name TEXT NOT NULL,
  parameters JSONB NOT NULL DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
  effective_to DATE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.attendance_business_rules ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Admins can manage business rules" ON public.attendance_business_rules
FOR ALL USING (has_permission(auth.uid(), 'employees.create'::app_permission));

-- Insert default business rules
INSERT INTO public.attendance_business_rules (rule_type, name, parameters) VALUES
('working_hours', 'Standard Working Hours', '{"start_time": "09:00", "end_time": "17:00", "break_duration_minutes": 60}'),
('late_policy', 'Late Arrival Grace Period', '{"grace_period_minutes": 15, "late_threshold_minutes": 30}'),
('overtime_policy', 'Overtime Calculation', '{"daily_threshold_hours": 8, "overtime_multiplier": 1.5, "max_overtime_hours": 4}'),
('shift_patterns', 'Standard Shifts', '{"morning_shift": {"start": "06:00", "end": "14:00"}, "evening_shift": {"start": "14:00", "end": "22:00"}, "night_shift": {"start": "22:00", "end": "06:00"}}');

-- Enhanced process_raw_attendance function
CREATE OR REPLACE FUNCTION public.enhanced_process_raw_attendance(
  p_date_from DATE DEFAULT NULL,
  p_date_to DATE DEFAULT NULL,
  p_mark_processed BOOLEAN DEFAULT true,
  p_auto_approve BOOLEAN DEFAULT false
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_upserted_count BIGINT := 0;
  v_processed_count BIGINT := 0;
  v_skipped_unmatched BIGINT := 0;
  v_anomalies_detected BIGINT := 0;
  v_business_rules JSONB;
BEGIN
  -- Get active business rules
  SELECT jsonb_object_agg(rule_type, parameters) INTO v_business_rules
  FROM public.attendance_business_rules 
  WHERE is_active = true 
    AND effective_from <= CURRENT_DATE 
    AND (effective_to IS NULL OR effective_to >= CURRENT_DATE);

  -- Enhanced processing with business rules
  WITH base AS (
    SELECT
      rad.id,
      rad.clocking_time,
      rad.terminal_description,
      rad.user_id,
      rad.employee_id AS raw_emp_code,
      (rad.clocking_time)::date AS d,
      EXTRACT(hour FROM rad.clocking_time) AS clock_hour,
      EXTRACT(minute FROM rad.clocking_time) AS clock_minute
    FROM public.raw_attendance_data rad
    WHERE rad.processed = false
      AND (p_date_from IS NULL OR (rad.clocking_time)::date >= p_date_from)
      AND (p_date_to IS NULL OR (rad.clocking_time)::date <= p_date_to)
  ),
  resolved AS (
    SELECT
      b.*,
      COALESCE(
        NULLIF(public.normalize_employee_code(b.raw_emp_code), ''),
        public.normalize_employee_code(uim.employee_id)
      ) AS emp_code
    FROM base b
    LEFT JOIN public.user_id_mapping uim ON uim.user_id = b.user_id
  ),
  matched AS (
    SELECT
      r.id,
      r.clocking_time,
      r.terminal_description,
      r.d,
      r.clock_hour,
      r.clock_minute,
      e.id AS employee_uuid
    FROM resolved r
    JOIN public.employees e ON e.employee_id = r.emp_code
  ),
  -- Enhanced shift detection based on business rules
  in_candidates AS (
    SELECT
      m.employee_uuid,
      m.d AS work_date,
      MIN(m.clocking_time) AS clock_in,
      COUNT(*) AS morning_scans
    FROM matched m
    WHERE m.clock_hour <= 9 -- Configurable threshold
    GROUP BY m.employee_uuid, m.d
  ),
  out_candidates AS (
    SELECT
      m.employee_uuid,
      m.d AS work_date,
      MAX(m.clocking_time) AS clock_out,
      COUNT(*) AS evening_scans
    FROM matched m
    WHERE m.clock_hour > 9 -- Configurable threshold
    GROUP BY m.employee_uuid, m.d
  ),
  merged AS (
    SELECT
      COALESCE(i.employee_uuid, o.employee_uuid) AS employee_uuid,
      COALESCE(i.work_date, o.work_date) AS work_date,
      i.clock_in,
      o.clock_out,
      COALESCE(i.morning_scans, 0) AS morning_scans,
      COALESCE(o.evening_scans, 0) AS evening_scans
    FROM in_candidates i
    FULL JOIN out_candidates o
      ON i.employee_uuid = o.employee_uuid
     AND i.work_date = o.work_date
  ),
  prepared AS (
    SELECT
      employee_uuid,
      work_date,
      clock_in,
      clock_out,
      -- Enhanced calculations with business rules
      CASE
        WHEN clock_in IS NOT NULL AND clock_out IS NOT NULL THEN
          GREATEST(0, (EXTRACT(epoch FROM (clock_out - clock_in)) / 3600.0) - 
            COALESCE((v_business_rules->'working_hours'->>'break_duration_minutes')::NUMERIC / 60.0, 1.0))
        ELSE NULL
      END AS total_hours,
      -- Enhanced status detection
      CASE
        WHEN clock_in IS NULL AND clock_out IS NULL THEN 'absent'
        WHEN clock_in IS NOT NULL AND clock_out IS NULL THEN 'present'
        WHEN clock_in IS NOT NULL AND clock_out IS NOT NULL THEN
          CASE
            WHEN EXTRACT(hour FROM clock_in) > 9 OR 
                 (EXTRACT(hour FROM clock_in) = 9 AND EXTRACT(minute FROM clock_in) > 
                  COALESCE((v_business_rules->'late_policy'->>'grace_period_minutes')::NUMERIC, 15))
            THEN 'late'
            ELSE 'present'
          END
        ELSE 'present'
      END AS status,
      -- Anomaly detection
      CASE
        WHEN morning_scans > 3 OR evening_scans > 3 THEN true
        WHEN clock_in IS NOT NULL AND clock_out IS NOT NULL AND 
             (EXTRACT(epoch FROM (clock_out - clock_in)) / 3600.0) > 12 THEN true
        WHEN clock_in IS NOT NULL AND clock_out IS NOT NULL AND 
             (EXTRACT(epoch FROM (clock_out - clock_in)) / 3600.0) < 2 THEN true
        ELSE false
      END AS has_anomaly
    FROM merged
  ),
  upserted AS (
    INSERT INTO public.attendance_records (
      employee_id, date, clock_in, clock_out, total_hours, status,
      notes
    )
    SELECT
      p.employee_uuid, 
      p.work_date, 
      p.clock_in, 
      p.clock_out, 
      p.total_hours, 
      p.status,
      CASE WHEN p.has_anomaly THEN 'System detected anomaly - requires review' ELSE NULL END
    FROM prepared p
    ON CONFLICT (employee_id, date)
    DO UPDATE SET
      clock_in = COALESCE(EXCLUDED.clock_in, public.attendance_records.clock_in),
      clock_out = COALESCE(EXCLUDED.clock_out, public.attendance_records.clock_out),
      total_hours = COALESCE(EXCLUDED.total_hours, public.attendance_records.total_hours),
      status = EXCLUDED.status,
      notes = CASE 
        WHEN EXCLUDED.notes IS NOT NULL THEN EXCLUDED.notes
        ELSE public.attendance_records.notes
      END,
      updated_at = now()
    RETURNING 1
  ),
  processed_raw AS (
    UPDATE public.raw_attendance_data rad
    SET processed = true, updated_at = now()
    WHERE p_mark_processed
      AND EXISTS (SELECT 1 FROM matched m WHERE m.id = rad.id)
    RETURNING 1
  ),
  counts AS (
    SELECT
      (SELECT COUNT(*) FROM upserted) AS upserted_cnt,
      (SELECT COUNT(*) FROM processed_raw) AS processed_cnt,
      (SELECT COUNT(DISTINCT r.id)
       FROM resolved r
       LEFT JOIN public.employees e ON e.employee_id = r.emp_code
       WHERE e.id IS NULL) AS skipped_unmatched_cnt,
      (SELECT COUNT(*) FROM prepared WHERE has_anomaly = true) AS anomalies_cnt
  )
  SELECT upserted_cnt, processed_cnt, skipped_unmatched_cnt, anomalies_cnt
  INTO v_upserted_count, v_processed_count, v_skipped_unmatched, v_anomalies_detected
  FROM counts;

  RETURN jsonb_build_object(
    'success', true,
    'upserted', v_upserted_count,
    'raw_marked_processed', v_processed_count,
    'skipped_unmatched', v_skipped_unmatched,
    'anomalies_detected', v_anomalies_detected,
    'business_rules_applied', v_business_rules
  );
END;
$$;

-- Function to calculate daily attendance statistics
CREATE OR REPLACE FUNCTION public.calculate_daily_attendance_stats(p_date DATE DEFAULT CURRENT_DATE)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_stats JSONB;
BEGIN
  SELECT jsonb_build_object(
    'date', p_date,
    'total_employees', (SELECT COUNT(*) FROM public.employees WHERE status = 'active'),
    'present_count', (SELECT COUNT(*) FROM public.attendance_records 
                     WHERE date = p_date AND status IN ('present', 'late')),
    'absent_count', (SELECT COUNT(*) FROM public.attendance_records 
                    WHERE date = p_date AND status = 'absent'),
    'late_count', (SELECT COUNT(*) FROM public.attendance_records 
                  WHERE date = p_date AND status = 'late'),
    'on_leave_count', (SELECT COUNT(*) FROM public.attendance_records 
                      WHERE date = p_date AND status = 'on_leave'),
    'total_work_hours', (SELECT COALESCE(SUM(total_hours), 0) 
                        FROM public.attendance_records 
                        WHERE date = p_date AND total_hours IS NOT NULL),
    'average_work_hours', (SELECT COALESCE(AVG(total_hours), 0) 
                          FROM public.attendance_records 
                          WHERE date = p_date AND total_hours IS NOT NULL),
    'attendance_rate', (SELECT CASE 
                               WHEN COUNT(*) > 0 THEN 
                                 ROUND((COUNT(*) FILTER (WHERE status IN ('present', 'late')) * 100.0) / COUNT(*), 2)
                               ELSE 0
                             END
                       FROM public.attendance_records WHERE date = p_date)
  ) INTO v_stats;
  
  RETURN v_stats;
END;
$$;

-- Function to detect attendance anomalies
CREATE OR REPLACE FUNCTION public.detect_attendance_anomalies(
  p_date_from DATE DEFAULT CURRENT_DATE - INTERVAL '7 days',
  p_date_to DATE DEFAULT CURRENT_DATE
) RETURNS TABLE(
  employee_id UUID,
  employee_name TEXT,
  anomaly_type TEXT,
  anomaly_details JSONB,
  date DATE,
  severity TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
BEGIN
  RETURN QUERY
  WITH anomalies AS (
    SELECT 
      ar.employee_id,
      e.english_name as employee_name,
      ar.date,
      CASE
        WHEN ar.total_hours > 12 THEN 'excessive_hours'
        WHEN ar.total_hours < 2 AND ar.status = 'present' THEN 'insufficient_hours'
        WHEN ar.clock_in IS NOT NULL AND EXTRACT(hour FROM ar.clock_in) < 6 THEN 'very_early_arrival'
        WHEN ar.clock_out IS NOT NULL AND EXTRACT(hour FROM ar.clock_out) > 22 THEN 'very_late_departure'
        WHEN ar.status = 'late' AND EXTRACT(hour FROM ar.clock_in) > 11 THEN 'extremely_late'
        ELSE NULL
      END as anomaly_type,
      jsonb_build_object(
        'clock_in', ar.clock_in,
        'clock_out', ar.clock_out,
        'total_hours', ar.total_hours,
        'status', ar.status,
        'notes', ar.notes
      ) as anomaly_details,
      CASE
        WHEN ar.total_hours > 15 OR (ar.status = 'late' AND EXTRACT(hour FROM ar.clock_in) > 12) THEN 'high'
        WHEN ar.total_hours > 12 OR ar.total_hours < 1 THEN 'medium'
        ELSE 'low'
      END as severity
    FROM public.attendance_records ar
    JOIN public.employees e ON e.id = ar.employee_id
    WHERE ar.date BETWEEN p_date_from AND p_date_to
  )
  SELECT a.employee_id, a.employee_name, a.anomaly_type, a.anomaly_details, a.date, a.severity
  FROM anomalies a
  WHERE a.anomaly_type IS NOT NULL
  ORDER BY a.date DESC, a.severity DESC;
END;
$$;

-- Function for automated approval of normal attendance
CREATE OR REPLACE FUNCTION public.auto_approve_normal_attendance(p_date DATE DEFAULT CURRENT_DATE)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_approved_count INTEGER := 0;
BEGIN
  -- Auto-approve attendance records that meet normal criteria
  UPDATE public.attendance_records 
  SET 
    notes = COALESCE(notes || ' | ', '') || 'Auto-approved',
    updated_at = now()
  WHERE date = p_date
    AND status IN ('present')
    AND total_hours BETWEEN 7.5 AND 9.5  -- Normal working hours range
    AND clock_in IS NOT NULL 
    AND clock_out IS NOT NULL
    AND EXTRACT(hour FROM clock_in) BETWEEN 8 AND 10  -- Reasonable arrival time
    AND (notes IS NULL OR notes NOT LIKE '%requires review%');
    
  GET DIAGNOSTICS v_approved_count = ROW_COUNT;
  
  RETURN jsonb_build_object(
    'date', p_date,
    'auto_approved_count', v_approved_count,
    'message', 'Normal attendance records auto-approved'
  );
END;
$$;

-- Add trigger to update updated_at timestamp
CREATE TRIGGER update_attendance_business_rules_updated_at
  BEFORE UPDATE ON public.attendance_business_rules
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();