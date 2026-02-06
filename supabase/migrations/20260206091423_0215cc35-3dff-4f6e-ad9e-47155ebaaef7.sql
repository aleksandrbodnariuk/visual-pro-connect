-- Додати роль 'specialist' до enum app_role
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'specialist';

-- Створити функцію get_specialists() для отримання тільки фахівців
CREATE OR REPLACE FUNCTION public.get_specialists()
RETURNS TABLE(
  id uuid, 
  full_name text, 
  avatar_url text, 
  title text, 
  bio text, 
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
    u.categories, u.city, u.country, u.created_at
  FROM public.users u
  WHERE EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = u.id AND role = 'specialist'
  )
  ORDER BY u.created_at DESC;
END;
$$;

-- Дати дозвіл на виклик функції
GRANT EXECUTE ON FUNCTION public.get_specialists() TO authenticated, anon;