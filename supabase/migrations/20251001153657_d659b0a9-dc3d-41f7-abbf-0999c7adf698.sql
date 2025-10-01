-- Create function to ensure user profile exists
CREATE OR REPLACE FUNCTION public.ensure_user_profile()
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
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  user_exists boolean;
  auth_user_email text;
  auth_user_phone text;
BEGIN
  -- Check if authenticated
  IF auth.uid() IS NULL THEN
    RETURN;
  END IF;
  
  -- Check if user profile exists
  SELECT EXISTS(SELECT 1 FROM public.users WHERE users.id = auth.uid()) INTO user_exists;
  
  -- If profile doesn't exist, create it
  IF NOT user_exists THEN
    -- Get email and phone from auth.users
    SELECT email, phone INTO auth_user_email, auth_user_phone
    FROM auth.users 
    WHERE auth.users.id = auth.uid();
    
    -- Create profile with email or phone as phone_number
    INSERT INTO public.users (
      id, 
      phone_number, 
      full_name,
      is_admin,
      founder_admin,
      is_shareholder,
      created_at
    ) VALUES (
      auth.uid(),
      COALESCE(auth_user_phone, auth_user_email, 'user_' || auth.uid()::text),
      COALESCE((SELECT raw_user_meta_data->>'full_name' FROM auth.users WHERE auth.users.id = auth.uid()), 'New User'),
      false,
      false,
      false,
      NOW()
    );
  END IF;
  
  -- Return the profile
  RETURN QUERY
  SELECT 
    u.id, u.full_name, u.phone_number, u.avatar_url, u.banner_url, u.title, u.bio,
    u.country, u.city, u.website, u.instagram, u.facebook, u.viber,
    u.categories, u.created_at, u.is_admin, u.founder_admin, u.is_shareholder,
    true as has_password
  FROM public.users u
  WHERE u.id = auth.uid();
END;
$function$;