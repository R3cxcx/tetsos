-- Ensure audit_event_type enum exists with required labels
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'audit_event_type' AND n.nspname = 'public'
  ) THEN
    CREATE TYPE public.audit_event_type AS ENUM (
      'role_assigned',
      'role_removed',
      'employee_created',
      'employee_updated',
      'employee_deleted',
      'sensitive_data_accessed',
      'recruitment_request_created',
      'recruitment_request_approved',
      'recruitment_request_rejected'
    );
  END IF;
END $$;

-- Add any missing enum values (idempotent)
ALTER TYPE public.audit_event_type ADD VALUE IF NOT EXISTS 'role_assigned';
ALTER TYPE public.audit_event_type ADD VALUE IF NOT EXISTS 'role_removed';
ALTER TYPE public.audit_event_type ADD VALUE IF NOT EXISTS 'employee_created';
ALTER TYPE public.audit_event_type ADD VALUE IF NOT EXISTS 'employee_updated';
ALTER TYPE public.audit_event_type ADD VALUE IF NOT EXISTS 'employee_deleted';
ALTER TYPE public.audit_event_type ADD VALUE IF NOT EXISTS 'sensitive_data_accessed';
ALTER TYPE public.audit_event_type ADD VALUE IF NOT EXISTS 'recruitment_request_created';
ALTER TYPE public.audit_event_type ADD VALUE IF NOT EXISTS 'recruitment_request_approved';
ALTER TYPE public.audit_event_type ADD VALUE IF NOT EXISTS 'recruitment_request_rejected';

-- Recreate log_audit_event with fully qualified enum type
CREATE OR REPLACE FUNCTION public.log_audit_event(
  p_event_type public.audit_event_type,
  p_actor_id uuid DEFAULT auth.uid(),
  p_target_user_id uuid DEFAULT NULL::uuid,
  p_resource_type text DEFAULT NULL::text,
  p_resource_id text DEFAULT NULL::text,
  p_old_values jsonb DEFAULT NULL::jsonb,
  p_new_values jsonb DEFAULT NULL::jsonb,
  p_metadata jsonb DEFAULT NULL::jsonb
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  audit_id UUID;
BEGIN
  INSERT INTO public.audit_logs (
    event_type,
    actor_id,
    target_user_id,
    resource_type,
    resource_id,
    old_values,
    new_values,
    metadata
  ) VALUES (
    p_event_type,
    p_actor_id,
    p_target_user_id,
    p_resource_type,
    p_resource_id,
    p_old_values,
    p_new_values,
    p_metadata
  ) RETURNING id INTO audit_id;
  
  RETURN audit_id;
END;
$function$;

-- Recreate audit_role_changes to use qualified enum casts
CREATE OR REPLACE FUNCTION public.audit_role_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.log_audit_event(
      'role_assigned'::public.audit_event_type,
      auth.uid(),
      NEW.user_id,
      'user_roles',
      NEW.id::text,
      NULL,
      to_jsonb(NEW),
      jsonb_build_object('role', NEW.role, 'operation', 'INSERT')
    );
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM public.log_audit_event(
      'role_removed'::public.audit_event_type,
      auth.uid(),
      OLD.user_id,
      'user_roles',
      OLD.id::text,
      to_jsonb(OLD),
      NULL,
      jsonb_build_object('role', OLD.role, 'operation', 'DELETE')
    );
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$function$;

-- Qualify enum casts in audit_recruitment_changes as well (consistency)
CREATE OR REPLACE FUNCTION public.audit_recruitment_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.log_audit_event(
      'recruitment_request_created'::public.audit_event_type,
      auth.uid(),
      NEW.requested_by,
      'recruitment_requests',
      NEW.id::text,
      NULL,
      to_jsonb(NEW),
      jsonb_build_object('position', NEW.position_title, 'operation', 'INSERT')
    );
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Log status changes specifically
    IF OLD.status != NEW.status THEN
      IF NEW.status = 'approved_by_hiring_manager'::public.recruitment_status THEN
        PERFORM public.log_audit_event(
          'recruitment_request_approved'::public.audit_event_type,
          auth.uid(),
          NEW.requested_by,
          'recruitment_requests',
          NEW.id::text,
          jsonb_build_object('old_status', OLD.status),
          jsonb_build_object('new_status', NEW.status),
          jsonb_build_object('position', NEW.position_title, 'approval_type', 'hiring_manager')
        );
      ELSIF NEW.status = 'rejected'::public.recruitment_status THEN
        PERFORM public.log_audit_event(
          'recruitment_request_rejected'::public.audit_event_type,
          auth.uid(),
          NEW.requested_by,
          'recruitment_requests',
          NEW.id::text,
          jsonb_build_object('old_status', OLD.status),
          jsonb_build_object('new_status', NEW.status),
          jsonb_build_object('position', NEW.position_title)
        );
      END IF;
    END IF;
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$function$;

-- Create trigger on user_roles to audit role assignment/removal
DROP TRIGGER IF EXISTS trg_audit_user_roles ON public.user_roles;
CREATE TRIGGER trg_audit_user_roles
AFTER INSERT OR DELETE ON public.user_roles
FOR EACH ROW
EXECUTE FUNCTION public.audit_role_changes();