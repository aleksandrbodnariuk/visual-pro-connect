
-- 1. Add link column to notifications table
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS link text;

-- 2. Helper: create stock market notification for a user
CREATE OR REPLACE FUNCTION public.create_stock_notification(
  _user_id uuid,
  _message text,
  _link text DEFAULT '/stock-market'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.notifications (user_id, message, is_read, link)
  VALUES (_user_id, _message, false, _link);
END;
$$;

-- 3. Helper: notify all admins
CREATE OR REPLACE FUNCTION public.notify_admins_stock_event(
  _message text,
  _link text DEFAULT '/stock-market?tab=moderation'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _admin_id uuid;
BEGIN
  FOR _admin_id IN
    SELECT user_id FROM public.user_roles WHERE role IN ('admin', 'founder')
  LOOP
    INSERT INTO public.notifications (user_id, message, is_read, link)
    VALUES (_admin_id, _message, false, _link);
  END LOOP;
END;
$$;

-- 4. Trigger: notify seller + admins when a new transaction (buy request) is created
CREATE OR REPLACE FUNCTION public.on_stock_transaction_created()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _buyer_name text;
  _seller_name text;
BEGIN
  -- Only for new pending transactions
  IF NEW.status != 'pending' THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(full_name, 'Користувач') INTO _buyer_name FROM public.users WHERE id = NEW.buyer_id;
  SELECT COALESCE(full_name, 'Користувач') INTO _seller_name FROM public.users WHERE id = NEW.seller_id;

  -- Notify seller
  PERFORM public.create_stock_notification(
    NEW.seller_id,
    _buyer_name || ' подав заявку на ' || NEW.quantity || ' акцій',
    '/stock-market?tab=my-offers'
  );

  -- Notify admins
  PERFORM public.notify_admins_stock_event(
    'Нова заявка: ' || _buyer_name || ' → ' || _seller_name || ', ' || NEW.quantity || ' акцій',
    '/stock-market?tab=moderation'
  );

  -- Push notification to seller
  BEGIN
    PERFORM net.http_post(
      url := 'https://cxdkaxjeibqdmpvozirz.supabase.co/functions/v1/send-push-notification',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN4ZGtheGplaWJxZG1wdm96aXJ6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ4MzUxMzcsImV4cCI6MjA2MDQxMTEzN30.mjqEyiJX59YLQpjb-_N4qS_3byUY_zpgS2g6X5xqM2U'
      ),
      body := jsonb_build_object(
        'user_id', NEW.seller_id::text,
        'title', 'Нова заявка на акції',
        'body', _buyer_name || ' подав заявку на ' || NEW.quantity || ' акцій',
        'url', '/stock-market'
      )
    );
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_stock_transaction_created_trigger ON public.transactions;
CREATE TRIGGER on_stock_transaction_created_trigger
  AFTER INSERT ON public.transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.on_stock_transaction_created();

-- 5. Update approve_share_transaction to add notifications
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

  -- Notify buyer
  PERFORM public.create_stock_notification(
    tx.buyer_id,
    'Передачу ' || tx.quantity || ' акцій від ' || _seller_name || ' підтверджено',
    '/stock-market?tab=transactions'
  );

  -- Notify seller
  PERFORM public.create_stock_notification(
    tx.seller_id,
    'Передачу ' || tx.quantity || ' акцій користувачу ' || _buyer_name || ' підтверджено',
    '/stock-market?tab=my-offers'
  );

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

-- 6. Update reject_share_transaction to add notifications
CREATE OR REPLACE FUNCTION public.reject_share_transaction(_transaction_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  tx RECORD;
  _buyer_name text;
  _seller_name text;
BEGIN
  IF NOT public.is_user_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Доступ заборонено' USING ERRCODE = 'insufficient_privilege';
  END IF;

  SELECT * INTO tx FROM public.transactions WHERE id = _transaction_id FOR UPDATE;
  
  IF tx IS NULL THEN
    RAISE EXCEPTION 'Заявку не знайдено' USING ERRCODE = 'no_data_found';
  END IF;
  
  IF tx.status != 'pending' THEN
    RAISE EXCEPTION 'Заявку вже оброблено' USING ERRCODE = 'check_violation';
  END IF;

  UPDATE public.transactions SET status = 'rejected', updated_at = now() WHERE id = _transaction_id;

  -- Get names
  SELECT COALESCE(full_name, 'Користувач') INTO _buyer_name FROM public.users WHERE id = tx.buyer_id;
  SELECT COALESCE(full_name, 'Користувач') INTO _seller_name FROM public.users WHERE id = tx.seller_id;

  -- Notify buyer
  PERFORM public.create_stock_notification(
    tx.buyer_id,
    'Заявку на ' || tx.quantity || ' акцій від ' || _seller_name || ' відхилено',
    '/stock-market?tab=transactions'
  );

  -- Notify seller
  PERFORM public.create_stock_notification(
    tx.seller_id,
    'Заявку ' || _buyer_name || ' на ' || tx.quantity || ' акцій відхилено',
    '/stock-market?tab=my-offers'
  );
END;
$$;
