-- Create terminals table for fingerprint terminal management
CREATE TABLE public.terminals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  terminal_uid TEXT NOT NULL UNIQUE,
  terminal_name TEXT NOT NULL,
  location TEXT,
  site_admin_name TEXT,
  connection_method TEXT CHECK (connection_method IN ('ethernet', 'wifi', 'usb', 'serial')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.terminals ENABLE ROW LEVEL SECURITY;

-- Create policies for terminal management
CREATE POLICY "Users can view terminals" 
ON public.terminals 
FOR SELECT 
USING (has_permission(auth.uid(), 'employees.read'::app_permission) OR has_role(auth.uid(), 'employee'::app_role));

CREATE POLICY "Users can create terminals" 
ON public.terminals 
FOR INSERT 
WITH CHECK (has_permission(auth.uid(), 'employees.create'::app_permission));

CREATE POLICY "Users can update terminals" 
ON public.terminals 
FOR UPDATE 
USING (has_permission(auth.uid(), 'employees.update'::app_permission))
WITH CHECK (has_permission(auth.uid(), 'employees.update'::app_permission));

CREATE POLICY "Users can delete terminals" 
ON public.terminals 
FOR DELETE 
USING (has_permission(auth.uid(), 'employees.delete'::app_permission));

-- Create index for better performance
CREATE INDEX idx_terminals_terminal_uid ON public.terminals(terminal_uid);
CREATE INDEX idx_terminals_active ON public.terminals(is_active);