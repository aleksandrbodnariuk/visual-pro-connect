-- Fix critical security issue: Remove password exposure and strengthen RLS policies

-- 1. Drop existing SELECT policy that may expose sensitive data
DROP POLICY IF EXISTS "Users can view own profile or admins" ON public.users;

-- 2. Create a secure view that excludes sensitive data for public access
CREATE OR REPLACE FUNCTION public.get_safe_user_profile(user_uuid uuid)
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
SET search_path = 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    u.id, u.full_name, u.avatar_url, u.banner_url, u.title, u.bio,
    u.country, u.city, u.website, u.instagram, u.facebook, u.viber,
    u.categories, u.created_at, u.is_shareholder
  FROM public.users u
  WHERE u.id = user_uuid;
END;
$$;

-- 3. Create a secure function for user's own full profile (including sensitive data)
CREATE OR REPLACE FUNCTION public.get_my_profile()
RETURNS TABLE(
  id uuid,
  full_name text,
  phone_number text,
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
  is_admin boolean,
  founder_admin boolean,
  is_shareholder boolean,
  has_password boolean
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Only return data if user is requesting their own profile
  IF auth.uid() IS NULL THEN
    RETURN;
  END IF;
  
  RETURN QUERY
  SELECT 
    u.id, u.full_name, u.phone_number, u.avatar_url, u.banner_url, u.title, u.bio,
    u.country, u.city, u.website, u.instagram, u.facebook, u.viber,
    u.categories, u.created_at, u.is_admin, u.founder_admin, u.is_shareholder,
    (u.password IS NOT NULL AND u.password <> '') as has_password
  FROM public.users u
  WHERE u.id = auth.uid();
END;
$$;

-- 4. Create admin function for user management (without exposing passwords)
CREATE OR REPLACE FUNCTION public.get_users_for_admin()
RETURNS TABLE(
  id uuid,
  full_name text,
  phone_number text,
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
  is_admin boolean,
  founder_admin boolean,
  is_shareholder boolean,
  has_password boolean
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Only allow access to admins
  IF NOT is_admin(auth.uid()) THEN
    RETURN;
  END IF;
  
  RETURN QUERY
  SELECT 
    u.id, u.full_name, u.phone_number, u.avatar_url, u.banner_url, u.title, u.bio,
    u.country, u.city, u.website, u.instagram, u.facebook, u.viber,
    u.categories, u.created_at, u.is_admin, u.founder_admin, u.is_shareholder,
    (u.password IS NOT NULL AND u.password <> '') as has_password
  FROM public.users u
  ORDER BY u.created_at DESC;
END;
$$;

-- 5. Create a severely restricted SELECT policy that only allows access through security definer functions
CREATE POLICY "Restrict direct access to users table"
ON public.users
FOR SELECT
USING (false);  -- This blocks all direct access, forcing use of security definer functions

-- 6. Ensure passwords are never exposed in any direct queries by creating a password update function
CREATE OR REPLACE FUNCTION public.update_my_password(old_password text, new_password text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  current_password text;
  updated_count int;
BEGIN
  -- Get current password for verification
  SELECT password INTO current_password 
  FROM public.users 
  WHERE id = auth.uid();
  
  -- Verify old password matches
  IF current_password != old_password THEN
    RETURN false;
  END IF;
  
  -- Update password
  UPDATE public.users 
  SET password = new_password 
  WHERE id = auth.uid();
  
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count > 0;
END;
$$;