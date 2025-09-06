-- Enable real-time updates for employees table
ALTER TABLE public.employees REPLICA IDENTITY FULL;

-- Add employees table to realtime publication  
ALTER PUBLICATION supabase_realtime ADD TABLE public.employees;