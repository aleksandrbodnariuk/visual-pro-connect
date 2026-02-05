-- Add theme column to users table for personalized theme preferences
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS theme text DEFAULT 'light';

-- Add comment for clarity
COMMENT ON COLUMN public.users.theme IS 'User preferred theme: light or dark';