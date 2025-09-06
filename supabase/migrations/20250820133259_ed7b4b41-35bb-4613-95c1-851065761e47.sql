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

-- Enable RLS
ALTER TABLE hiring_requests ENABLE ROW LEVEL SECURITY;