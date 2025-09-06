-- Ensure unique index for upsert in process_raw_attendance
CREATE UNIQUE INDEX IF NOT EXISTS ux_attendance_records_employee_date
ON public.attendance_records (employee_id, date);