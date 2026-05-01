-- Допоміжна функція для updated_at (якщо ще немає)
CREATE OR REPLACE FUNCTION public.set_updated_at_ad()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Таблиця рекламних замовлень
CREATE TABLE public.ad_orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  finder_user_id UUID NOT NULL,
  finder_role TEXT NOT NULL,
  advertiser_name TEXT NOT NULL,
  advertiser_contact TEXT,
  ad_price NUMERIC NOT NULL DEFAULT 0,
  ad_date DATE NOT NULL,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  processed BOOLEAN NOT NULL DEFAULT false,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ad_orders_finder ON public.ad_orders(finder_user_id);
CREATE INDEX idx_ad_orders_status ON public.ad_orders(status);
CREATE INDEX idx_ad_orders_date ON public.ad_orders(ad_date);

ALTER TABLE public.ad_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins full access ad_orders"
  ON public.ad_orders FOR ALL
  USING (is_user_admin(auth.uid()))
  WITH CHECK (is_user_admin(auth.uid()));

CREATE POLICY "Reps can view own ad_orders"
  ON public.ad_orders FOR SELECT
  USING (
    finder_user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.representatives r_self
      JOIN public.representatives r_finder ON r_finder.user_id = ad_orders.finder_user_id
      WHERE r_self.user_id = auth.uid()
        AND (
          r_finder.parent_id = r_self.id
          OR r_finder.parent_id IN (SELECT id FROM public.representatives WHERE parent_id = r_self.id)
        )
    )
  );

CREATE POLICY "Reps can create own ad_orders"
  ON public.ad_orders FOR INSERT
  WITH CHECK (
    finder_user_id = auth.uid()
    AND EXISTS (SELECT 1 FROM public.representatives WHERE user_id = auth.uid())
  );

CREATE POLICY "Reps can update own pending ad_orders"
  ON public.ad_orders FOR UPDATE
  USING (finder_user_id = auth.uid() AND processed = false)
  WITH CHECK (finder_user_id = auth.uid());

CREATE TRIGGER trg_ad_orders_updated_at
BEFORE UPDATE ON public.ad_orders
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_ad();

-- Деталізація виплат за рекламою
CREATE TABLE public.ad_earnings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ad_order_id UUID NOT NULL REFERENCES public.ad_orders(id) ON DELETE CASCADE,
  representative_id UUID NOT NULL,
  user_id UUID NOT NULL,
  role_snapshot TEXT NOT NULL,
  position_label TEXT NOT NULL,
  percent NUMERIC NOT NULL DEFAULT 0,
  amount NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ad_earnings_user ON public.ad_earnings(user_id);
CREATE INDEX idx_ad_earnings_order ON public.ad_earnings(ad_order_id);

ALTER TABLE public.ad_earnings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins full access ad_earnings"
  ON public.ad_earnings FOR ALL
  USING (is_user_admin(auth.uid()))
  WITH CHECK (is_user_admin(auth.uid()));

CREATE POLICY "Users can view own ad_earnings"
  ON public.ad_earnings FOR SELECT
  USING (user_id = auth.uid());

