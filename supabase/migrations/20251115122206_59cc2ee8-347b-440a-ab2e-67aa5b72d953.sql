-- Drop old function and create new one with email field
DROP FUNCTION IF EXISTS public.get_users_for_admin();

CREATE FUNCTION public.get_users_for_admin()
RETURNS TABLE(
  id uuid, 
  email text,
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
SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.is_user_admin(auth.uid()) THEN
    RETURN;
  END IF;
  
  RETURN QUERY
  SELECT 
    u.id,
    au.email,
    u.full_name, 
    u.phone_number, 
    u.avatar_url, 
    u.banner_url, 
    u.title, 
    u.bio,
    u.country, 
    u.city, 
    u.website, 
    u.instagram, 
    u.facebook, 
    u.viber,
    u.categories, 
    u.created_at,
    EXISTS(SELECT 1 FROM public.user_roles WHERE user_id = u.id AND role IN ('admin', 'founder')) as is_admin,
    EXISTS(SELECT 1 FROM public.user_roles WHERE user_id = u.id AND role = 'founder') as founder_admin,
    EXISTS(SELECT 1 FROM public.user_roles WHERE user_id = u.id AND role = 'shareholder') as is_shareholder,
    true as has_password
  FROM public.users u
  LEFT JOIN auth.users au ON u.id = au.id
  ORDER BY u.created_at DESC;
END;
$function$;