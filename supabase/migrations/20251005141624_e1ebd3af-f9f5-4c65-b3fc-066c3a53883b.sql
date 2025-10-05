-- Recreate handle_new_user function and trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  is_founder boolean;
BEGIN
  is_founder := (NEW.email = 'aleksandrbodnariuk@gmail.com' OR NEW.phone = '0507068007');

  INSERT INTO public.users (
    id,
    phone_number,
    full_name,
    created_at
  ) VALUES (
    NEW.id,
    COALESCE(NEW.phone, NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'first_name' || ' ' || NEW.raw_user_meta_data->>'last_name', 'New User'),
    NOW()
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user'::app_role)
  ON CONFLICT (user_id, role) DO NOTHING;

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

-- Drop and recreate trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE PROCEDURE public.handle_new_user();