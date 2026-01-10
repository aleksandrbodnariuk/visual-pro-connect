-- Видаляємо стару функцію та створюємо нову з категоріями та локацією
DROP FUNCTION IF EXISTS public.get_safe_public_profiles();

CREATE OR REPLACE FUNCTION public.get_safe_public_profiles()
RETURNS TABLE(
  id uuid, 
  full_name text, 
  avatar_url text, 
  title text, 
  bio text,
  is_shareholder boolean,
  categories text[],
  city text,
  country text,
  created_at timestamp without time zone
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    u.id, u.full_name, u.avatar_url, u.title, u.bio, 
    u.is_shareholder, u.categories, u.city, u.country, u.created_at
  FROM public.users u
  ORDER BY u.created_at DESC;
END;
$$;