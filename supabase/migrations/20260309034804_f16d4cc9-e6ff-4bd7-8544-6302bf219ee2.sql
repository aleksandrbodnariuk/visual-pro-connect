
CREATE OR REPLACE FUNCTION public.cancel_share_transaction(_transaction_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  tx RECORD;
  _buyer_name text;
BEGIN
  SELECT * INTO tx FROM public.transactions WHERE id = _transaction_id FOR UPDATE;

  IF tx IS NULL THEN
    RAISE EXCEPTION 'Заявку не знайдено' USING ERRCODE = 'no_data_found';
  END IF;

  IF tx.status != 'pending' THEN
    RAISE EXCEPTION 'Тільки pending-заявку можна скасувати' USING ERRCODE = 'check_violation';
  END IF;

  -- Only buyer or admin can cancel
  IF tx.buyer_id != auth.uid() AND NOT public.is_user_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Доступ заборонено' USING ERRCODE = 'insufficient_privilege';
  END IF;

  -- Delete the transaction
  DELETE FROM public.transactions WHERE id = _transaction_id;

  -- Only after successful delete, notify seller
  SELECT COALESCE(full_name, 'Покупець') INTO _buyer_name FROM public.users WHERE id = tx.buyer_id;

  PERFORM public.create_stock_notification(
    tx.seller_id,
    _buyer_name || ' скасував заявку на ' || tx.quantity || ' акцій',
    '/stock-market?tab=my-offers'
  );
END;
$$;
