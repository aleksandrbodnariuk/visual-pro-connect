
-- Table: shareholder_payouts
-- Tracks individual payout records per shareholder
CREATE TABLE public.shareholder_payouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shareholder_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  -- Financial details
  amount numeric NOT NULL DEFAULT 0,
  base_income numeric NOT NULL DEFAULT 0,
  title_bonus numeric NOT NULL DEFAULT 0,
  -- Which confirmed orders are included
  order_ids uuid[] NOT NULL DEFAULT '{}',
  -- Snapshot at calculation time
  shares_at_calculation integer NOT NULL DEFAULT 0,
  share_percent_at_calculation numeric NOT NULL DEFAULT 0,
  title_at_calculation text,
  total_shares_snapshot integer NOT NULL DEFAULT 0,
  -- Status: pending (calculated) → paid (admin confirmed payment) → confirmed (investor confirmed receipt)
  status text NOT NULL DEFAULT 'pending',
  notes text,
  admin_notes text,
  -- Timestamps
  created_at timestamptz NOT NULL DEFAULT now(),
  paid_at timestamptz,
  paid_by uuid REFERENCES public.users(id),
  confirmed_at timestamptz,
  reminder_sent_at timestamptz
);

-- Enable RLS
ALTER TABLE public.shareholder_payouts ENABLE ROW LEVEL SECURITY;

-- RLS: Admins full access
CREATE POLICY "Admins full access to payouts"
  ON public.shareholder_payouts
  FOR ALL
  TO public
  USING (public.is_user_admin(auth.uid()))
  WITH CHECK (public.is_user_admin(auth.uid()));

-- RLS: Shareholders can view own payouts
CREATE POLICY "Shareholders can view own payouts"
  ON public.shareholder_payouts
  FOR SELECT
  TO authenticated
  USING (shareholder_id = auth.uid());

-- RLS: Shareholders can update own payouts (only to confirm)
CREATE POLICY "Shareholders can confirm own payouts"
  ON public.shareholder_payouts
  FOR UPDATE
  TO authenticated
  USING (shareholder_id = auth.uid() AND status = 'paid')
  WITH CHECK (shareholder_id = auth.uid() AND status = 'confirmed');

-- Index for fast lookups
CREATE INDEX idx_shareholder_payouts_shareholder ON public.shareholder_payouts(shareholder_id);
CREATE INDEX idx_shareholder_payouts_status ON public.shareholder_payouts(status);

-- RPC: Confirm payout by shareholder
CREATE OR REPLACE FUNCTION public.confirm_payout(_payout_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _payout RECORD;
  _shareholder_name text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT * INTO _payout FROM public.shareholder_payouts WHERE id = _payout_id FOR UPDATE;
  
  IF _payout IS NULL THEN
    RAISE EXCEPTION 'Виплату не знайдено';
  END IF;
  
  IF _payout.shareholder_id != auth.uid() THEN
    RAISE EXCEPTION 'Доступ заборонено';
  END IF;
  
  IF _payout.status != 'paid' THEN
    RAISE EXCEPTION 'Виплату можна підтвердити лише зі статусом "виплачено"';
  END IF;

  UPDATE public.shareholder_payouts
  SET status = 'confirmed', confirmed_at = now()
  WHERE id = _payout_id;

  -- Notify admins
  SELECT COALESCE(full_name, 'Акціонер') INTO _shareholder_name FROM public.users WHERE id = _payout.shareholder_id;
  
  PERFORM public.notify_admins_stock_event(
    _shareholder_name || ' підтвердив отримання виплати ' || _payout.amount || ' $',
    '/admin/payouts'
  );
END;
$$;

-- RPC: Admin marks payout as paid
CREATE OR REPLACE FUNCTION public.mark_payout_paid(_payout_id uuid, _admin_notes text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _payout RECORD;
  _admin_name text;
BEGIN
  IF NOT public.is_user_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Доступ заборонено';
  END IF;

  SELECT * INTO _payout FROM public.shareholder_payouts WHERE id = _payout_id FOR UPDATE;
  
  IF _payout IS NULL THEN
    RAISE EXCEPTION 'Виплату не знайдено';
  END IF;
  
  IF _payout.status != 'pending' THEN
    RAISE EXCEPTION 'Лише очікувані виплати можна відмітити як виплачені';
  END IF;

  UPDATE public.shareholder_payouts
  SET status = 'paid', paid_at = now(), paid_by = auth.uid(), admin_notes = COALESCE(_admin_notes, admin_notes)
  WHERE id = _payout_id;

  -- Notify shareholder
  SELECT COALESCE(full_name, 'Адміністратор') INTO _admin_name FROM public.users WHERE id = auth.uid();
  
  INSERT INTO public.notifications (user_id, message, is_read, link)
  VALUES (
    _payout.shareholder_id,
    'Вам виплачено ' || _payout.amount || ' $. Будь ласка, підтвердіть отримання.',
    false,
    '/shareholder-panel'
  );

  -- Push notification
  BEGIN
    PERFORM net.http_post(
      url := 'https://cxdkaxjeibqdmpvozirz.supabase.co/functions/v1/send-push-notification',
      headers := jsonb_build_object('Content-Type', 'application/json',
        'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN4ZGtheGplaWJxZG1wdm96aXJ6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ4MzUxMzcsImV4cCI6MjA2MDQxMTEzN30.mjqEyiJX59YLQpjb-_N4qS_3byUY_zpgS2g6X5xqM2U'),
      body := jsonb_build_object('user_id', _payout.shareholder_id::text, 'title', 'Виплата отримана', 'body', 'Підтвердіть отримання ' || _payout.amount || ' $', 'url', '/shareholder-panel')
    );
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
END;
$$;

-- RPC: Admin force-confirms a payout (for cases where investor doesn't respond)
CREATE OR REPLACE FUNCTION public.admin_force_confirm_payout(_payout_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.is_user_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Доступ заборонено';
  END IF;

  UPDATE public.shareholder_payouts
  SET status = 'confirmed', confirmed_at = now(), admin_notes = COALESCE(admin_notes, '') || ' [Підтверджено адміном]'
  WHERE id = _payout_id AND status = 'paid';
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Виплату не знайдено або вона не у статусі "виплачено"';
  END IF;
END;
$$;
