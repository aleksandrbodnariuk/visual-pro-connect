CREATE OR REPLACE FUNCTION public.is_org_member(_org_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.is_org_manager(_org_id, _user_id) OR EXISTS (
    SELECT 1 FROM public.organization_members m WHERE m.organization_id = _org_id AND m.user_id = _user_id);
$$;
REVOKE ALL ON FUNCTION public.is_org_member(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_org_member(uuid, uuid) TO authenticated, service_role;

CREATE TABLE public.team_partners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  sponsor_id uuid REFERENCES public.team_partners(id) ON DELETE SET NULL,
  user_id uuid,
  full_name text NOT NULL,
  phone text,
  personal_pv numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'partner',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.team_partners TO authenticated;
GRANT ALL ON public.team_partners TO service_role;
ALTER TABLE public.team_partners ENABLE ROW LEVEL SECURITY;
CREATE POLICY team_partners_read ON public.team_partners FOR SELECT TO authenticated USING (public.is_org_member(organization_id, auth.uid()));
CREATE POLICY team_partners_write ON public.team_partners FOR ALL TO authenticated USING (public.is_org_manager(organization_id, auth.uid())) WITH CHECK (public.is_org_manager(organization_id, auth.uid()));
CREATE INDEX team_partners_org_idx ON public.team_partners(organization_id, sponsor_id);

CREATE TABLE public.team_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  title text NOT NULL,
  kind text NOT NULL DEFAULT 'meeting',
  starts_at timestamptz NOT NULL,
  location text,
  link text,
  description text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.team_events TO authenticated;
GRANT ALL ON public.team_events TO service_role;
ALTER TABLE public.team_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY team_events_read ON public.team_events FOR SELECT TO authenticated USING (public.is_org_member(organization_id, auth.uid()));
CREATE POLICY team_events_write ON public.team_events FOR ALL TO authenticated USING (public.is_org_manager(organization_id, auth.uid())) WITH CHECK (public.is_org_manager(organization_id, auth.uid()));

CREATE TABLE public.team_materials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  category text NOT NULL DEFAULT 'presentation',
  title text NOT NULL,
  body text,
  url text,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.team_materials TO authenticated;
GRANT ALL ON public.team_materials TO service_role;
ALTER TABLE public.team_materials ENABLE ROW LEVEL SECURITY;
CREATE POLICY team_materials_read ON public.team_materials FOR SELECT TO authenticated USING (public.is_org_member(organization_id, auth.uid()));
CREATE POLICY team_materials_write ON public.team_materials FOR ALL TO authenticated USING (public.is_org_manager(organization_id, auth.uid())) WITH CHECK (public.is_org_manager(organization_id, auth.uid()));

CREATE TABLE public.team_onboarding (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid(),
  step_key text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, user_id, step_key)
);
GRANT SELECT, INSERT, DELETE ON public.team_onboarding TO authenticated;
GRANT ALL ON public.team_onboarding TO service_role;
ALTER TABLE public.team_onboarding ENABLE ROW LEVEL SECURITY;
CREATE POLICY team_onboarding_read ON public.team_onboarding FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_org_manager(organization_id, auth.uid()));
CREATE POLICY team_onboarding_ins ON public.team_onboarding FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() AND public.is_org_member(organization_id, auth.uid()));
CREATE POLICY team_onboarding_del ON public.team_onboarding FOR DELETE TO authenticated USING (user_id = auth.uid());