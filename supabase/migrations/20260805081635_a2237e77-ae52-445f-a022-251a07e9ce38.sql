DROP FUNCTION IF EXISTS public.get_my_profile();
DROP FUNCTION IF EXISTS public.get_detailed_profile(uuid);

CREATE OR REPLACE FUNCTION public.get_my_profile()
 RETURNS TABLE(id uuid, full_name text, phone_number text, avatar_url text, banner_url text, title text, bio text, country text, city text, website text, instagram text, facebook text, viber text, categories text[], created_at timestamp without time zone, is_admin boolean, founder_admin boolean, is_shareholder boolean, has_password boolean, date_of_birth date)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  has_admin_role BOOLEAN;
  has_founder_role BOOLEAN;
  has_shareholder_role BOOLEAN;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN;
  END IF;

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
    has_admin_role,
    has_founder_role,
    has_shareholder_role,
    true as has_password,
    u.date_of_birth
  FROM public.users u
  WHERE u.id = auth.uid();
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_detailed_profile(target_user_id uuid)
 RETURNS TABLE(id uuid, full_name text, avatar_url text, banner_url text, title text, bio text, is_shareholder boolean, country text, city text, website text, instagram text, facebook text, viber text, categories text[], created_at timestamp without time zone, date_of_birth date)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  is_own_profile boolean;
  are_friends boolean;
BEGIN
  is_own_profile := (auth.uid() = target_user_id);

  SELECT EXISTS(
    SELECT 1 FROM public.friend_requests 
    WHERE ((sender_id = auth.uid() AND receiver_id = target_user_id) 
           OR (sender_id = target_user_id AND receiver_id = auth.uid()))
           AND status = 'accepted'
  ) INTO are_friends;

  RETURN QUERY
  SELECT 
    u.id, u.full_name, u.avatar_url, u.banner_url, u.title, u.bio,
    u.is_shareholder,
    CASE WHEN (is_own_profile OR are_friends) THEN u.country ELSE NULL END,
    CASE WHEN (is_own_profile OR are_friends) THEN u.city ELSE NULL END,
    CASE WHEN (is_own_profile OR are_friends) THEN u.website ELSE NULL END,
    CASE WHEN (is_own_profile OR are_friends) THEN u.instagram ELSE NULL END,
    CASE WHEN (is_own_profile OR are_friends) THEN u.facebook ELSE NULL END,
    CASE WHEN (is_own_profile OR are_friends) THEN u.viber ELSE NULL END,
    CASE WHEN (is_own_profile OR are_friends) THEN u.categories ELSE NULL END,
    u.created_at,
    CASE WHEN (is_own_profile OR are_friends) THEN u.date_of_birth ELSE NULL END
  FROM public.users u
  WHERE u.id = target_user_id;
END;
$function$;