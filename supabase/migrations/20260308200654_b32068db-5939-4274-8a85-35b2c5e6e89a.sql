
-- Add notes column to market if not exists
ALTER TABLE public.market ADD COLUMN IF NOT EXISTS notes text;

-- Drop and recreate approve_share_transaction with new statuses
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
END;
$function$;

-- Drop and recreate reject_share_transaction with new statuses
CREATE OR REPLACE FUNCTION public.reject_share_transaction(_transaction_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  tx RECORD;
BEGIN
  IF NOT public.is_user_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Доступ заборонено' USING ERRCODE = 'insufficient_privilege';
  END IF;

  SELECT * INTO tx FROM public.transactions WHERE id = _transaction_id FOR UPDATE;
  
  IF tx IS NULL THEN
    RAISE EXCEPTION 'Заявку не знайдено' USING ERRCODE = 'no_data_found';
  END IF;
  
  IF tx.status NOT IN ('pending', 'awaiting_offline_deal') THEN
    RAISE EXCEPTION 'Заявку вже змінено' USING ERRCODE = 'check_violation';
  END IF;

  -- Reject transaction
  UPDATE public.transactions SET status = 'rejected', updated_at = now() WHERE id = _transaction_id;

  -- Re-activate the listing
  IF tx.share_id IS NOT NULL THEN
    UPDATE public.market SET status = 'active', buyer_id = NULL, updated_at = now() WHERE id = tx.share_id;
  END IF;
END;
$function$;
