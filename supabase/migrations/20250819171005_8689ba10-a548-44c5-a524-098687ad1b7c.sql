-- Fix security vulnerability: Remove policy that exposes sensitive user data
-- The "Users can view public profile data of others" policy allows access to ALL columns
-- including sensitive data like phone_number, which creates a security risk

-- Drop the overly permissive policy that exposes sensitive information
DROP POLICY IF EXISTS "Users can view public profile data of others" ON public.users;

-- Note: Public profile access should use the existing secure functions:
-- - get_public_profiles() - returns only safe public fields
-- - get_safe_user_profile() - returns filtered profile data
-- These functions already exclude sensitive fields like phone_number, is_admin, etc.

-- The remaining policies are secure:
-- 1. "Users can view their own profile" - users can see their complete profile
-- 2. "Admins can view all profiles" - admin access for management
-- 3. Public profile data access through secure RPC functions only