-- Add roles to the current user for accessing employee data
INSERT INTO public.user_roles (user_id, role) 
VALUES 
  (auth.uid(), 'admin'),
  (auth.uid(), 'hr_manager')
ON CONFLICT (user_id, role) DO NOTHING;