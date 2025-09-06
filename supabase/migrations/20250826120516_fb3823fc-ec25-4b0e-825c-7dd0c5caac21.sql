-- 1) Add deletability columns (idempotent)
ALTER TABLE public.employees 
ADD COLUMN IF NOT EXISTS is_deletable boolean NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS deleted_at timestamp with time zone DEFAULT NULL;

-- 2) Update DELETE policy to respect deletability
DROP POLICY IF EXISTS "Users can delete employees" ON public.employees;
CREATE POLICY "Users can delete employees" 
ON public.employees 
FOR DELETE 
USING (
  has_permission(auth.uid(), 'employees.delete'::app_permission) 
  AND is_deletable = true 
  AND deleted_at IS NULL
);

-- 3) Safe delete function with integrity checks
CREATE OR REPLACE FUNCTION public.safe_delete_employee(p_employee_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_employee record;
  v_attendance_count integer := 0;
  v_recruitment_count integer := 0;
  v_hiring_count integer := 0;
  v_mapping_count integer := 0;
  v_total_references integer := 0;
BEGIN
  IF NOT has_permission(auth.uid(), 'employees.delete'::app_permission) THEN
    RAISE EXCEPTION 'Access denied. Insufficient permissions to delete employee.';
  END IF;

  SELECT * INTO v_employee FROM public.employees WHERE id = p_employee_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'Employee not found');
  END IF;

  IF v_employee.deleted_at IS NOT NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Employee is already deleted');
  END IF;

  IF v_employee.is_deletable = false THEN
    RETURN jsonb_build_object('success', false, 'message', 'Employee cannot be deleted due to existing transactions');
  END IF;

  SELECT COUNT(*) INTO v_attendance_count FROM public.attendance_records WHERE employee_id = p_employee_id;
  SELECT COUNT(*) INTO v_recruitment_count FROM public.recruitment_requests WHERE hired_employee_id = p_employee_id;
  SELECT COUNT(*) INTO v_hiring_count FROM public.hiring_requests WHERE hired_employee_id = p_employee_id;
  SELECT COUNT(*) INTO v_mapping_count
  FROM public.user_id_mapping uim
  JOIN public.employees e ON e.employee_id = uim.employee_id
  WHERE e.id = p_employee_id;

  v_total_references := v_attendance_count + v_recruitment_count + v_hiring_count + v_mapping_count;

  IF v_total_references > 0 THEN
    UPDATE public.employees SET is_deletable = false, updated_at = now() WHERE id = p_employee_id;
    RETURN jsonb_build_object(
      'success', false,
      'message', format('Employee cannot be deleted. Found %s related records (Attendance: %s, Recruitment: %s, Hiring: %s, Mappings: %s)', v_total_references, v_attendance_count, v_recruitment_count, v_hiring_count, v_mapping_count),
      'references', jsonb_build_object(
        'attendance_records', v_attendance_count,
        'recruitment_requests', v_recruitment_count,
        'hiring_requests', v_hiring_count,
        'user_mappings', v_mapping_count,
        'total', v_total_references
      )
    );
  END IF;

  DELETE FROM public.employees WHERE id = p_employee_id;

  PERFORM public.log_audit_event(
    'employee_deleted'::public.audit_event_type,
    auth.uid(),
    v_employee.user_id,
    'employees',
    p_employee_id::text,
    to_jsonb(v_employee),
    NULL,
    jsonb_build_object('employee_id', v_employee.employee_id, 'operation', 'SAFE_DELETE')
  );

  RETURN jsonb_build_object('success', true, 'message', 'Employee deleted successfully');
END;
$function$;

-- 4) Trigger to auto-mark employees as non-deletable on references
CREATE OR REPLACE FUNCTION public.mark_employee_non_deletable()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_employee_uuid uuid := NULL;
BEGIN
  IF TG_TABLE_NAME = 'attendance_records' THEN
    v_employee_uuid := NEW.employee_id;
  ELSIF TG_TABLE_NAME = 'recruitment_requests' AND NEW.hired_employee_id IS NOT NULL THEN
    v_employee_uuid := NEW.hired_employee_id;
  ELSIF TG_TABLE_NAME = 'hiring_requests' AND NEW.hired_employee_id IS NOT NULL THEN
    v_employee_uuid := NEW.hired_employee_id;
  ELSIF TG_TABLE_NAME = 'user_id_mapping' THEN
    SELECT e.id INTO v_employee_uuid FROM public.employees e WHERE e.employee_id = NEW.employee_id;
  END IF;

  IF v_employee_uuid IS NOT NULL THEN
    UPDATE public.employees SET is_deletable = false, updated_at = now() WHERE id = v_employee_uuid;
  END IF;

  RETURN NEW;
END;
$function$;

-- Triggers on referencing tables
DROP TRIGGER IF EXISTS mark_employee_non_deletable_attendance ON public.attendance_records;
CREATE TRIGGER mark_employee_non_deletable_attendance
  AFTER INSERT ON public.attendance_records
  FOR EACH ROW
  EXECUTE FUNCTION public.mark_employee_non_deletable();

DROP TRIGGER IF EXISTS mark_employee_non_deletable_recruitment ON public.recruitment_requests;
CREATE TRIGGER mark_employee_non_deletable_recruitment
  AFTER INSERT OR UPDATE ON public.recruitment_requests
  FOR EACH ROW
  WHEN (NEW.hired_employee_id IS NOT NULL)
  EXECUTE FUNCTION public.mark_employee_non_deletable();

DROP TRIGGER IF EXISTS mark_employee_non_deletable_hiring ON public.hiring_requests;
CREATE TRIGGER mark_employee_non_deletable_hiring
  AFTER INSERT OR UPDATE ON public.hiring_requests
  FOR EACH ROW
  WHEN (NEW.hired_employee_id IS NOT NULL)
  EXECUTE FUNCTION public.mark_employee_non_deletable();

DROP TRIGGER IF EXISTS mark_employee_non_deletable_mapping ON public.user_id_mapping;
CREATE TRIGGER mark_employee_non_deletable_mapping
  AFTER INSERT ON public.user_id_mapping
  FOR EACH ROW
  EXECUTE FUNCTION public.mark_employee_non_deletable();

-- 5) Recreate get_employees_basic_data to include is_deletable and exclude soft-deleted
DROP FUNCTION IF EXISTS public.get_employees_basic_data();
CREATE FUNCTION public.get_employees_basic_data()
RETURNS TABLE(
  id uuid, 
  employee_id text, 
  english_name text, 
  arabic_name text, 
  position_title text, 
  category text, 
  status text, 
  date_of_joining date, 
  date_of_leaving date, 
  nationality text, 
  work_phone text, 
  qualifications text, 
  user_id uuid, 
  is_deletable boolean,
  created_at timestamp with time zone, 
  updated_at timestamp with time zone
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO ''
AS $function$
  SELECT 
    e.id,
    e.employee_id,
    e.english_name,
    e.arabic_name,
    e."position" as position_title,
    e.category,
    e.status,
    e.date_of_joining,
    e.date_of_leaving,
    e.nationality,
    e.work_phone,
    e.qualifications,
    e.user_id,
    e.is_deletable,
    e.created_at,
    e.updated_at
  FROM public.employees e
  WHERE public.has_permission(auth.uid(), 'employees.read'::public.app_permission)
    AND e.deleted_at IS NULL;
$function$;