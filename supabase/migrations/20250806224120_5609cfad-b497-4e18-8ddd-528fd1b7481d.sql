-- Create recruitment status enum
CREATE TYPE public.recruitment_status AS ENUM (
  'draft',
  'pending_hiring_manager',
  'approved_by_hiring_manager',
  'rejected_by_hiring_manager',
  'pending_recruiter',
  'in_recruitment_process',
  'pending_recruitment_manager',
  'contract_generated',
  'hired',
  'rejected'
);

-- Create recruitment request table
CREATE TABLE public.recruitment_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  requested_by UUID NOT NULL REFERENCES auth.users(id),
  position_title TEXT NOT NULL,
  department TEXT NOT NULL,
  cost_center TEXT NOT NULL,
  job_description TEXT,
  required_qualifications TEXT,
  preferred_qualifications TEXT,
  salary_range_min DECIMAL,
  salary_range_max DECIMAL,
  expected_start_date DATE,
  justification TEXT,
  headcount_increase BOOLEAN DEFAULT false,
  replacement_for TEXT,
  status recruitment_status NOT NULL DEFAULT 'draft',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  submitted_at TIMESTAMP WITH TIME ZONE,
  
  -- Hiring manager stage
  hiring_manager_id UUID REFERENCES auth.users(id),
  hiring_manager_approved_at TIMESTAMP WITH TIME ZONE,
  hiring_manager_comments TEXT,
  
  -- Recruiter stage
  recruiter_id UUID REFERENCES auth.users(id),
  recruiter_assigned_at TIMESTAMP WITH TIME ZONE,
  
  -- Recruitment manager stage
  recruitment_manager_id UUID REFERENCES auth.users(id),
  recruitment_manager_approved_at TIMESTAMP WITH TIME ZONE,
  final_salary DECIMAL,
  contract_details TEXT,
  
  -- Final hire
  hired_employee_id UUID REFERENCES public.employees(id),
  hired_at TIMESTAMP WITH TIME ZONE
);

