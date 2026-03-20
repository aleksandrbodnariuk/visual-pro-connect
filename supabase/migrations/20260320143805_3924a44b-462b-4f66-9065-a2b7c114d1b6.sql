
-- Read-only RPC for admins to query audit log by order_id
CREATE OR REPLACE FUNCTION public.get_financial_audit_log(_order_id uuid DEFAULT NULL)
RETURNS SETOF public.financial_audit_log
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT *
  FROM public.financial_audit_log
  WHERE (_order_id IS NULL OR order_id = _order_id)
  ORDER BY created_at DESC;
$$;
