-- Fix get_employees_basic_data RPC function to work with new RLS policy
-- The function needs to be SECURITY DEFINER to bypass RLS for authorized lookups

DROP FUNCTION IF EXISTS public.get_employees_basic_data();

CREATE OR REPLACE FUNCTION public.get_employees_basic_data()
 RETURNS TABLE(id uuid, employee_id text, english_name text, arabic_name text, position_title text, category text, status text, date_of_joining date, date_of_leaving date, nationality text, work_phone text, qualifications text, user_id uuid, is_deletable boolean, created_at timestamp with time zone, updated_at timestamp with time zone)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
BEGIN
  -- Check if user has permission to read employees (required for upload lookups)
  IF NOT (
    public.has_permission(auth.uid(), 'employees.read'::public.app_permission) OR
    public.has_role(auth.uid(), 'super_admin'::public.app_role) OR
    public.has_role(auth.uid(), 'hr_manager'::public.app_role) OR
    public.has_role(auth.uid(), 'admin'::public.app_role)
  ) THEN
    RAISE EXCEPTION 'Access denied. Insufficient permissions to read employee data.';
  END IF;

  RETURN QUERY
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
  WHERE e.deleted_at IS NULL;
END;
$function$;