
-- 1. Додаємо поле unallocated_funds до company_settings
ALTER TABLE public.company_settings
  ADD COLUMN IF NOT EXISTS unallocated_funds NUMERIC NOT NULL DEFAULT 0;

-- 2. Серверна функція: повний розподіл прибутку замовлення
--    з урахуванням unallocated_funds та представників
CREATE OR REPLACE FUNCTION public.process_order_profit(
  _order_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _order RECORD;
  _settings RECORD;
  _unallocated NUMERIC;
  _order_expenses NUMERIC;
  _covered_from_fund NUMERIC;
  _remaining_expenses NUMERIC;
  _net_profit NUMERIC;
  -- representative chain
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
  -- shareholder pools (unchanged formula)
  _specialists_pool NUMERIC;
  _shares_pool NUMERIC;
  _title_bonus_pool NUMERIC;
  _admin_fund NUMERIC;
  _unclaimed_title_bonus NUMERIC := 0;
  _net_after_reps NUMERIC;
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

  -- 2. Load settings
  SELECT * INTO _settings FROM public.company_settings LIMIT 1 FOR UPDATE;
  _unallocated := COALESCE(_settings.unallocated_funds, 0);
  _order_expenses := COALESCE(_order.order_expenses, 0);

  -- STEP 1: Cover expenses from unallocated_funds first
  IF _unallocated >= _order_expenses THEN
    _covered_from_fund := _order_expenses;
    _remaining_expenses := 0;
  ELSE
    _covered_from_fund := _unallocated;
    _remaining_expenses := _order_expenses - _unallocated;
  END IF;

  -- Зменшуємо фонд на покриту суму
  _unallocated := _unallocated - _covered_from_fund;

  -- STEP 2: Net profit = order_amount - залишок витрат (що не покрився з фонду)
  _net_profit := GREATEST(0, _order.order_amount - _remaining_expenses);

  -- STEP 3: Representative pool (якщо є representative_id)
  IF _order.representative_id IS NOT NULL AND _net_profit > 0 THEN
    -- Отримуємо ланцюг: прямий представник
    SELECT * INTO _rep FROM public.representatives WHERE id = _order.representative_id;
    
    IF _rep IS NOT NULL THEN
      -- Визначаємо ролі в ланцюгу
      IF _rep.role::text = 'representative' THEN _has_rep := TRUE; END IF;
      IF _rep.role::text = 'manager' THEN _has_manager := TRUE; END IF;
      IF _rep.role::text = 'director' THEN _has_director := TRUE; END IF;

      -- Parent
      IF _rep.parent_id IS NOT NULL THEN
        SELECT * INTO _parent FROM public.representatives WHERE id = _rep.parent_id;
        IF _parent IS NOT NULL THEN
          IF _parent.role::text = 'manager' THEN _has_manager := TRUE; END IF;
          IF _parent.role::text = 'director' THEN _has_director := TRUE; END IF;
          -- Grandparent
          IF _parent.parent_id IS NOT NULL THEN
            SELECT * INTO _grandparent FROM public.representatives WHERE id = _parent.parent_id;
            IF _grandparent IS NOT NULL THEN
              IF _grandparent.role::text = 'director' THEN _has_director := TRUE; END IF;
            END IF;
          END IF;
        END IF;
      END IF;

      -- Визначення відсотків за комбінацією
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

      -- Зберігаємо earnings для кожного учасника ланцюга
      IF _rep_percent > 0 AND _rep.role::text = 'representative' THEN
        INSERT INTO public.representative_earnings (order_id, representative_id, amount, percent, role_snapshot)
        VALUES (_order_id, _rep.id, _net_profit * _rep_percent, _rep_percent * 100, _rep.role::text);
        _rep_total_amount := _rep_total_amount + _net_profit * _rep_percent;
      END IF;
      
      IF _mgr_percent > 0 THEN
        -- Хто менеджер?
        IF _rep.role::text = 'manager' THEN
          INSERT INTO public.representative_earnings (order_id, representative_id, amount, percent, role_snapshot)
          VALUES (_order_id, _rep.id, _net_profit * _mgr_percent, _mgr_percent * 100, _rep.role::text);
          _rep_total_amount := _rep_total_amount + _net_profit * _mgr_percent;
        ELSIF _parent IS NOT NULL AND _parent.role::text = 'manager' THEN
          INSERT INTO public.representative_earnings (order_id, representative_id, amount, percent, role_snapshot)
          VALUES (_order_id, _parent.id, _net_profit * _mgr_percent, _mgr_percent * 100, _parent.role::text);
          _rep_total_amount := _rep_total_amount + _net_profit * _mgr_percent;
        END IF;
      END IF;

      IF _dir_percent > 0 THEN
        -- Хто директор?
        IF _rep.role::text = 'director' THEN
          INSERT INTO public.representative_earnings (order_id, representative_id, amount, percent, role_snapshot)
          VALUES (_order_id, _rep.id, _net_profit * _dir_percent, _dir_percent * 100, _rep.role::text);
          _rep_total_amount := _rep_total_amount + _net_profit * _dir_percent;
        ELSIF _parent IS NOT NULL AND _parent.role::text = 'director' THEN
          INSERT INTO public.representative_earnings (order_id, representative_id, amount, percent, role_snapshot)
          VALUES (_order_id, _parent.id, _net_profit * _dir_percent, _dir_percent * 100, _parent.role::text);
          _rep_total_amount := _rep_total_amount + _net_profit * _dir_percent;
        ELSIF _grandparent IS NOT NULL AND _grandparent.role::text = 'director' THEN
          INSERT INTO public.representative_earnings (order_id, representative_id, amount, percent, role_snapshot)
          VALUES (_order_id, _grandparent.id, _net_profit * _dir_percent, _dir_percent * 100, _grandparent.role::text);
          _rep_total_amount := _rep_total_amount + _net_profit * _dir_percent;
        END IF;
      END IF;
    END IF;
  END IF;

  -- Cap at 10%
  _rep_total_amount := LEAST(_rep_total_amount, _net_profit * 0.10);

  -- Net after reps
  _net_after_reps := GREATEST(0, _net_profit - _rep_total_amount);

  -- Shareholder pools (UNCHANGED formula: 50/20/17.5/12.5)
  _specialists_pool := _net_after_reps * 0.50;
  _shares_pool := _net_after_reps * 0.20;
  _title_bonus_pool := _net_after_reps * 0.175;
  _admin_fund := _net_after_reps * 0.125;

  -- STEP 4: Залишок (unclaimed) повертається у unallocated_funds
  -- На цьому етапі unclaimed = title_bonus_pool (повний, бо деталізація по акціонерах
  -- відбувається в PayoutsTab). Тут зберігаємо лише admin_fund як джерело.
  -- Користувач зазначив: джерело = залишок після розподілу
  _unallocated := _unallocated + _admin_fund;

  -- Оновлюємо баланс фонду
  UPDATE public.company_settings
  SET unallocated_funds = _unallocated,
      updated_at = now()
  WHERE id = _settings.id;

  -- Формуємо результат
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
    'unallocated_funds_after', _unallocated
  );

  RETURN _result;
END;
$$;
