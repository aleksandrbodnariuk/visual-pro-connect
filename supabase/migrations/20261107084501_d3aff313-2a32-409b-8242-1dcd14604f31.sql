CREATE OR REPLACE FUNCTION public.can_view_organization(_org_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT _user_id IS NOT NULL AND (
    public.has_role(_user_id,'admin')
    OR EXISTS (SELECT 1 FROM public.organizations o WHERE o.id=_org_id AND o.created_by=_user_id)
    OR EXISTS (SELECT 1 FROM public.organization_members m WHERE m.organization_id=_org_id AND m.user_id=_user_id)
    OR EXISTS (SELECT 1 FROM public.party_access p WHERE p.organization_id=_org_id AND p.user_id=_user_id)
    OR EXISTS (SELECT 1 FROM public.hq_managers h WHERE h.organization_id=_org_id AND h.user_id=_user_id)
    OR EXISTS (SELECT 1 FROM public.hq_members h WHERE h.organization_id=_org_id AND h.user_id=_user_id)
    OR EXISTS (SELECT 1 FROM public.precinct_members pm WHERE pm.organization_id=_org_id AND pm.user_id=_user_id)
    OR EXISTS (SELECT 1 FROM public.party_members pm WHERE pm.organization_id=_org_id AND pm.user_id=_user_id)
    OR EXISTS (SELECT 1 FROM public.campaign_trainees t WHERE t.organization_id=_org_id AND t.user_id=_user_id)
  );
$$;
REVOKE ALL ON FUNCTION public.can_view_organization(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_view_organization(uuid, uuid) TO authenticated, service_role;

DROP POLICY IF EXISTS "orgs_select_auth" ON public.organizations;
CREATE POLICY "orgs_select_private" ON public.organizations FOR SELECT TO authenticated
  USING (public.can_view_organization(id, auth.uid()));

DROP POLICY IF EXISTS "org_members_select" ON public.organization_members;
CREATE POLICY "org_members_select_private" ON public.organization_members FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_org_member(organization_id, auth.uid()));

CREATE OR REPLACE FUNCTION public.has_any_org_access()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.organizations o WHERE public.can_view_organization(o.id, auth.uid()));
$$;
REVOKE ALL ON FUNCTION public.has_any_org_access() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_any_org_access() TO authenticated;

ALTER TABLE public.team_events
  ADD COLUMN IF NOT EXISTS is_public boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS duration_minutes int NOT NULL DEFAULT 90,
  ADD COLUMN IF NOT EXISTS public_until timestamptz;

CREATE TABLE public.team_presentation_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  event_id uuid NOT NULL REFERENCES public.team_events(id) ON DELETE CASCADE,
  inviter_id uuid,
  name text NOT NULL,
  phone text,
  message text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, DELETE ON public.team_presentation_leads TO authenticated;
GRANT ALL ON public.team_presentation_leads TO service_role;
ALTER TABLE public.team_presentation_leads ENABLE ROW LEVEL SECURITY;
CREATE POLICY leads_read ON public.team_presentation_leads FOR SELECT TO authenticated
  USING (inviter_id = auth.uid() OR public.is_org_manager(organization_id, auth.uid()));
CREATE POLICY leads_delete ON public.team_presentation_leads FOR DELETE TO authenticated
  USING (public.is_org_manager(organization_id, auth.uid()));
CREATE INDEX team_leads_event_idx ON public.team_presentation_leads(event_id, created_at);

CREATE OR REPLACE FUNCTION public.get_public_presentation(_event_id uuid, _ref uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE e record; o record; inv jsonb := NULL; ph text;
BEGIN
  SELECT * INTO e FROM public.team_events WHERE id = _event_id AND is_public;
  IF NOT FOUND THEN RETURN NULL; END IF;
  IF now() > COALESCE(e.public_until, e.starts_at + make_interval(mins => e.duration_minutes) + interval '1 day') THEN
    RETURN jsonb_build_object('expired', true, 'title', e.title);
  END IF;
  SELECT id, name, logo_url INTO o FROM public.organizations WHERE id = e.organization_id;
  IF _ref IS NOT NULL AND public.is_org_member(e.organization_id, _ref) THEN
    SELECT phone INTO ph FROM public.team_partners WHERE organization_id = e.organization_id AND user_id = _ref LIMIT 1;
    SELECT jsonb_build_object('id', u.id, 'name', u.full_name, 'avatar_url', u.avatar_url, 'phone', ph)
      INTO inv FROM public.users u WHERE u.id = _ref;
  END IF;
  RETURN jsonb_build_object('expired', false, 'id', e.id, 'title', e.title, 'kind', e.kind, 'starts_at', e.starts_at,
    'duration_minutes', e.duration_minutes, 'location', e.location, 'link', e.link, 'description', e.description,
    'org_name', o.name, 'org_logo', o.logo_url, 'inviter', inv);
END; $$;
REVOKE ALL ON FUNCTION public.get_public_presentation(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_presentation(uuid, uuid) TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.submit_presentation_lead(_event_id uuid, _ref uuid, _name text, _phone text, _message text)
RETURNS boolean LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public AS $$
DECLARE e record; inviter uuid := NULL; n text := btrim(coalesce(_name,'')); r record;
BEGIN
  IF length(n) < 2 OR length(n) > 100 THEN RAISE EXCEPTION 'Вкажіть ім''я (2–100 символів)'; END IF;
  IF length(coalesce(_phone,'')) > 30 OR length(coalesce(_message,'')) > 1000 THEN RAISE EXCEPTION 'Задовгі дані'; END IF;
  SELECT * INTO e FROM public.team_events WHERE id = _event_id AND is_public;
  IF NOT FOUND OR now() > COALESCE(e.public_until, e.starts_at + make_interval(mins => e.duration_minutes) + interval '1 day') THEN
    RAISE EXCEPTION 'Презентація недоступна';
  END IF;
  IF (SELECT count(*) FROM public.team_presentation_leads WHERE event_id = _event_id AND created_at > now() - interval '1 hour') > 200 THEN
    RAISE EXCEPTION 'Забагато заявок, спробуйте пізніше';
  END IF;
  IF _ref IS NOT NULL AND public.is_org_member(e.organization_id, _ref) THEN inviter := _ref; END IF;
  INSERT INTO public.team_presentation_leads (organization_id, event_id, inviter_id, name, phone, message)
    VALUES (e.organization_id, _event_id, inviter, n, nullif(btrim(_phone),''), nullif(btrim(_message),''));
  IF inviter IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, message, link)
      VALUES (inviter, 'Ваш гість ' || n || ' залишив заявку після презентації «' || e.title || '»', '/organizations/' || e.organization_id);
  ELSE
    FOR r IN SELECT user_id FROM public.organization_members WHERE organization_id = e.organization_id AND role IN ('owner','admin') LOOP
      INSERT INTO public.notifications (user_id, message, link)
        VALUES (r.user_id, 'Нова заявка гостя ' || n || ' після презентації «' || e.title || '»', '/organizations/' || e.organization_id);
    END LOOP;
  END IF;
  RETURN true;
END; $$;
REVOKE ALL ON FUNCTION public.submit_presentation_lead(uuid, uuid, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_presentation_lead(uuid, uuid, text, text, text) TO anon, authenticated, service_role;