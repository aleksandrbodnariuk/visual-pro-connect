-- Fix the handle_new_user() function to properly cast raw_user_meta_data to jsonb
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path TO 'public'
AS $$
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
  INSERT INTO public.users (
    id,
    phone_number,
    full_name,
    created_at
  ) VALUES (
    NEW.id,
    COALESCE(NEW.phone, NEW.email),
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
$$;