-- Soft-delete, race-safe safe_delete_employee function
CREATE OR REPLACE FUNCTION public.safe_delete_employee(p_employee_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_actor uuid := auth.uid();
  v_employee record;
  v_attendance_count integer := 0;
  v_recruitment_count integer := 0;
  v_hiring_count integer := 0;
  v_mapping_count integer := 0;
  v_total_references integer := 0;
  v_update_count integer := 0;
BEGIN
  -- Require authenticated user context
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'Authentication required to delete employee.';
  END IF;

  -- Require permission using fully-qualified enum
  IF NOT public.has_permission(v_actor, 'employees.delete'::public.app_permission) THEN
    RAISE EXCEPTION 'Access denied. Insufficient permissions to delete employee.';
  END IF;

  -- Load employee record
  SELECT * INTO v_employee FROM public.employees WHERE id = p_employee_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'Employee not found');
  END IF;

  -- Already deleted check
  IF v_employee.deleted_at IS NOT NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Employee is already deleted');
  END IF;

  -- Count references in related tables
  SELECT COUNT(*) INTO v_attendance_count
  FROM public.attendance_records ar
  WHERE ar.employee_id = p_employee_id;

  SELECT COUNT(*) INTO v_recruitment_count
  FROM public.recruitment_requests rr
  WHERE rr.hired_employee_id = p_employee_id;

  SELECT COUNT(*) INTO v_hiring_count
  FROM public.hiring_requests hr
  WHERE hr.hired_employee_id = p_employee_id;

  SELECT COUNT(*) INTO v_mapping_count
  FROM public.user_id_mapping uim
  WHERE uim.employee_id = v_employee.employee_id;

  v_total_references := v_attendance_count + v_recruitment_count + v_hiring_count + v_mapping_count;

  -- If references exist, mark non-deletable and return details
  IF v_total_references > 0 THEN
    UPDATE public.employees
       SET is_deletable = false,
           updated_at = now()
     WHERE id = p_employee_id;

    RETURN jsonb_build_object(
      'success', false,
      'message', 'Employee cannot be deleted due to existing references',
      'references', jsonb_build_object(
        'attendance_records', v_attendance_count,
        'recruitment_requests', v_recruitment_count,
        'hiring_requests', v_hiring_count,
        'user_mappings', v_mapping_count,
        'total', v_total_references
      )
    );
  END IF;

  -- Perform SOFT delete atomically and race-safe using NOT EXISTS guards
  UPDATE public.employees e
     SET deleted_at = now(),
         updated_at = now()
   WHERE e.id = p_employee_id
     AND NOT EXISTS (
       SELECT 1 FROM public.attendance_records ar WHERE ar.employee_id = e.id
     )
     AND NOT EXISTS (
       SELECT 1 FROM public.recruitment_requests rr WHERE rr.hired_employee_id = e.id
     )
     AND NOT EXISTS (
       SELECT 1 FROM public.hiring_requests hr WHERE hr.hired_employee_id = e.id
     )
     AND NOT EXISTS (
       SELECT 1 FROM public.user_id_mapping uim WHERE uim.employee_id = e.employee_id
     )
  RETURNING 1 INTO v_update_count;

  -- If update blocked by concurrent references, recompute and return failure
  IF v_update_count = 0 THEN
    SELECT COUNT(*) INTO v_attendance_count FROM public.attendance_records WHERE employee_id = p_employee_id;
    SELECT COUNT(*) INTO v_recruitment_count FROM public.recruitment_requests WHERE hired_employee_id = p_employee_id;
    SELECT COUNT(*) INTO v_hiring_count FROM public.hiring_requests WHERE hired_employee_id = p_employee_id;
    SELECT COUNT(*) INTO v_mapping_count FROM public.user_id_mapping WHERE employee_id = v_employee.employee_id;

    v_total_references := v_attendance_count + v_recruitment_count + v_hiring_count + v_mapping_count;

    UPDATE public.employees SET is_deletable = false, updated_at = now() WHERE id = p_employee_id;

    RETURN jsonb_build_object(
      'success', false,
      'message', 'Employee cannot be deleted due to newly created references',
      'references', jsonb_build_object(
        'attendance_records', v_attendance_count,
        'recruitment_requests', v_recruitment_count,
        'hiring_requests', v_hiring_count,
        'user_mappings', v_mapping_count,
        'total', v_total_references
      )
    );
  END IF;

  -- Log audit event with fully-qualified enum
  PERFORM public.log_audit_event(
    'employee_deleted'::public.audit_event_type,
    v_actor,
    v_employee.user_id,
    'employees',
    p_employee_id::text,
    to_jsonb(v_employee),
    jsonb_build_object('deleted_at', now()),
    jsonb_build_object('employee_id', v_employee.employee_id, 'operation', 'SOFT_DELETE')
  );

  RETURN jsonb_build_object('success', true, 'message', 'Employee soft-deleted successfully');
END;
$function$;