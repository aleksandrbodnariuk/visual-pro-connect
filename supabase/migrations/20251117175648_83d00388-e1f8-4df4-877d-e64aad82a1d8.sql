-- Оновити функцію get_users_for_admin() з кращою обробкою помилок
CREATE OR REPLACE FUNCTION public.get_users_for_admin()
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
DECLARE
  current_user_id uuid;
  is_admin_check boolean;
BEGIN
  current_user_id := auth.uid();
  
  -- Логування для діагностики
  RAISE NOTICE 'Current user ID: %', current_user_id;
  
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required: auth.uid() is NULL. Please ensure user is authenticated.';
  END IF;
  
  -- Перевіряємо, чи користувач є адміном
  is_admin_check := public.is_user_admin(current_user_id);
  RAISE NOTICE 'Is admin check: %', is_admin_check;
  
  IF NOT is_admin_check THEN
    RAISE EXCEPTION 'Access denied: User % is not an administrator', current_user_id;
  END IF;
  
  RAISE NOTICE 'User is admin, returning data';
  
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