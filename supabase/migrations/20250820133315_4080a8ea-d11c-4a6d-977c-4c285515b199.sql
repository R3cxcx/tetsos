-- Create RLS policies for hiring_requests
CREATE POLICY "Users can view hiring requests they're involved with" 
ON hiring_requests 
FOR SELECT 
USING (
  created_by = auth.uid() 
  OR recruitment_manager_id = auth.uid()
  OR hr_manager_id = auth.uid()
  OR projects_director_id = auth.uid()
  OR payroll_officer_id = auth.uid()
  OR has_permission(auth.uid(), 'employees.read'::app_permission)
  OR EXISTS (
    SELECT 1 FROM recruitment_requests rr 
    WHERE rr.id = hiring_requests.recruitment_request_id 
    AND (rr.requested_by = auth.uid() OR rr.hiring_manager_id = auth.uid() OR rr.recruiter_id = auth.uid())
  )
);

CREATE POLICY "Recruiters can create hiring requests" 
ON hiring_requests 
FOR INSERT 
WITH CHECK (
  has_permission(auth.uid(), 'employees.create'::app_permission)
  OR created_by = auth.uid()
);

CREATE POLICY "Stakeholders can update hiring requests" 
ON hiring_requests 
FOR UPDATE 
USING (
  has_permission(auth.uid(), 'employees.update'::app_permission)
  OR created_by = auth.uid()
  OR recruitment_manager_id = auth.uid()
  OR hr_manager_id = auth.uid()
  OR projects_director_id = auth.uid()
  OR payroll_officer_id = auth.uid()
);

CREATE POLICY "Admins can delete hiring requests" 
ON hiring_requests 
FOR DELETE 
USING (has_permission(auth.uid(), 'employees.delete'::app_permission));

-- Add trigger for updated_at
CREATE TRIGGER update_hiring_requests_updated_at
  BEFORE UPDATE ON hiring_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();