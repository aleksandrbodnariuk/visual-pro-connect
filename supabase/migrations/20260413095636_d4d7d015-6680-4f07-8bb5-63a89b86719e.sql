
-- Create specialist_payouts table
CREATE TABLE public.specialist_payouts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  specialist_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  amount numeric NOT NULL DEFAULT 0,
  order_id uuid NOT NULL REFERENCES public.specialist_orders(id) ON DELETE CASCADE,
  role_at_calculation text,
  status text NOT NULL DEFAULT 'pending',
  notes text,
  admin_notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  paid_at timestamp with time zone,
  paid_by uuid REFERENCES public.users(id),
  confirmed_at timestamp with time zone
);

-- Enable RLS
ALTER TABLE public.specialist_payouts ENABLE ROW LEVEL SECURITY;

-- Admin full access
CREATE POLICY "Admins full access to spec payouts"
ON public.specialist_payouts FOR ALL
USING (is_user_admin(auth.uid()))
WITH CHECK (is_user_admin(auth.uid()));

-- Specialists can view own payouts
CREATE POLICY "Specialists can view own payouts"
ON public.specialist_payouts FOR SELECT
TO authenticated
USING (specialist_id = auth.uid());

-- Specialists can confirm own payouts (paid -> confirmed)
CREATE POLICY "Specialists can confirm own payouts"
ON public.specialist_payouts FOR UPDATE
TO authenticated
USING (specialist_id = auth.uid() AND status = 'paid')
WITH CHECK (specialist_id = auth.uid() AND status = 'confirmed');

-- Index for fast lookups
CREATE INDEX idx_specialist_payouts_specialist ON public.specialist_payouts(specialist_id);
CREATE INDEX idx_specialist_payouts_order ON public.specialist_payouts(order_id);
CREATE INDEX idx_specialist_payouts_status ON public.specialist_payouts(status);

-- RPC: mark_spec_payout_paid
CREATE OR REPLACE FUNCTION public.mark_spec_payout_paid(_payout_id uuid, _admin_notes text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT is_user_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;
  UPDATE specialist_payouts
  SET status = 'paid', paid_at = now(), paid_by = auth.uid(), admin_notes = _admin_notes
  WHERE id = _payout_id AND status = 'pending';
END;
$$;

-- RPC: admin_force_confirm_spec_payout
CREATE OR REPLACE FUNCTION public.admin_force_confirm_spec_payout(_payout_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT is_user_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;
  UPDATE specialist_payouts
  SET status = 'confirmed', confirmed_at = now()
  WHERE id = _payout_id AND status = 'paid';
END;
$$;

-- RPC: confirm_spec_payout (specialist confirms receipt)
CREATE OR REPLACE FUNCTION public.confirm_spec_payout(_payout_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE specialist_payouts
  SET status = 'confirmed', confirmed_at = now()
  WHERE id = _payout_id AND specialist_id = auth.uid() AND status = 'paid';
END;
$$;
