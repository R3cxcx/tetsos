-- Enhanced employee data function with pagination and search
CREATE OR REPLACE FUNCTION public.get_employees_paginated(
  p_limit INTEGER DEFAULT 100,
  p_offset INTEGER DEFAULT 0,
  p_search TEXT DEFAULT '',
  p_status_filter TEXT DEFAULT 'all',
  p_sort_field TEXT DEFAULT 'english_name',
  p_sort_direction TEXT DEFAULT 'asc'
)
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
  updated_at timestamp with time zone,
  total_count bigint
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_total_count bigint;
  v_query text;
  v_where_clause text := '';
  v_order_clause text;
BEGIN
  -- Check permission
  IF NOT public.has_permission(auth.uid(), 'employees.read'::public.app_permission) THEN
    RAISE EXCEPTION 'Access denied. employees.read permission required.';
  END IF;

  -- Build WHERE clause for search and status filter
  IF p_search != '' THEN
    v_where_clause := v_where_clause || format(
      ' AND (e.english_name ILIKE %L OR e.arabic_name ILIKE %L OR e.employee_id ILIKE %L OR e.work_phone ILIKE %L OR e.nationality ILIKE %L OR e."position" ILIKE %L)',
      '%' || p_search || '%',
      '%' || p_search || '%', 
      '%' || p_search || '%',
      '%' || p_search || '%',
      '%' || p_search || '%',
      '%' || p_search || '%'
    );
  END IF;

  IF p_status_filter != 'all' THEN
    v_where_clause := v_where_clause || format(' AND e.status = %L', p_status_filter);
  END IF;

  -- Build ORDER clause
  v_order_clause := format('ORDER BY e.%I %s', p_sort_field, 
    CASE WHEN p_sort_direction = 'desc' THEN 'DESC' ELSE 'ASC' END
  );

  -- Get total count first
  v_query := format('SELECT COUNT(*) FROM public.employees e WHERE e.deleted_at IS NULL %s', v_where_clause);
  EXECUTE v_query INTO v_total_count;

  -- Build main query
  v_query := format($sql$
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
      e.updated_at,
      %L::bigint as total_count
    FROM public.employees e
    WHERE e.deleted_at IS NULL %s
    %s
    LIMIT %L OFFSET %L
  $sql$, v_total_count, v_where_clause, v_order_clause, p_limit, p_offset);

  -- Return the result
  RETURN QUERY EXECUTE v_query;
END;
$function$;