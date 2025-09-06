-- Create master data tables for HR system

-- Departments table
CREATE TABLE public.departments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  code TEXT UNIQUE,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID
);

-- Positions table
CREATE TABLE public.positions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  department_id UUID REFERENCES public.departments(id),
  code TEXT UNIQUE,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID
);

-- Employee Status table
CREATE TABLE public.employee_statuses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  status TEXT NOT NULL UNIQUE,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID
);

-- Nationalities table
CREATE TABLE public.nationalities (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  code TEXT UNIQUE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID
);

-- Employee Categories table
CREATE TABLE public.employee_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  code TEXT UNIQUE,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID
);

-- Enable Row Level Security
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_statuses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nationalities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_categories ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for departments
CREATE POLICY "Users can view departments" 
ON public.departments 
FOR SELECT 
USING (has_permission(auth.uid(), 'employees.read'::app_permission));

CREATE POLICY "Users can create departments" 
ON public.departments 
FOR INSERT 
WITH CHECK (has_permission(auth.uid(), 'employees.create'::app_permission));

CREATE POLICY "Users can update departments" 
ON public.departments 
FOR UPDATE 
USING (has_permission(auth.uid(), 'employees.update'::app_permission));

CREATE POLICY "Users can delete departments" 
ON public.departments 
FOR DELETE 
USING (has_permission(auth.uid(), 'employees.delete'::app_permission));

-- Create RLS policies for positions
CREATE POLICY "Users can view positions" 
ON public.positions 
FOR SELECT 
USING (has_permission(auth.uid(), 'employees.read'::app_permission));

CREATE POLICY "Users can create positions" 
ON public.positions 
FOR INSERT 
WITH CHECK (has_permission(auth.uid(), 'employees.create'::app_permission));

CREATE POLICY "Users can update positions" 
ON public.positions 
FOR UPDATE 
USING (has_permission(auth.uid(), 'employees.update'::app_permission));

CREATE POLICY "Users can delete positions" 
ON public.positions 
FOR DELETE 
USING (has_permission(auth.uid(), 'employees.delete'::app_permission));

-- Create RLS policies for employee_statuses
CREATE POLICY "Users can view employee statuses" 
ON public.employee_statuses 
FOR SELECT 
USING (has_permission(auth.uid(), 'employees.read'::app_permission));

CREATE POLICY "Users can create employee statuses" 
ON public.employee_statuses 
FOR INSERT 
WITH CHECK (has_permission(auth.uid(), 'employees.create'::app_permission));

CREATE POLICY "Users can update employee statuses" 
ON public.employee_statuses 
FOR UPDATE 
USING (has_permission(auth.uid(), 'employees.update'::app_permission));

CREATE POLICY "Users can delete employee statuses" 
ON public.employee_statuses 
FOR DELETE 
USING (has_permission(auth.uid(), 'employees.delete'::app_permission));

-- Create RLS policies for nationalities
CREATE POLICY "Users can view nationalities" 
ON public.nationalities 
FOR SELECT 
USING (has_permission(auth.uid(), 'employees.read'::app_permission));

CREATE POLICY "Users can create nationalities" 
ON public.nationalities 
FOR INSERT 
WITH CHECK (has_permission(auth.uid(), 'employees.create'::app_permission));

CREATE POLICY "Users can update nationalities" 
ON public.nationalities 
FOR UPDATE 
USING (has_permission(auth.uid(), 'employees.update'::app_permission));

CREATE POLICY "Users can delete nationalities" 
ON public.nationalities 
FOR DELETE 
USING (has_permission(auth.uid(), 'employees.delete'::app_permission));

-- Create RLS policies for employee_categories
CREATE POLICY "Users can view employee categories" 
ON public.employee_categories 
FOR SELECT 
USING (has_permission(auth.uid(), 'employees.read'::app_permission));

CREATE POLICY "Users can create employee categories" 
ON public.employee_categories 
FOR INSERT 
WITH CHECK (has_permission(auth.uid(), 'employees.create'::app_permission));

CREATE POLICY "Users can update employee categories" 
ON public.employee_categories 
FOR UPDATE 
USING (has_permission(auth.uid(), 'employees.update'::app_permission));

CREATE POLICY "Users can delete employee categories" 
ON public.employee_categories 
FOR DELETE 
USING (has_permission(auth.uid(), 'employees.delete'::app_permission));

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_departments_updated_at
BEFORE UPDATE ON public.departments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_positions_updated_at
BEFORE UPDATE ON public.positions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_employee_statuses_updated_at
BEFORE UPDATE ON public.employee_statuses
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_nationalities_updated_at
BEFORE UPDATE ON public.nationalities
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_employee_categories_updated_at
BEFORE UPDATE ON public.employee_categories
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default data
INSERT INTO public.employee_statuses (status, description) VALUES 
('active', 'Active employee'),
('inactive', 'Inactive employee'),
('pending', 'Pending approval');

INSERT INTO public.departments (name, code, description) VALUES 
('Human Resources', 'HR', 'Human Resources Department'),
('Information Technology', 'IT', 'Information Technology Department'),
('Finance', 'FIN', 'Finance Department'),
('Operations', 'OPS', 'Operations Department'),
('Sales', 'SALES', 'Sales Department');

INSERT INTO public.nationalities (name, code) VALUES 
('Saudi Arabian', 'SA'),
('American', 'US'),
('British', 'GB'),
('Egyptian', 'EG'),
('Indian', 'IN'),
('Pakistani', 'PK'),
('Bangladeshi', 'BD'),
('Filipino', 'PH'),
('Jordanian', 'JO'),
('Lebanese', 'LB');

INSERT INTO public.employee_categories (name, code, description) VALUES 
('Full-time', 'FT', 'Full-time permanent employee'),
('Part-time', 'PT', 'Part-time employee'),
('Contract', 'CT', 'Contract employee'),
('Consultant', 'CS', 'External consultant'),
('Intern', 'IN', 'Internship position');