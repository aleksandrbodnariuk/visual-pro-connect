-- Fix security issue: User Phone Numbers Exposed to Public
-- Strengthen RLS policies to ensure phone numbers and sensitive data are properly protected

-- Drop existing policies to recreate them with stronger security
DROP POLICY IF EXISTS "Users can view their own profile" ON public.users;
DROP POLICY IF EXISTS "Verified admins can view all profiles" ON public.users;
DROP POLICY IF EXISTS "Users can view their own complete profile" ON public.users;
DROP POLICY IF EXISTS "Verified admins can view all complete profiles" ON public.users;
DROP POLICY IF EXISTS "Block all other profile access" ON public.users;

-- Create new, more secure and explicit policies
CREATE POLICY "secure_users_own_profile_access" 
ON public.users 
FOR SELECT 
USING (id = auth.uid());

CREATE POLICY "secure_admin_all_profiles_access" 
ON public.users 
FOR SELECT 
USING (check_admin_access());

-- Update the public profile functions to be more explicit about excluding sensitive data
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
  -- Note: phone_number, is_admin, founder_admin are intentionally excluded for security
  ORDER BY u.created_at DESC;
END;
$$;

-- Add comments to document security considerations
COMMENT ON TABLE public.users IS 'User profile data. Phone numbers and admin flags are sensitive - only accessible to user themselves or verified admins. Use get_safe_public_profiles() for public data.';
COMMENT ON COLUMN public.users.phone_number IS 'SENSITIVE: Only accessible to user themselves and verified admins';
COMMENT ON COLUMN public.users.is_admin IS 'SENSITIVE: Only accessible to user themselves and verified admins';
COMMENT ON COLUMN public.users.founder_admin IS 'SENSITIVE: Only accessible to user themselves and verified admins';