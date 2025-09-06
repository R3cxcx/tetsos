-- Enable real-time for employees table
ALTER TABLE public.employees REPLICA IDENTITY FULL;

-- Add the table to the realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.employees;