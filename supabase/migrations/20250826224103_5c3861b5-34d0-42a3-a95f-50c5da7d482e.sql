-- Create a function to get accurate employee statistics
CREATE OR REPLACE FUNCTION public.get_employee_stats()
RETURNS TABLE(
  total_count bigint,
  active_count bigint,
  inactive_count bigint,
  pending_count bigint
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = ''
AS $function$
BEGIN
  -- Check permission
  IF NOT public.has_permission(auth.uid(), 'employees.read'::public.app_permission) THEN
    RAISE EXCEPTION 'Access denied. employees.read permission required.';
  END IF;

  RETURN QUERY
  SELECT 
    COUNT(*)::bigint as total_count,
    COUNT(*) FILTER (WHERE status = 'active')::bigint as active_count,
    COUNT(*) FILTER (WHERE status = 'inactive')::bigint as inactive_count,
    COUNT(*) FILTER (WHERE status = 'pending')::bigint as pending_count
  FROM public.employees 
  WHERE deleted_at IS NULL;
END;
$function$;