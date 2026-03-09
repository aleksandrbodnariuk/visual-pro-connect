
-- 1. Fix link in sync_user_title: /shareholder → /shareholder-panel
-- 2. Add sync_all_shareholder_titles()
-- 3. Add trigger on company_settings to auto-sync all titles on total_shares change

-- Fix sync_user_title with correct link
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

  UPDATE public.users SET title = _new_title WHERE id = _user_id;

  IF _new_title IS DISTINCT FROM _old_title AND _new_title IS NOT NULL THEN
    PERFORM public.create_stock_notification(
      _user_id,
      'Вітаємо! Ви стали ' || _new_title || '. Ваш відсоток акцій: ' || ROUND(_percent, 2) || '%',
      '/shareholder-panel'
    );
  END IF;
END;
$$;

-- Sync titles for ALL shareholders at once
CREATE OR REPLACE FUNCTION public.sync_all_shareholder_titles()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _uid uuid;
BEGIN
  FOR _uid IN
    SELECT DISTINCT s.user_id FROM public.shares s WHERE s.quantity > 0
  LOOP
    PERFORM public.sync_user_title(_uid);
  END LOOP;
END;
$$;

-- Trigger: when total_shares changes in company_settings, resync all titles
CREATE OR REPLACE FUNCTION public.on_total_shares_changed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF OLD.total_shares IS DISTINCT FROM NEW.total_shares THEN
    PERFORM public.sync_all_shareholder_titles();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_total_shares_title_sync ON public.company_settings;

CREATE TRIGGER trg_total_shares_title_sync
AFTER UPDATE ON public.company_settings
FOR EACH ROW
EXECUTE FUNCTION public.on_total_shares_changed();
