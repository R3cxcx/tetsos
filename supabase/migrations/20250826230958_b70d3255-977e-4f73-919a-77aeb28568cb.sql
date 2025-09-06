-- Assign basic permissions to existing users to fix employee editing
-- This is a temporary fix to get the system working

-- First, let's add admin role to the first user if they don't have any roles
DO $$
DECLARE
    first_user_id UUID;
    admin_count INTEGER;
BEGIN
    -- Get the first user ID from profiles
    SELECT user_id INTO first_user_id 
    FROM public.profiles 
    ORDER BY created_at 
    LIMIT 1;
    
    -- Check if there are any admins
    SELECT COUNT(*) INTO admin_count 
    FROM public.user_roles 
    WHERE role = 'admin';
    
    -- If we have a user and no admins, make the first user an admin
    IF first_user_id IS NOT NULL AND admin_count = 0 THEN
        INSERT INTO public.user_roles (user_id, role) 
        VALUES (first_user_id, 'admin')
        ON CONFLICT (user_id, role) DO NOTHING;
        
        -- Also add hr_manager role for employee management
        INSERT INTO public.user_roles (user_id, role) 
        VALUES (first_user_id, 'hr_manager')
        ON CONFLICT (user_id, role) DO NOTHING;
    END IF;
END $$;