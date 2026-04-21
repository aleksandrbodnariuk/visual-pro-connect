-- 1. Add economic fields to vip_tiers
ALTER TABLE public.vip_tiers
  ADD COLUMN IF NOT EXISTS discount_percent numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS monthly_bonus_uah numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS birthday_bonus_uah numeric NOT NULL DEFAULT 0;

-- 2. Add birth date to users
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS date_of_birth date;

-- 3. Add bonus tracking to memberships
ALTER TABLE public.user_vip_memberships
  ADD COLUMN IF NOT EXISTS last_monthly_bonus_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_birthday_gift_year integer;

-- 4. Seed defaults for existing tiers
UPDATE public.vip_tiers SET discount_percent = 10, monthly_bonus_uah = 200, birthday_bonus_uah = 500 WHERE id = 'silver';
UPDATE public.vip_tiers SET discount_percent = 15, monthly_bonus_uah = 500, birthday_bonus_uah = 1000 WHERE id = 'gold';
UPDATE public.vip_tiers SET discount_percent = 20, monthly_bonus_uah = 1000, birthday_bonus_uah = 2000 WHERE id = 'platinum';

-- 5. RPC: get current VIP discount percent for a user
CREATE OR REPLACE FUNCTION public.get_vip_discount_percent(_user_id uuid)
RETURNS numeric
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE((
    SELECT t.discount_percent
    FROM public.user_vip_memberships m
    JOIN public.vip_tiers t ON t.id = m.tier
    WHERE m.user_id = _user_id
      AND (m.is_lifetime OR m.expires_at > now())
    ORDER BY t.discount_percent DESC
    LIMIT 1
  ), 0)::numeric;
$$;

-- 6. RPC: claim monthly bonus (adds UAH to user's certificate, max once per 30 days)
CREATE OR REPLACE FUNCTION public.claim_vip_monthly_bonus(_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_membership record;
  v_tier record;
  v_existing_cert record;
  v_new_cert_id uuid;
  v_bonus numeric;
BEGIN
  IF _user_id IS NULL OR _user_id <> auth.uid() THEN
    RETURN jsonb_build_object('ok', false, 'error', 'unauthorized');
  END IF;

  SELECT * INTO v_membership
  FROM public.user_vip_memberships
  WHERE user_id = _user_id
    AND (is_lifetime OR expires_at > now())
  LIMIT 1;

  IF v_membership IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'no_active_vip');
  END IF;

  SELECT * INTO v_tier FROM public.vip_tiers WHERE id = v_membership.tier;
  IF v_tier IS NULL OR v_tier.monthly_bonus_uah <= 0 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'no_bonus_for_tier');
  END IF;

  IF v_membership.last_monthly_bonus_at IS NOT NULL
     AND v_membership.last_monthly_bonus_at > (now() - interval '30 days') THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error', 'already_claimed',
      'next_available_at', v_membership.last_monthly_bonus_at + interval '30 days'
    );
  END IF;

  v_bonus := v_tier.monthly_bonus_uah;

  -- Stack onto existing active certificate or create new one
  SELECT * INTO v_existing_cert
  FROM public.user_certificates
  WHERE user_id = _user_id AND is_active = true AND discount_type = 'uah'
  LIMIT 1;

  IF v_existing_cert.id IS NOT NULL THEN
    UPDATE public.user_certificates
    SET discount_value = COALESCE(discount_value, 0) + v_bonus,
        purchase_amount_uah = COALESCE(purchase_amount_uah, 0) + v_bonus,
        note = COALESCE(note, '') || ' +' || v_bonus::text || '₴ VIP-бонус ' || to_char(now(), 'YYYY-MM-DD')
    WHERE id = v_existing_cert.id;
    v_new_cert_id := v_existing_cert.id;
  ELSE
    INSERT INTO public.user_certificates (
      user_id, is_active, discount_type, discount_value, note, tier, purchase_amount_uah
    ) VALUES (
      _user_id, true, 'uah', v_bonus,
      'Щомісячний VIP-бонус ' || to_char(now(), 'YYYY-MM'),
      v_membership.tier, v_bonus
    ) RETURNING id INTO v_new_cert_id;
  END IF;

  UPDATE public.user_vip_memberships
  SET last_monthly_bonus_at = now()
  WHERE id = v_membership.id;

  -- Notify
  INSERT INTO public.notifications (user_id, message, link)
  VALUES (
    _user_id,
    '🎁 Нараховано щомісячний VIP-бонус: ' || v_bonus::text || '₴ на ваш сертифікат',
    '/sertyfikaty/moi'
  );

  RETURN jsonb_build_object(
    'ok', true,
    'bonus_uah', v_bonus,
    'certificate_id', v_new_cert_id
  );
