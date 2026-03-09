
-- 1. Create share_transfer_log table for tracking all confirmed transfers
CREATE TABLE public.share_transfer_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid REFERENCES public.market(id) ON DELETE SET NULL,
  transaction_id uuid REFERENCES public.transactions(id) ON DELETE SET NULL,
  from_user_id uuid NOT NULL,
  to_user_id uuid NOT NULL,
  shares_qty integer NOT NULL,
  price_per_share_usd numeric NOT NULL DEFAULT 0,
  total_amount_usd numeric NOT NULL DEFAULT 0,
  confirmed_by uuid,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 2. Enable RLS
ALTER TABLE public.share_transfer_log ENABLE ROW LEVEL SECURITY;

-- 3. Users can view their own transfers, admins can view all
CREATE POLICY "Users can view own transfers"
  ON public.share_transfer_log
  FOR SELECT
  USING (from_user_id = auth.uid() OR to_user_id = auth.uid() OR is_user_admin(auth.uid()));

-- 4. Only via RPC (admin context) can insert
CREATE POLICY "System can insert transfers"
  ON public.share_transfer_log
  FOR INSERT
  WITH CHECK (is_user_admin(auth.uid()));

-- 5. Update approve_share_transaction to log transfers
CREATE OR REPLACE FUNCTION public.approve_share_transaction(_transaction_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  tx RECORD;
  seller_shares integer;
BEGIN
  IF NOT public.is_user_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Доступ заборонено' USING ERRCODE = 'insufficient_privilege';
  END IF;

  SELECT * INTO tx FROM public.transactions WHERE id = _transaction_id FOR UPDATE;
  
  IF tx IS NULL THEN
    RAISE EXCEPTION 'Заявку не знайдено' USING ERRCODE = 'no_data_found';
  END IF;
  
  IF tx.status NOT IN ('pending', 'awaiting_offline_deal') THEN
    RAISE EXCEPTION 'Заявку вже змінено іншим користувачем' USING ERRCODE = 'check_violation';
  END IF;

  SELECT quantity INTO seller_shares FROM public.shares WHERE user_id = tx.seller_id FOR UPDATE;
  
  IF seller_shares IS NULL OR seller_shares < tx.quantity THEN
    RAISE EXCEPTION 'Недостатньо часток у продавця для завершення передачі' USING ERRCODE = 'check_violation';
  END IF;

  -- Deduct from seller
  UPDATE public.shares SET quantity = quantity - tx.quantity WHERE user_id = tx.seller_id;

  -- Add to buyer (upsert)
  INSERT INTO public.shares (user_id, quantity)
  VALUES (tx.buyer_id, tx.quantity)
  ON CONFLICT (user_id) DO UPDATE SET quantity = shares.quantity + EXCLUDED.quantity;

  -- Mark transaction as approved
  UPDATE public.transactions 
  SET status = 'approved', approved_by_admin = true, updated_at = now()
  WHERE id = _transaction_id;

  -- Mark the market listing as completed
  IF tx.share_id IS NOT NULL THEN
    UPDATE public.market SET status = 'completed', updated_at = now() WHERE id = tx.share_id;
  END IF;
  
  -- If buyer is not yet a shareholder, mark them
  UPDATE public.users SET is_shareholder = true WHERE id = tx.buyer_id AND is_shareholder = false;
  
  -- Add shareholder role if not exists
  INSERT INTO public.user_roles (user_id, role)
  VALUES (tx.buyer_id, 'shareholder'::app_role)
  ON CONFLICT (user_id, role) DO NOTHING;

  -- Log the transfer
  INSERT INTO public.share_transfer_log (
    listing_id, transaction_id, from_user_id, to_user_id,
    shares_qty, price_per_share_usd, total_amount_usd, confirmed_by
  ) VALUES (
    tx.share_id, _transaction_id, tx.seller_id, tx.buyer_id,
    tx.quantity, COALESCE(tx.price_per_share, 0), tx.total_price, auth.uid()
  );
END;
$function$;
