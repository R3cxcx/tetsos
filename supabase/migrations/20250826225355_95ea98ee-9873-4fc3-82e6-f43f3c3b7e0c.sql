-- Assign super_admin role to the current user so they can update employee records
INSERT INTO user_roles (user_id, role, assigned_by) 
VALUES (auth.uid(), 'super_admin', auth.uid())
ON CONFLICT (user_id, role) DO NOTHING;