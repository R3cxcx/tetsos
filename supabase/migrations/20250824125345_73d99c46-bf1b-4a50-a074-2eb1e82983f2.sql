-- Add foreign key relationship between attendance_records and employees
ALTER TABLE public.attendance_records 
ADD CONSTRAINT fk_attendance_employee 
FOREIGN KEY (employee_id) REFERENCES public.employees(id) ON DELETE CASCADE;