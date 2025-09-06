-- Create comprehensive employees table
CREATE TABLE public.employees (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id TEXT NOT NULL UNIQUE,
  category TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  english_name TEXT NOT NULL,
  arabic_name TEXT,
  position TEXT,
  date_of_joining DATE,
  date_of_leaving DATE,
  nationality TEXT,
  gender TEXT,
  marital_status TEXT,
  id_number TEXT, -- Jenseya/Passport number
  issuing_body TEXT,
  issue_date DATE,
  work_phone TEXT,
  home_phone TEXT,
  nok_person TEXT, -- Next of Kin person
  nok_name TEXT, -- Next of Kin name
  nok_phone_number TEXT,
  personal_email TEXT,
  birth_date DATE,
  birth_place TEXT,
  qualifications TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;

-- Create policies for employees table
CREATE POLICY "Users can view employees"
ON public.employees
FOR SELECT
USING (
  public.has_permission(auth.uid(), 'employees.read')
);

CREATE POLICY "Users can create employees"
ON public.employees
FOR INSERT
WITH CHECK (
  public.has_permission(auth.uid(), 'employees.create')
);

CREATE POLICY "Users can update employees"
ON public.employees
FOR UPDATE
USING (
  public.has_permission(auth.uid(), 'employees.update')
);

CREATE POLICY "Users can delete employees"
ON public.employees
FOR DELETE
USING (
  public.has_permission(auth.uid(), 'employees.delete')
);

-- Create indexes for better performance
CREATE INDEX idx_employees_employee_id ON public.employees(employee_id);
CREATE INDEX idx_employees_english_name ON public.employees(english_name);
CREATE INDEX idx_employees_status ON public.employees(status);
CREATE INDEX idx_employees_position ON public.employees(position);
CREATE INDEX idx_employees_date_of_joining ON public.employees(date_of_joining);

-- Create trigger for timestamp updates
CREATE TRIGGER update_employees_updated_at
  BEFORE UPDATE ON public.employees
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();