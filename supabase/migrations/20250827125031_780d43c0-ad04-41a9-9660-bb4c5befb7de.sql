-- Add employee_uuid column to raw_attendance_data table for faster lookups
ALTER TABLE public.raw_attendance_data 
ADD COLUMN employee_uuid UUID REFERENCES public.employees(id);