-- 1) Guardrails against future duplicate finance processing
CREATE UNIQUE INDEX IF NOT EXISTS financial_audit_log_order_id_unique
  ON public.financial_audit_log(order_id);

CREATE UNIQUE INDEX IF NOT EXISTS representative_earnings_order_rep_unique
  ON public.representative_earnings(order_id, representative_id);

CREATE UNIQUE INDEX IF NOT EXISTS specialist_payouts_order_specialist_unique
  ON public.specialist_payouts(order_id, specialist_id);

CREATE OR REPLACE FUNCTION public.prevent_shareholder_payout_order_overlap()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE'
     AND NEW.shareholder_id IS NOT DISTINCT FROM OLD.shareholder_id
     AND NEW.order_ids IS NOT DISTINCT FROM OLD.order_ids THEN
    RETURN NEW;
  END IF;

  IF COALESCE(array_length(NEW.order_ids, 1), 0) = 0 THEN
    RETURN NEW;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.shareholder_payouts p
    WHERE p.shareholder_id = NEW.shareholder_id
      AND p.id <> COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
      AND p.order_ids && NEW.order_ids
  ) THEN
    RAISE EXCEPTION 'Виплата акціонеру за одне з цих замовлень вже існує';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_shareholder_payout_order_overlap_trigger ON public.shareholder_payouts;
CREATE TRIGGER prevent_shareholder_payout_order_overlap_trigger
BEFORE INSERT OR UPDATE ON public.shareholder_payouts
FOR EACH ROW EXECUTE FUNCTION public.prevent_shareholder_payout_order_overlap();

CREATE OR REPLACE FUNCTION public.prevent_representative_payout_order_overlap()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE'
     AND NEW.representative_id IS NOT DISTINCT FROM OLD.representative_id
     AND NEW.order_ids IS NOT DISTINCT FROM OLD.order_ids THEN
    RETURN NEW;
  END IF;

  IF COALESCE(array_length(NEW.order_ids, 1), 0) = 0 THEN
    RETURN NEW;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.representative_payouts p
    WHERE p.representative_id = NEW.representative_id
      AND p.id <> COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
      AND p.order_ids && NEW.order_ids
  ) THEN
    RAISE EXCEPTION 'Виплата представнику за одне з цих замовлень вже існує';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_representative_payout_order_overlap_trigger ON public.representative_payouts;
CREATE TRIGGER prevent_representative_payout_order_overlap_trigger
BEFORE INSERT OR UPDATE ON public.representative_payouts
FOR EACH ROW EXECUTE FUNCTION public.prevent_representative_payout_order_overlap();

