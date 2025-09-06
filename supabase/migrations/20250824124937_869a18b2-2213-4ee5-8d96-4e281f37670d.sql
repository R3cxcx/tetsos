-- Create attendance_records table for tracking employee attendance
CREATE TABLE public.attendance_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID NOT NULL,
  date DATE NOT NULL,
  clock_in TIMESTAMP WITH TIME ZONE,
  clock_out TIMESTAMP WITH TIME ZONE,
  total_hours NUMERIC,
  status TEXT NOT NULL DEFAULT 'present' CHECK (status IN ('present', 'absent', 'late', 'on_leave', 'half_day')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(employee_id, date)
);

-- Enable RLS
ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;

-- Create policies for attendance records
CREATE POLICY "Users can view attendance records" 
ON public.attendance_records 
FOR SELECT 
USING (has_permission(auth.uid(), 'employees.read'::app_permission) OR has_role(auth.uid(), 'employee'::app_role));

CREATE POLICY "Users can create attendance records" 
ON public.attendance_records 
FOR INSERT 
WITH CHECK (has_permission(auth.uid(), 'employees.create'::app_permission));

CREATE POLICY "Users can update attendance records" 
ON public.attendance_records 
FOR UPDATE 
USING (has_permission(auth.uid(), 'employees.update'::app_permission));

CREATE POLICY "Users can delete attendance records" 
ON public.attendance_records 
FOR DELETE 
USING (has_permission(auth.uid(), 'employees.delete'::app_permission));

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_attendance_records_updated_at
BEFORE UPDATE ON public.attendance_records
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for better performance
CREATE INDEX idx_attendance_records_employee_date ON public.attendance_records(employee_id, date);
CREATE INDEX idx_attendance_records_date ON public.attendance_records(date);