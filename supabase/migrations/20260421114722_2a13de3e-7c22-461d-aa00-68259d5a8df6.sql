
-- Generic updated_at function
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Tier definitions
CREATE TABLE public.vip_tiers (
  id text PRIMARY KEY,
  label text NOT NULL,
  price_uah numeric NOT NULL DEFAULT 0,
  duration_days integer NOT NULL DEFAULT 30,
  description text,
  perks jsonb NOT NULL DEFAULT '[]'::jsonb,
  gradient text NOT NULL DEFAULT 'from-yellow-400 via-amber-500 to-orange-600',
  badge_icon text NOT NULL DEFAULT 'Crown',
  name_color text,
  banner_animation text NOT NULL DEFAULT 'shimmer',
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  highlight boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.vip_tiers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active vip tiers"
  ON public.vip_tiers FOR SELECT
  USING (is_active = true OR is_user_admin(auth.uid()));

CREATE POLICY "Admins manage vip tiers"
  ON public.vip_tiers FOR ALL
  USING (is_user_admin(auth.uid()))
  WITH CHECK (is_user_admin(auth.uid()));

CREATE TRIGGER vip_tiers_updated_at BEFORE UPDATE ON public.vip_tiers
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Memberships
CREATE TABLE public.user_vip_memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  tier text NOT NULL,
  started_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,
  is_lifetime boolean NOT NULL DEFAULT false,
  custom_name_color text,
  custom_banner_url text,
  granted_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_vip_memberships ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view memberships"
  ON public.user_vip_memberships FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins manage memberships"
  ON public.user_vip_memberships FOR ALL
  USING (is_user_admin(auth.uid()))
  WITH CHECK (is_user_admin(auth.uid()));

CREATE POLICY "Users can update own customizations"
  ON public.user_vip_memberships FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE TRIGGER user_vip_memberships_updated_at BEFORE UPDATE ON public.user_vip_memberships
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Purchase requests
CREATE TABLE public.vip_purchase_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id uuid NOT NULL,
  recipient_id uuid,
  recipient_phone text,
  is_gift boolean NOT NULL DEFAULT false,
  tier text NOT NULL,
  amount_uah numeric NOT NULL,
  duration_days integer NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  buyer_note text,
  admin_note text,
  approved_by uuid,
  approved_at timestamptz,
  membership_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.vip_purchase_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own vip requests"
  ON public.vip_purchase_requests FOR SELECT
  USING (buyer_id = auth.uid() OR recipient_id = auth.uid() OR is_user_admin(auth.uid()));

CREATE POLICY "Users create own vip requests"
  ON public.vip_purchase_requests FOR INSERT
  WITH CHECK (buyer_id = auth.uid());

CREATE POLICY "Users cancel own pending vip requests"
  ON public.vip_purchase_requests FOR UPDATE
  USING (buyer_id = auth.uid() AND status = 'pending')
  WITH CHECK (buyer_id = auth.uid() AND status IN ('pending','cancelled'));

CREATE POLICY "Admins full access vip requests"
  ON public.vip_purchase_requests FOR ALL
  USING (is_user_admin(auth.uid()))
  WITH CHECK (is_user_admin(auth.uid()));

CREATE TRIGGER vip_purchase_requests_updated_at BEFORE UPDATE ON public.vip_purchase_requests
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Helpers
CREATE OR REPLACE FUNCTION public.has_active_vip(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_vip_memberships
    WHERE user_id = _user_id
      AND (is_lifetime = true OR expires_at > now())
  );
$$;

CREATE OR REPLACE FUNCTION public.get_user_vip_tier(_user_id uuid)
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT tier FROM public.user_vip_memberships
  WHERE user_id = _user_id
    AND (is_lifetime = true OR expires_at > now())
  LIMIT 1;
$$;

-- Approve RPC
CREATE OR REPLACE FUNCTION public.approve_vip_purchase(_request_id uuid, _admin_note text DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_req record;
  v_target_user uuid;
  v_membership_id uuid;
  v_new_expires timestamptz;
  v_existing record;
BEGIN
  IF NOT is_user_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Only admins can approve';
  END IF;

  SELECT * INTO v_req FROM vip_purchase_requests WHERE id = _request_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Request not found'; END IF;
  IF v_req.status <> 'pending' THEN RAISE EXCEPTION 'Request not pending'; END IF;

  v_target_user := COALESCE(v_req.recipient_id, v_req.buyer_id);

  SELECT * INTO v_existing FROM user_vip_memberships WHERE user_id = v_target_user;

  IF FOUND AND v_existing.expires_at IS NOT NULL AND v_existing.expires_at > now() THEN
    v_new_expires := v_existing.expires_at + (v_req.duration_days || ' days')::interval;
  ELSE
    v_new_expires := now() + (v_req.duration_days || ' days')::interval;
  END IF;

  INSERT INTO user_vip_memberships (user_id, tier, started_at, expires_at, granted_by)
  VALUES (v_target_user, v_req.tier, now(), v_new_expires, auth.uid())
  ON CONFLICT (user_id) DO UPDATE
    SET tier = EXCLUDED.tier,
        expires_at = v_new_expires,
        granted_by = auth.uid(),
        updated_at = now()
  RETURNING id INTO v_membership_id;

  UPDATE vip_purchase_requests
  SET status = 'approved',
      approved_by = auth.uid(),
      approved_at = now(),
      admin_note = COALESCE(_admin_note, admin_note),
      membership_id = v_membership_id,
      updated_at = now()
  WHERE id = _request_id;

  INSERT INTO notifications (user_id, message, link)
  VALUES (
    v_target_user,
    CASE WHEN v_req.is_gift AND v_target_user <> v_req.buyer_id
      THEN '🏆 Вам подарували VIP-статус: ' || v_req.tier
      ELSE '🏆 Ваш VIP-статус активовано: ' || v_req.tier
    END,
    '/profile'
  );

  RETURN v_membership_id;
END;
$$;

-- Seed
INSERT INTO public.vip_tiers (id, label, price_uah, duration_days, description, perks, gradient, badge_icon, name_color, sort_order, highlight) VALUES
('silver', 'Silver VIP', 499, 30, 'Базовий преміум-статус на 1 місяць', '["Срібний бейдж біля аватара","Анімований банер (shimmer)","Кастомний колір імені"]'::jsonb, 'from-slate-300 via-slate-400 to-slate-500', 'Star', '#94a3b8', 1, false),
('gold', 'Gold VIP', 1299, 90, 'Золотий статус на 3 місяці', '["Золотий бейдж","Анімований банер (gold-shimmer)","Преміум-колір імені","Підвищена видимість профілю"]'::jsonb, 'from-yellow-400 via-amber-500 to-orange-500', 'Crown', '#f59e0b', 2, true),
('platinum', 'Platinum VIP', 3999, 365, 'Платиновий статус на 1 рік', '["Платиновий бейдж","Епічний анімований банер","Будь-який колір імені","Топ позиції в пошуку","Ексклюзивні емодзі (скоро)"]'::jsonb, 'from-cyan-300 via-purple-400 to-pink-500', 'Gem', '#a855f7', 3, false);
