-- Create user profiles table
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name TEXT,
  last_name TEXT,
  email TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create app roles enum
CREATE TYPE public.app_role AS ENUM ('super_admin', 'admin', 'hr_manager', 'hr_staff', 'employee');

-- Create permissions enum  
CREATE TYPE public.app_permission AS ENUM (
  'employees.create', 'employees.read', 'employees.update', 'employees.delete',
  'roles.create', 'roles.read', 'roles.update', 'roles.delete',
  'users.create', 'users.read', 'users.update', 'users.delete',
  'settings.read', 'settings.update'
);

-- Create user roles table
CREATE TABLE public.user_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  assigned_by UUID REFERENCES auth.users(id),
  assigned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);

-- Create role permissions table
CREATE TABLE public.role_permissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  role app_role NOT NULL,
  permission app_permission NOT NULL,
  UNIQUE(role, permission)
);

-- Insert default role permissions
INSERT INTO public.role_permissions (role, permission) VALUES
-- Super Admin has all permissions
('super_admin', 'employees.create'),
('super_admin', 'employees.read'),
('super_admin', 'employees.update'),
('super_admin', 'employees.delete'),
('super_admin', 'roles.create'),
('super_admin', 'roles.read'),
('super_admin', 'roles.update'),
('super_admin', 'roles.delete'),
('super_admin', 'users.create'),
('super_admin', 'users.read'),
('super_admin', 'users.update'),
('super_admin', 'users.delete'),
('super_admin', 'settings.read'),
('super_admin', 'settings.update'),

-- Admin permissions
('admin', 'employees.create'),
('admin', 'employees.read'),
('admin', 'employees.update'),
('admin', 'employees.delete'),
('admin', 'users.read'),
('admin', 'users.update'),
('admin', 'settings.read'),

-- HR Manager permissions
('hr_manager', 'employees.create'),
('hr_manager', 'employees.read'),
('hr_manager', 'employees.update'),
('hr_manager', 'employees.delete'),
('hr_manager', 'users.read'),

-- HR Staff permissions
('hr_staff', 'employees.create'),
('hr_staff', 'employees.read'),
('hr_staff', 'employees.update'),

-- Employee permissions
('employee', 'employees.read');

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

-- Create security definer functions to avoid RLS recursion
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE OR REPLACE FUNCTION public.has_permission(_user_id UUID, _permission app_permission)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    JOIN public.role_permissions rp ON ur.role = rp.role
    WHERE ur.user_id = _user_id AND rp.permission = _permission
  )
$$;

CREATE OR REPLACE FUNCTION public.get_user_roles(_user_id UUID)
RETURNS app_role[]
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
  SELECT ARRAY_AGG(role)
  FROM public.user_roles
  WHERE user_id = _user_id
$$;

-- Create profiles RLS policies
CREATE POLICY "Users can view own profile"
ON public.profiles
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update own profile"
ON public.profiles
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all profiles"
ON public.profiles
FOR SELECT
USING (
  public.has_role(auth.uid(), 'super_admin') OR 
  public.has_role(auth.uid(), 'admin') OR
  public.has_permission(auth.uid(), 'users.read')
);

CREATE POLICY "Admins can insert profiles"
ON public.profiles
FOR INSERT
WITH CHECK (
  public.has_role(auth.uid(), 'super_admin') OR 
  public.has_permission(auth.uid(), 'users.create')
);

CREATE POLICY "Admins can update profiles"
ON public.profiles
FOR UPDATE
USING (
  public.has_role(auth.uid(), 'super_admin') OR 
  public.has_permission(auth.uid(), 'users.update')
);

-- Create user_roles RLS policies
CREATE POLICY "Users can view own roles"
ON public.user_roles
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all roles"
ON public.user_roles
FOR SELECT
USING (
  public.has_role(auth.uid(), 'super_admin') OR 
  public.has_permission(auth.uid(), 'roles.read')
);

CREATE POLICY "Super admins can manage roles"
ON public.user_roles
FOR ALL
USING (public.has_role(auth.uid(), 'super_admin'));

-- Create role_permissions RLS policies
CREATE POLICY "Everyone can view role permissions"
ON public.role_permissions
FOR SELECT
USING (true);

CREATE POLICY "Super admins can manage role permissions"
ON public.role_permissions
FOR ALL
USING (public.has_role(auth.uid(), 'super_admin'));

-- Create function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE PLPGSQL
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Insert profile
  INSERT INTO public.profiles (user_id, first_name, last_name, email)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data ->> 'first_name',
    NEW.raw_user_meta_data ->> 'last_name',
    NEW.email
  );
  
  -- Assign default employee role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'employee');
  
  RETURN NEW;
END;
$$;

-- Create trigger for new user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for timestamp updates
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();