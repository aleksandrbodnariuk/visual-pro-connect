
-- 1. SQL function mirroring shareholderRules.ts title thresholds
CREATE OR REPLACE FUNCTION public.get_title_by_share_percent(_percent numeric)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN _percent >= 100 THEN 'Імператор'
    WHEN _percent >= 50  THEN 'Герцог'
    WHEN _percent >= 40  THEN 'Лорд'
    WHEN _percent >= 30  THEN 'Маркіз'
    WHEN _percent >= 20  THEN 'Граф'
    WHEN _percent >= 10  THEN 'Барон'
    WHEN _percent >= 5   THEN 'Магнат'
    WHEN _percent >= 1   THEN 'Акціонер'
    ELSE NULL
  END;
$$;

-- 2. Sync title for a single user, notify on change
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
  -- Get user's shares
  SELECT COALESCE(s.quantity, 0) INTO _shares
  FROM public.shares s WHERE s.user_id = _user_id;
  IF _shares IS NULL THEN _shares := 0; END IF;

  -- Get total shares
  SELECT total_shares INTO _total FROM public.company_settings LIMIT 1;
  IF _total IS NULL OR _total <= 0 THEN
    -- System not configured, do nothing
    RETURN;
  END IF;

  -- Calculate percent
  _percent := (_shares::numeric / _total::numeric) * 100;

  -- Determine title
  _new_title := public.get_title_by_share_percent(_percent);

  -- Get old title
  SELECT title INTO _old_title FROM public.users WHERE id = _user_id;

  -- Update title in users table
  UPDATE public.users SET title = _new_title WHERE id = _user_id;

  -- Notify only if title actually changed (and new title is not null)
  IF _new_title IS DISTINCT FROM _old_title AND _new_title IS NOT NULL THEN
    PERFORM public.create_stock_notification(
      _user_id,
      'Вітаємо! Ви стали ' || _new_title || '. Ваш відсоток акцій: ' || ROUND(_percent, 2) || '%',
      '/shareholder'
    );
  END IF;
END;
$$;

-- 3. Trigger on shares table to auto-sync title after any change
CREATE OR REPLACE FUNCTION public.on_shares_changed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM public.sync_user_title(OLD.user_id);
    RETURN OLD;
  ELSE
    PERFORM public.sync_user_title(NEW.user_id);
    -- If user_id changed (unlikely but safe), also sync old
    IF TG_OP = 'UPDATE' AND OLD.user_id IS DISTINCT FROM NEW.user_id THEN
      PERFORM public.sync_user_title(OLD.user_id);
    END IF;
    RETURN NEW;
  END IF;
END;
$$;

-- Drop if exists to avoid conflict
DROP TRIGGER IF EXISTS trg_shares_title_sync ON public.shares;

CREATE TRIGGER trg_shares_title_sync
AFTER INSERT OR UPDATE OR DELETE ON public.shares
FOR EACH ROW
EXECUTE FUNCTION public.on_shares_changed();