-- 2) Make profit processing idempotent and serialized per order
CREATE OR REPLACE FUNCTION public.process_order_profit(_order_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _order RECORD;
  _settings RECORD;
  _unallocated_snapshot NUMERIC;
  _unallocated NUMERIC;
  _order_expenses NUMERIC;
  _covered_from_fund NUMERIC;
  _remaining_expenses NUMERIC;
  _net_profit NUMERIC;
  _rep RECORD;
  _parent RECORD;
  _grandparent RECORD;
  _rep_total_amount NUMERIC := 0;
  _specialists_pool NUMERIC;
  _shares_pool NUMERIC;
  _title_bonus_pool NUMERIC;
  _admin_fund NUMERIC;
  _net_after_reps NUMERIC;
  _sh RECORD;
  _total_shares INTEGER;
  _sh_percent NUMERIC;
  _sh_title_level INTEGER;
  _distributed_title_bonus NUMERIC := 0;
  _unclaimed_title_bonus NUMERIC := 0;
  _level_pool NUMERIC;
  _eligible_shares INTEGER;
  _result JSONB;
  _cfg_total_max NUMERIC;
  _cfg_personal NUMERIC;
  _cfg_manager NUMERIC;
  _cfg_director NUMERIC;
  _pct_specialists NUMERIC;
  _pct_shares NUMERIC;
  _pct_title_bonus NUMERIC;
  _pct_admin_fund NUMERIC;
  _title_bonus_per_level NUMERIC;
  _i INTEGER;
  _min_title_level INTEGER;
  _sh_bonus NUMERIC;
BEGIN
  IF NOT public.is_user_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Доступ заборонено';
  END IF;

  SELECT * INTO _order FROM public.specialist_orders WHERE id = _order_id FOR UPDATE;
  IF _order IS NULL THEN RAISE EXCEPTION 'Замовлення не знайдено'; END IF;
  IF _order.status != 'confirmed' THEN RAISE EXCEPTION 'Замовлення має бути підтверджене'; END IF;
  IF _order.order_amount IS NULL OR _order.order_amount <= 0 THEN RAISE EXCEPTION 'Сума замовлення має бути > 0'; END IF;

  IF EXISTS (SELECT 1 FROM public.financial_audit_log WHERE order_id = _order_id)
     OR EXISTS (SELECT 1 FROM public.shareholder_payouts WHERE order_ids && ARRAY[_order_id])
     OR EXISTS (SELECT 1 FROM public.representative_earnings WHERE order_id = _order_id)
     OR EXISTS (SELECT 1 FROM public.representative_payouts WHERE order_ids && ARRAY[_order_id]) THEN
    RAISE EXCEPTION 'Прибуток за це замовлення вже розподілено. Повторний розрахунок заблоковано, щоб не створити дублікати.';
  END IF;

  SELECT * INTO _settings FROM public.company_settings LIMIT 1 FOR UPDATE;
  _unallocated_snapshot := COALESCE(_settings.unallocated_funds, 0);
  _unallocated := _unallocated_snapshot;
  _order_expenses := COALESCE(_order.order_expenses, 0);
  _total_shares := _settings.total_shares;

  SELECT COALESCE((SELECT value::numeric FROM public.site_settings WHERE id = 'rep-total-max-percent'), 10) / 100.0 INTO _cfg_total_max;
  SELECT COALESCE((SELECT value::numeric FROM public.site_settings WHERE id = 'rep-personal-percent'), 5) / 100.0 INTO _cfg_personal;
  SELECT COALESCE((SELECT value::numeric FROM public.site_settings WHERE id = 'rep-manager-percent'), 3) / 100.0 INTO _cfg_manager;
  SELECT COALESCE((SELECT value::numeric FROM public.site_settings WHERE id = 'rep-director-percent'), 2) / 100.0 INTO _cfg_director;

  SELECT COALESCE((SELECT value::numeric FROM public.site_settings WHERE id = 'profit-specialists-percent'), 50) / 100.0 INTO _pct_specialists;
  SELECT COALESCE((SELECT value::numeric FROM public.site_settings WHERE id = 'profit-shares-percent'), 20) / 100.0 INTO _pct_shares;
  SELECT COALESCE((SELECT value::numeric FROM public.site_settings WHERE id = 'profit-title-bonus-percent'), 17.5) / 100.0 INTO _pct_title_bonus;
  SELECT COALESCE((SELECT value::numeric FROM public.site_settings WHERE id = 'profit-admin-fund-percent'), 12.5) / 100.0 INTO _pct_admin_fund;
  _title_bonus_per_level := _pct_title_bonus / 7.0;

  IF _unallocated >= _order_expenses THEN
    _covered_from_fund := _order_expenses;
    _remaining_expenses := 0;
  ELSE
    _covered_from_fund := _unallocated;
    _remaining_expenses := _order_expenses - _unallocated;
  END IF;
  _unallocated := _unallocated - _covered_from_fund;

  _net_profit := ROUND(GREATEST(0, _order.order_amount - _remaining_expenses), 2);

  IF _net_profit <= 0 THEN
    UPDATE public.company_settings SET unallocated_funds = _unallocated, updated_at = now() WHERE id = _settings.id;
    INSERT INTO public.financial_audit_log (order_id, net_profit, representatives_total, shareholders_total, unallocated_used, unallocated_added)
    VALUES (_order_id, 0, 0, 0, _covered_from_fund, 0);
    RETURN jsonb_build_object(
      'order_id', _order_id, 'order_amount', _order.order_amount, 'order_expenses', _order_expenses,
      'covered_from_fund', _covered_from_fund, 'remaining_expenses', _remaining_expenses,
      'net_profit', 0, 'rep_total_amount', 0, 'net_after_reps', 0,
      'specialists_pool', 0, 'shares_pool', 0, 'title_bonus_pool', 0, 'admin_fund', 0,
      'distributed_title_bonus', 0, 'unclaimed_title_bonus', 0,
      'unallocated_snapshot', _unallocated_snapshot, 'unallocated_funds_after', _unallocated, 'zero_profit', true
    );
  END IF;

  IF _order.representative_id IS NOT NULL THEN
    SELECT * INTO _rep FROM public.representatives WHERE id = _order.representative_id;
    IF _rep IS NOT NULL THEN
      INSERT INTO public.representative_earnings (order_id, representative_id, amount, percent, role_snapshot)
      VALUES (_order_id, _rep.id, ROUND(_net_profit * _cfg_personal, 2), _cfg_personal * 100, _rep.role::text);
      _rep_total_amount := _rep_total_amount + ROUND(_net_profit * _cfg_personal, 2);

      IF _rep.parent_id IS NOT NULL THEN
        SELECT * INTO _parent FROM public.representatives WHERE id = _rep.parent_id;
        IF _parent IS NOT NULL THEN
          INSERT INTO public.representative_earnings (order_id, representative_id, amount, percent, role_snapshot)
          VALUES (_order_id, _parent.id, ROUND(_net_profit * _cfg_manager, 2), _cfg_manager * 100, _parent.role::text);
          _rep_total_amount := _rep_total_amount + ROUND(_net_profit * _cfg_manager, 2);

          IF _parent.parent_id IS NOT NULL THEN
            SELECT * INTO _grandparent FROM public.representatives WHERE id = _parent.parent_id;
            IF _grandparent IS NOT NULL THEN
              INSERT INTO public.representative_earnings (order_id, representative_id, amount, percent, role_snapshot)
              VALUES (_order_id, _grandparent.id, ROUND(_net_profit * _cfg_director, 2), _cfg_director * 100, _grandparent.role::text);
              _rep_total_amount := _rep_total_amount + ROUND(_net_profit * _cfg_director, 2);
            END IF;
          END IF;
        END IF;
      END IF;
    END IF;
  END IF;

  _rep_total_amount := LEAST(_rep_total_amount, ROUND(_net_profit * _cfg_total_max, 2));
  _net_after_reps := ROUND(GREATEST(0, _net_profit - _rep_total_amount), 2);

  _specialists_pool := ROUND(_net_after_reps * _pct_specialists, 2);
  _shares_pool := ROUND(_net_after_reps * _pct_shares, 2);
  _title_bonus_pool := ROUND(_net_after_reps * _pct_title_bonus, 2);
  _admin_fund := ROUND(_net_after_reps * _pct_admin_fund, 2);

  FOR _sh IN
    SELECT s.user_id, s.quantity, u.title
    FROM public.shares s
    JOIN public.users u ON u.id = s.user_id
    WHERE u.is_shareholder = true AND s.quantity > 0
    ORDER BY s.quantity DESC
  LOOP
    _sh_percent := ROUND((_sh.quantity::numeric / _total_shares) * 100, 4);
    INSERT INTO public.shareholder_payouts (
      shareholder_id, amount, base_income, title_bonus,
      shares_at_calculation, share_percent_at_calculation,
      total_shares_snapshot, title_at_calculation,
      order_ids, status
    ) VALUES (
      _sh.user_id,
      ROUND(_shares_pool * (_sh.quantity::numeric / _total_shares), 2),
      ROUND(_shares_pool * (_sh.quantity::numeric / _total_shares), 2),
      0,
      _sh.quantity,
      _sh_percent,
      _total_shares,
      _sh.title,
      ARRAY[_order_id],
      'pending'
    );
  END LOOP;

  FOR _i IN 1..7 LOOP
    _min_title_level := _i;
    _level_pool := ROUND(_net_after_reps * _title_bonus_per_level, 2);

    SELECT COALESCE(SUM(s.quantity), 0) INTO _eligible_shares
    FROM public.shares s
    JOIN public.users u ON u.id = s.user_id
    WHERE u.is_shareholder = true AND s.quantity > 0
      AND (CASE
        WHEN ROUND((s.quantity::numeric / _total_shares) * 100, 4) >= 100 THEN 7
        WHEN ROUND((s.quantity::numeric / _total_shares) * 100, 4) >= 50  THEN 6
        WHEN ROUND((s.quantity::numeric / _total_shares) * 100, 4) >= 40  THEN 5
        WHEN ROUND((s.quantity::numeric / _total_shares) * 100, 4) >= 30  THEN 4
        WHEN ROUND((s.quantity::numeric / _total_shares) * 100, 4) >= 20  THEN 3
        WHEN ROUND((s.quantity::numeric / _total_shares) * 100, 4) >= 10  THEN 2
        WHEN ROUND((s.quantity::numeric / _total_shares) * 100, 4) >= 5   THEN 1
        WHEN ROUND((s.quantity::numeric / _total_shares) * 100, 4) >= 1   THEN 0
        ELSE -1
      END) >= _min_title_level;

    IF _eligible_shares > 0 THEN
      FOR _sh IN
        SELECT s.user_id, s.quantity
        FROM public.shares s
        JOIN public.users u ON u.id = s.user_id
        WHERE u.is_shareholder = true AND s.quantity > 0
          AND (CASE
            WHEN ROUND((s.quantity::numeric / _total_shares) * 100, 4) >= 100 THEN 7
            WHEN ROUND((s.quantity::numeric / _total_shares) * 100, 4) >= 50  THEN 6
            WHEN ROUND((s.quantity::numeric / _total_shares) * 100, 4) >= 40  THEN 5
            WHEN ROUND((s.quantity::numeric / _total_shares) * 100, 4) >= 30  THEN 4
            WHEN ROUND((s.quantity::numeric / _total_shares) * 100, 4) >= 20  THEN 3
            WHEN ROUND((s.quantity::numeric / _total_shares) * 100, 4) >= 10  THEN 2
            WHEN ROUND((s.quantity::numeric / _total_shares) * 100, 4) >= 5   THEN 1
            WHEN ROUND((s.quantity::numeric / _total_shares) * 100, 4) >= 1   THEN 0
            ELSE -1
          END) >= _min_title_level
      LOOP
        _sh_bonus := ROUND(_level_pool * (_sh.quantity::numeric / _eligible_shares), 2);
        UPDATE public.shareholder_payouts
        SET title_bonus = title_bonus + _sh_bonus,
            amount = amount + _sh_bonus
        WHERE shareholder_id = _sh.user_id
          AND order_ids = ARRAY[_order_id];
        _distributed_title_bonus := _distributed_title_bonus + _sh_bonus;
      END LOOP;
    END IF;
  END LOOP;

  _unclaimed_title_bonus := _title_bonus_pool - _distributed_title_bonus;
  _unallocated := _unallocated + _unclaimed_title_bonus;

  UPDATE public.company_settings
  SET unallocated_funds = _unallocated, updated_at = now()
  WHERE id = _settings.id;

  INSERT INTO public.financial_audit_log (order_id, net_profit, representatives_total, shareholders_total, unallocated_used, unallocated_added)
  VALUES (_order_id, _net_profit, _rep_total_amount, _shares_pool, _covered_from_fund, _unclaimed_title_bonus);

  RETURN jsonb_build_object(
    'order_id', _order_id, 'order_amount', _order.order_amount, 'order_expenses', _order_expenses,
    'covered_from_fund', _covered_from_fund, 'remaining_expenses', _remaining_expenses,
    'net_profit', _net_profit, 'rep_total_amount', _rep_total_amount,
    'net_after_reps', _net_after_reps,
    'specialists_pool', _specialists_pool, 'shares_pool', _shares_pool,
    'title_bonus_pool', _title_bonus_pool, 'admin_fund', _admin_fund,
    'distributed_title_bonus', _distributed_title_bonus,
    'unclaimed_title_bonus', _unclaimed_title_bonus,
    'unallocated_snapshot', _unallocated_snapshot,
    'unallocated_funds_after', _unallocated
  );
END;
$$;

-- 3) Admin deletion tool for confirmed/unconfirmed/orphaned order finance
CREATE OR REPLACE FUNCTION public.admin_delete_order_financials(_order_id uuid, _delete_order boolean DEFAULT true)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _deleted_sh int := 0;
  _deleted_sp int := 0;
  _deleted_rp int := 0;
  _deleted_re int := 0;
  _deleted_fa int := 0;
  _deleted_participants int := 0;
  _deleted_orders int := 0;
