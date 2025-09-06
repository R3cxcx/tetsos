-- Tighten employees table read access and enforce usage of secure RPCs for PII-safe access

-- 1) Remove broad SELECT policy
DROP POLICY IF EXISTS "HR staff can view basic employee data" ON public.employees;

-- 2) Allow only HR managers and super admins to perform direct SELECTs on employees
CREATE POLICY "HR managers and super admins can view employees"
ON public.employees
FOR SELECT
USING (
  public.has_role(auth.uid(), 'hr_manager'::public.app_role)
  OR public.has_role(auth.uid(), 'super_admin'::public.app_role)
);

-- Note: All other users must use RPCs like get_employees_basic_data and get_employee_safe_data
-- which are SECURITY DEFINER and return only non-sensitive fields.