
-- 1) Enforce referential integrity and uniqueness for final payroll records
DO $$
BEGIN
  -- Add FK only if not present
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'attendance_records_employee_fk'
  ) THEN
    ALTER TABLE public.attendance_records
      ADD CONSTRAINT attendance_records_employee_fk
      FOREIGN KEY (employee_id)
      REFERENCES public.employees(id)
      ON DELETE RESTRICT;
  END IF;
END$$;

-- Unique daily record per employee (prevents duplicates)
CREATE UNIQUE INDEX IF NOT EXISTS attendance_records_employee_date_uniq
  ON public.attendance_records(employee_id, date);

-- 2) Helper to normalize employee codes, e.g., " ig-0004122 " -> "IG4122"
CREATE OR REPLACE FUNCTION public.normalize_employee_code(code text)
RETURNS text
LANGUAGE sql
STABLE
AS $$
SELECT
  CASE
    WHEN code IS NULL THEN NULL
    ELSE
      REGEXP_REPLACE(
        REGEXP_REPLACE(
          UPPER(REGEXP_REPLACE(BTRIM(code), '[^A-Za-z0-9]', '', 'g')),
          '^([A-Z]+)0+([0-9]+)$',
          '\1\2'
        ),
        '^0+',''
      )
  END;
$$;

-- 3) Processor function: dedupe, ensure employee exists, apply 9AM logic, upsert into attendance_records
CREATE OR REPLACE FUNCTION public.process_raw_attendance(
  p_date_from timestamptz DEFAULT NULL,
  p_date_to   timestamptz DEFAULT NULL,
  p_mark_processed boolean DEFAULT true,
  p_overwrite boolean DEFAULT true
) RETURNS TABLE(
  processed_days int,
  upserted int,
  skipped_unmatched int,
  unmatched_codes text[]
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $fn$
DECLARE
  v_from timestamptz := COALESCE(p_date_from, now() - interval '30 days');
  v_to   timestamptz := COALESCE(p_date_to, now());
  v_unmatched_codes text[];
  v_upserted int;
  v_days int;
BEGIN
  -- Authorization gate: must be allowed to update employee-related data
  IF NOT public.has_permission(auth.uid(), 'employees.update'::public.app_permission) THEN
    RAISE EXCEPTION 'Not authorized to process attendance';
  END IF;

  -- 3.1) Collect candidate raw punches in a temp table, dedupe exact duplicates by (user_id, clocking_time)
  CREATE TEMP TABLE _raw ON COMMIT DROP AS
  SELECT DISTINCT ON (r.user_id, r.clocking_time)
         r.id,
         r.user_id,
         r.employee_id AS raw_employee_code,
         r.name,
         r.terminal_description,
         r.clocking_time,
         COALESCE(
           public.normalize_employee_code(um.employee_id),
           public.normalize_employee_code(r.employee_id)
         ) AS norm_emp_code
  FROM public.raw_attendance_data r
  LEFT JOIN public.user_id_mapping um
    ON um.user_id = r.user_id
  WHERE r.clocking_time >= v_from
    AND r.clocking_time <= v_to
    AND r.processed = false
  ORDER BY r.user_id, r.clocking_time, r.created_at DESC;

  -- 3.2) Resolve to existing employees; skip those that don't match
  CREATE TEMP TABLE _joined ON COMMIT DROP AS
  SELECT _r.*, e.id AS emp_id
  FROM _raw _r
  LEFT JOIN public.employees e
    ON public.normalize_employee_code(e.employee_id) = _r.norm_emp_code;

  -- Capture unmatched normalized codes for reporting
  SELECT ARRAY_AGG(DISTINCT norm_emp_code) FILTER (WHERE emp_id IS NULL)
    INTO v_unmatched_codes
  FROM _joined;

  -- 3.3) Aggregate per employee/day, apply 9AM logic (as in code.py)
  WITH base AS (
    SELECT emp_id,
           (_j.clocking_time)::date AS d,      -- uses current timezone
           _j.clocking_time
    FROM _joined _j
    WHERE _j.emp_id IS NOT NULL
  ),
  mins AS (
    SELECT emp_id, d,
           MIN(clocking_time) FILTER (WHERE clocking_time::time < time '09:00') AS first_before9,
           MAX(clocking_time) FILTER (WHERE clocking_time::time >= time '09:00') AS last_after9,
           MIN(clocking_time) AS first_any,
           MAX(clocking_time) AS last_any
    FROM base
    GROUP BY emp_id, d
  ),
  final AS (
    SELECT emp_id,
           d AS date,
           COALESCE(first_before9, first_any) AS clock_in,
           COALESCE(last_after9, last_any) AS clock_out,
           CASE
             WHEN COALESCE(first_before9, first_any) IS NOT NULL
              AND COALESCE(last_after9, last_any) IS NOT NULL
             THEN EXTRACT(EPOCH FROM (COALESCE(last_after9, last_any) - COALESCE(first_before9, first_any))) / 3600.0
             ELSE NULL
           END AS total_hours
    FROM mins
  )
  INSERT INTO public.attendance_records AS ar (employee_id, date, clock_in, clock_out, total_hours, status, updated_at)
  SELECT f.emp_id, f.date, f.clock_in, f.clock_out, f.total_hours, 'present', now()
  FROM final f
  ON CONFLICT (employee_id, date)
  DO UPDATE SET
    clock_in = CASE WHEN p_overwrite THEN EXCLUDED.clock_in ELSE ar.clock_in END,
    clock_out = CASE WHEN p_overwrite THEN EXCLUDED.clock_out ELSE ar.clock_out END,
    total_hours = CASE WHEN p_overwrite THEN EXCLUDED.total_hours ELSE ar.total_hours END,
    updated_at = now()
  RETURNING 1;

  GET DIAGNOSTICS v_upserted = ROW_COUNT;

  -- 3.4) Mark consumed raw rows as processed (optional)
  IF p_mark_processed THEN
    UPDATE public.raw_attendance_data r
    SET processed = true, updated_at = now()
    WHERE r.id IN (SELECT id FROM _joined WHERE emp_id IS NOT NULL);
  END IF;

  -- 3.5) Summary: distinct employee/day combinations processed
  SELECT COUNT(DISTINCT (emp_id, (_j.clocking_time)::date))
    INTO v_days
  FROM _joined _j
  WHERE _j.emp_id IS NOT NULL;

  RETURN QUERY SELECT
    COALESCE(v_days, 0),
    COALESCE(v_upserted, 0),
    COALESCE(CARDINALITY(v_unmatched_codes), 0),
    COALESCE(v_unmatched_codes, ARRAY[]::text[]);
END;
$fn$;
