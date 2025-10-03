-- Drop existing functions
DROP FUNCTION IF EXISTS public.get_my_profile();
DROP FUNCTION IF EXISTS public.get_users_for_admin();
DROP FUNCTION IF EXISTS public.ensure_user_profile();

-- Recreate get_my_profile with roles from user_roles table
CREATE FUNCTION public.get_my_profile()
RETURNS TABLE(
  id UUID, 
  full_name TEXT, 
  phone_number TEXT, 
  avatar_url TEXT, 
  banner_url TEXT, 
  title TEXT, 
  bio TEXT, 
  country TEXT, 
  city TEXT, 
  website TEXT, 
  instagram TEXT, 
  facebook TEXT, 
  viber TEXT, 
  categories TEXT[], 
  created_at TIMESTAMP WITHOUT TIME ZONE, 
  is_admin BOOLEAN, 
  founder_admin BOOLEAN, 
  is_shareholder BOOLEAN, 
  has_password BOOLEAN
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  has_admin_role BOOLEAN;
  has_founder_role BOOLEAN;
  has_shareholder_role BOOLEAN;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN;
  END IF;
  
  -- Check roles from user_roles table
  SELECT 
    EXISTS(SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'founder')),
    EXISTS(SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'founder'),
    EXISTS(SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'shareholder')
  INTO has_admin_role, has_founder_role, has_shareholder_role;
  
  RETURN QUERY
  SELECT 
    u.id, u.full_name, u.phone_number, u.avatar_url, u.banner_url, u.title, u.bio,
    u.country, u.city, u.website, u.instagram, u.facebook, u.viber,
    u.categories, u.created_at, 
    has_admin_role as is_admin,
    has_founder_role as founder_admin,
    has_shareholder_role as is_shareholder,
    true as has_password
  FROM public.users u
  WHERE u.id = auth.uid();
END;
$$;

-- Recreate get_users_for_admin with roles from user_roles table
CREATE FUNCTION public.get_users_for_admin()
RETURNS TABLE(
  id UUID, 
  full_name TEXT, 
  phone_number TEXT, 
  avatar_url TEXT, 
  banner_url TEXT, 
  title TEXT, 
  bio TEXT, 
  country TEXT, 
  city TEXT, 
  website TEXT, 
  instagram TEXT, 
  facebook TEXT, 
  viber TEXT, 
  categories TEXT[], 
  created_at TIMESTAMP WITHOUT TIME ZONE, 
  is_admin BOOLEAN, 
  founder_admin BOOLEAN, 
  is_shareholder BOOLEAN, 
  has_password BOOLEAN
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_user_admin(auth.uid()) THEN
    RETURN;
  END IF;
  
  RETURN QUERY
  SELECT 
    u.id, u.full_name, u.phone_number, u.avatar_url, u.banner_url, u.title, u.bio,
    u.country, u.city, u.website, u.instagram, u.facebook, u.viber,
    u.categories, u.created_at,
    EXISTS(SELECT 1 FROM public.user_roles WHERE user_id = u.id AND role IN ('admin', 'founder')) as is_admin,
    EXISTS(SELECT 1 FROM public.user_roles WHERE user_id = u.id AND role = 'founder') as founder_admin,
    EXISTS(SELECT 1 FROM public.user_roles WHERE user_id = u.id AND role = 'shareholder') as is_shareholder,
    true as has_password
  FROM public.users u
  ORDER BY u.created_at DESC;
END;
$$;

-- Recreate ensure_user_profile with roles from user_roles table
CREATE FUNCTION public.ensure_user_profile()
RETURNS TABLE(
  id UUID, 
  full_name TEXT, 
  phone_number TEXT, 
  avatar_url TEXT, 
  banner_url TEXT, 
  title TEXT, 
  bio TEXT, 
  country TEXT, 
  city TEXT, 
  website TEXT, 
  instagram TEXT, 
  facebook TEXT, 
  viber TEXT, 
  categories TEXT[], 
  created_at TIMESTAMP WITHOUT TIME ZONE, 
  is_admin BOOLEAN, 
  founder_admin BOOLEAN, 
  is_shareholder BOOLEAN, 
  has_password BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_exists BOOLEAN;
  auth_user_email TEXT;
  auth_user_phone TEXT;
  has_admin_role BOOLEAN;
  has_founder_role BOOLEAN;
  has_shareholder_role BOOLEAN;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN;
  END IF;
  
  SELECT EXISTS(SELECT 1 FROM public.users WHERE users.id = auth.uid()) INTO user_exists;
  
  IF NOT user_exists THEN
    SELECT email, phone INTO auth_user_email, auth_user_phone
    FROM auth.users 
    WHERE auth.users.id = auth.uid();
    
    INSERT INTO public.users (
      id, 
      phone_number, 
      full_name,
      created_at
    ) VALUES (
      auth.uid(),
      COALESCE(auth_user_phone, auth_user_email, 'user_' || auth.uid()::text),
      COALESCE((SELECT raw_user_meta_data->>'full_name' FROM auth.users WHERE auth.users.id = auth.uid()), 'New User'),
      NOW()
    );
    
    -- Add default user role
    INSERT INTO public.user_roles (user_id, role)
    VALUES (auth.uid(), 'user'::app_role)
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  
  -- Get user roles
  SELECT 
    EXISTS(SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'founder')),
    EXISTS(SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'founder'),
    EXISTS(SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'shareholder')
  INTO has_admin_role, has_founder_role, has_shareholder_role;
  
  RETURN QUERY
  SELECT 
    u.id, u.full_name, u.phone_number, u.avatar_url, u.banner_url, u.title, u.bio,
    u.country, u.city, u.website, u.instagram, u.facebook, u.viber,
    u.categories, u.created_at,
    has_admin_role as is_admin,
    has_founder_role as founder_admin,
    has_shareholder_role as is_shareholder,
    true as has_password
  FROM public.users u
  WHERE u.id = auth.uid();
END;
$$;