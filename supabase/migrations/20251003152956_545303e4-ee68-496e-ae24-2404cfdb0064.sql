-- Додаємо роль founder для користувача-засновника
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'founder'::app_role 
FROM public.users 
WHERE phone_number = '0507068007'
ON CONFLICT (user_id, role) DO NOTHING;

-- Оновлюємо функцію get_my_profile для правильного читання ролей
CREATE OR REPLACE FUNCTION public.get_my_profile()
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
  
  -- Перевіряємо ролі з таблиці user_roles
  SELECT 
    EXISTS(SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'founder')) as admin_check,
    EXISTS(SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'founder') as founder_check,
    EXISTS(SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'shareholder') as shareholder_check
  INTO has_admin_role, has_founder_role, has_shareholder_role;
  
  RETURN QUERY
  SELECT 
    u.id, u.full_name, u.phone_number, u.avatar_url, u.banner_url, u.title, u.bio,
    u.country, u.city, u.website, u.instagram, u.facebook, u.viber,
    u.categories, u.created_at, 
    has_admin_role,
    has_founder_role,
    has_shareholder_role,
    true as has_password
  FROM public.users u
  WHERE u.id = auth.uid();
END;
$$;

-- Оновлюємо функцію ensure_user_profile для правильного читання ролей
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
    
    -- Додаємо роль користувача за замовчуванням
    INSERT INTO public.user_roles (user_id, role)
    VALUES (auth.uid(), 'user'::app_role)
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  
  -- Перевіряємо ролі з таблиці user_roles
  SELECT 
    EXISTS(SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'founder')) as admin_check,
    EXISTS(SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'founder') as founder_check,
    EXISTS(SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'shareholder') as shareholder_check
  INTO has_admin_role, has_founder_role, has_shareholder_role;
  
  RETURN QUERY
  SELECT 
    u.id, u.full_name, u.phone_number, u.avatar_url, u.banner_url, u.title, u.bio,
    u.country, u.city, u.website, u.instagram, u.facebook, u.viber,
    u.categories, u.created_at,
    has_admin_role,
    has_founder_role,
    has_shareholder_role,
    true as has_password
  FROM public.users u
  WHERE u.id = auth.uid();
END;
$$;