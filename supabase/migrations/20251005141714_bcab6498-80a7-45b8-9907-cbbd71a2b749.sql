-- Ensure handle_new_user is defined correctly and attach trigger on auth.users
-- 1) Recreate the function (idempotent)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  is_founder boolean;
BEGIN
  -- Identify founder by email or phone
  is_founder := (NEW.email = 'aleksandrbodnariuk@gmail.com' OR NEW.phone = '0507068007');

  -- Insert minimal user profile into public.users
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

-- 2) Drop existing trigger if present
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- 3) Create trigger on auth.users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE PROCEDURE public.handle_new_user();

-- 4) Drop existing policy if present
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.users;

-- 5) Recreate policy to allow trigger execution
CREATE POLICY "Users can insert their own profile"
ON public.users
FOR INSERT
TO public
WITH CHECK ((id = auth.uid()) OR check_admin_access() OR (auth.uid() IS NULL));