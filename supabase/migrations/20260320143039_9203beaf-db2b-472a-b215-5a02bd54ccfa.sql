
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
  _has_rep BOOLEAN := FALSE;
  _has_manager BOOLEAN := FALSE;
  _has_director BOOLEAN := FALSE;
  _rep_percent NUMERIC := 0;
  _mgr_percent NUMERIC := 0;
  _dir_percent NUMERIC := 0;
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
BEGIN
  -- Admin-only
  IF NOT public.is_user_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Доступ заборонено';
  END IF;

  -- 1. Load order
  SELECT * INTO _order FROM public.specialist_orders WHERE id = _order_id;
  IF _order IS NULL THEN
    RAISE EXCEPTION 'Замовлення не знайдено';
  END IF;
  IF _order.status != 'confirmed' THEN
    RAISE EXCEPTION 'Замовлення має бути підтверджене';
  END IF;
  IF _order.order_amount IS NULL OR _order.order_amount <= 0 THEN
    RAISE EXCEPTION 'Сума замовлення має бути > 0';
  END IF;

  -- 2. Load settings (FOR UPDATE = row lock)
  SELECT * INTO _settings FROM public.company_settings LIMIT 1 FOR UPDATE;
  _unallocated_snapshot := COALESCE(_settings.unallocated_funds, 0);
  _unallocated := _unallocated_snapshot;
  _order_expenses := COALESCE(_order.order_expenses, 0);
  _total_shares := _settings.total_shares;

  -- STEP 1: Cover expenses from unallocated_funds snapshot
  IF _unallocated >= _order_expenses THEN
    _covered_from_fund := _order_expenses;
    _remaining_expenses := 0;
  ELSE
    _covered_from_fund := _unallocated;
    _remaining_expenses := _order_expenses - _unallocated;
  END IF;
  _unallocated := _unallocated - _covered_from_fund;

  -- STEP 2: Net profit
  _net_profit := ROUND(GREATEST(0, _order.order_amount - _remaining_expenses), 2);

  -- GUARD: zero profit → no distributions
  IF _net_profit <= 0 THEN
    UPDATE public.company_settings
    SET unallocated_funds = _unallocated,
        updated_at = now()
    WHERE id = _settings.id;

    _result := jsonb_build_object(
      'order_id', _order_id,
      'order_amount', _order.order_amount,
      'order_expenses', _order_expenses,
      'covered_from_fund', _covered_from_fund,
      'remaining_expenses', _remaining_expenses,
      'net_profit', 0,
      'rep_total_amount', 0,
      'net_after_reps', 0,
      'specialists_pool', 0,
      'shares_pool', 0,
      'title_bonus_pool', 0,
      'admin_fund', 0,
      'distributed_title_bonus', 0,
      'unclaimed_title_bonus', 0,
      'unallocated_snapshot', _unallocated_snapshot,
      'unallocated_funds_after', _unallocated,
      'zero_profit', true
    );

    RAISE NOTICE '[process_order_profit] order=% ZERO-PROFIT result=%', _order_id, _result;
    RETURN _result;
  END IF;

  -- STEP 3: Representative pool
  IF _order.representative_id IS NOT NULL THEN
    SELECT * INTO _rep FROM public.representatives WHERE id = _order.representative_id;

    IF _rep IS NOT NULL THEN
      IF _rep.role::text = 'representative' THEN _has_rep := TRUE; END IF;
      IF _rep.role::text = 'manager' THEN _has_manager := TRUE; END IF;
      IF _rep.role::text = 'director' THEN _has_director := TRUE; END IF;

      IF _rep.parent_id IS NOT NULL THEN
        SELECT * INTO _parent FROM public.representatives WHERE id = _rep.parent_id;
        IF _parent IS NOT NULL THEN
          IF _parent.role::text = 'manager' THEN _has_manager := TRUE; END IF;
          IF _parent.role::text = 'director' THEN _has_director := TRUE; END IF;
          IF _parent.parent_id IS NOT NULL THEN
            SELECT * INTO _grandparent FROM public.representatives WHERE id = _parent.parent_id;
            IF _grandparent IS NOT NULL THEN
              IF _grandparent.role::text = 'director' THEN _has_director := TRUE; END IF;
            END IF;
          END IF;
        END IF;
      END IF;

      IF _has_rep AND _has_manager AND _has_director THEN
        _rep_percent := 0.05; _mgr_percent := 0.03; _dir_percent := 0.02;
      ELSIF _has_rep AND _has_manager THEN
        _rep_percent := 0.05; _mgr_percent := 0.03;
      ELSIF _has_manager AND _has_director THEN
        _mgr_percent := 0.08; _dir_percent := 0.02;
      ELSIF _has_rep THEN
        _rep_percent := 0.05;
      ELSIF _has_manager THEN
        _mgr_percent := 0.08;
      ELSIF _has_director THEN
        _dir_percent := 0.10;
      END IF;

      IF _rep_percent > 0 AND _rep.role::text = 'representative' THEN
        INSERT INTO public.representative_earnings (order_id, representative_id, amount, percent, role_snapshot)
        VALUES (_order_id, _rep.id, ROUND(_net_profit * _rep_percent, 2), _rep_percent * 100, _rep.role::text);
        _rep_total_amount := _rep_total_amount + ROUND(_net_profit * _rep_percent, 2);
      END IF;

      IF _mgr_percent > 0 THEN
        IF _rep.role::text = 'manager' THEN
          INSERT INTO public.representative_earnings (order_id, representative_id, amount, percent, role_snapshot)
          VALUES (_order_id, _rep.id, ROUND(_net_profit * _mgr_percent, 2), _mgr_percent * 100, _rep.role::text);
          _rep_total_amount := _rep_total_amount + ROUND(_net_profit * _mgr_percent, 2);
        ELSIF _parent IS NOT NULL AND _parent.role::text = 'manager' THEN
          INSERT INTO public.representative_earnings (order_id, representative_id, amount, percent, role_snapshot)
          VALUES (_order_id, _parent.id, ROUND(_net_profit * _mgr_percent, 2), _mgr_percent * 100, _parent.role::text);
          _rep_total_amount := _rep_total_amount + ROUND(_net_profit * _mgr_percent, 2);
        END IF;
      END IF;

      IF _dir_percent > 0 THEN
        IF _rep.role::text = 'director' THEN
          INSERT INTO public.representative_earnings (order_id, representative_id, amount, percent, role_snapshot)
          VALUES (_order_id, _rep.id, ROUND(_net_profit * _dir_percent, 2), _dir_percent * 100, _rep.role::text);
          _rep_total_amount := _rep_total_amount + ROUND(_net_profit * _dir_percent, 2);
        ELSIF _parent IS NOT NULL AND _parent.role::text = 'director' THEN
          INSERT INTO public.representative_earnings (order_id, representative_id, amount, percent, role_snapshot)
          VALUES (_order_id, _parent.id, ROUND(_net_profit * _dir_percent, 2), _dir_percent * 100, _parent.role::text);
          _rep_total_amount := _rep_total_amount + ROUND(_net_profit * _dir_percent, 2);
        ELSIF _grandparent IS NOT NULL AND _grandparent.role::text = 'director' THEN
          INSERT INTO public.representative_earnings (order_id, representative_id, amount, percent, role_snapshot)
          VALUES (_order_id, _grandparent.id, ROUND(_net_profit * _dir_percent, 2), _dir_percent * 100, _grandparent.role::text);
          _rep_total_amount := _rep_total_amount + ROUND(_net_profit * _dir_percent, 2);
        END IF;
      END IF;
    END IF;
  END IF;

  _rep_total_amount := LEAST(_rep_total_amount, ROUND(_net_profit * 0.10, 2));
  _net_after_reps := ROUND(GREATEST(0, _net_profit - _rep_total_amount), 2);

  -- STEP 4: Shareholder pools (50/20/17.5/12.5) — rounded to cents
  _specialists_pool := ROUND(_net_after_reps * 0.50, 2);
  _shares_pool := ROUND(_net_after_reps * 0.20, 2);
  _title_bonus_pool := ROUND(_net_after_reps * 0.175, 2);
  _admin_fund := ROUND(_net_after_reps * 0.125, 2);

  -- Title bonus: 7 levels × 2.5%
  IF _total_shares > 0 AND _net_after_reps > 0 THEN
    _level_pool := ROUND(_net_after_reps * 0.025, 2);

    FOR i IN 1..7 LOOP
      _eligible_shares := 0;

      FOR _sh IN SELECT s.user_id, s.quantity FROM public.shares s WHERE s.quantity > 0 LOOP
        _sh_percent := (_sh.quantity::numeric / _total_shares) * 100;
        _sh_title_level := 0;
        IF _sh_percent >= 50 THEN _sh_title_level := 7;
        ELSIF _sh_percent >= 40 THEN _sh_title_level := 6;
        ELSIF _sh_percent >= 30 THEN _sh_title_level := 5;
        ELSIF _sh_percent >= 20 THEN _sh_title_level := 4;
        ELSIF _sh_percent >= 10 THEN _sh_title_level := 3;
        ELSIF _sh_percent >= 5 THEN _sh_title_level := 2;
        ELSIF _sh_percent >= 1 THEN _sh_title_level := 1;
        END IF;

        IF _sh_title_level >= i THEN
          _eligible_shares := _eligible_shares + _sh.quantity;
        END IF;
      END LOOP;

      IF _eligible_shares > 0 THEN
        _distributed_title_bonus := _distributed_title_bonus + _level_pool;
      END IF;
    END LOOP;

    _unclaimed_title_bonus := ROUND(GREATEST(0, _title_bonus_pool - _distributed_title_bonus), 2);
  ELSE
    _unclaimed_title_bonus := _title_bonus_pool;
  END IF;

  -- STEP 5: Add unclaimed to unallocated (ONLY at the end)
  _unallocated := ROUND(_unallocated + _unclaimed_title_bonus, 2);

  UPDATE public.company_settings
  SET unallocated_funds = _unallocated,
      updated_at = now()
  WHERE id = _settings.id;

  _result := jsonb_build_object(
    'order_id', _order_id,
    'order_amount', _order.order_amount,
    'order_expenses', _order_expenses,
    'covered_from_fund', _covered_from_fund,
    'remaining_expenses', _remaining_expenses,
    'net_profit', _net_profit,
    'rep_total_amount', _rep_total_amount,
    'net_after_reps', _net_after_reps,
    'specialists_pool', _specialists_pool,
    'shares_pool', _shares_pool,
    'title_bonus_pool', _title_bonus_pool,
    'admin_fund', _admin_fund,
    'distributed_title_bonus', _distributed_title_bonus,
    'unclaimed_title_bonus', _unclaimed_title_bonus,
    'unallocated_snapshot', _unallocated_snapshot,
    'unallocated_funds_after', _unallocated
  );

  RAISE NOTICE '[process_order_profit] order=% net_profit=% reps=% shareholders_net=% unallocated_used=% unallocated_added=%',
    _order_id, _net_profit, _rep_total_amount, _net_after_reps, _covered_from_fund, _unclaimed_title_bonus;

  RETURN _result;
END;
$$;
