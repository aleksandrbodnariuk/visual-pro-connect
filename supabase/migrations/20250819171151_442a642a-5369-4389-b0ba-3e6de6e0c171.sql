-- Fix security issue: Strengthen admin authentication checks
-- The current "Admins can view all profiles" policy uses is_admin() which only checks is_admin flag
-- This is less secure than check_admin_access() which verifies both admin and founder status

-- Drop the current admin policy that uses weak authentication
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.users;

-- Create a stronger admin policy using the more comprehensive check_admin_access() function
-- This function verifies both is_admin=true OR founder_admin=true for better security
CREATE POLICY "Verified admins can view all profiles" 
ON public.users 
FOR SELECT 
USING (check_admin_access());

-- Also update other admin policies to use the stronger authentication
-- Update admin policies for INSERT operations
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.users;
DROP POLICY IF EXISTS "Users can insert their own profile (strict)" ON public.users;

CREATE POLICY "Users can insert their own profile" 
ON public.users 
FOR INSERT 
WITH CHECK (id = auth.uid() OR check_admin_access());

-- Update admin policies for UPDATE operations  
DROP POLICY IF EXISTS "Users can manage their own profile" ON public.users;
DROP POLICY IF EXISTS "Users can manage their own profile (strict)" ON public.users;

CREATE POLICY "Users can manage their own profile" 
ON public.users 
FOR UPDATE 
USING (id = auth.uid() OR check_admin_access());

-- Update admin policies for DELETE operations
DROP POLICY IF EXISTS "Only admins can delete user profiles" ON public.users;

CREATE POLICY "Only verified admins can delete user profiles" 
ON public.users 
FOR DELETE 
USING (check_admin_access());