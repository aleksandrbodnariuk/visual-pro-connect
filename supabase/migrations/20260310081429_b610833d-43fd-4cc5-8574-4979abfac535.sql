
-- Fix 1: Update sync_user_title to set a bypass flag before updating users.title
CREATE OR REPLACE FUNCTION public.sync_user_title(_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _shares integer;
  _total integer;
  _percent numeric;
  _new_title text;
  _old_title text;
BEGIN
  SELECT COALESCE(s.quantity, 0) INTO _shares
  FROM public.shares s WHERE s.user_id = _user_id;
  IF _shares IS NULL THEN _shares := 0; END IF;

  SELECT total_shares INTO _total FROM public.company_settings LIMIT 1;
  IF _total IS NULL OR _total <= 0 THEN
    RETURN;
  END IF;

  _percent := (_shares::numeric / _total::numeric) * 100;
  _new_title := public.get_title_by_share_percent(_percent);

  SELECT title INTO _old_title FROM public.users WHERE id = _user_id;

  -- Set bypass flag so protect_user_privileged_fields allows title change
  PERFORM set_config('app.bypass_title_protection', 'true', true);
  
  UPDATE public.users SET title = _new_title WHERE id = _user_id;
  
  -- Reset bypass flag
  PERFORM set_config('app.bypass_title_protection', '', true);

  IF _new_title IS DISTINCT FROM _old_title AND _new_title IS NOT NULL THEN
    PERFORM public.create_stock_notification(
      _user_id,
      'Вітаємо! Ви стали ' || _new_title || '. Ваш відсоток акцій: ' || ROUND(_percent, 2) || '%',
      '/shareholder-panel'
    );
  END IF;
END;
$$;

-- Fix 2: Update protect_user_privileged_fields to check the bypass flag for title
CREATE OR REPLACE FUNCTION public.protect_user_privileged_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _bypass text;
BEGIN
  -- If caller is admin, allow all changes
  IF public.is_user_admin(auth.uid()) THEN
    RETURN NEW;
  END IF;

  -- Check bypass flag set by sync_user_title (trusted SECURITY DEFINER function)
  _bypass := current_setting('app.bypass_title_protection', true);

  IF TG_OP = 'UPDATE' THEN
    -- Non-admin: force privileged fields back to old values
    NEW.is_admin := OLD.is_admin;
    NEW.founder_admin := OLD.founder_admin;
    NEW.is_blocked := OLD.is_blocked;
    NEW.is_shareholder := OLD.is_shareholder;
    -- Allow title change only if bypass flag is set (from sync_user_title)
    IF _bypass IS DISTINCT FROM 'true' THEN
      NEW.title := OLD.title;
    END IF;
  ELSIF TG_OP = 'INSERT' THEN
    -- Non-admin: force safe defaults on insert
    NEW.is_admin := false;
    NEW.founder_admin := false;
    NEW.is_blocked := false;
    NEW.is_shareholder := false;
    IF _bypass IS DISTINCT FROM 'true' THEN
      NEW.title := NULL;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;
