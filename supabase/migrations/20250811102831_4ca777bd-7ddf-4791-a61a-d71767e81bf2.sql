-- Add user_id field to employees table to link employees to auth users
ALTER TABLE public.employees 
ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Create index for better performance
CREATE INDEX idx_employees_user_id ON public.employees(user_id);

-- Update the RLS policy for employees to allow employee role users to see only their own records
DROP POLICY IF EXISTS "Users can view employees" ON public.employees;

CREATE POLICY "Users can view employees" 
ON public.employees 
FOR SELECT 
USING (
  -- Admin permissions - can see all
  has_permission(auth.uid(), 'employees.read'::app_permission) 
  OR 
  -- Employee role - can only see their own record
  (has_role(auth.uid(), 'employee'::app_role) AND user_id = auth.uid())
);