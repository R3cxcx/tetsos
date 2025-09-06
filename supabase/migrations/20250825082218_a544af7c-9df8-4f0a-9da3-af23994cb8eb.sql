-- Migrate data from fpempdata into employees and then drop fpempdata
-- Wrap logic in a DO block to compute counts and log them
DO $$
DECLARE
  v_total_source bigint := 0;
  v_distinct_source bigint := 0;
  v_to_insert bigint := 0;
  v_inserted bigint := 0;
BEGIN
  -- Compute counts and insert missing employees
  WITH source AS (
    SELECT 
      public.normalize_employee_code(id) AS employee_id,
      name AS english_name,
      arabic_name,
      position,
      contract_type,
      hire_date,
      email,
      phone
    FROM public.fpempdata
  ),
  prepared AS (
    SELECT 
      s.employee_id,
      s.english_name,
      s.arabic_name,
      s.position,
      s.contract_type,
      CASE
        WHEN s.hire_date IS NULL OR s.hire_date IN ('', 'null', 'undefined') THEN NULL
        WHEN s.hire_date ~ '^\n?\r?\d{4}-\d{2}-\d{2}$' THEN s.hire_date::date
        ELSE (
          CASE 
            WHEN s.hire_date::date >= '1900-01-01' AND s.hire_date::date <= '2100-12-31'
            THEN s.hire_date::date
            ELSE NULL
          END
        )
      END AS date_of_joining,
      s.email,
      s.phone
    FROM source s
    WHERE s.employee_id IS NOT NULL AND s.employee_id <> ''
  ),
  distinct_src AS (
    SELECT DISTINCT ON (employee_id) *
    FROM prepared
    ORDER BY employee_id
  ),
  to_insert AS (
    SELECT ds.*
    FROM distinct_src ds
    LEFT JOIN public.employees e ON e.employee_id = ds.employee_id
    WHERE e.id IS NULL
  ),
  ins AS (
    INSERT INTO public.employees (
      employee_id, english_name, arabic_name, status, position, personal_email, work_phone, category, date_of_joining, created_by
    )
    SELECT
      employee_id,
      english_name,
      arabic_name,
      'active',
      position,
      email,
      phone,
      contract_type,
      date_of_joining,
      NULL
    FROM to_insert
    RETURNING 1
  )
  SELECT 
    (SELECT COUNT(*) FROM prepared) AS total_source,
    (SELECT COUNT(*) FROM (SELECT DISTINCT employee_id FROM prepared) s) AS distinct_source,
    (SELECT COUNT(*) FROM to_insert) AS to_insert_count,
    (SELECT COUNT(*) FROM ins) AS inserted_count
  INTO v_total_source, v_distinct_source, v_to_insert, v_inserted;

  RAISE NOTICE 'fpempdata migration: total_source=%, distinct_source=%, to_insert=%, inserted=%', v_total_source, v_distinct_source, v_to_insert, v_inserted;
END $$;

-- Drop the fpempdata table after successful migration
DROP TABLE IF EXISTS public.fpempdata;