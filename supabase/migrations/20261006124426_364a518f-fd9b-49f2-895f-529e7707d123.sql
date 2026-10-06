CREATE TABLE public.ad_managers (
  user_id uuid PRIMARY KEY,
  granted_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, DELETE ON public.ad_managers TO authenticated;
GRANT ALL ON public.ad_managers TO service_role;
ALTER TABLE public.ad_managers ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_ad_manager(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.ad_managers WHERE user_id = _user_id)
      OR public.is_user_admin(_user_id)
$$;
REVOKE EXECUTE ON FUNCTION public.is_ad_manager(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_ad_manager(uuid) TO authenticated, service_role;

CREATE POLICY "Ad managers see self, admins all" ON public.ad_managers FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_user_admin(auth.uid()));
CREATE POLICY "Admins grant ad rights" ON public.ad_managers FOR INSERT TO authenticated
  WITH CHECK (public.is_user_admin(auth.uid()));
CREATE POLICY "Admins revoke ad rights" ON public.ad_managers FOR DELETE TO authenticated
  USING (public.is_user_admin(auth.uid()));

CREATE TABLE public.feed_ads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id uuid NOT NULL DEFAULT auth.uid(),
  advertiser_name text NOT NULL,
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  media_url text,
  cta_text text NOT NULL DEFAULT 'Детальніше',
  cta_url text NOT NULL,
  status text NOT NULL DEFAULT 'draft',
  rejection_reason text,
  start_date timestamptz NOT NULL DEFAULT now(),
  end_date timestamptz NOT NULL DEFAULT (now() + interval '14 days'),
  target_views integer,
  views_count integer NOT NULL DEFAULT 0,
  clicks_count integer NOT NULL DEFAULT 0,
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.feed_ads TO authenticated;
GRANT ALL ON public.feed_ads TO service_role;
ALTER TABLE public.feed_ads ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_feed_ads_active ON public.feed_ads (status, start_date, end_date);

CREATE POLICY "Users see live ads; managers own; admins all" ON public.feed_ads FOR SELECT TO authenticated
  USING (
    (status = 'active' AND start_date <= now() AND end_date > now()
      AND (target_views IS NULL OR views_count < target_views))
    OR (author_id = auth.uid() AND public.is_ad_manager(auth.uid()))
    OR public.is_user_admin(auth.uid())
  );
CREATE POLICY "Ad managers create ads" ON public.feed_ads FOR INSERT TO authenticated
  WITH CHECK (author_id = auth.uid() AND public.is_ad_manager(auth.uid()));
CREATE POLICY "Ad managers edit own ads, admins all" ON public.feed_ads FOR UPDATE TO authenticated
  USING ((author_id = auth.uid() AND public.is_ad_manager(auth.uid())) OR public.is_user_admin(auth.uid()))
  WITH CHECK ((author_id = auth.uid() AND public.is_ad_manager(auth.uid())) OR public.is_user_admin(auth.uid()));
CREATE POLICY "Ad managers delete own ads, admins all" ON public.feed_ads FOR DELETE TO authenticated
  USING ((author_id = auth.uid() AND public.is_ad_manager(auth.uid())) OR public.is_user_admin(auth.uid()));

CREATE OR REPLACE FUNCTION public.feed_ads_guard()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE _admin boolean := public.is_user_admin(auth.uid());
BEGIN
  IF NEW.status NOT IN ('draft','pending_approval','active','paused','rejected','completed') THEN
    RAISE EXCEPTION 'Недопустимий статус реклами';
  END IF;
  IF NEW.end_date <= NEW.start_date THEN
    RAISE EXCEPTION 'Дата завершення має бути пізніше дати початку';
  END IF;
  IF length(NEW.title) > 120 OR length(NEW.description) > 2000 OR length(NEW.cta_text) > 30 THEN
    RAISE EXCEPTION 'Перевищено допустиму довжину тексту';
  END IF;
  IF NEW.cta_url !~* '^(https?://|/)' THEN
    RAISE EXCEPTION 'Посилання має починатися з https:// або /';
  END IF;
  NEW.updated_at := now();
  IF _admin OR auth.uid() IS NULL THEN RETURN NEW; END IF;

  IF TG_OP = 'INSERT' THEN
    IF NEW.status NOT IN ('draft','pending_approval') THEN NEW.status := 'draft'; END IF;
    NEW.views_count := 0; NEW.clicks_count := 0;
    NEW.reviewed_by := NULL; NEW.reviewed_at := NULL; NEW.rejection_reason := NULL;
    RETURN NEW;
  END IF;

  NEW.views_count := OLD.views_count; NEW.clicks_count := OLD.clicks_count;
  NEW.author_id := OLD.author_id;
  NEW.reviewed_by := OLD.reviewed_by; NEW.reviewed_at := OLD.reviewed_at;
  -- Manager may only pause/resume an approved ad without re-review
  IF OLD.status IN ('active','paused') AND NEW.status IN ('active','paused')
     AND NEW.title = OLD.title AND NEW.description = OLD.description
     AND NEW.media_url IS NOT DISTINCT FROM OLD.media_url AND NEW.cta_url = OLD.cta_url
     AND NEW.cta_text = OLD.cta_text AND NEW.advertiser_name = OLD.advertiser_name THEN
    RETURN NEW;
  END IF;
  IF NEW.status NOT IN ('draft','pending_approval') THEN
    NEW.status := 'pending_approval';
  END IF;
  NEW.rejection_reason := CASE WHEN NEW.status = 'pending_approval' THEN NULL ELSE OLD.rejection_reason END;
  RETURN NEW;
END $$;
CREATE TRIGGER feed_ads_guard BEFORE INSERT OR UPDATE ON public.feed_ads
  FOR EACH ROW EXECUTE FUNCTION public.feed_ads_guard();

CREATE OR REPLACE FUNCTION public.record_feed_ad_event(_ad_id uuid, _kind text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN RETURN; END IF;
  IF _kind = 'view' THEN
    UPDATE public.feed_ads SET views_count = views_count + 1
     WHERE id = _ad_id AND status = 'active' AND start_date <= now() AND end_date > now();
  ELSIF _kind = 'click' THEN
    UPDATE public.feed_ads SET clicks_count = clicks_count + 1
     WHERE id = _ad_id AND status = 'active';
  END IF;
END $$;
REVOKE EXECUTE ON FUNCTION public.record_feed_ad_event(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_feed_ad_event(uuid, text) TO authenticated, service_role;
REVOKE EXECUTE ON FUNCTION public.feed_ads_guard() FROM PUBLIC, anon, authenticated;