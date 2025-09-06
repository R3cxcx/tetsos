-- Create a secure function to promote staging employees to production
CREATE OR REPLACE FUNCTION public.promote_staging_employee(
  p_staging_employee_id text
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_staging_employee record;
  v_new_employee_id uuid;
  v_parsed_date_of_joining date;
  v_parsed_date_of_leaving date;
  v_parsed_issue_date date;
  v_parsed_birth_date date;
  v_mapped_status text;
BEGIN
  -- Check if user has required permissions
  IF NOT (
    public.has_role(auth.uid(), 'super_admin'::public.app_role) OR
    public.has_role(auth.uid(), 'admin'::public.app_role) OR
    public.has_role(auth.uid(), 'hr_manager'::public.app_role)
  ) THEN
    RAISE EXCEPTION 'Access denied. Only super admins, admins, and HR managers can promote employees.';
  END IF;

  -- Get the staging employee record
  SELECT * INTO v_staging_employee
  FROM public.employees_staging
  WHERE id = p_staging_employee_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Staging employee with ID % not found', p_staging_employee_id;
  END IF;

  -- Parse dates with proper validation
  v_parsed_date_of_joining := CASE 
    WHEN v_staging_employee.date_of_joining IS NULL OR 
         v_staging_employee.date_of_joining = 'null' OR 
         v_staging_employee.date_of_joining = 'undefined' OR
         v_staging_employee.date_of_joining = '' THEN NULL
    WHEN v_staging_employee.date_of_joining ~ '^\d{4}-\d{2}-\d{2}$' THEN 
         v_staging_employee.date_of_joining::date
    ELSE (
      CASE 
        WHEN v_staging_employee.date_of_joining::date >= '1900-01-01' AND 
             v_staging_employee.date_of_joining::date <= '2100-12-31' 
        THEN v_staging_employee.date_of_joining::date
        ELSE NULL
      END
    )
  END;

  v_parsed_date_of_leaving := CASE 
    WHEN v_staging_employee.date_of_leaving IS NULL OR 
         v_staging_employee.date_of_leaving = 'null' OR 
         v_staging_employee.date_of_leaving = 'undefined' OR
         v_staging_employee.date_of_leaving = '' THEN NULL
    WHEN v_staging_employee.date_of_leaving ~ '^\d{4}-\d{2}-\d{2}$' THEN 
         v_staging_employee.date_of_leaving::date
    ELSE (
      CASE 
        WHEN v_staging_employee.date_of_leaving::date >= '1900-01-01' AND 
             v_staging_employee.date_of_leaving::date <= '2100-12-31' 
        THEN v_staging_employee.date_of_leaving::date
        ELSE NULL
      END
    )
  END;

  v_parsed_issue_date := CASE 
    WHEN v_staging_employee.issue_date IS NULL OR 
         v_staging_employee.issue_date = 'null' OR 
         v_staging_employee.issue_date = 'undefined' OR
         v_staging_employee.issue_date = '' THEN NULL
    WHEN v_staging_employee.issue_date ~ '^\d{4}-\d{2}-\d{2}$' THEN 
         v_staging_employee.issue_date::date
    ELSE (
      CASE 
        WHEN v_staging_employee.issue_date::date >= '1900-01-01' AND 
             v_staging_employee.issue_date::date <= '2100-12-31' 
        THEN v_staging_employee.issue_date::date
        ELSE NULL
      END
    )
  END;

  v_parsed_birth_date := CASE 
    WHEN v_staging_employee.birth_date IS NULL OR 
         v_staging_employee.birth_date = 'null' OR 
         v_staging_employee.birth_date = 'undefined' OR
         v_staging_employee.birth_date = '' THEN NULL
    WHEN v_staging_employee.birth_date ~ '^\d{4}-\d{2}-\d{2}$' THEN 
         v_staging_employee.birth_date::date
    ELSE (
      CASE 
        WHEN v_staging_employee.birth_date::date >= '1900-01-01' AND 
             v_staging_employee.birth_date::date <= '2100-12-31' 
        THEN v_staging_employee.birth_date::date
        ELSE NULL
      END
    )
  END;

  -- Map staging status to production status
  v_mapped_status := CASE 
    WHEN LOWER(TRIM(COALESCE(v_staging_employee.status, ''))) = 'left' THEN 'inactive'
    WHEN LOWER(TRIM(COALESCE(v_staging_employee.status, ''))) IN ('yes', 'active', 'rehired') THEN 'active'
    WHEN LOWER(TRIM(COALESCE(v_staging_employee.status, ''))) = 'yet to join' THEN 'pending'
    ELSE 'active'
  END;

  -- Check if employee already exists in production
  IF EXISTS (
    SELECT 1 FROM public.employees 
    WHERE employee_id ILIKE v_staging_employee.employee_id
  ) THEN
    RAISE EXCEPTION 'Employee with ID % already exists in production', v_staging_employee.employee_id;
  END IF;

  -- Insert into production employees table (bypassing RLS with SECURITY DEFINER)
  INSERT INTO public.employees (
    employee_id,
    english_name,
    arabic_name,
    status,
    position,
    personal_email,
    qualifications,
    nationality,
    gender,
    marital_status,
    id_number,
    issuing_body,
    birth_place,
    work_phone,
    home_phone,
    nok_person,
    nok_name,
    nok_phone_number,
    category,
    date_of_joining,
    date_of_leaving,
    issue_date,
    birth_date,
    created_by
  ) VALUES (
    v_staging_employee.employee_id,
    v_staging_employee.english_name,
    v_staging_employee.arabic_name,
    v_mapped_status,
    v_staging_employee.position,
    v_staging_employee.personal_email,
    v_staging_employee.qualifications,
    v_staging_employee.nationality,
    v_staging_employee.gender,
    v_staging_employee.marital_status,
    v_staging_employee.id_number,
    v_staging_employee.issuing_body,
    v_staging_employee.birth_place,
    v_staging_employee.work_phone,
    v_staging_employee.home_phone,
    v_staging_employee.nok_person,
    v_staging_employee.nok_name,
    v_staging_employee.nok_phone_number,
    v_staging_employee.category,
    v_parsed_date_of_joining,
    v_parsed_date_of_leaving,
    v_parsed_issue_date,
    v_parsed_birth_date,
    auth.uid()
  ) RETURNING id INTO v_new_employee_id;

  -- Log the promotion
  PERFORM public.log_audit_event(
    'employee_created'::public.audit_event_type,
    auth.uid(),
    NULL,
    'employees',
    v_new_employee_id::text,
    NULL,
    jsonb_build_object(
      'promoted_from_staging', true,
      'staging_id', p_staging_employee_id,
      'employee_id', v_staging_employee.employee_id
    ),
    jsonb_build_object('operation', 'STAGING_PROMOTION')
  );

  RETURN v_new_employee_id;
END;
$$;