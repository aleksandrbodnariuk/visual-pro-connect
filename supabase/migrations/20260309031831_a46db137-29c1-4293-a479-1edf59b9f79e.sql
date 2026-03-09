
-- 1. Create set_stock_market_access RPC
CREATE OR REPLACE FUNCTION public.set_stock_market_access(_user_id uuid, _access text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _shares integer;
BEGIN
  -- Only admin/founder can call this
  IF NOT public.is_user_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Доступ заборонено' USING ERRCODE = 'insufficient_privilege';
  END IF;

  -- Validate _access value
  IF _access NOT IN ('none', 'candidate', 'shareholder') THEN
    RAISE EXCEPTION 'Невірне значення доступу: %', _access;
  END IF;

  -- Check shares ownership
  SELECT COALESCE(s.quantity, 0) INTO _shares
  FROM public.shares s WHERE s.user_id = _user_id;
  IF _shares IS NULL THEN _shares := 0; END IF;

  -- Cannot remove access if user has shares
  IF _access = 'none' AND _shares > 0 THEN
    RAISE EXCEPTION 'Не можна забрати доступ у користувача, який володіє акціями (%)' , _shares
    USING ERRCODE = 'check_violation';
  END IF;

  -- Cannot downgrade shareholder with shares to candidate
  IF _access = 'candidate' AND _shares > 0 THEN
    RAISE EXCEPTION 'Не можна понизити до кандидата користувача, який володіє акціями (%)' , _shares
    USING ERRCODE = 'check_violation';
  END IF;

  -- Remove candidate and shareholder roles
  DELETE FROM public.user_roles WHERE user_id = _user_id AND role IN ('candidate', 'shareholder');

  -- Set new role
  IF _access = 'candidate' THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (_user_id, 'candidate'::app_role)
    ON CONFLICT (user_id, role) DO NOTHING;
    UPDATE public.users SET is_shareholder = false WHERE id = _user_id;
  ELSIF _access = 'shareholder' THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (_user_id, 'shareholder'::app_role)
    ON CONFLICT (user_id, role) DO NOTHING;
    UPDATE public.users SET is_shareholder = true WHERE id = _user_id;
  ELSIF _access = 'none' THEN
    UPDATE public.users SET is_shareholder = false WHERE id = _user_id;
  END IF;
END;
$$;

-- 2. Update has_stock_market_access to also check shares > 0
CREATE OR REPLACE FUNCTION public.has_stock_market_access(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT (
    public.is_user_admin(_user_id)
    OR
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = 'shareholder')
    OR
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = 'candidate')
    OR
    EXISTS (SELECT 1 FROM public.shares WHERE user_id = _user_id AND quantity > 0)
    OR
    EXISTS (SELECT 1 FROM public.users WHERE id = _user_id AND is_shareholder = true)
  )
$$;
