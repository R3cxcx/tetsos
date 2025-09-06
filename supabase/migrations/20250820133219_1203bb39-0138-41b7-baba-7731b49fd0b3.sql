-- Add vacancies field to recruitment_requests table
ALTER TABLE recruitment_requests ADD COLUMN vacancies INTEGER DEFAULT 1;

-- Create a new hiring_requests table for individual candidate hiring decisions
CREATE TABLE hiring_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  recruitment_request_id UUID NOT NULL REFERENCES recruitment_requests(id) ON DELETE CASCADE,
  candidate_id UUID NOT NULL REFERENCES recruitment_candidates(id) ON DELETE CASCADE,
  created_by UUID NOT NULL,
  proposed_salary NUMERIC,
  proposed_start_date DATE,
  justification TEXT,
  contract_details TEXT,
  status hiring_request_status DEFAULT 'pending_rm_approval',
  recruitment_manager_id UUID,
  rm_approved_at TIMESTAMP WITH TIME ZONE,
  rm_comments TEXT,
  final_salary NUMERIC,
  final_contract_details TEXT,
  hr_manager_id UUID,
  hr_approved_at TIMESTAMP WITH TIME ZONE,
  hr_comments TEXT,
  projects_director_id UUID,
  pd_approved_at TIMESTAMP WITH TIME ZONE,
  pd_comments TEXT,
  payroll_officer_id UUID,
  payroll_approved_at TIMESTAMP WITH TIME ZONE,
  payroll_comments TEXT,
  hired_employee_id UUID,
  hired_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(recruitment_request_id, candidate_id)
);

-- Create enum for hiring request status
CREATE TYPE hiring_request_status AS ENUM (
  'pending_rm_approval',
  'approved_by_rm',
  'rejected_by_rm',
  'pending_hr_approval',
  'approved_by_hr',
  'rejected_by_hr',
  'pending_pd_approval',
  'approved_by_pd',
  'rejected_by_pd',
  'pending_payroll',
  'approved_by_payroll',
  'rejected_by_payroll',
  'contract_generated',
  'hired',
  'rejected'
);

-- Enable RLS
ALTER TABLE hiring_requests ENABLE ROW LEVEL SECURITY;

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

-- Add trigger for updated_at
CREATE TRIGGER update_hiring_requests_updated_at
  BEFORE UPDATE ON hiring_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();