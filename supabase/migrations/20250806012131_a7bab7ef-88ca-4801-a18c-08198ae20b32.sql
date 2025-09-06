-- Create employees staging table with all text columns for data cleansing
CREATE TABLE public.employees_staging (
  id text DEFAULT gen_random_uuid()::text PRIMARY KEY,
  employee_id text,
  english_name text,
  arabic_name text,
  status text DEFAULT 'active',
  position text,
  personal_email text,
  qualifications text,
  nationality text,
  gender text,
  marital_status text,
  id_number text,
  issuing_body text,
  birth_place text,
  work_phone text,
  home_phone text,
  nok_person text,
  nok_name text,
  nok_phone_number text,
  category text,
  date_of_joining text,
  date_of_leaving text,
  issue_date text,
  birth_date text,
  created_at text DEFAULT now()::text,
  updated_at text DEFAULT now()::text,
  created_by text
);

-- Enable Row Level Security
ALTER TABLE public.employees_staging ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for staging table (same permissions as main employees table)
CREATE POLICY "Users can view staging employees" 
ON public.employees_staging 
FOR SELECT 
USING (has_permission(auth.uid(), 'employees.read'::app_permission));

CREATE POLICY "Users can create staging employees" 
ON public.employees_staging 
FOR INSERT 
WITH CHECK (has_permission(auth.uid(), 'employees.create'::app_permission));

CREATE POLICY "Users can update staging employees" 
ON public.employees_staging 
FOR UPDATE 
USING (has_permission(auth.uid(), 'employees.update'::app_permission));

CREATE POLICY "Users can delete staging employees" 
ON public.employees_staging 
FOR DELETE 
USING (has_permission(auth.uid(), 'employees.delete'::app_permission));