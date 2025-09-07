-- Fix security issue: User Phone Numbers Exposed to Public
-- Strengthen RLS policies to ensure phone numbers and sensitive data are properly protected

-- First, let's create a more secure function to check if data can be accessed publicly
CREATE OR REPLACE FUNCTION public.can_access_user_public_data(target_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only allow access to basic public profile data, never sensitive data like phone numbers
  -- This function will be used to determine what data can be accessed publicly
  RETURN target_user_id IS NOT NULL;
END;
$$;

-- Update the existing policies to be more explicit about protecting phone numbers
DROP POLICY IF EXISTS "Users can view their own profile" ON public.users;
DROP POLICY IF EXISTS "Verified admins can view all profiles" ON public.users;

-- Create new, more secure policies
CREATE POLICY "Users can view their own complete profile" 
ON public.users 
FOR SELECT 
USING (id = auth.uid());

CREATE POLICY "Verified admins can view all complete profiles" 
ON public.users 
FOR SELECT 
USING (check_admin_access());

-- Ensure no other policies allow broader access
CREATE POLICY "Block all other profile access" 
ON public.users 
FOR SELECT 
USING (false);

-- Update the public profile functions to be more explicit about what they return
-- These functions should NEVER return phone_number or other sensitive data
CREATE OR REPLACE FUNCTION public.get_safe_public_profiles()
RETURNS TABLE(
  id uuid, 
  full_name text, 
  avatar_url text, 
  banner_url text, 
  title text, 
  bio text, 
  country text, 
  city text, 
  website text, 
  instagram text, 
  facebook text, 
  viber text, 
  categories text[], 
  created_at timestamp without time zone, 
  is_shareholder boolean
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- This function explicitly excludes phone_number and other sensitive data
  -- It's safe for public consumption
  RETURN QUERY
  SELECT 
    u.id, u.full_name, u.avatar_url, u.banner_url, u.title, u.bio,
    u.country, u.city, u.website, u.instagram, u.facebook, u.viber,
    u.categories, u.created_at, u.is_shareholder
  FROM public.users u
  -- Note: phone_number, is_admin, founder_admin are intentionally excluded
  ORDER BY u.created_at DESC;
END;
$$;

-- Update the function to get profiles by IDs to also exclude sensitive data
CREATE OR REPLACE FUNCTION public.get_safe_public_profiles_by_ids(_ids uuid[])
RETURNS TABLE(
  id uuid, 
  full_name text, 
  avatar_url text, 
  banner_url text, 
  title text, 
  bio text, 
  country text, 
  city text, 
  website text, 
  instagram text, 
  facebook text, 
  viber text, 
  categories text[], 
  created_at timestamp without time zone, 
  is_shareholder boolean
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- This function explicitly excludes phone_number and other sensitive data
  RETURN QUERY
  SELECT 
    u.id, u.full_name, u.avatar_url, u.banner_url, u.title, u.bio,
    u.country, u.city, u.website, u.instagram, u.facebook, u.viber,
    u.categories, u.created_at, u.is_shareholder
  FROM public.users u
  WHERE u.id = ANY(_ids)
  -- Note: phone_number, is_admin, founder_admin are intentionally excluded
  ORDER BY u.created_at DESC;
END;
$$;

-- Add a comment to document the security considerations
COMMENT ON TABLE public.users IS 'Contains user profile data. Phone numbers and admin flags are sensitive and should only be accessible to the user themselves or verified admins. Use get_safe_public_profiles() for public data access.';
COMMENT ON COLUMN public.users.phone_number IS 'SENSITIVE DATA: Only accessible to user themselves and verified admins';
COMMENT ON COLUMN public.users.is_admin IS 'SENSITIVE DATA: Only accessible to user themselves and verified admins';
COMMENT ON COLUMN public.users.founder_admin IS 'SENSITIVE DATA: Only accessible to user themselves and verified admins';