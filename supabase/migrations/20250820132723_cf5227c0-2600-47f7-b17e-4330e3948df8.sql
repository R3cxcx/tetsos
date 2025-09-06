-- Add 'recruiter' role to the app_role enum
ALTER TYPE app_role ADD VALUE 'recruiter';

-- Add permissions for the recruiter role
-- Recruiters should be able to read employee data and create/update recruitment-related records
INSERT INTO role_permissions (role, permission) VALUES 
('recruiter', 'employees.read'),
('recruiter', 'employees.create'),
('recruiter', 'employees.update');