-- Fix RLS on user_roles to allow INSERTs by super_admin
DO $$
BEGIN
  -- Drop old broad policy if it exists
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'user_roles' AND policyname = 'Super admins can manage roles'
  ) THEN
    EXECUTE 'DROP POLICY "Super admins can manage roles" ON public.user_roles';
  END IF;
END $$;

-- Ensure SELECT/UPDATE/DELETE are allowed for super admins
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'user_roles' AND policyname = 'Super admins can read roles'
  ) THEN
    EXECUTE 'CREATE POLICY "Super admins can read roles" ON public.user_roles FOR SELECT USING (public.has_role(auth.uid(), ''super_admin''))';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'user_roles' AND policyname = 'Super admins can update roles'
  ) THEN
    EXECUTE 'CREATE POLICY "Super admins can update roles" ON public.user_roles FOR UPDATE USING (public.has_role(auth.uid(), ''super_admin''))';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'user_roles' AND policyname = 'Super admins can delete roles'
  ) THEN
    EXECUTE 'CREATE POLICY "Super admins can delete roles" ON public.user_roles FOR DELETE USING (public.has_role(auth.uid(), ''super_admin''))';
  END IF;
END $$;

-- Explicit INSERT policy with WITH CHECK for super admins
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'user_roles' AND policyname = 'Super admins can insert roles'
  ) THEN
    EXECUTE 'CREATE POLICY "Super admins can insert roles" ON public.user_roles FOR INSERT WITH CHECK (public.has_role(auth.uid(), ''super_admin''))';
  END IF;
END $$;


