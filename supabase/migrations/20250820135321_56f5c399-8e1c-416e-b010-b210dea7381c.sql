-- Grant recruiters employees.read permission so they can access HR features
INSERT INTO public.role_permissions (role, permission)
SELECT 'recruiter'::app_role, 'employees.read'::app_permission
WHERE NOT EXISTS (
  SELECT 1 FROM public.role_permissions
  WHERE role = 'recruiter'::app_role AND permission = 'employees.read'::app_permission
);
