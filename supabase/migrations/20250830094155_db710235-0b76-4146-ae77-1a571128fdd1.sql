-- Add a restrictive SELECT policy for employees table to protect PII
-- Only allow SELECT for privileged users and exclude soft-deleted rows

-- Safety: drop if an older version exists (idempotent for re-runs)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'employees' 
      AND polname = 'Privileged users can view employees'
  ) THEN
    EXECUTE 'DROP POLICY "Privileged users can view employees" ON public.employees';
  END IF;
END $$;

-- Create the new SELECT policy
CREATE POLICY "Privileged users can view employees"
ON public.employees
FOR SELECT
USING (
  (deleted_at IS NULL) AND (
    public.has_role(auth.uid(), 'super_admin'::public.app_role)
    OR public.has_role(auth.uid(), 'hr_manager'::public.app_role)
    OR public.has_permission(auth.uid(), 'employees.read'::public.app_permission)
  )
);
