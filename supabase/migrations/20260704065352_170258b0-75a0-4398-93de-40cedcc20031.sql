
-- 1. Add is_test flag to specialist_orders
ALTER TABLE public.specialist_orders
  ADD COLUMN IF NOT EXISTS is_test BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS specialist_orders_is_test_idx
  ON public.specialist_orders(is_test) WHERE is_test = true;

-- 2. Admin-only bulk cleanup of all test data
CREATE OR REPLACE FUNCTION public.admin_delete_all_test_data()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _is_admin boolean;
  _test_order_ids uuid[];
  _deleted_sh int := 0;
  _deleted_sp int := 0;
  _deleted_rp int := 0;
  _deleted_re int := 0;
  _deleted_fa int := 0;
  _deleted_orders int := 0;
BEGIN
  -- Auth check: admin only
  SELECT public.has_role(auth.uid(), 'admin'::app_role) INTO _is_admin;
  IF NOT _is_admin THEN
    RAISE EXCEPTION 'Only admins can delete test data';
  END IF;

  -- Collect test order IDs
  SELECT COALESCE(array_agg(id), ARRAY[]::uuid[])
  INTO _test_order_ids
  FROM public.specialist_orders
  WHERE is_test = true;

  IF array_length(_test_order_ids, 1) IS NULL THEN
    RETURN jsonb_build_object(
      'orders', 0, 'shareholder_payouts', 0, 'specialist_payouts', 0,
      'representative_payouts', 0, 'representative_earnings', 0, 'financial_audit_log', 0
    );
  END IF;

  -- Delete shareholder_payouts that reference any test order
  WITH d AS (
    DELETE FROM public.shareholder_payouts
    WHERE order_ids && _test_order_ids
    RETURNING 1
  )
  SELECT count(*) INTO _deleted_sh FROM d;

  -- Delete specialist_payouts by order_id
  WITH d AS (
    DELETE FROM public.specialist_payouts
    WHERE order_id = ANY(_test_order_ids)
    RETURNING 1
  )
  SELECT count(*) INTO _deleted_sp FROM d;

  -- Delete representative_payouts that reference any test order
  WITH d AS (
    DELETE FROM public.representative_payouts
    WHERE order_ids && _test_order_ids
    RETURNING 1
  )
  SELECT count(*) INTO _deleted_rp FROM d;

  -- Delete representative_earnings by order_id
  WITH d AS (
    DELETE FROM public.representative_earnings
    WHERE order_id = ANY(_test_order_ids)
    RETURNING 1
  )
  SELECT count(*) INTO _deleted_re FROM d;

  -- Delete financial_audit_log by order_id
  WITH d AS (
    DELETE FROM public.financial_audit_log
    WHERE order_id = ANY(_test_order_ids)
    RETURNING 1
  )
  SELECT count(*) INTO _deleted_fa FROM d;

  -- Delete participants and orders themselves
  DELETE FROM public.specialist_order_participants WHERE order_id = ANY(_test_order_ids);

  WITH d AS (
    DELETE FROM public.specialist_orders WHERE id = ANY(_test_order_ids) RETURNING 1
  )
  SELECT count(*) INTO _deleted_orders FROM d;

  RETURN jsonb_build_object(
    'orders', _deleted_orders,
    'shareholder_payouts', _deleted_sh,
    'specialist_payouts', _deleted_sp,
    'representative_payouts', _deleted_rp,
    'representative_earnings', _deleted_re,
    'financial_audit_log', _deleted_fa
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_delete_all_test_data() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_delete_all_test_data() TO authenticated;

-- 3. Helper: return counts of what would be deleted (dry run)
CREATE OR REPLACE FUNCTION public.admin_test_data_summary()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _is_admin boolean;
  _test_order_ids uuid[];
  _sh int; _sp int; _rp int; _re int; _fa int; _orders int;
BEGIN
  SELECT public.has_role(auth.uid(), 'admin'::app_role) INTO _is_admin;
  IF NOT _is_admin THEN RAISE EXCEPTION 'Only admins can view test data summary'; END IF;

  SELECT COALESCE(array_agg(id), ARRAY[]::uuid[]) INTO _test_order_ids
  FROM public.specialist_orders WHERE is_test = true;

  _orders := COALESCE(array_length(_test_order_ids, 1), 0);
  IF _orders = 0 THEN
    RETURN jsonb_build_object('orders', 0, 'shareholder_payouts', 0, 'specialist_payouts', 0,
      'representative_payouts', 0, 'representative_earnings', 0, 'financial_audit_log', 0);
  END IF;

  SELECT count(*) INTO _sh FROM public.shareholder_payouts WHERE order_ids && _test_order_ids;
  SELECT count(*) INTO _sp FROM public.specialist_payouts WHERE order_id = ANY(_test_order_ids);
  SELECT count(*) INTO _rp FROM public.representative_payouts WHERE order_ids && _test_order_ids;
  SELECT count(*) INTO _re FROM public.representative_earnings WHERE order_id = ANY(_test_order_ids);
  SELECT count(*) INTO _fa FROM public.financial_audit_log WHERE order_id = ANY(_test_order_ids);

  RETURN jsonb_build_object(
    'orders', _orders,
    'shareholder_payouts', _sh,
    'specialist_payouts', _sp,
    'representative_payouts', _rp,
    'representative_earnings', _re,
    'financial_audit_log', _fa
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_test_data_summary() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_test_data_summary() TO authenticated;
