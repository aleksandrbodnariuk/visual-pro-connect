-- Частина 1: Оновити функцію get_users_for_admin() щоб фільтрувати email з phone_number
CREATE OR REPLACE FUNCTION public.get_users_for_admin()
 RETURNS TABLE(id uuid, email text, full_name text, phone_number text, avatar_url text, banner_url text, title text, bio text, country text, city text, website text, instagram text, facebook text, viber text, categories text[], created_at timestamp without time zone, is_admin boolean, founder_admin boolean, is_shareholder boolean, has_password boolean)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
    -- Фільтруємо email з phone_number - повертаємо тільки реальні телефони
    CASE 
      WHEN u.phone_number IS NOT NULL 
           AND u.phone_number NOT LIKE '%@%' 
      THEN u.phone_number::text 
      ELSE NULL 
    END as phone_number,
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
$function$;

-- Частина 2: Оновити тригер handle_new_user() щоб записувати тільки реальний телефон
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  is_founder boolean;
  user_meta jsonb;
  full_name_val text;
BEGIN
  -- Safely cast metadata to jsonb
  user_meta := COALESCE(NEW.raw_user_meta_data::jsonb, '{}'::jsonb);
  
  -- Identify founder by email or phone
  is_founder := (NEW.email = 'aleksandrbodnariuk@gmail.com' OR NEW.phone = '0507068007');
  
  -- Extract full name with fallback
  full_name_val := COALESCE(
    user_meta->>'full_name',
    NULLIF(TRIM(COALESCE(user_meta->>'first_name', '') || ' ' || COALESCE(user_meta->>'last_name', '')), ''),
    'New User'
  );

  -- Insert minimal user profile into public.users
  -- phone_number тепер зберігає ТІЛЬКИ реальний телефон, не email
  INSERT INTO public.users (
    id,
    phone_number,
    full_name,
    created_at
  ) VALUES (
    NEW.id,
    NEW.phone,  -- Тільки телефон, NULL якщо немає (не fallback на email)
    full_name_val,
    NOW()
  )
  ON CONFLICT (id) DO NOTHING;

  -- Assign default role in user_roles
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user'::app_role)
  ON CONFLICT (user_id, role) DO NOTHING;

  -- Special roles for founder
  IF is_founder THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES 
      (NEW.id, 'founder'::app_role),
      (NEW.id, 'admin'::app_role)
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$function$;