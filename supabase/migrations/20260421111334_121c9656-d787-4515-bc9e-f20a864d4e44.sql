-- 1. Розширюємо user_certificates для підтримки тарифів та подарунків
ALTER TABLE public.user_certificates 
  ADD COLUMN IF NOT EXISTS tier text,
  ADD COLUMN IF NOT EXISTS purchased_by uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS is_gift boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS purchase_amount_uah numeric;

-- 2. Таблиця заявок на купівлю сертифікатів
CREATE TABLE IF NOT EXISTS public.certificate_purchase_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recipient_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  recipient_phone text,
  is_gift boolean NOT NULL DEFAULT false,
  tier text NOT NULL CHECK (tier IN ('basic', 'standard', 'premium')),
  amount_uah numeric NOT NULL CHECK (amount_uah > 0),
  discount_percent numeric NOT NULL CHECK (discount_percent > 0 AND discount_percent <= 100),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
  buyer_note text,
  admin_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  approved_at timestamptz,
  approved_by uuid REFERENCES auth.users(id),
  certificate_id uuid REFERENCES public.user_certificates(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_cpr_status ON public.certificate_purchase_requests(status);
CREATE INDEX IF NOT EXISTS idx_cpr_buyer ON public.certificate_purchase_requests(buyer_id);

-- 3. RLS
ALTER TABLE public.certificate_purchase_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own purchase requests"
  ON public.certificate_purchase_requests FOR SELECT
  USING (buyer_id = auth.uid() OR recipient_id = auth.uid() OR is_user_admin(auth.uid()));

CREATE POLICY "Users can create own purchase requests"
  ON public.certificate_purchase_requests FOR INSERT
  WITH CHECK (buyer_id = auth.uid());

CREATE POLICY "Users can cancel own pending requests"
  ON public.certificate_purchase_requests FOR UPDATE
  USING (buyer_id = auth.uid() AND status = 'pending')
  WITH CHECK (buyer_id = auth.uid() AND status IN ('pending', 'cancelled'));

CREATE POLICY "Admins full access on purchase requests"
  ON public.certificate_purchase_requests FOR ALL
  USING (is_user_admin(auth.uid()))
  WITH CHECK (is_user_admin(auth.uid()));

-- 4. Trigger для оновлення updated_at
CREATE OR REPLACE FUNCTION public.cpr_update_timestamp()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_cpr_update_ts ON public.certificate_purchase_requests;
CREATE TRIGGER trg_cpr_update_ts
  BEFORE UPDATE ON public.certificate_purchase_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.cpr_update_timestamp();

-- 5. RPC: підтвердити заявку (адмін) — атомарно створює/оновлює сертифікат
CREATE OR REPLACE FUNCTION public.approve_certificate_purchase(
  _request_id uuid,
  _admin_note text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_req public.certificate_purchase_requests;
  v_target_user uuid;
  v_cert_id uuid;
  v_buyer_name text;
BEGIN
  IF NOT is_user_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Доступ заборонено';
  END IF;

  SELECT * INTO v_req FROM public.certificate_purchase_requests WHERE id = _request_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Заявку не знайдено'; END IF;
  IF v_req.status <> 'pending' THEN RAISE EXCEPTION 'Заявка вже оброблена (статус: %)', v_req.status; END IF;

  -- Визначаємо отримувача
  IF v_req.is_gift THEN
    IF v_req.recipient_id IS NULL THEN
      RAISE EXCEPTION 'Не вказано отримувача подарунка';
    END IF;
    v_target_user := v_req.recipient_id;
    SELECT full_name INTO v_buyer_name FROM public.users WHERE id = v_req.buyer_id;
  ELSE
    v_target_user := v_req.buyer_id;
  END IF;

  -- Створюємо/оновлюємо сертифікат (один на користувача)
  INSERT INTO public.user_certificates (
    user_id, is_active, discount_type, discount_value, note,
    tier, purchased_by, is_gift, purchase_amount_uah
  ) VALUES (
    v_target_user, true, 'percent', v_req.discount_percent,
    CASE WHEN v_req.is_gift 
      THEN 'Подарунок від ' || COALESCE(v_buyer_name, 'друга')
      ELSE 'Куплений сертифікат (' || v_req.amount_uah || '₴)'
    END,
    v_req.tier, v_req.buyer_id, v_req.is_gift, v_req.amount_uah
  )
  ON CONFLICT (user_id) DO UPDATE SET
    is_active = true,
    discount_type = 'percent',
    discount_value = GREATEST(public.user_certificates.discount_value, v_req.discount_percent),
    note = EXCLUDED.note,
    tier = EXCLUDED.tier,
    purchased_by = EXCLUDED.purchased_by,
    is_gift = EXCLUDED.is_gift,
    purchase_amount_uah = EXCLUDED.purchase_amount_uah,
    updated_at = now()
  RETURNING id INTO v_cert_id;

  -- Оновлюємо заявку
  UPDATE public.certificate_purchase_requests
  SET status = 'approved',
      approved_at = now(),
      approved_by = auth.uid(),
      admin_note = COALESCE(_admin_note, admin_note),
      certificate_id = v_cert_id
  WHERE id = _request_id;

  -- Сповіщення отримувачу
  INSERT INTO public.notifications (user_id, message, link)
  VALUES (
    v_target_user,
    CASE WHEN v_req.is_gift
      THEN '🎁 Вам подарували сертифікат на знижку ' || v_req.discount_percent || '%!'
      ELSE '🎉 Ваш сертифікат на знижку ' || v_req.discount_percent || '% активовано!'
    END,
    '/profile/' || v_target_user
  );

  -- Сповіщення покупцю (якщо подарунок)
  IF v_req.is_gift AND v_req.buyer_id <> v_target_user THEN
    INSERT INTO public.notifications (user_id, message, link)
    VALUES (v_req.buyer_id, '✅ Ваш подарунковий сертифікат активовано отримувачу', '/sertyfikaty/moi');
  END IF;

  RETURN v_cert_id;
END;
$$;

-- 6. RPC: відхилити заявку
CREATE OR REPLACE FUNCTION public.reject_certificate_purchase(
  _request_id uuid,
  _admin_note text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_buyer uuid;
BEGIN
  IF NOT is_user_admin(auth.uid()) THEN RAISE EXCEPTION 'Доступ заборонено'; END IF;

  UPDATE public.certificate_purchase_requests
  SET status = 'rejected',
      admin_note = COALESCE(_admin_note, admin_note),
      approved_by = auth.uid(),
      approved_at = now()
  WHERE id = _request_id AND status = 'pending'
  RETURNING buyer_id INTO v_buyer;

  IF v_buyer IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, message, link)
    VALUES (v_buyer, '❌ Вашу заявку на сертифікат відхилено. ' || COALESCE(_admin_note, ''), '/sertyfikaty/moi');
  END IF;
END;
$$;