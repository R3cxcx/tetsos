-- Drop and recreate the audit triggers to ensure they work with the new enum

-- Drop existing triggers
DROP TRIGGER IF EXISTS audit_employee_changes ON public.employees;

-- Recreate the audit_employee_changes function with proper error handling
CREATE OR REPLACE FUNCTION public.audit_employee_changes()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.log_audit_event(
      'employee_created'::public.audit_event_type,
      auth.uid(),
      NEW.user_id,
      'employees',
      NEW.id::text,
      NULL,
      to_jsonb(NEW),
      jsonb_build_object('operation', 'INSERT')
    );
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    PERFORM public.log_audit_event(
      'employee_updated'::public.audit_event_type,
      auth.uid(),
      NEW.user_id,
      'employees', 
      NEW.id::text,
      to_jsonb(OLD),
      to_jsonb(NEW),
      jsonb_build_object('operation', 'UPDATE')
    );
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM public.log_audit_event(
      'employee_deleted'::public.audit_event_type,
      auth.uid(),
      OLD.user_id,
      'employees',
      OLD.id::text,
      to_jsonb(OLD),
      NULL,
      jsonb_build_object('operation', 'DELETE')
    );
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$function$;

-- Recreate the trigger
CREATE TRIGGER audit_employee_changes
  AFTER INSERT OR UPDATE OR DELETE ON public.employees
  FOR EACH ROW EXECUTE FUNCTION public.audit_employee_changes();