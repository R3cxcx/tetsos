-- Assign super_admin role to the user with email super@test.com
INSERT INTO user_roles (user_id, role, assigned_by) 
VALUES ('20f0e6e6-c1bd-431d-a618-31cffb9b569b', 'super_admin', '20f0e6e6-c1bd-431d-a618-31cffb9b569b')
ON CONFLICT (user_id, role) DO NOTHING;