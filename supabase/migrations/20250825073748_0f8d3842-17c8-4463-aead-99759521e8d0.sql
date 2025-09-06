
-- 1) Ensure one attendance row per employee per day
ALTER TABLE public.attendance_records
  ADD CONSTRAINT attendance_records_employee_date_unique
  UNIQUE (employee_id, date);

-- 2) Helper to normalize employee codes (trim, uppercase, remove non-alphanumeric, collapse leading zeros after alpha prefix)
CREATE OR REPLACE FUNCTION public.normalize_employee_code(p_raw text)
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_raw text := p_raw;
  v_norm text;
  v_collapsed text;
BEGIN
  IF v_raw IS NULL THEN
    RETURN NULL;
  END IF;

  -- Trim, uppercase, remove non-alphanumeric
  v_norm := upper(regexp_replace(btrim(v_raw), '[^A-Za-z0-9]', '', 'g'));

  -- Collapse leading zeros after alpha prefix once (e.g., IG0004122 -> IG4122)
  v_collapsed := regexp_replace(v_norm, '^([A-Z]+)0+([0-9]+)$', '\1\2');

  RETURN v_collapsed;
END;
$$;

-- 3) Main processing function:
--    - p_date_from / p_date_to restricts processing window (by date of clocking_time)
--    - p_mark_processed decides if we set processed=true on the raw rows we matched
--    - returns JSON summary
CREATE OR REPLACE FUNCTION public.process_raw_attendance(
  p_date_from date DEFAULT NULL,
  p_date_to   date DEFAULT NULL,
  p_mark_processed boolean DEFAULT true
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_upserted_count bigint := 0;
  v_processed_count bigint := 0;
  v_skipped_unmatched bigint := 0;
BEGIN
  -- Use a CTE pipeline to:
  -- 1) Pick relevant raw rows
  -- 2) Normalize/resolve employee codes (via raw.employee_id or user_id_mapping.user_id)
  -- 3) Match to employees table to get employee UUID
  -- 4) Derive clock-in and clock-out per employee per day using the 9:00 rule
  -- 5) Upsert into attendance_records
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
    -- Prefer raw employee_id when present, else map from user_id
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
    -- Keep only rows that match a known employee
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
  in_candidates AS (
    -- Earliest scan at or before 09:00 is clock-in
    SELECT
      m.employee_uuid,
      m.d AS work_date,
      MIN(m.clocking_time) AS clock_in
    FROM matched m
    WHERE EXTRACT(hour FROM m.clocking_time) <= 9
    GROUP BY m.employee_uuid, m.d
  ),
  out_candidates AS (
    -- Latest scan after 09:00 is clock-out
    SELECT
      m.employee_uuid,
      m.d AS work_date,
      MAX(m.clocking_time) AS clock_out
    FROM matched m
    WHERE EXTRACT(hour FROM m.clocking_time) > 9
    GROUP BY m.employee_uuid, m.d
  ),
  merged AS (
    SELECT
      COALESCE(i.employee_uuid, o.employee_uuid) AS employee_uuid,
      COALESCE(i.work_date, o.work_date) AS work_date,
      i.clock_in,
      o.clock_out
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
      CASE
        WHEN clock_in IS NOT NULL AND clock_out IS NOT NULL
          THEN (EXTRACT(epoch FROM (clock_out - clock_in)) / 3600.0)::numeric
        ELSE NULL
      END AS total_hours,
      CASE
        WHEN clock_in IS NULL AND clock_out IS NULL THEN 'absent'
        WHEN clock_in IS NOT NULL AND clock_out IS NULL THEN 'present'
        ELSE 'present'
      END AS status
    FROM merged
  ),
  upserted AS (
    INSERT INTO public.attendance_records (
      employee_id, date, clock_in, clock_out, total_hours, status
    )
    SELECT
      p.employee_uuid, p.work_date, p.clock_in, p.clock_out, p.total_hours, p.status
    FROM prepared p
    ON CONFLICT (employee_id, date)
    DO UPDATE SET
      clock_in   = COALESCE(EXCLUDED.clock_in, public.attendance_records.clock_in),
      clock_out  = COALESCE(EXCLUDED.clock_out, public.attendance_records.clock_out),
      total_hours= COALESCE(EXCLUDED.total_hours, public.attendance_records.total_hours),
      status     = EXCLUDED.status,
      updated_at = now()
    RETURNING 1
  ),
  processed_raw AS (
    -- If requested, mark raw rows that matched employees as processed
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
      -- Rows that did not match any employee (skipped)
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
$$;
