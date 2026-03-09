
-- 1. Create helper function for stock market access check
CREATE OR REPLACE FUNCTION public.has_stock_market_access(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT (
    public.is_user_admin(_user_id)
    OR
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = 'shareholder')
    OR
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = 'candidate')
  )
$$;

-- 2. Update market SELECT policy
DROP POLICY IF EXISTS "Authenticated can view active listings" ON public.market;
CREATE POLICY "Eligible users can view active listings" ON public.market
  FOR SELECT USING (
    (status IN ('active', 'partially_filled') AND public.has_stock_market_access(auth.uid()))
    OR seller_id = auth.uid()
    OR public.is_user_admin(auth.uid())
  );

-- 3. Update transactions INSERT policy
DROP POLICY IF EXISTS "Authenticated users can create buy transactions" ON public.transactions;
CREATE POLICY "Eligible users can create buy transactions" ON public.transactions
  FOR INSERT WITH CHECK (
    buyer_id = auth.uid()
    AND public.has_stock_market_access(auth.uid())
  );

-- 4. Update create_share_listing with access check
CREATE OR REPLACE FUNCTION public.create_share_listing(_quantity integer, _note text DEFAULT NULL)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id uuid;
  _owned integer;
  _reserved integer;
  _available integer;
  _price numeric;
  _listing_id uuid;
BEGIN
  _user_id := auth.uid();
  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'Необхідно увійти в систему';
  END IF;
  IF _quantity <= 0 THEN
    RAISE EXCEPTION 'Кількість має бути більше 0';
  END IF;
  IF NOT public.has_stock_market_access(_user_id) THEN
    RAISE EXCEPTION 'Немає доступу до ринку акцій';
  END IF;
  IF NOT public.has_role(_user_id, 'shareholder'::app_role) THEN
    RAISE EXCEPTION 'Необхідний статус акціонера для створення пропозиції';
  END IF;

  SELECT COALESCE(quantity, 0) INTO _owned
  FROM public.shares WHERE user_id = _user_id FOR UPDATE;
  IF _owned IS NULL OR _owned <= 0 THEN
    RAISE EXCEPTION 'У вас немає акцій';
  END IF;

  SELECT COALESCE(SUM(remaining_qty), 0) INTO _reserved
  FROM public.market WHERE seller_id = _user_id AND status IN ('active', 'partially_filled');
  _available := _owned - _reserved;
  IF _quantity > _available THEN
    RAISE EXCEPTION 'Недостатньо доступних акцій. Доступно: %, запитано: %', _available, _quantity;
  END IF;

  SELECT share_price_usd INTO _price FROM public.company_settings LIMIT 1;
  IF _price IS NULL THEN
    RAISE EXCEPTION 'Ціна акції не налаштована';
  END IF;

  INSERT INTO public.market (seller_id, quantity, remaining_qty, price_per_share, status, notes)
  VALUES (_user_id, _quantity, _quantity, _price, 'active', _note)
  RETURNING id INTO _listing_id;
  RETURN _listing_id;
END;
$$;

-- 5. Update approve_share_transaction to auto-upgrade candidate→shareholder
CREATE OR REPLACE FUNCTION public.approve_share_transaction(_transaction_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  tx RECORD;
  listing RECORD;
  seller_shares integer;
  new_remaining integer;
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
  -- Auto-upgrade: remove candidate role
  DELETE FROM public.user_roles WHERE user_id = tx.buyer_id AND role = 'candidate';

  INSERT INTO public.share_transfer_log (
    listing_id, transaction_id, from_user_id, to_user_id,
    shares_qty, price_per_share_usd, total_amount_usd, confirmed_by
  ) VALUES (
    tx.share_id, _transaction_id, tx.seller_id, tx.buyer_id,
    tx.quantity, COALESCE(tx.price_per_share, 0), tx.total_price, auth.uid()
  );
END;
$$;
