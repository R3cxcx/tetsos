-- Add approval status to profiles table
ALTER TABLE public.profiles 
ADD COLUMN approval_status text DEFAULT 'pending' CHECK (approval_status IN ('pending', 'approved', 'rejected'));

-- Add approval related fields
ALTER TABLE public.profiles 
ADD COLUMN approved_by uuid REFERENCES auth.users(id),
ADD COLUMN approved_at timestamp with time zone;

-- Create index for faster queries
CREATE INDEX idx_profiles_approval_status ON public.profiles(approval_status);

-- Update existing users to approved status (for existing system continuity)
UPDATE public.profiles SET approval_status = 'approved' WHERE approval_status = 'pending';