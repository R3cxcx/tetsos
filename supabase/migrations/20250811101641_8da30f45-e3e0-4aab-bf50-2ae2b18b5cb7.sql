-- Remove automatic role assignment from new user trigger
-- First, drop the existing trigger and function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Create a new trigger function that only creates profiles without roles
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
BEGIN
  -- Insert profile only (no automatic role assignment)
  INSERT INTO public.profiles (user_id, first_name, last_name, email)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data ->> 'first_name',
    NEW.raw_user_meta_data ->> 'last_name',
    NEW.email
  );
  
  -- No role assignment here anymore
  RETURN NEW;
END;
$$;

-- Recreate the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Assign super_admin role to ossama.awny (current Google user)
INSERT INTO public.user_roles (user_id, role, assigned_by)
VALUES ('8e804143-6d3a-43f8-9d8d-4828a1def941', 'super_admin', '20f0e6e6-c1bd-431d-a618-31cffb9b569b')
ON CONFLICT (user_id, role) DO NOTHING;

-- Remove the employee role from ossama.awny since they should be super_admin
DELETE FROM public.user_roles 
WHERE user_id = '8e804143-6d3a-43f8-9d8d-4828a1def941' 
AND role = 'employee';