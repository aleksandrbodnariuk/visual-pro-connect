-- Phase 1: Implement proper authentication security fixes

-- First, let's create a proper authentication trigger to handle user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert into users table when a new auth user is created
  INSERT INTO public.users (
    id,
    phone_number,
    full_name,
    is_admin,
    founder_admin,
    is_shareholder,
    created_at
  ) VALUES (
    NEW.id,
    COALESCE(NEW.phone, NEW.email), -- Use phone if available, otherwise email
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    CASE WHEN NEW.phone = '0507068007' THEN true ELSE false END,
    CASE WHEN NEW.phone = '0507068007' THEN true ELSE false END,
    CASE WHEN NEW.phone = '0507068007' THEN true ELSE false END,
    NOW()
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user creation
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Remove password column from users table (security fix)
ALTER TABLE public.users DROP COLUMN IF EXISTS password;

-- Update the validate_user_credentials function to use Supabase Auth
CREATE OR REPLACE FUNCTION public.validate_user_credentials(_phone_number text, _input_password text)
RETURNS TABLE(id uuid, full_name text, phone_number text, is_admin boolean, founder_admin boolean, is_shareholder boolean, created_at timestamp without time zone, categories text[], avatar_url text, bio text, website text, instagram text, facebook text, viber text, banner_url text, title text, country text, city text, has_password boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  -- This function is deprecated - use Supabase Auth instead
  RETURN;
END;
$function$;

-- Create a function to get user by phone for migration purposes
CREATE OR REPLACE FUNCTION public.get_user_by_phone(_phone_number text)
RETURNS TABLE(id uuid, full_name text, phone_number text, is_admin boolean, founder_admin boolean, is_shareholder boolean, created_at timestamp without time zone, categories text[], avatar_url text, bio text, website text, instagram text, facebook text, viber text, banner_url text, title text, country text, city text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    u.id, u.full_name, u.phone_number, u.is_admin, u.founder_admin, u.is_shareholder,
    u.created_at, u.categories, u.avatar_url, u.bio, u.website, u.instagram, u.facebook, u.viber,
    u.banner_url, u.title, u.country, u.city
  FROM public.users u
  WHERE u.phone_number = _phone_number;
END;
$function$;

-- Update functions to remove password references
CREATE OR REPLACE FUNCTION public.get_my_profile()
RETURNS TABLE(id uuid, full_name text, phone_number text, avatar_url text, banner_url text, title text, bio text, country text, city text, website text, instagram text, facebook text, viber text, categories text[], created_at timestamp without time zone, is_admin boolean, founder_admin boolean, is_shareholder boolean, has_password boolean)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN;
  END IF;
  
  RETURN QUERY
  SELECT 
    u.id, u.full_name, u.phone_number, u.avatar_url, u.banner_url, u.title, u.bio,
    u.country, u.city, u.website, u.instagram, u.facebook, u.viber,
    u.categories, u.created_at, u.is_admin, u.founder_admin, u.is_shareholder,
    true as has_password -- Always true since using Supabase Auth
  FROM public.users u
  WHERE u.id = auth.uid();
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_users_for_admin()
RETURNS TABLE(id uuid, full_name text, phone_number text, avatar_url text, banner_url text, title text, bio text, country text, city text, website text, instagram text, facebook text, viber text, categories text[], created_at timestamp without time zone, is_admin boolean, founder_admin boolean, is_shareholder boolean, has_password boolean)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  IF NOT is_admin(auth.uid()) THEN
    RETURN;
  END IF;
  
  RETURN QUERY
  SELECT 
    u.id, u.full_name, u.phone_number, u.avatar_url, u.banner_url, u.title, u.bio,
    u.country, u.city, u.website, u.instagram, u.facebook, u.viber,
    u.categories, u.created_at, u.is_admin, u.founder_admin, u.is_shareholder,
    true as has_password -- Always true since using Supabase Auth
  FROM public.users u
  ORDER BY u.created_at DESC;
END;
$function$;