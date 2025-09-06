-- Update RLS policies for all HR tables to restrict employee role access

-- Departments: Employees can only view departments
DROP POLICY IF EXISTS "Users can view departments" ON public.departments;
CREATE POLICY "Users can view departments" 
ON public.departments 
FOR SELECT 
USING (
  has_permission(auth.uid(), 'employees.read'::app_permission)
  OR has_role(auth.uid(), 'employee'::app_role)
);

-- Employee Categories: Employees can only view categories
DROP POLICY IF EXISTS "Users can view employee categories" ON public.employee_categories;
CREATE POLICY "Users can view employee categories" 
ON public.employee_categories 
FOR SELECT 
USING (
  has_permission(auth.uid(), 'employees.read'::app_permission)
  OR has_role(auth.uid(), 'employee'::app_role)
);

-- Positions: Employees can only view positions
DROP POLICY IF EXISTS "Users can view positions" ON public.positions;
CREATE POLICY "Users can view positions" 
ON public.positions 
FOR SELECT 
USING (
  has_permission(auth.uid(), 'employees.read'::app_permission)
  OR has_role(auth.uid(), 'employee'::app_role)
);

-- Nationalities: Employees can only view nationalities
DROP POLICY IF EXISTS "Users can view nationalities" ON public.nationalities;
CREATE POLICY "Users can view nationalities" 
ON public.nationalities 
FOR SELECT 
USING (
  has_permission(auth.uid(), 'employees.read'::app_permission)
  OR has_role(auth.uid(), 'employee'::app_role)
);

-- Employee Statuses: Employees can only view statuses
DROP POLICY IF EXISTS "Users can view employee statuses" ON public.employee_statuses;
CREATE POLICY "Users can view employee statuses" 
ON public.employee_statuses 
FOR SELECT 
USING (
  has_permission(auth.uid(), 'employees.read'::app_permission)
  OR has_role(auth.uid(), 'employee'::app_role)
);

-- Employees Staging: Only admins can access staging
DROP POLICY IF EXISTS "Users can view staging employees" ON public.employees_staging;
CREATE POLICY "Users can view staging employees" 
ON public.employees_staging 
FOR SELECT 
USING (has_permission(auth.uid(), 'employees.read'::app_permission));

-- Recruitment tables: Only admins and relevant users can access
DROP POLICY IF EXISTS "Users can view recruitment requests" ON public.recruitment_requests;
CREATE POLICY "Users can view recruitment requests" 
ON public.recruitment_requests 
FOR SELECT 
USING (
  has_permission(auth.uid(), 'employees.read'::app_permission) 
  OR (requested_by = auth.uid()) 
  OR (hiring_manager_id = auth.uid()) 
  OR (recruiter_id = auth.uid()) 
  OR (recruitment_manager_id = auth.uid())
);

DROP POLICY IF EXISTS "Users can view interview assessments" ON public.interview_assessments;
CREATE POLICY "Users can view interview assessments" 
ON public.interview_assessments 
FOR SELECT 
USING (
  has_permission(auth.uid(), 'employees.read'::app_permission) 
  OR (interviewer_id = auth.uid()) 
  OR (EXISTS ( 
    SELECT 1
    FROM recruitment_requests rr
    WHERE ((rr.id = interview_assessments.recruitment_request_id) 
    AND ((rr.requested_by = auth.uid()) 
    OR (rr.hiring_manager_id = auth.uid()) 
    OR (rr.recruiter_id = auth.uid()) 
    OR (rr.recruitment_manager_id = auth.uid())))
  ))
);

DROP POLICY IF EXISTS "Users can view recruitment activities" ON public.recruitment_activities;
CREATE POLICY "Users can view recruitment activities" 
ON public.recruitment_activities 
FOR SELECT 
USING (
  has_permission(auth.uid(), 'employees.read'::app_permission) 
  OR (performed_by = auth.uid()) 
  OR (EXISTS ( 
    SELECT 1
    FROM recruitment_requests rr
    WHERE ((rr.id = recruitment_activities.recruitment_request_id) 
    AND ((rr.requested_by = auth.uid()) 
    OR (rr.hiring_manager_id = auth.uid()) 
    OR (rr.recruiter_id = auth.uid()) 
    OR (rr.recruitment_manager_id = auth.uid())))
  ))
);