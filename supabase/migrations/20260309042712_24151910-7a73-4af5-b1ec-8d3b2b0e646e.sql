
-- 1. Create trigger function to protect privileged fields on UPDATE and INSERT
CREATE OR REPLACE FUNCTION public.protect_user_privileged_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- If caller is admin, allow all changes
  IF public.is_user_admin(auth.uid()) THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    -- Non-admin: force privileged fields back to old values
    NEW.is_admin := OLD.is_admin;
    NEW.founder_admin := OLD.founder_admin;
    NEW.is_blocked := OLD.is_blocked;
    NEW.is_shareholder := OLD.is_shareholder;
    NEW.title := OLD.title;
  ELSIF TG_OP = 'INSERT' THEN
    -- Non-admin: force safe defaults on insert
    NEW.is_admin := false;
    NEW.founder_admin := false;
    NEW.is_blocked := false;
    NEW.is_shareholder := false;
    NEW.title := NULL;
  END IF;

  RETURN NEW;
END;
$$;

-- 2. Create BEFORE UPDATE trigger (drop if exists to be safe)
DROP TRIGGER IF EXISTS trg_protect_user_privileged_update ON public.users;
CREATE TRIGGER trg_protect_user_privileged_update
  BEFORE UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_user_privileged_fields();

-- 3. Create BEFORE INSERT trigger
DROP TRIGGER IF EXISTS trg_protect_user_privileged_insert ON public.users;
CREATE TRIGGER trg_protect_user_privileged_insert
  BEFORE INSERT ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_user_privileged_fields();

-- 4. Tighten INSERT policy: remove anonymous access
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.users;
CREATE POLICY "Users can insert their own profile"
  ON public.users
  FOR INSERT
  WITH CHECK ((id = auth.uid()) OR check_admin_access());
