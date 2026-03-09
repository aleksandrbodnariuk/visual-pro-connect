
-- Function: get confirmed orders with financials for shareholder forecast
-- SECURITY DEFINER so shareholders can read confirmed orders
-- (existing RLS only allows specialists/admins to read specialist_orders)
CREATE OR REPLACE FUNCTION public.get_confirmed_orders_for_forecast()
RETURNS TABLE(
  id uuid,
  title text,
  order_date date,
  order_amount numeric,
  order_expenses numeric,
  status text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only authenticated shareholders (or admins) can call this
  IF auth.uid() IS NULL THEN
    RETURN;
  END IF;

  IF NOT (
    public.has_role(auth.uid(), 'shareholder'::app_role) OR
    public.is_user_admin(auth.uid())
  ) THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    so.id,
    so.title,
    so.order_date,
    so.order_amount,
    so.order_expenses,
    so.status
  FROM public.specialist_orders so
  WHERE so.status = 'confirmed'
    AND so.order_amount IS NOT NULL
    AND so.order_expenses IS NOT NULL
  ORDER BY so.order_date DESC;
END;
$$;

-- Also need to fetch all shareholders' share quantities for the calculation
-- (shareholder needs to know all shareholders to compute title bonuses correctly)
CREATE OR REPLACE FUNCTION public.get_all_shareholders_shares()
RETURNS TABLE(
  user_id uuid,
  quantity integer
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN;
  END IF;

  IF NOT (
    public.has_role(auth.uid(), 'shareholder'::app_role) OR
    public.is_user_admin(auth.uid())
  ) THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT s.user_id, s.quantity
  FROM public.shares s
  WHERE s.quantity > 0;
END;
$$;
