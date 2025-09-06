-- Tighten employees data access: remove broad direct SELECT policy
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'employees' 
      AND policyname = 'HR managers and super admins can view employees'
  ) THEN
    EXECUTE 'DROP POLICY "HR managers and super admins can view employees" ON public.employees';
  END IF;
END $$;

-- Note: Direct SELECTs on public.employees are now effectively blocked (no permissive SELECT policies).
-- Access must go through security-definer functions like public.get_employees_basic_data() and public.get_employees_sensitive_data().
