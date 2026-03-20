
-- Seed 4 profit distribution settings with defaults matching current hardcoded values
INSERT INTO public.site_settings (id, value) VALUES
  ('profit-specialists-percent', '50'),
  ('profit-shares-percent', '20'),
  ('profit-title-bonus-percent', '17.5'),
  ('profit-admin-fund-percent', '12.5')
ON CONFLICT (id) DO NOTHING;

-- Update process_order_profit to read distribution percentages from site_settings
CREATE OR REPLACE FUNCTION public.process_order_profit(_order_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
  _cfg_total_max NUMERIC;
  _cfg_personal NUMERIC;
  _cfg_manager NUMERIC;
  _cfg_director NUMERIC;
  -- NEW: configurable profit distribution percentages
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

  SELECT * INTO _order FROM public.specialist_orders WHERE id = _order_id;
  IF _order IS NULL THEN RAISE EXCEPTION 'Замовлення не знайдено'; END IF;
  IF _order.status != 'confirmed' THEN RAISE EXCEPTION 'Замовлення має бути підтверджене'; END IF;
  IF _order.order_amount IS NULL OR _order.order_amount <= 0 THEN RAISE EXCEPTION 'Сума замовлення має бути > 0'; END IF;

  SELECT * INTO _settings FROM public.company_settings LIMIT 1 FOR UPDATE;
  _unallocated_snapshot := COALESCE(_settings.unallocated_funds, 0);
  _unallocated := _unallocated_snapshot;
  _order_expenses := COALESCE(_order.order_expenses, 0);
  _total_shares := _settings.total_shares;

  -- Load rep commission config
  SELECT COALESCE((SELECT value::numeric FROM public.site_settings WHERE id = 'rep-total-max-percent'), 10) / 100.0 INTO _cfg_total_max;
  SELECT COALESCE((SELECT value::numeric FROM public.site_settings WHERE id = 'rep-personal-percent'), 5) / 100.0 INTO _cfg_personal;
  SELECT COALESCE((SELECT value::numeric FROM public.site_settings WHERE id = 'rep-manager-percent'), 3) / 100.0 INTO _cfg_manager;
  SELECT COALESCE((SELECT value::numeric FROM public.site_settings WHERE id = 'rep-director-percent'), 2) / 100.0 INTO _cfg_director;

  -- Load configurable profit distribution percentages
  SELECT COALESCE((SELECT value::numeric FROM public.site_settings WHERE id = 'profit-specialists-percent'), 50) / 100.0 INTO _pct_specialists;
  SELECT COALESCE((SELECT value::numeric FROM public.site_settings WHERE id = 'profit-shares-percent'), 20) / 100.0 INTO _pct_shares;
  SELECT COALESCE((SELECT value::numeric FROM public.site_settings WHERE id = 'profit-title-bonus-percent'), 17.5) / 100.0 INTO _pct_title_bonus;
  SELECT COALESCE((SELECT value::numeric FROM public.site_settings WHERE id = 'profit-admin-fund-percent'), 12.5) / 100.0 INTO _pct_admin_fund;
  _title_bonus_per_level := _pct_title_bonus / 7.0;

  -- Expenses coverage from unallocated funds
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
    _result := jsonb_build_object(
      'order_id', _order_id, 'order_amount', _order.order_amount, 'order_expenses', _order_expenses,
      'covered_from_fund', _covered_from_fund, 'remaining_expenses', _remaining_expenses,
      'net_profit', 0, 'rep_total_amount', 0, 'net_after_reps', 0,
      'specialists_pool', 0, 'shares_pool', 0, 'title_bonus_pool', 0, 'admin_fund', 0,
      'distributed_title_bonus', 0, 'unclaimed_title_bonus', 0,
      'unallocated_snapshot', _unallocated_snapshot, 'unallocated_funds_after', _unallocated, 'zero_profit', true
    );
    RETURN _result;
  END IF;

  -- Representative commissions (unchanged logic)
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

      -- Personal order = only personalPercent regardless of role level
      IF _has_rep AND _has_manager AND _has_director THEN
        _rep_percent := _cfg_personal; _mgr_percent := _cfg_manager; _dir_percent := _cfg_director;
      ELSIF _has_rep AND _has_manager THEN
        _rep_percent := _cfg_personal; _mgr_percent := _cfg_manager;
      ELSIF _has_manager AND _has_director THEN
        _mgr_percent := _cfg_personal; _dir_percent := _cfg_director;
      ELSIF _has_rep THEN
        _rep_percent := _cfg_personal;
      ELSIF _has_manager THEN
        _mgr_percent := _cfg_personal;
      ELSIF _has_director THEN
        _dir_percent := _cfg_personal;
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

  _rep_total_amount := LEAST(_rep_total_amount, ROUND(_net_profit * _cfg_total_max, 2));
  _net_after_reps := ROUND(GREATEST(0, _net_profit - _rep_total_amount), 2);

  -- Use configurable percentages instead of hardcoded values
  _specialists_pool := ROUND(_net_after_reps * _pct_specialists, 2);
  _shares_pool := ROUND(_net_after_reps * _pct_shares, 2);
  _title_bonus_pool := ROUND(_net_after_reps * _pct_title_bonus, 2);
  _admin_fund := ROUND(_net_after_reps * _pct_admin_fund, 2);

  -- Shareholder base income payouts
  FOR _sh IN
    SELECT s.user_id, s.quantity, u.title
    FROM public.shares s
    JOIN public.users u ON u.id = s.user_id
    WHERE u.is_shareholder = true AND s.quantity > 0
    ORDER BY s.quantity DESC
  LOOP
    _sh_percent := ROUND((_sh.quantity::numeric / _total_shares) * 100, 4);
    
    -- Title level based on thresholds matching client-side logic
    _sh_title_level := CASE
      WHEN _sh_percent >= 100 THEN 7
      WHEN _sh_percent >= 50  THEN 6
      WHEN _sh_percent >= 40  THEN 5
      WHEN _sh_percent >= 30  THEN 4
      WHEN _sh_percent >= 20  THEN 3
      WHEN _sh_percent >= 10  THEN 2
      WHEN _sh_percent >= 5   THEN 1
      WHEN _sh_percent >= 1   THEN 0
      ELSE -1
    END;

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

  -- Title bonus distribution: 7 levels, each gets titleBonusPool / 7
  FOR _i IN 1..7 LOOP
    _min_title_level := _i; -- level 1 = Магнат(>=5%), 2 = Барон(>=10%), etc.
    _level_pool := ROUND(_net_after_reps * _title_bonus_per_level, 2);
    
    -- Count eligible shares for this level
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
      -- Distribute this level's pool among eligible shareholders
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
        -- Update the payout record to add this title bonus
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

  _result := jsonb_build_object(
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
  RETURN _result;
END;
$function$;
