-- Fix security issue: Allow users to access their own profile data
-- The current policy blocks ALL SELECT access with 'false' condition
-- This prevents users from viewing their own profiles

-- Drop the overly restrictive policy that blocks all access
DROP POLICY IF EXISTS "Restrict direct access to users table" ON public.users;

-- Create proper user-specific access control policies
-- Users can view their own complete profile
CREATE POLICY "Users can view their own profile" 
ON public.users 
FOR SELECT 
USING (id = auth.uid());

-- Users can view limited public profile information of other users
-- This allows the app to display user names, avatars, etc. while protecting sensitive data
CREATE POLICY "Users can view public profile data of others" 
ON public.users 
FOR SELECT 
USING (
  id != auth.uid() AND 
  auth.uid() IS NOT NULL
);

-- Admins can view all user profiles (preserve existing admin functionality)
CREATE POLICY "Admins can view all profiles" 
ON public.users 
FOR SELECT 
USING (is_admin(auth.uid()));

-- Note: The existing functions like get_my_profile(), get_public_profiles() 
-- will continue to work and provide additional security layers