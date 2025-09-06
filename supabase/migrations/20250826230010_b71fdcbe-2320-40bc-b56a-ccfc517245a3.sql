-- Create RPC functions for enhanced employee management

-- Function to update employee with enhanced security
CREATE OR REPLACE FUNCTION update_employee_secure(
  p_employee_id UUID,
  p_updates JSONB
) RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSON;
BEGIN
  -- Check if user has permission to update employees
  IF NOT has_permission(auth.uid(), 'employees.update'::app_permission) THEN
    RAISE EXCEPTION 'Permission denied: you need employees.update permission';
  END IF;

  -- Perform the update
  UPDATE employees 
  SET 
    category = COALESCE(p_updates->>'category', category),
    status = COALESCE(p_updates->>'status', status),
    english_name = COALESCE(p_updates->>'english_name', english_name),
    arabic_name = COALESCE(p_updates->>'arabic_name', arabic_name),
    position = COALESCE(p_updates->>'position', position),
    nationality = COALESCE(p_updates->>'nationality', nationality),
    gender = COALESCE(p_updates->>'gender', gender),
    marital_status = COALESCE(p_updates->>'marital_status', marital_status),
    personal_email = COALESCE(p_updates->>'personal_email', personal_email),
    work_phone = COALESCE(p_updates->>'work_phone', work_phone),
    home_phone = COALESCE(p_updates->>'home_phone', home_phone),
    id_number = COALESCE(p_updates->>'id_number', id_number),
    birth_date = CASE 
      WHEN p_updates->>'birth_date' = '' THEN NULL
      ELSE COALESCE((p_updates->>'birth_date')::DATE, birth_date)
    END,
    date_of_joining = CASE 
      WHEN p_updates->>'date_of_joining' = '' THEN NULL
      ELSE COALESCE((p_updates->>'date_of_joining')::DATE, date_of_joining)
    END,
    updated_at = NOW()
  WHERE id = p_employee_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Employee not found';
  END IF;

  result := json_build_object('success', true, 'employee_id', p_employee_id);
  RETURN result;
END;
$$;

-- Function to get employee sensitive data for authorized users
CREATE OR REPLACE FUNCTION get_employee_sensitive_data(p_employee_id UUID)
RETURNS TABLE(
  id UUID,
  employee_id TEXT,
  category TEXT,
  status TEXT,
  english_name TEXT,
  arabic_name TEXT,
  position TEXT,
  date_of_joining DATE,
  date_of_leaving DATE,
  nationality TEXT,
  gender TEXT,
  marital_status TEXT,
  id_number TEXT,
  issuing_body TEXT,
  issue_date DATE,
  work_phone TEXT,
  home_phone TEXT,
  nok_person TEXT,
  nok_name TEXT,
  nok_phone_number TEXT,
  personal_email TEXT,
  birth_date DATE,
  birth_place TEXT,
  qualifications TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  user_id UUID,
  is_deletable BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if user has permission to read sensitive employee data
  IF NOT (has_permission(auth.uid(), 'employees.read'::app_permission) OR 
          has_role(auth.uid(), 'super_admin'::app_role) OR 
          has_role(auth.uid(), 'admin'::app_role)) THEN
    RAISE EXCEPTION 'Permission denied: insufficient privileges to access sensitive data';
  END IF;

  RETURN QUERY
  SELECT 
    e.id,
    e.employee_id,
    e.category,
    e.status,
    e.english_name,
    e.arabic_name,
    e.position,
    e.date_of_joining,
    e.date_of_leaving,
    e.nationality,
    e.gender,
    e.marital_status,
    e.id_number,
    e.issuing_body,
    e.issue_date,
    e.work_phone,
    e.home_phone,
    e.nok_person,
    e.nok_name,
    e.nok_phone_number,
    e.personal_email,
    e.birth_date,
    e.birth_place,
    e.qualifications,
    e.created_at,
    e.updated_at,
    e.user_id,
    e.is_deletable
  FROM employees e
  WHERE e.id = p_employee_id
  AND e.deleted_at IS NULL;
END;
$$;