-- Create interview assessment table
CREATE TABLE public.interview_assessments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  recruitment_request_id UUID NOT NULL REFERENCES public.recruitment_requests(id) ON DELETE CASCADE,
  interviewer_id UUID NOT NULL REFERENCES auth.users(id),
  candidate_name TEXT NOT NULL,
  candidate_email TEXT,
  candidate_phone TEXT,
  interview_date TIMESTAMP WITH TIME ZONE,
  
  -- Assessment fields
  technical_skills_score INTEGER CHECK (technical_skills_score >= 1 AND technical_skills_score <= 10),
  communication_score INTEGER CHECK (communication_score >= 1 AND communication_score <= 10),
  experience_score INTEGER CHECK (experience_score >= 1 AND experience_score <= 10),
  cultural_fit_score INTEGER CHECK (cultural_fit_score >= 1 AND cultural_fit_score <= 10),
  overall_score INTEGER CHECK (overall_score >= 1 AND overall_score <= 10),
  
  technical_notes TEXT,
  communication_notes TEXT,
  experience_notes TEXT,
  cultural_fit_notes TEXT,
  additional_comments TEXT,
  
  recommendation TEXT CHECK (recommendation IN ('strongly_recommend', 'recommend', 'neutral', 'not_recommend', 'strongly_reject')),
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create recruitment activities log
CREATE TABLE public.recruitment_activities (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  recruitment_request_id UUID NOT NULL REFERENCES public.recruitment_requests(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL,
  performed_by UUID NOT NULL REFERENCES auth.users(id),
  activity_details TEXT,
  previous_status recruitment_status,
  new_status recruitment_status,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.recruitment_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interview_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recruitment_activities ENABLE ROW LEVEL SECURITY;

-- Create policies for recruitment_requests
CREATE POLICY "Users can view recruitment requests" 
ON public.recruitment_requests 
FOR SELECT 
USING (
  has_permission(auth.uid(), 'recruitment.read'::app_permission) OR
  requested_by = auth.uid() OR
  hiring_manager_id = auth.uid() OR
  recruiter_id = auth.uid() OR
  recruitment_manager_id = auth.uid()
);

CREATE POLICY "Users can create recruitment requests" 
ON public.recruitment_requests 
FOR INSERT 
WITH CHECK (
  has_permission(auth.uid(), 'recruitment.create'::app_permission) OR
  requested_by = auth.uid()
);

CREATE POLICY "Users can update recruitment requests" 
ON public.recruitment_requests 
FOR UPDATE 
USING (
  has_permission(auth.uid(), 'recruitment.update'::app_permission) OR
  (requested_by = auth.uid() AND status = 'draft') OR
  (hiring_manager_id = auth.uid() AND status = 'pending_hiring_manager') OR
  (recruiter_id = auth.uid() AND status IN ('approved_by_hiring_manager', 'pending_recruiter', 'in_recruitment_process')) OR
  (recruitment_manager_id = auth.uid() AND status = 'pending_recruitment_manager')
);

CREATE POLICY "Admins can delete recruitment requests" 
ON public.recruitment_requests 
FOR DELETE 
USING (has_permission(auth.uid(), 'recruitment.delete'::app_permission));

-- Create policies for interview_assessments
CREATE POLICY "Users can view interview assessments" 
ON public.interview_assessments 
FOR SELECT 
USING (
  has_permission(auth.uid(), 'recruitment.read'::app_permission) OR
  interviewer_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM public.recruitment_requests rr 
    WHERE rr.id = recruitment_request_id 
    AND (rr.requested_by = auth.uid() OR rr.hiring_manager_id = auth.uid() OR rr.recruiter_id = auth.uid() OR rr.recruitment_manager_id = auth.uid())
  )
);

CREATE POLICY "Interviewers can create assessments" 
ON public.interview_assessments 
FOR INSERT 
WITH CHECK (
  has_permission(auth.uid(), 'recruitment.create'::app_permission) OR
  interviewer_id = auth.uid()
);

CREATE POLICY "Interviewers can update their assessments" 
ON public.interview_assessments 
FOR UPDATE 
USING (
  has_permission(auth.uid(), 'recruitment.update'::app_permission) OR
  interviewer_id = auth.uid()
);

CREATE POLICY "Admins can delete assessments" 
ON public.interview_assessments 
FOR DELETE 
USING (has_permission(auth.uid(), 'recruitment.delete'::app_permission));

-- Create policies for recruitment_activities
CREATE POLICY "Users can view recruitment activities" 
ON public.recruitment_activities 
FOR SELECT 
USING (
  has_permission(auth.uid(), 'recruitment.read'::app_permission) OR
  performed_by = auth.uid() OR
  EXISTS (
    SELECT 1 FROM public.recruitment_requests rr 
    WHERE rr.id = recruitment_request_id 
    AND (rr.requested_by = auth.uid() OR rr.hiring_manager_id = auth.uid() OR rr.recruiter_id = auth.uid() OR rr.recruitment_manager_id = auth.uid())
  )
);

CREATE POLICY "Users can create activities" 
ON public.recruitment_activities 
FOR INSERT 
WITH CHECK (
  has_permission(auth.uid(), 'recruitment.create'::app_permission) OR
  performed_by = auth.uid()
);

-- Create function to update timestamps
CREATE TRIGGER update_recruitment_requests_updated_at
BEFORE UPDATE ON public.recruitment_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_interview_assessments_updated_at
BEFORE UPDATE ON public.interview_assessments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add recruitment permissions to the app_permission enum
ALTER TYPE public.app_permission ADD VALUE 'recruitment.read';
ALTER TYPE public.app_permission ADD VALUE 'recruitment.create';
ALTER TYPE public.app_permission ADD VALUE 'recruitment.update';
ALTER TYPE public.app_permission ADD VALUE 'recruitment.delete';

-- Grant recruitment permissions to appropriate roles
INSERT INTO public.role_permissions (role, permission) VALUES
('hr_manager', 'recruitment.read'),
('hr_manager', 'recruitment.create'),
('hr_manager', 'recruitment.update'),
('hr_manager', 'recruitment.delete'),
('hr_staff', 'recruitment.read'),
('hr_staff', 'recruitment.create'),
('hr_staff', 'recruitment.update'),
('admin', 'recruitment.read'),
('admin', 'recruitment.create'),
('admin', 'recruitment.update'),
('admin', 'recruitment.delete'),
('super_admin', 'recruitment.read'),
('super_admin', 'recruitment.create'),
('super_admin', 'recruitment.update'),
('super_admin', 'recruitment.delete');