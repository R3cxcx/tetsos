
-- 1) Extend attendance_records to hold confirmation and terminal info
ALTER TABLE public.attendance_records
  ADD COLUMN IF NOT EXISTS is_confirmed boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS in_terminal_id text,
  ADD COLUMN IF NOT EXISTS out_terminal_id text,
  ADD COLUMN IF NOT EXISTS source_type text NOT NULL DEFAULT 'raw';

-- 2) Update the raw processing function to fill terminals and confirmation
CREATE OR REPLACE FUNCTION public.process_raw_attendance(
  p_date_from date DEFAULT NULL,
  p_date_to date DEFAULT NULL,
  p_mark_processed boolean DEFAULT true
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $func$
DECLARE
  v_upserted_count bigint := 0;
  v_processed_count bigint := 0;
  v_skipped_unmatched bigint := 0;
BEGIN
  WITH base AS (
    SELECT
      rad.id,
      rad.clocking_time,
      rad.terminal_description,
      rad.user_id,
      rad.employee_id AS raw_emp_code,
      (rad.clocking_time)::date AS d
    FROM public.raw_attendance_data rad
    WHERE rad.processed = false
      AND (p_date_from IS NULL OR (rad.clocking_time)::date >= p_date_from)
      AND (p_date_to   IS NULL OR (rad.clocking_time)::date <= p_date_to)
  ),
  resolved AS (
    SELECT
      b.*,
      COALESCE(
        NULLIF(public.normalize_employee_code(b.raw_emp_code), ''),
        public.normalize_employee_code(uim.employee_id)
      ) AS emp_code
    FROM base b
    LEFT JOIN public.user_id_mapping uim
      ON uim.user_id = b.user_id
  ),
  matched AS (
    SELECT
      r.id,
      r.clocking_time,
      r.terminal_description,
      r.d,
      e.id AS employee_uuid
    FROM resolved r
    JOIN public.employees e
      ON e.employee_id = r.emp_code
  ),
  -- pick earliest at/before 09:00 with its terminal
  in_candidates AS (
    SELECT DISTINCT ON (m.employee_uuid, m.d)
      m.employee_uuid,
      m.d AS work_date,
      m.clocking_time AS clock_in,
      m.terminal_description AS in_terminal_id
    FROM matched m
    WHERE EXTRACT(hour FROM m.clocking_time) <= 9
    ORDER BY m.employee_uuid, m.d, m.clocking_time ASC
  ),
  -- pick latest after 09:00 with its terminal
  out_candidates AS (
    SELECT DISTINCT ON (m.employee_uuid, m.d)
      m.employee_uuid,
      m.d AS work_date,
      m.clocking_time AS clock_out,
      m.terminal_description AS out_terminal_id
    FROM matched m
    WHERE EXTRACT(hour FROM m.clocking_time) > 9
    ORDER BY m.employee_uuid, m.d, m.clocking_time DESC
  ),
  merged AS (
    SELECT
      COALESCE(i.employee_uuid, o.employee_uuid) AS employee_uuid,
      COALESCE(i.work_date, o.work_date) AS work_date,
      i.clock_in,
      o.clock_out,
      i.in_terminal_id,
      o.out_terminal_id
    FROM in_candidates i
    FULL JOIN out_candidates o
      ON i.employee_uuid = o.employee_uuid
     AND i.work_date     = o.work_date
  ),
  prepared AS (
    SELECT
      employee_uuid,
      work_date,
      clock_in,
      clock_out,
      in_terminal_id,
      out_terminal_id,
      CASE
        WHEN clock_in IS NOT NULL AND clock_out IS NOT NULL
          THEN (EXTRACT(epoch FROM (clock_out - clock_in)) / 3600.0)::numeric
        ELSE NULL
      END AS total_hours,
      CASE
        WHEN clock_in IS NULL AND clock_out IS NULL THEN 'absent'
        WHEN clock_in IS NOT NULL AND clock_out IS NULL THEN 'present'
        ELSE 'present'
      END AS status,
      (clock_in IS NOT NULL AND clock_out IS NOT NULL) AS is_confirmed
    FROM merged
  ),
  upserted AS (
    INSERT INTO public.attendance_records (
      employee_id, date, clock_in, clock_out, total_hours, status,
      in_terminal_id, out_terminal_id, is_confirmed, source_type
    )
    SELECT
      p.employee_uuid,
      p.work_date,
      p.clock_in,
      p.clock_out,
      p.total_hours,
      p.status,
      p.in_terminal_id,
      p.out_terminal_id,
      p.is_confirmed,
      'raw'
    FROM prepared p
    ON CONFLICT (employee_id, date)
    DO UPDATE SET
      clock_in       = COALESCE(EXCLUDED.clock_in, public.attendance_records.clock_in),
      clock_out      = COALESCE(EXCLUDED.clock_out, public.attendance_records.clock_out),
      total_hours    = COALESCE(EXCLUDED.total_hours, public.attendance_records.total_hours),
      status         = EXCLUDED.status,
      in_terminal_id = COALESCE(EXCLUDED.in_terminal_id, public.attendance_records.in_terminal_id),
      out_terminal_id= COALESCE(EXCLUDED.out_terminal_id, public.attendance_records.out_terminal_id),
      -- once confirmed, stay confirmed
      is_confirmed   = public.attendance_records.is_confirmed OR EXCLUDED.is_confirmed,
      source_type    = COALESCE(public.attendance_records.source_type, EXCLUDED.source_type),
      updated_at     = now()
    RETURNING 1
  ),
  processed_raw AS (
    UPDATE public.raw_attendance_data rad
    SET processed = true,
        updated_at = now()
    WHERE p_mark_processed
      AND EXISTS (
        SELECT 1
        FROM matched m
        WHERE m.id = rad.id
      )
    RETURNING 1
  ),
  counts AS (
    SELECT
      (SELECT COUNT(*) FROM upserted)       AS upserted_cnt,
      (SELECT COUNT(*) FROM processed_raw)  AS processed_cnt,
      (SELECT COUNT(DISTINCT r.id)
         FROM resolved r
         LEFT JOIN public.employees e ON e.employee_id = r.emp_code
        WHERE e.id IS NULL)                AS skipped_unmatched_cnt
  )
  SELECT
    upserted_cnt, processed_cnt, skipped_unmatched_cnt
  INTO
    v_upserted_count, v_processed_count, v_skipped_unmatched
  FROM counts;

  RETURN jsonb_build_object(
    'upserted', v_upserted_count,
    'raw_marked_processed', v_processed_count,
    'skipped_unmatched', v_skipped_unmatched
  );
END;
$func$;

-- 3) RPC for direct, confirmed attendance upsert
CREATE OR REPLACE FUNCTION public.upsert_direct_attendance(
  p_employee_code text,
  p_clock_in timestamptz,
  p_clock_out timestamptz DEFAULT NULL,
  p_in_terminal_id text DEFAULT NULL,
  p_out_terminal_id text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $func$
DECLARE
  v_emp_code text;
  v_emp_id uuid;
  v_date date;
  v_total_hours numeric;
  v_status text;
  v_is_confirmed boolean := false;
BEGIN
  -- Permissions: require create permission
  IF NOT public.has_permission(auth.uid(), 'employees.create'::public.app_permission) THEN
    RAISE EXCEPTION 'Access denied. Missing employees.create permission';
  END IF;

  IF p_employee_code IS NULL OR btrim(p_employee_code) = '' THEN
    RAISE EXCEPTION 'employee_code is required';
  END IF;
  IF p_clock_in IS NULL THEN
    RAISE EXCEPTION 'clock_in is required';
  END IF;

  v_emp_code := public.normalize_employee_code(p_employee_code);

  SELECT e.id INTO v_emp_id
  FROM public.employees e
  WHERE e.employee_id = v_emp_code;

  IF v_emp_id IS NULL THEN
    RAISE EXCEPTION 'Employee with code % not found', v_emp_code;
  END IF;

  -- validate same-date if clock_out provided
  IF p_clock_out IS NOT NULL AND (p_clock_out::date) <> (p_clock_in::date) THEN
    RAISE EXCEPTION 'clock_in and clock_out must be on the same date';
  END IF;

  v_date := (p_clock_in)::date;

  IF p_clock_out IS NOT NULL THEN
    v_total_hours := GREATEST(0, (EXTRACT(epoch FROM (p_clock_out - p_clock_in)) / 3600.0));
    v_is_confirmed := true;
  ELSE
    v_total_hours := NULL;
    v_is_confirmed := false;
  END IF;

  -- status: mark 'late' if after 09:00
  v_status := CASE
    WHEN p_clock_in IS NULL THEN 'absent'
    WHEN EXTRACT(hour FROM p_clock_in) > 9 OR (EXTRACT(hour FROM p_clock_in) = 9 AND EXTRACT(minute FROM p_clock_in) > 0) THEN 'late'
    ELSE 'present'
  END;

  INSERT INTO public.attendance_records (
    employee_id, date, clock_in, clock_out, total_hours, status,
    in_terminal_id, out_terminal_id, is_confirmed, source_type
  )
  VALUES (
    v_emp_id, v_date, p_clock_in, p_clock_out, v_total_hours, v_status,
    p_in_terminal_id, p_out_terminal_id, v_is_confirmed, 'direct'
  )
  ON CONFLICT (employee_id, date)
  DO UPDATE SET
    clock_in       = EXCLUDED.clock_in,
    clock_out      = EXCLUDED.clock_out,
    total_hours    = EXCLUDED.total_hours,
    status         = EXCLUDED.status,
    in_terminal_id = COALESCE(EXCLUDED.in_terminal_id, public.attendance_records.in_terminal_id),
    out_terminal_id= COALESCE(EXCLUDED.out_terminal_id, public.attendance_records.out_terminal_id),
    is_confirmed   = public.attendance_records.is_confirmed OR EXCLUDED.is_confirmed,
    source_type    = COALESCE(public.attendance_records.source_type, EXCLUDED.source_type),
    updated_at     = now();

  RETURN jsonb_build_object(
    'success', true,
    'employee_id', v_emp_id,
    'date', v_date,
    'is_confirmed', v_is_confirmed
  );
END;
$func$;
