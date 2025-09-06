-- Create attendance_records table
CREATE TABLE IF NOT EXISTS public.attendance_records (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    clock_in TIMESTAMP WITH TIME ZONE,
    clock_out TIMESTAMP WITH TIME ZONE,
    total_hours DECIMAL(5,2),
    status TEXT NOT NULL DEFAULT 'present' CHECK (status IN ('present', 'absent', 'late', 'on_leave', 'half_day')),
    notes TEXT,
    location TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure one record per employee per day
    UNIQUE(employee_id, date)
);

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_attendance_records_employee_date ON public.attendance_records(employee_id, date);
CREATE INDEX IF NOT EXISTS idx_attendance_records_date ON public.attendance_records(date);
CREATE INDEX IF NOT EXISTS idx_attendance_records_status ON public.attendance_records(status);

-- Create attendance_settings table for configuration
CREATE TABLE IF NOT EXISTS public.attendance_settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    setting_key TEXT NOT NULL UNIQUE,
    setting_value TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default attendance settings
INSERT INTO public.attendance_settings (setting_key, setting_value, description) VALUES
    ('working_hours_start', '09:00', 'Default start time for working hours'),
    ('working_hours_end', '17:00', 'Default end time for working hours'),
    ('late_threshold_minutes', '15', 'Minutes after start time to consider late'),
    ('overtime_threshold_hours', '8', 'Hours after which overtime begins'),
    ('break_time_minutes', '60', 'Total break time allowed per day'),
    ('weekend_working', 'false', 'Whether weekend work is allowed'),
    ('holiday_working', 'false', 'Whether holiday work is allowed')
ON CONFLICT (setting_key) DO NOTHING;

-- Create attendance_policies table for department-specific rules
CREATE TABLE IF NOT EXISTS public.attendance_policies (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    department_id UUID REFERENCES public.departments(id) ON DELETE CASCADE,
    policy_name TEXT NOT NULL,
    working_hours_start TIME,
    working_hours_end TIME,
    late_threshold_minutes INTEGER DEFAULT 15,
    overtime_threshold_hours DECIMAL(3,1) DEFAULT 8.0,
    break_time_minutes INTEGER DEFAULT 60,
    flexible_hours BOOLEAN DEFAULT false,
    remote_work_allowed BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create attendance_leave_types table
CREATE TABLE IF NOT EXISTS public.attendance_leave_types (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    is_paid BOOLEAN DEFAULT true,
    max_days_per_year INTEGER,
    requires_approval BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default leave types
INSERT INTO public.attendance_leave_types (name, description, is_paid, max_days_per_year, requires_approval) VALUES
    ('Annual Leave', 'Regular vacation time', true, 25, true),
    ('Sick Leave', 'Medical leave with doctor note', true, 15, false),
    ('Personal Leave', 'Personal time off', false, 5, true),
    ('Maternity Leave', 'Maternity and parental leave', true, 90, false),
    ('Bereavement Leave', 'Leave for family bereavement', true, 5, false),
    ('Unpaid Leave', 'Unpaid time off', false, 30, true)
ON CONFLICT (name) DO NOTHING;

-- Create attendance_leave_requests table
CREATE TABLE IF NOT EXISTS public.attendance_leave_requests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
    leave_type_id UUID NOT NULL REFERENCES public.attendance_leave_types(id) ON DELETE CASCADE,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    total_days DECIMAL(3,1) NOT NULL,
    reason TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
    approved_by UUID REFERENCES public.employees(id),
    approved_at TIMESTAMP WITH TIME ZONE,
    rejection_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for leave requests
CREATE INDEX IF NOT EXISTS idx_leave_requests_employee ON public.attendance_leave_requests(employee_id);
CREATE INDEX IF NOT EXISTS idx_leave_requests_status ON public.attendance_leave_requests(status);
CREATE INDEX IF NOT EXISTS idx_leave_requests_dates ON public.attendance_leave_requests(start_date, end_date);

-- Create attendance_overtime table
CREATE TABLE IF NOT EXISTS public.attendance_overtime (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    regular_hours DECIMAL(4,2) NOT NULL,
    overtime_hours DECIMAL(4,2) NOT NULL,
    total_hours DECIMAL(4,2) NOT NULL,
    overtime_rate DECIMAL(3,2) DEFAULT 1.5,
    reason TEXT,
    approved_by UUID REFERENCES public.employees(id),
    approved_at TIMESTAMP WITH TIME ZONE,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for overtime
CREATE INDEX IF NOT EXISTS idx_overtime_employee ON public.attendance_overtime(employee_id);
CREATE INDEX IF NOT EXISTS idx_overtime_date ON public.attendance_overtime(date);
CREATE INDEX IF NOT EXISTS idx_overtime_status ON public.attendance_overtime(status);

-- Enable Row Level Security
ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_leave_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_leave_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_overtime ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for attendance_records
CREATE POLICY "Users can view their own attendance records" ON public.attendance_records
    FOR SELECT USING (auth.uid()::text = employee_id::text);

CREATE POLICY "HR users can view all attendance records" ON public.attendance_records
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.user_roles ur
            JOIN public.role_permissions rp ON ur.role_id = rp.role_id
            WHERE ur.user_id = auth.uid()
            AND rp.permission_name = 'employees.read'
        )
    );

CREATE POLICY "HR users can insert attendance records" ON public.attendance_records
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.user_roles ur
            JOIN public.role_permissions rp ON ur.role_id = rp.role_id
            WHERE ur.user_id = auth.uid()
            AND rp.permission_name = 'employees.write'
        )
    );

CREATE POLICY "HR users can update attendance records" ON public.attendance_records
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.user_roles ur
            JOIN public.role_permissions rp ON ur.role_id = rp.role_id
            WHERE ur.user_id = auth.uid()
            AND rp.permission_name = 'employees.write'
        )
    );

-- Create RLS policies for other tables (similar pattern)
CREATE POLICY "HR users can manage attendance settings" ON public.attendance_settings
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.user_roles ur
            JOIN public.role_permissions rp ON ur.role_id = rp.role_id
            WHERE ur.user_id = auth.uid()
            AND rp.permission_name = 'employees.write'
        )
    );

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_attendance_records_updated_at BEFORE UPDATE ON public.attendance_records
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_attendance_settings_updated_at BEFORE UPDATE ON public.attendance_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_attendance_policies_updated_at BEFORE UPDATE ON public.attendance_policies
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_leave_types_updated_at BEFORE UPDATE ON public.attendance_leave_types
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_leave_requests_updated_at BEFORE UPDATE ON public.attendance_leave_requests
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_overtime_updated_at BEFORE UPDATE ON public.attendance_overtime
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
