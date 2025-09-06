-- Add new app permissions to support Attendance, Recruitment, and Finance modules
-- Safe to run multiple times using IF NOT EXISTS

-- Attendance permissions
ALTER TYPE public.app_permission ADD VALUE IF NOT EXISTS 'attendance.read';
ALTER TYPE public.app_permission ADD VALUE IF NOT EXISTS 'attendance.create';
ALTER TYPE public.app_permission ADD VALUE IF NOT EXISTS 'attendance.update';
ALTER TYPE public.app_permission ADD VALUE IF NOT EXISTS 'attendance.delete';

-- Recruitment permissions
ALTER TYPE public.app_permission ADD VALUE IF NOT EXISTS 'recruitment.read';
ALTER TYPE public.app_permission ADD VALUE IF NOT EXISTS 'recruitment.create';
ALTER TYPE public.app_permission ADD VALUE IF NOT EXISTS 'recruitment.update';
ALTER TYPE public.app_permission ADD VALUE IF NOT EXISTS 'recruitment.delete';

-- Finance: Cost Centers
ALTER TYPE public.app_permission ADD VALUE IF NOT EXISTS 'cost_centers.read';
ALTER TYPE public.app_permission ADD VALUE IF NOT EXISTS 'cost_centers.create';
ALTER TYPE public.app_permission ADD VALUE IF NOT EXISTS 'cost_centers.update';
ALTER TYPE public.app_permission ADD VALUE IF NOT EXISTS 'cost_centers.delete';

-- Finance: Budget Management
ALTER TYPE public.app_permission ADD VALUE IF NOT EXISTS 'budget.read';
ALTER TYPE public.app_permission ADD VALUE IF NOT EXISTS 'budget.create';
ALTER TYPE public.app_permission ADD VALUE IF NOT EXISTS 'budget.update';
ALTER TYPE public.app_permission ADD VALUE IF NOT EXISTS 'budget.delete';