-- 4. Update approve_share_transaction to call sync_user_title for buyer and seller
CREATE OR REPLACE FUNCTION public.approve_share_transaction(_transaction_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  tx RECORD;
  listing RECORD;
  seller_shares integer;
  new_remaining integer;
  _buyer_name text;
  _seller_name text;
BEGIN
  IF NOT public.is_user_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Доступ заборонено' USING ERRCODE = 'insufficient_privilege';
  END IF;

  SELECT * INTO tx FROM public.transactions WHERE id = _transaction_id FOR UPDATE;
  IF tx IS NULL THEN RAISE EXCEPTION 'Заявку не знайдено' USING ERRCODE = 'no_data_found'; END IF;
  IF tx.status != 'pending' THEN RAISE EXCEPTION 'Заявку вже оброблено' USING ERRCODE = 'check_violation'; END IF;

  IF tx.share_id IS NOT NULL THEN
    SELECT * INTO listing FROM public.market WHERE id = tx.share_id FOR UPDATE;
    IF listing IS NULL THEN RAISE EXCEPTION 'Пропозицію не знайдено'; END IF;
    IF listing.remaining_qty < tx.quantity THEN
      RAISE EXCEPTION 'У пропозиції залишилось лише % акцій, запитано %', listing.remaining_qty, tx.quantity;
    END IF;
  END IF;

  SELECT quantity INTO seller_shares FROM public.shares WHERE user_id = tx.seller_id FOR UPDATE;
  IF seller_shares IS NULL OR seller_shares < tx.quantity THEN
    RAISE EXCEPTION 'Недостатньо акцій у продавця' USING ERRCODE = 'check_violation';
  END IF;

  -- Update shares (triggers trg_shares_title_sync automatically for both)
  UPDATE public.shares SET quantity = quantity - tx.quantity WHERE user_id = tx.seller_id;
  INSERT INTO public.shares (user_id, quantity) VALUES (tx.buyer_id, tx.quantity)
    ON CONFLICT (user_id) DO UPDATE SET quantity = shares.quantity + EXCLUDED.quantity;

  UPDATE public.transactions SET status = 'approved', approved_by_admin = true, updated_at = now() WHERE id = _transaction_id;

  IF tx.share_id IS NOT NULL THEN
    new_remaining := listing.remaining_qty - tx.quantity;
    IF new_remaining <= 0 THEN
      UPDATE public.market SET remaining_qty = 0, status = 'closed', updated_at = now() WHERE id = tx.share_id;
    ELSE
      UPDATE public.market SET remaining_qty = new_remaining, status = 'partially_filled', updated_at = now() WHERE id = tx.share_id;
    END IF;
  END IF;

  -- Mark buyer as shareholder
  UPDATE public.users SET is_shareholder = true WHERE id = tx.buyer_id AND (is_shareholder IS NULL OR is_shareholder = false);
  INSERT INTO public.user_roles (user_id, role) VALUES (tx.buyer_id, 'shareholder'::app_role) ON CONFLICT (user_id, role) DO NOTHING;
  DELETE FROM public.user_roles WHERE user_id = tx.buyer_id AND role = 'candidate';

  INSERT INTO public.share_transfer_log (
    listing_id, transaction_id, from_user_id, to_user_id,
    shares_qty, price_per_share_usd, total_amount_usd, confirmed_by
  ) VALUES (
    tx.share_id, _transaction_id, tx.seller_id, tx.buyer_id,
    tx.quantity, COALESCE(tx.price_per_share, 0), tx.total_price, auth.uid()
  );

  -- Get names for notifications
  SELECT COALESCE(full_name, 'Користувач') INTO _buyer_name FROM public.users WHERE id = tx.buyer_id;
  SELECT COALESCE(full_name, 'Користувач') INTO _seller_name FROM public.users WHERE id = tx.seller_id;

  -- Notify buyer about transfer
  PERFORM public.create_stock_notification(
    tx.buyer_id,
    'Передачу ' || tx.quantity || ' акцій від ' || _seller_name || ' підтверджено',
    '/stock-market?tab=transactions'
  );

  -- Notify seller about transfer
  PERFORM public.create_stock_notification(
    tx.seller_id,
    'Передачу ' || tx.quantity || ' акцій користувачу ' || _buyer_name || ' підтверджено',
    '/stock-market?tab=my-offers'
  );

  -- Title sync is handled automatically by trg_shares_title_sync trigger

  -- Push notifications
  BEGIN
    PERFORM net.http_post(
      url := 'https://cxdkaxjeibqdmpvozirz.supabase.co/functions/v1/send-push-notification',
      headers := jsonb_build_object('Content-Type', 'application/json',
        'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN4ZGtheGplaWJxZG1wdm96aXJ6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ4MzUxMzcsImV4cCI6MjA2MDQxMTEzN30.mjqEyiJX59YLQpjb-_N4qS_3byUY_zpgS2g6X5xqM2U'),
      body := jsonb_build_object('user_id', tx.buyer_id::text, 'title', 'Акції підтверджено', 'body', 'Ви отримали ' || tx.quantity || ' акцій', 'url', '/stock-market')
    );
    PERFORM net.http_post(
      url := 'https://cxdkaxjeibqdmpvozirz.supabase.co/functions/v1/send-push-notification',
      headers := jsonb_build_object('Content-Type', 'application/json',
        'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN4ZGtheGplaWJxZG1wdm96aXJ6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ4MzUxMzcsImV4cCI6MjA2MDQxMTEzN30.mjqEyiJX59YLQpjb-_N4qS_3byUY_zpgS2g6X5xqM2U'),
      body := jsonb_build_object('user_id', tx.seller_id::text, 'title', 'Акції передано', 'body', 'Передачу ' || tx.quantity || ' акцій підтверджено', 'url', '/stock-market')
    );
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
END;
$$;