-- Лічильник доходу мережі від реклами
CREATE TABLE public.ad_network_revenue (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ad_order_id UUID NOT NULL REFERENCES public.ad_orders(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL DEFAULT 0,
  network_percent NUMERIC NOT NULL DEFAULT 0.5,
  bonus_from_unfilled_uplines NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.ad_network_revenue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage ad_network_revenue"
  ON public.ad_network_revenue FOR ALL
  USING (is_user_admin(auth.uid()))
  WITH CHECK (is_user_admin(auth.uid()));

-- RPC: обробка рекламного замовлення (admin-only)
CREATE OR REPLACE FUNCTION public.process_ad_order(_ad_order_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order RECORD;
  v_finder_rep RECORD;
  v_upline_1 RECORD;
  v_upline_2 RECORD;
  v_finder_amount NUMERIC := 0;
  v_upline1_amount NUMERIC := 0;
  v_upline2_amount NUMERIC := 0;
  v_reps_total NUMERIC := 0;
  v_network_amount NUMERIC := 0;
  v_unfilled_bonus NUMERIC := 0;
BEGIN
  IF NOT is_user_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Only admins can process ad orders';
  END IF;

  SELECT * INTO v_order FROM public.ad_orders WHERE id = _ad_order_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Ad order not found'; END IF;
  IF v_order.processed THEN RAISE EXCEPTION 'Ad order already processed'; END IF;
  IF v_order.ad_price <= 0 THEN RAISE EXCEPTION 'Ad price must be positive'; END IF;

  SELECT * INTO v_finder_rep FROM public.representatives WHERE user_id = v_order.finder_user_id LIMIT 1;
  IF NOT FOUND THEN RAISE EXCEPTION 'Finder is not a representative'; END IF;

  v_finder_amount := v_order.ad_price * 0.30;
  INSERT INTO public.ad_earnings (ad_order_id, representative_id, user_id, role_snapshot, position_label, percent, amount)
  VALUES (_ad_order_id, v_finder_rep.id, v_finder_rep.user_id, 'finder', v_finder_rep.role::text, 0.30, v_finder_amount);

  IF v_finder_rep.parent_id IS NOT NULL THEN
    SELECT * INTO v_upline_1 FROM public.representatives WHERE id = v_finder_rep.parent_id;
    IF FOUND THEN
      v_upline1_amount := v_order.ad_price * 0.10;
      INSERT INTO public.ad_earnings (ad_order_id, representative_id, user_id, role_snapshot, position_label, percent, amount)
      VALUES (_ad_order_id, v_upline_1.id, v_upline_1.user_id, 'upline_1', v_upline_1.role::text, 0.10, v_upline1_amount);

      IF v_upline_1.parent_id IS NOT NULL THEN
        SELECT * INTO v_upline_2 FROM public.representatives WHERE id = v_upline_1.parent_id;
        IF FOUND THEN
          v_upline2_amount := v_order.ad_price * 0.10;
          INSERT INTO public.ad_earnings (ad_order_id, representative_id, user_id, role_snapshot, position_label, percent, amount)
          VALUES (_ad_order_id, v_upline_2.id, v_upline_2.user_id, 'upline_2', v_upline_2.role::text, 0.10, v_upline2_amount);
        ELSE
          v_unfilled_bonus := v_unfilled_bonus + v_order.ad_price * 0.10;
        END IF;
      ELSE
        v_unfilled_bonus := v_unfilled_bonus + v_order.ad_price * 0.10;
      END IF;
    ELSE
      v_unfilled_bonus := v_unfilled_bonus + v_order.ad_price * 0.20;
    END IF;
  ELSE
    v_unfilled_bonus := v_unfilled_bonus + v_order.ad_price * 0.20;
  END IF;

  v_reps_total := v_finder_amount + v_upline1_amount + v_upline2_amount;
  v_network_amount := v_order.ad_price * 0.50 + v_unfilled_bonus;

  INSERT INTO public.ad_network_revenue (ad_order_id, amount, network_percent, bonus_from_unfilled_uplines)
  VALUES (_ad_order_id, v_network_amount, 0.5, v_unfilled_bonus);

  IF v_finder_amount > 0 THEN
    INSERT INTO public.representative_payouts (representative_id, amount, order_ids, role_at_calculation, percent_at_calculation, status, notes)
    VALUES (v_finder_rep.user_id, v_finder_amount, ARRAY[_ad_order_id], v_finder_rep.role::text, 0.30, 'pending', 'Реклама: ' || v_order.advertiser_name);
  END IF;
  IF v_upline1_amount > 0 THEN
    INSERT INTO public.representative_payouts (representative_id, amount, order_ids, role_at_calculation, percent_at_calculation, status, notes)
    VALUES (v_upline_1.user_id, v_upline1_amount, ARRAY[_ad_order_id], v_upline_1.role::text, 0.10, 'pending', 'Реклама: ' || v_order.advertiser_name);
  END IF;
  IF v_upline2_amount > 0 THEN
    INSERT INTO public.representative_payouts (representative_id, amount, order_ids, role_at_calculation, percent_at_calculation, status, notes)
    VALUES (v_upline_2.user_id, v_upline2_amount, ARRAY[_ad_order_id], v_upline_2.role::text, 0.10, 'pending', 'Реклама: ' || v_order.advertiser_name);
  END IF;

  UPDATE public.ad_orders
  SET processed = true, processed_at = now(), status = 'confirmed'
  WHERE id = _ad_order_id;

  RETURN jsonb_build_object(
    'ad_price', v_order.ad_price,
    'finder_amount', v_finder_amount,
    'upline1_amount', v_upline1_amount,
    'upline2_amount', v_upline2_amount,
    'reps_total', v_reps_total,
    'network_amount', v_network_amount,
    'unfilled_bonus', v_unfilled_bonus
  );
END;
$$;