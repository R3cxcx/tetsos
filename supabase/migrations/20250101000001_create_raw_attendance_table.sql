-- Create raw_attendance_data table for storing fingerprint device data
CREATE TABLE IF NOT EXISTS public.raw_attendance_data (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id TEXT NOT NULL, -- Fingerprint device user ID
    employee_id TEXT NOT NULL, -- HR employee ID (required from file)
    name TEXT NOT NULL,
    clocking_time TIMESTAMP WITH TIME ZONE NOT NULL,
    terminal_description TEXT,
    processed BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_raw_attendance_data_user_id ON public.raw_attendance_data(user_id);
CREATE INDEX IF NOT EXISTS idx_raw_attendance_data_employee_id ON public.raw_attendance_data(employee_id);
CREATE INDEX IF NOT EXISTS idx_raw_attendance_data_clocking_time ON public.raw_attendance_data(clocking_time);
CREATE INDEX IF NOT EXISTS idx_raw_attendance_data_processed ON public.raw_attendance_data(processed);

-- Create user_id_mapping table for mapping fingerprint device IDs to employee IDs
CREATE TABLE IF NOT EXISTS public.user_id_mapping (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id TEXT NOT NULL UNIQUE, -- Fingerprint device user ID
    employee_id TEXT NOT NULL REFERENCES public.employees(employee_id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for user_id_mapping
CREATE INDEX IF NOT EXISTS idx_user_id_mapping_user_id ON public.user_id_mapping(user_id);
CREATE INDEX IF NOT EXISTS idx_user_id_mapping_employee_id ON public.user_id_mapping(employee_id);

-- Enable RLS
ALTER TABLE public.raw_attendance_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_id_mapping ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for raw_attendance_data
CREATE POLICY "HR users can view raw attendance data" ON public.raw_attendance_data
    FOR SELECT USING (public.has_permission(auth.uid(), 'attendance.read'));

CREATE POLICY "HR users can insert raw attendance data" ON public.raw_attendance_data
    FOR INSERT WITH CHECK (public.has_permission(auth.uid(), 'attendance.create'));

CREATE POLICY "HR users can update raw attendance data" ON public.raw_attendance_data
    FOR UPDATE USING (public.has_permission(auth.uid(), 'attendance.update'));

CREATE POLICY "HR users can delete raw attendance data" ON public.raw_attendance_data
    FOR DELETE USING (public.has_permission(auth.uid(), 'attendance.delete'));

-- Create RLS policies for user_id_mapping
CREATE POLICY "HR users can view user ID mappings" ON public.user_id_mapping
    FOR SELECT USING (public.has_permission(auth.uid(), 'attendance.read'));

CREATE POLICY "HR users can insert user ID mappings" ON public.user_id_mapping
    FOR INSERT WITH CHECK (public.has_permission(auth.uid(), 'attendance.create'));

CREATE POLICY "HR users can update user ID mappings" ON public.user_id_mapping
    FOR UPDATE USING (public.has_permission(auth.uid(), 'attendance.update'));

CREATE POLICY "HR users can delete user ID mappings" ON public.user_id_mapping
    FOR DELETE USING (public.has_permission(auth.uid(), 'attendance.delete'));

-- Create trigger for timestamp updates
CREATE TRIGGER update_raw_attendance_data_updated_at
    BEFORE UPDATE ON public.raw_attendance_data
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_id_mapping_updated_at
    BEFORE UPDATE ON public.user_id_mapping
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();
