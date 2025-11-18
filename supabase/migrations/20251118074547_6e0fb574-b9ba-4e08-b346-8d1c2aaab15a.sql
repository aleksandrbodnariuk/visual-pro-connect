-- Drop and recreate get_users_for_admin to fix varchar/text type mismatch
DROP FUNCTION IF EXISTS public.get_users_for_admin();

create function public.get_users_for_admin()
returns table (
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
language plpgsql
stable
security definer
set search_path = public
as $$
DECLARE
  current_user_id uuid;
  is_admin_check boolean;
BEGIN
  current_user_id := auth.uid();
  
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required: auth.uid() is NULL';
  END IF;
  
  is_admin_check := public.is_user_admin(current_user_id);
  
  IF NOT is_admin_check THEN
    RAISE EXCEPTION 'Access denied: User % is not an administrator', current_user_id;
  END IF;
  
  RETURN QUERY
  SELECT
    u.id,
    au.email::text,
    u.full_name::text,
    u.phone_number::text,
    u.avatar_url::text,
    u.banner_url::text,
    u.title::text,
    u.bio::text,
    u.country::text,
    u.city::text,
    u.website::text,
    u.instagram::text,
    u.facebook::text,
    u.viber::text,
    u.categories::text[],
    u.created_at,
    EXISTS(SELECT 1 FROM public.user_roles WHERE user_id = u.id AND role IN ('admin', 'founder')) as is_admin,
    EXISTS(SELECT 1 FROM public.user_roles WHERE user_id = u.id AND role = 'founder') as founder_admin,
    EXISTS(SELECT 1 FROM public.user_roles WHERE user_id = u.id AND role = 'shareholder') as is_shareholder,
    true as has_password
  FROM public.users u
  LEFT JOIN auth.users au ON u.id = au.id
  ORDER BY u.created_at DESC;
END;
$$;

grant execute on function public.get_users_for_admin() to authenticated;