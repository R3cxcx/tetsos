-- Fix missing audit_event_type and align audit_logs schema

-- 1) Create the enum type if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'audit_event_type' AND n.nspname = 'public'
  ) THEN
    CREATE TYPE public.audit_event_type AS ENUM (
      'employee_created',
      'employee_updated',
      'employee_deleted',
      'role_assigned',
      'role_removed',
      'sensitive_data_accessed',
      'recruitment_request_created',
      'recruitment_request_approved',
      'recruitment_request_rejected'
    );
  END IF;
END$$;

-- 2) Ensure all enum values exist (idempotent)
ALTER TYPE public.audit_event_type ADD VALUE IF NOT EXISTS 'employee_created';
ALTER TYPE public.audit_event_type ADD VALUE IF NOT EXISTS 'employee_updated';
ALTER TYPE public.audit_event_type ADD VALUE IF NOT EXISTS 'employee_deleted';
ALTER TYPE public.audit_event_type ADD VALUE IF NOT EXISTS 'role_assigned';
ALTER TYPE public.audit_event_type ADD VALUE IF NOT EXISTS 'role_removed';
ALTER TYPE public.audit_event_type ADD VALUE IF NOT EXISTS 'sensitive_data_accessed';
ALTER TYPE public.audit_event_type ADD VALUE IF NOT EXISTS 'recruitment_request_created';
ALTER TYPE public.audit_event_type ADD VALUE IF NOT EXISTS 'recruitment_request_approved';
ALTER TYPE public.audit_event_type ADD VALUE IF NOT EXISTS 'recruitment_request_rejected';

-- 3) Add event_type column to audit_logs if missing and backfill
ALTER TABLE public.audit_logs
  ADD COLUMN IF NOT EXISTS event_type public.audit_event_type;

-- Backfill any NULLs to a safe default
UPDATE public.audit_logs
SET event_type = 'sensitive_data_accessed'
WHERE event_type IS NULL;

-- Enforce NOT NULL going forward
ALTER TABLE public.audit_logs
  ALTER COLUMN event_type SET NOT NULL;