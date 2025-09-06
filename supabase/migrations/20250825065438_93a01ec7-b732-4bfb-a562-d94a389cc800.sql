-- Create raw_attendance_data table
CREATE TABLE IF NOT EXISTS public.raw_attendance_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  employee_id TEXT NOT NULL,
  name TEXT NOT NULL,
  clocking_time TIMESTAMPTZ NOT NULL,
  terminal_description TEXT,
  processed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.raw_attendance_data ENABLE ROW LEVEL SECURITY;

-- RLS Policies for raw_attendance_data
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'raw_attendance_data' AND policyname = 'Users can view raw attendance data'
  ) THEN
    CREATE POLICY "Users can view raw attendance data"
    ON public.raw_attendance_data
    FOR SELECT
    USING (public.has_permission(auth.uid(), 'employees.read'::public.app_permission) OR public.has_role(auth.uid(), 'employee'::public.app_role));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'raw_attendance_data' AND policyname = 'Users can insert raw attendance data'
  ) THEN
    CREATE POLICY "Users can insert raw attendance data"
    ON public.raw_attendance_data
    FOR INSERT
    WITH CHECK (public.has_permission(auth.uid(), 'employees.create'::public.app_permission));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'raw_attendance_data' AND policyname = 'Users can update raw attendance data'
  ) THEN
    CREATE POLICY "Users can update raw attendance data"
    ON public.raw_attendance_data
    FOR UPDATE
    USING (public.has_permission(auth.uid(), 'employees.update'::public.app_permission))
    WITH CHECK (public.has_permission(auth.uid(), 'employees.update'::public.app_permission));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'raw_attendance_data' AND policyname = 'Users can delete raw attendance data'
  ) THEN
    CREATE POLICY "Users can delete raw attendance data"
    ON public.raw_attendance_data
    FOR DELETE
    USING (public.has_permission(auth.uid(), 'employees.delete'::public.app_permission));
  END IF;
END $$;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_raw_attendance_user_id ON public.raw_attendance_data(user_id);
CREATE INDEX IF NOT EXISTS idx_raw_attendance_employee_id ON public.raw_attendance_data(employee_id);
CREATE INDEX IF NOT EXISTS idx_raw_attendance_clocking_time ON public.raw_attendance_data(clocking_time);
CREATE INDEX IF NOT EXISTS idx_raw_attendance_processed ON public.raw_attendance_data(processed);

-- Trigger to auto-update updated_at
CREATE OR REPLACE TRIGGER trg_raw_attendance_updated_at
BEFORE UPDATE ON public.raw_attendance_data
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create user_id_mapping table
CREATE TABLE IF NOT EXISTS public.user_id_mapping (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  employee_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT user_id_mapping_user_id_unique UNIQUE (user_id),
  CONSTRAINT user_id_mapping_employee_fk FOREIGN KEY (employee_id)
    REFERENCES public.employees(employee_id)
    ON UPDATE CASCADE
);

-- Enable RLS
ALTER TABLE public.user_id_mapping ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_id_mapping
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'user_id_mapping' AND policyname = 'Users can view user_id_mapping'
  ) THEN
    CREATE POLICY "Users can view user_id_mapping"
    ON public.user_id_mapping
    FOR SELECT
    USING (public.has_permission(auth.uid(), 'employees.read'::public.app_permission) OR public.has_role(auth.uid(), 'employee'::public.app_role));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'user_id_mapping' AND policyname = 'Users can insert user_id_mapping'
  ) THEN
    CREATE POLICY "Users can insert user_id_mapping"
    ON public.user_id_mapping
    FOR INSERT
    WITH CHECK (public.has_permission(auth.uid(), 'employees.create'::public.app_permission));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'user_id_mapping' AND policyname = 'Users can update user_id_mapping'
  ) THEN
    CREATE POLICY "Users can update user_id_mapping"
    ON public.user_id_mapping
    FOR UPDATE
    USING (public.has_permission(auth.uid(), 'employees.update'::public.app_permission))
    WITH CHECK (public.has_permission(auth.uid(), 'employees.update'::public.app_permission));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'user_id_mapping' AND policyname = 'Users can delete user_id_mapping'
  ) THEN
    CREATE POLICY "Users can delete user_id_mapping"
    ON public.user_id_mapping
    FOR DELETE
    USING (public.has_permission(auth.uid(), 'employees.delete'::public.app_permission));
  END IF;
END $$;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_id_mapping_employee_id ON public.user_id_mapping(employee_id);
CREATE INDEX IF NOT EXISTS idx_user_id_mapping_user_id ON public.user_id_mapping(user_id);

-- Trigger to auto-update updated_at
CREATE OR REPLACE TRIGGER trg_user_id_mapping_updated_at
BEFORE UPDATE ON public.user_id_mapping
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();