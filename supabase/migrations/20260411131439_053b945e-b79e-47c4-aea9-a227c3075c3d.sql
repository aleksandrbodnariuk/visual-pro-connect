
-- Create representative_payouts table
CREATE TABLE public.representative_payouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  representative_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  amount numeric NOT NULL DEFAULT 0,
  order_ids uuid[] NOT NULL DEFAULT '{}',
  role_at_calculation text,
  percent_at_calculation numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending',
  notes text,
  admin_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  paid_at timestamptz,
  paid_by uuid REFERENCES public.users(id),
  confirmed_at timestamptz
);

-- Enable RLS
ALTER TABLE public.representative_payouts ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Admins full access to rep payouts"
ON public.representative_payouts FOR ALL
TO public
USING (is_user_admin(auth.uid()))
WITH CHECK (is_user_admin(auth.uid()));

CREATE POLICY "Representatives can view own payouts"
ON public.representative_payouts FOR SELECT
TO authenticated
USING (representative_id = auth.uid());

CREATE POLICY "Representatives can confirm own payouts"
ON public.representative_payouts FOR UPDATE
TO authenticated
USING (representative_id = auth.uid() AND status = 'paid')
WITH CHECK (representative_id = auth.uid() AND status = 'confirmed');

-- Index for fast lookups
CREATE INDEX idx_rep_payouts_representative ON public.representative_payouts(representative_id);
CREATE INDEX idx_rep_payouts_status ON public.representative_payouts(status);

-- ─── RPC: mark_rep_payout_paid ────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.mark_rep_payout_paid(_payout_id uuid, _admin_notes text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _payout RECORD;
BEGIN
  IF NOT public.is_user_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Доступ заборонено';
  END IF;

  SELECT * INTO _payout FROM public.representative_payouts WHERE id = _payout_id FOR UPDATE;
  
  IF _payout IS NULL THEN
    RAISE EXCEPTION 'Виплату не знайдено';
  END IF;
  
  IF _payout.status != 'pending' THEN
    RAISE EXCEPTION 'Лише очікувані виплати можна відмітити як виплачені';
  END IF;

  UPDATE public.representative_payouts
  SET status = 'paid', paid_at = now(), paid_by = auth.uid(), admin_notes = COALESCE(_admin_notes, admin_notes)
  WHERE id = _payout_id;

  -- Notify representative
  INSERT INTO public.notifications (user_id, message, is_read, link)
  VALUES (
    _payout.representative_id,
    'Вам виплачено ' || _payout.amount || ' $. Будь ласка, підтвердіть отримання.',
    false,
    '/representative-panel'
  );

  -- Push notification
  BEGIN
    PERFORM net.http_post(
      url := 'https://cxdkaxjeibqdmpvozirz.supabase.co/functions/v1/send-push-notification',
      headers := jsonb_build_object('Content-Type', 'application/json',
        'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN4ZGtheGplaWJxZG1wdm96aXJ6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ4MzUxMzcsImV4cCI6MjA2MDQxMTEzN30.mjqEyiJX59YLQpjb-_N4qS_3byUY_zpgS2g6X5xqM2U'),
      body := jsonb_build_object('user_id', _payout.representative_id::text, 'title', 'Виплата отримана', 'body', 'Підтвердіть отримання ' || _payout.amount || ' $', 'url', '/representative-panel')
    );
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
END;
$$;

-- ─── RPC: confirm_rep_payout ──────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.confirm_rep_payout(_payout_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _payout RECORD;
  _rep_name text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT * INTO _payout FROM public.representative_payouts WHERE id = _payout_id FOR UPDATE;
  
  IF _payout IS NULL THEN
    RAISE EXCEPTION 'Виплату не знайдено';
  END IF;
  
  IF _payout.representative_id != auth.uid() THEN
    RAISE EXCEPTION 'Доступ заборонено';
  END IF;
  
  IF _payout.status != 'paid' THEN
    RAISE EXCEPTION 'Виплату можна підтвердити лише зі статусом "виплачено"';
  END IF;

  UPDATE public.representative_payouts
  SET status = 'confirmed', confirmed_at = now()
  WHERE id = _payout_id;

  SELECT COALESCE(full_name, 'Представник') INTO _rep_name FROM public.users WHERE id = _payout.representative_id;
  
  PERFORM public.notify_admins_stock_event(
    _rep_name || ' підтвердив отримання виплати ' || _payout.amount || ' $',
    '/admin/payouts'
  );
END;
$$;

-- ─── RPC: admin_force_confirm_rep_payout ──────────────────────────────────
CREATE OR REPLACE FUNCTION public.admin_force_confirm_rep_payout(_payout_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.is_user_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Доступ заборонено';
  END IF;

  UPDATE public.representative_payouts
  SET status = 'confirmed', confirmed_at = now(), admin_notes = COALESCE(admin_notes, '') || ' [Підтверджено адміном]'
  WHERE id = _payout_id AND status = 'paid';
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Виплату не знайдено або вона не у статусі "виплачено"';
  END IF;
END;
$$;