BEGIN
  IF NOT public.is_user_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Доступ заборонено';
  END IF;

  WITH d AS (
    DELETE FROM public.shareholder_payouts
    WHERE order_ids && ARRAY[_order_id]
    RETURNING 1
  ) SELECT count(*) INTO _deleted_sh FROM d;

  WITH d AS (
    DELETE FROM public.specialist_payouts
    WHERE order_id = _order_id
    RETURNING 1
  ) SELECT count(*) INTO _deleted_sp FROM d;

  WITH d AS (
    DELETE FROM public.representative_payouts
    WHERE order_ids && ARRAY[_order_id]
    RETURNING 1
  ) SELECT count(*) INTO _deleted_rp FROM d;

  WITH d AS (
    DELETE FROM public.representative_earnings
    WHERE order_id = _order_id
    RETURNING 1
  ) SELECT count(*) INTO _deleted_re FROM d;

  WITH d AS (
    DELETE FROM public.financial_audit_log
    WHERE order_id = _order_id
    RETURNING 1
  ) SELECT count(*) INTO _deleted_fa FROM d;

  IF _delete_order THEN
    WITH d AS (
      DELETE FROM public.specialist_order_participants
      WHERE order_id = _order_id
      RETURNING 1
    ) SELECT count(*) INTO _deleted_participants FROM d;

    WITH d AS (
      DELETE FROM public.specialist_orders
      WHERE id = _order_id
      RETURNING 1
    ) SELECT count(*) INTO _deleted_orders FROM d;
  END IF;

  RETURN jsonb_build_object(
    'orders', _deleted_orders,
    'participants', _deleted_participants,
    'shareholder_payouts', _deleted_sh,
    'specialist_payouts', _deleted_sp,
    'representative_payouts', _deleted_rp,
    'representative_earnings', _deleted_re,
    'financial_audit_log', _deleted_fa
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_delete_order_financials(uuid, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_delete_order_financials(uuid, boolean) TO authenticated;

-- 4) Admin integrity report for visible cleanup UI
CREATE OR REPLACE FUNCTION public.admin_finance_integrity_report()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _orphan_payouts jsonb;
  _duplicate_payouts jsonb;
BEGIN
  IF NOT public.is_user_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Доступ заборонено';
  END IF;

  WITH payout_orders AS (
    SELECT 'shareholder'::text AS payout_type, id::text AS payout_id, shareholder_id::text AS beneficiary_id, unnest(order_ids) AS order_id, amount, status, created_at FROM public.shareholder_payouts
    UNION ALL
    SELECT 'representative', id::text, representative_id::text, unnest(order_ids), amount, status, created_at FROM public.representative_payouts
    UNION ALL
    SELECT 'specialist', id::text, specialist_id::text, order_id, amount, status, created_at FROM public.specialist_payouts
  )
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'payout_type', po.payout_type,
    'payout_id', po.payout_id,
    'beneficiary_id', po.beneficiary_id,
    'order_id', po.order_id,
    'amount', po.amount,
    'status', po.status,
    'created_at', po.created_at
  ) ORDER BY po.created_at DESC), '[]'::jsonb)
  INTO _orphan_payouts
  FROM payout_orders po
  LEFT JOIN public.specialist_orders so ON so.id = po.order_id
  WHERE so.id IS NULL;

  WITH payout_orders AS (
    SELECT 'shareholder'::text AS payout_type, id::text AS payout_id, shareholder_id::text AS beneficiary_id, unnest(order_ids) AS order_id, amount, status, created_at FROM public.shareholder_payouts
    UNION ALL
    SELECT 'representative', id::text, representative_id::text, unnest(order_ids), amount, status, created_at FROM public.representative_payouts
    UNION ALL
    SELECT 'specialist', id::text, specialist_id::text, order_id, amount, status, created_at FROM public.specialist_payouts
  ), grouped AS (
    SELECT payout_type, beneficiary_id, order_id, count(*) AS payout_rows, sum(amount) AS total_amount,
           jsonb_agg(jsonb_build_object('payout_id', payout_id, 'amount', amount, 'status', status, 'created_at', created_at) ORDER BY created_at DESC) AS rows
    FROM payout_orders
    GROUP BY payout_type, beneficiary_id, order_id
    HAVING count(*) > 1
  )
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'payout_type', payout_type,
    'beneficiary_id', beneficiary_id,
    'order_id', order_id,
    'payout_rows', payout_rows,
    'total_amount', total_amount,
    'rows', rows
  )), '[]'::jsonb)
  INTO _duplicate_payouts
  FROM grouped;

  RETURN jsonb_build_object(
    'orphan_payouts', _orphan_payouts,
    'duplicate_payouts', _duplicate_payouts,
    'orphan_count', jsonb_array_length(_orphan_payouts),
    'duplicate_count', jsonb_array_length(_duplicate_payouts)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_finance_integrity_report() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_finance_integrity_report() TO authenticated;