END;
$$;

-- 7. RPC: claim birthday gift (once per year, only in birth month)
CREATE OR REPLACE FUNCTION public.claim_vip_birthday_gift(_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_membership record;
  v_tier record;
  v_user record;
  v_existing_cert record;
  v_new_cert_id uuid;
  v_bonus numeric;
  v_current_year integer;
  v_current_month integer;
  v_birth_month integer;
BEGIN
  IF _user_id IS NULL OR _user_id <> auth.uid() THEN
    RETURN jsonb_build_object('ok', false, 'error', 'unauthorized');
  END IF;

  SELECT * INTO v_user FROM public.users WHERE id = _user_id;
  IF v_user.date_of_birth IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'no_birth_date');
  END IF;

  v_current_year := extract(year from now())::int;
  v_current_month := extract(month from now())::int;
  v_birth_month := extract(month from v_user.date_of_birth)::int;

  IF v_current_month <> v_birth_month THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_birth_month');
  END IF;

  SELECT * INTO v_membership
  FROM public.user_vip_memberships
  WHERE user_id = _user_id
    AND (is_lifetime OR expires_at > now())
  LIMIT 1;

  IF v_membership IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'no_active_vip');
  END IF;

  IF v_membership.last_birthday_gift_year IS NOT NULL
     AND v_membership.last_birthday_gift_year >= v_current_year THEN
    RETURN jsonb_build_object('ok', false, 'error', 'already_claimed_this_year');
  END IF;

  SELECT * INTO v_tier FROM public.vip_tiers WHERE id = v_membership.tier;
  IF v_tier IS NULL OR v_tier.birthday_bonus_uah <= 0 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'no_bonus_for_tier');
  END IF;

  v_bonus := v_tier.birthday_bonus_uah;

  SELECT * INTO v_existing_cert
  FROM public.user_certificates
  WHERE user_id = _user_id AND is_active = true AND discount_type = 'uah'
  LIMIT 1;

  IF v_existing_cert.id IS NOT NULL THEN
    UPDATE public.user_certificates
    SET discount_value = COALESCE(discount_value, 0) + v_bonus,
        purchase_amount_uah = COALESCE(purchase_amount_uah, 0) + v_bonus,
        note = COALESCE(note, '') || ' +' || v_bonus::text || '₴ Подарунок на ДН ' || v_current_year::text
    WHERE id = v_existing_cert.id;
    v_new_cert_id := v_existing_cert.id;
  ELSE
    INSERT INTO public.user_certificates (
      user_id, is_active, discount_type, discount_value, note, tier, purchase_amount_uah
    ) VALUES (
      _user_id, true, 'uah', v_bonus,
      '🎂 Подарунок на день народження ' || v_current_year::text,
      v_membership.tier, v_bonus
    ) RETURNING id INTO v_new_cert_id;
  END IF;

  UPDATE public.user_vip_memberships
  SET last_birthday_gift_year = v_current_year
  WHERE id = v_membership.id;

  INSERT INTO public.notifications (user_id, message, link)
  VALUES (
    _user_id,
    '🎂 З Днем народження! Вам нараховано ' || v_bonus::text || '₴ на сертифікат',
    '/sertyfikaty/moi'
  );

  RETURN jsonb_build_object(
    'ok', true,
    'bonus_uah', v_bonus,
    'certificate_id', v_new_cert_id
  );
END;
$$;