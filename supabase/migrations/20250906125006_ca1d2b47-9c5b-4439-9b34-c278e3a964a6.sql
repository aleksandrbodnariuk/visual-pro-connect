-- Створюємо безпечні функції для публічного доступу до профілів
-- Ці функції не повертають чутливі дані як номери телефонів

-- Безпечна версія get_public_profiles без чутливих даних
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
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    u.id, u.full_name, u.avatar_url, u.banner_url, u.title, u.bio,
    u.country, u.city, u.website, u.instagram, u.facebook, u.viber,
    u.categories, u.created_at, u.is_shareholder
  FROM public.users u
  -- НЕ повертаємо phone_number, is_admin, founder_admin та інші чутливі дані
  ORDER BY u.created_at DESC;
END;
$function$;

-- Безпечна версія get_public_profiles_by_ids без чутливих даних
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
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    u.id, u.full_name, u.avatar_url, u.banner_url, u.title, u.bio,
    u.country, u.city, u.website, u.instagram, u.facebook, u.viber,
    u.categories, u.created_at, u.is_shareholder
  FROM public.users u
  WHERE u.id = ANY(_ids)
  -- НЕ повертаємо phone_number, is_admin, founder_admin та інші чутливі дані
  ORDER BY u.created_at DESC;
END;
$function$;

-- Видаляємо небезпечні функції що експонують чутливі дані
DROP FUNCTION IF EXISTS public.get_public_profiles();
DROP FUNCTION IF EXISTS public.get_public_profiles_by_ids(uuid[]);