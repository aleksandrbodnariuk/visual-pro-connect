ALTER TABLE public.shares ALTER COLUMN quantity TYPE numeric(14,4);
ALTER TABLE public.company_settings ALTER COLUMN total_shares TYPE numeric(14,4);

CREATE OR REPLACE FUNCTION public.validate_shares_quantity()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE max_total numeric; other_shares numeric;
BEGIN
  IF NEW.quantity < 0 THEN
    RAISE EXCEPTION 'Кількість акцій не може бути від''ємною' USING ERRCODE = 'check_violation';
  END IF;
  SELECT total_shares INTO max_total FROM public.company_settings LIMIT 1;
  IF max_total IS NULL THEN RAISE EXCEPTION 'company_settings not found'; END IF;
  SELECT COALESCE(SUM(quantity),0) INTO other_shares FROM public.shares WHERE user_id <> NEW.user_id;
  IF other_shares + NEW.quantity > max_total THEN
    RAISE EXCEPTION 'Неможливо видати більше акцій, ніж визначено в компанії. Ліміт: %, вже видано: %, запитано: %', max_total, other_shares, NEW.quantity USING ERRCODE='check_violation';
  END IF;
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.validate_total_shares_decrease()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE issued numeric;
BEGIN
  IF NEW.total_shares < OLD.total_shares THEN
    SELECT COALESCE(SUM(quantity),0) INTO issued FROM public.shares;
    IF NEW.total_shares < issued THEN
      RAISE EXCEPTION 'Не можна зменшити загальну кількість акцій нижче вже виданих (%)', issued USING ERRCODE='check_violation';
    END IF;
  END IF;
  RETURN NEW;
END $$;
REVOKE EXECUTE ON FUNCTION public.validate_shares_quantity() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.validate_total_shares_decrease() FROM PUBLIC, anon, authenticated;

CREATE TABLE public.asset_capital_contributions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  operation_id uuid NOT NULL,
  user_id uuid NOT NULL,
  amount_usd numeric(14,2) NOT NULL,
  share_price_usd numeric NOT NULL,
  shares_issued numeric(14,4) NOT NULL,
  old_item_name text,
  sale_amount_usd numeric(14,2) NOT NULL DEFAULT 0,
  new_item_id uuid,
  new_item_name text NOT NULL,
  new_item_price_usd numeric(14,2) NOT NULL,
  note text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.asset_capital_contributions TO authenticated;
GRANT ALL ON public.asset_capital_contributions TO service_role;
ALTER TABLE public.asset_capital_contributions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins or contributor read contributions" ON public.asset_capital_contributions
  FOR SELECT TO authenticated USING (public.is_user_admin(auth.uid()) OR user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.asset_upgrade_with_contribution(
  _old_item_id uuid, _sale_amount numeric, _category_id uuid, _new_name text,
  _new_description text, _new_price numeric, _condition text, _acquired_at date,
  _contributions jsonb, _note text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _price numeric; _sale numeric := COALESCE(_sale_amount,0); _extra numeric;
  _sum numeric := 0; _c jsonb; _uid uuid; _amt numeric; _qty numeric; _total_new numeric := 0;
  _op uuid := gen_random_uuid(); _new_id uuid; _old_name text;
BEGIN
  IF NOT public.is_user_admin(auth.uid()) THEN RAISE EXCEPTION 'Лише адміністратор може проводити цю операцію'; END IF;
  IF COALESCE(trim(_new_name),'') = '' THEN RAISE EXCEPTION 'Вкажіть назву нового майна'; END IF;
  IF _new_price IS NULL OR _new_price <= 0 THEN RAISE EXCEPTION 'Вартість нового майна має бути більшою за 0'; END IF;
  IF _sale < 0 THEN RAISE EXCEPTION 'Сума продажу не може бути від''ємною'; END IF;
  _extra := round(_new_price - _sale, 2);
  IF _extra < 0 THEN RAISE EXCEPTION 'Сума продажу перевищує вартість нового майна — доплата не потрібна'; END IF;

  SELECT share_price_usd INTO _price FROM public.company_settings LIMIT 1 FOR UPDATE;
  IF _price IS NULL OR _price <= 0 THEN RAISE EXCEPTION 'Не встановлено офіційний курс акції'; END IF;

  FOR _c IN SELECT * FROM jsonb_array_elements(COALESCE(_contributions,'[]'::jsonb)) LOOP
    _amt := round((_c->>'amount')::numeric, 2);
    IF _amt IS NULL OR _amt <= 0 THEN RAISE EXCEPTION 'Сума кожного внеску має бути більшою за 0'; END IF;
    _sum := _sum + _amt;
  END LOOP;
  IF _sum <> _extra THEN RAISE EXCEPTION 'Сума внесків (%) не дорівнює доплаті (%)', _sum, _extra; END IF;

  IF _old_item_id IS NOT NULL THEN
    SELECT name INTO _old_name FROM public.asset_items WHERE id = _old_item_id;
    IF _old_name IS NULL THEN RAISE EXCEPTION 'Старе майно не знайдено'; END IF;
    DELETE FROM public.asset_items WHERE id = _old_item_id;
  END IF;

  INSERT INTO public.asset_items (category_id, name, description, quantity, unit_price, condition, acquired_at)
  VALUES (_category_id, trim(_new_name), NULLIF(trim(COALESCE(_new_description,'')),''), 1, _new_price, _condition, _acquired_at)
  RETURNING id INTO _new_id;

  FOR _c IN SELECT * FROM jsonb_array_elements(COALESCE(_contributions,'[]'::jsonb)) LOOP
    _total_new := _total_new + round(round((_c->>'amount')::numeric,2) / _price, 4);
  END LOOP;
  IF _total_new > 0 THEN
    UPDATE public.company_settings SET total_shares = total_shares + _total_new, updated_at = now(), updated_by = auth.uid();
  END IF;

  FOR _c IN SELECT * FROM jsonb_array_elements(COALESCE(_contributions,'[]'::jsonb)) LOOP
    _uid := (_c->>'user_id')::uuid; _amt := round((_c->>'amount')::numeric,2);
    _qty := round(_amt / _price, 4);
    INSERT INTO public.shares (user_id, quantity) VALUES (_uid, _qty)
      ON CONFLICT (user_id) DO UPDATE SET quantity = shares.quantity + EXCLUDED.quantity;
    INSERT INTO public.asset_capital_contributions (operation_id, user_id, amount_usd, share_price_usd, shares_issued,
      old_item_name, sale_amount_usd, new_item_id, new_item_name, new_item_price_usd, note, created_by)
    VALUES (_op, _uid, _amt, _price, _qty, _old_name, _sale, _new_id, trim(_new_name), _new_price, _note, auth.uid());
  END LOOP;

  RETURN jsonb_build_object('operation_id', _op, 'new_item_id', _new_id, 'shares_issued', _total_new, 'share_price', _price);
END $$;
REVOKE EXECUTE ON FUNCTION public.asset_upgrade_with_contribution(uuid,numeric,uuid,text,text,numeric,text,date,jsonb,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.asset_upgrade_with_contribution(uuid,numeric,uuid,text,text,numeric,text,date,jsonb,text) TO authenticated;