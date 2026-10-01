-- ENUMS
DO $$ BEGIN CREATE TYPE public.org_type AS ENUM ('party','company','ngo','other'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.hq_level AS ENUM ('central','oblast','okrug','city','otg','village'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.precinct_role AS ENUM ('commission','observer'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ORGANIZATIONS
CREATE TABLE public.organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  logo_url text,
  type public.org_type NOT NULL DEFAULT 'other',
  website text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.organizations TO authenticated;
GRANT ALL ON public.organizations TO service_role;
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "orgs_select_auth" ON public.organizations FOR SELECT TO authenticated USING (true);
CREATE POLICY "orgs_admin_write" ON public.organizations FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.organization_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role text NOT NULL DEFAULT 'member',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.organization_members TO authenticated;
GRANT ALL ON public.organization_members TO service_role;
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_org_manager(_org_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_role(_user_id,'admin') OR EXISTS (
    SELECT 1 FROM public.organization_members m
    WHERE m.organization_id = _org_id AND m.user_id = _user_id AND m.role IN ('owner','admin')
  );
$$;

CREATE POLICY "org_members_select" ON public.organization_members FOR SELECT TO authenticated USING (true);
CREATE POLICY "org_members_manage" ON public.organization_members FOR ALL TO authenticated
  USING (public.is_org_manager(organization_id, auth.uid()))
  WITH CHECK (public.is_org_manager(organization_id, auth.uid()));

-- PARTY ACCESS GRANTS
CREATE TABLE public.party_access (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  granted_by uuid,
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.party_access TO authenticated;
GRANT ALL ON public.party_access TO service_role;
ALTER TABLE public.party_access ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_party_access(_org_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_role(_user_id,'admin') OR EXISTS (
    SELECT 1 FROM public.party_access p
    WHERE p.organization_id = _org_id AND p.user_id = _user_id
  );
$$;

CREATE POLICY "party_access_select_self_or_admin" ON public.party_access FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_org_manager(organization_id, auth.uid()));
CREATE POLICY "party_access_manage" ON public.party_access FOR ALL TO authenticated
  USING (public.is_org_manager(organization_id, auth.uid()))
  WITH CHECK (public.is_org_manager(organization_id, auth.uid()));

-- HQ STRUCTURE TEMPLATES (per level, set by admin)
CREATE TABLE public.hq_structure_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  level public.hq_level NOT NULL,
  positions jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, level)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.hq_structure_templates TO authenticated;
GRANT ALL ON public.hq_structure_templates TO service_role;
ALTER TABLE public.hq_structure_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "hq_tpl_select" ON public.hq_structure_templates FOR SELECT TO authenticated
  USING (public.has_party_access(organization_id, auth.uid()));
CREATE POLICY "hq_tpl_manage" ON public.hq_structure_templates FOR ALL TO authenticated
  USING (public.is_org_manager(organization_id, auth.uid()))
  WITH CHECK (public.is_org_manager(organization_id, auth.uid()));

-- HEADQUARTERS
CREATE TABLE public.party_hqs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  parent_id uuid REFERENCES public.party_hqs(id) ON DELETE SET NULL,
  level public.hq_level NOT NULL,
  name text NOT NULL,
  region text,
  address text,
  phone text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_party_hqs_org ON public.party_hqs(organization_id, level);
CREATE INDEX idx_party_hqs_parent ON public.party_hqs(parent_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.party_hqs TO authenticated;
GRANT ALL ON public.party_hqs TO service_role;
ALTER TABLE public.party_hqs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "hqs_select" ON public.party_hqs FOR SELECT TO authenticated
  USING (public.has_party_access(organization_id, auth.uid()));
CREATE POLICY "hqs_manage" ON public.party_hqs FOR ALL TO authenticated
  USING (public.is_org_manager(organization_id, auth.uid()))
  WITH CHECK (public.is_org_manager(organization_id, auth.uid()));

-- HQ TEAM MEMBERS
CREATE TABLE public.hq_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hq_id uuid NOT NULL REFERENCES public.party_hqs(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid,
  full_name text NOT NULL,
  position text,
  phone text,
  is_agitator boolean NOT NULL DEFAULT false,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_hq_members_hq ON public.hq_members(hq_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.hq_members TO authenticated;
GRANT ALL ON public.hq_members TO service_role;
ALTER TABLE public.hq_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "hq_members_select" ON public.hq_members FOR SELECT TO authenticated
  USING (public.has_party_access(organization_id, auth.uid()));
CREATE POLICY "hq_members_manage" ON public.hq_members FOR ALL TO authenticated
  USING (public.is_org_manager(organization_id, auth.uid()))
  WITH CHECK (public.is_org_manager(organization_id, auth.uid()));

-- PRECINCTS
CREATE TABLE public.precincts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  hq_id uuid NOT NULL REFERENCES public.party_hqs(id) ON DELETE CASCADE,
  number text NOT NULL,
  name text,
  address text,
  voters_count integer NOT NULL DEFAULT 0,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_precincts_hq ON public.precincts(hq_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.precincts TO authenticated;
GRANT ALL ON public.precincts TO service_role;
ALTER TABLE public.precincts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "precincts_select" ON public.precincts FOR SELECT TO authenticated
  USING (public.has_party_access(organization_id, auth.uid()));
CREATE POLICY "precincts_manage" ON public.precincts FOR ALL TO authenticated
  USING (public.is_org_manager(organization_id, auth.uid()))
  WITH CHECK (public.is_org_manager(organization_id, auth.uid()));

-- PRECINCT PEOPLE
CREATE TABLE public.precinct_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  precinct_id uuid NOT NULL REFERENCES public.precincts(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid,
  full_name text NOT NULL,
  role public.precinct_role NOT NULL DEFAULT 'observer',
  position text,
  phone text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_precinct_members_precinct ON public.precinct_members(precinct_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.precinct_members TO authenticated;
GRANT ALL ON public.precinct_members TO service_role;
ALTER TABLE public.precinct_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "precinct_members_select" ON public.precinct_members FOR SELECT TO authenticated
  USING (public.has_party_access(organization_id, auth.uid()));
CREATE POLICY "precinct_members_manage" ON public.precinct_members FOR ALL TO authenticated
  USING (public.is_org_manager(organization_id, auth.uid()))
  WITH CHECK (public.is_org_manager(organization_id, auth.uid()));

-- updated_at triggers
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER trg_orgs_upd BEFORE UPDATE ON public.organizations FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_org_members_upd BEFORE UPDATE ON public.organization_members FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_party_access_upd BEFORE UPDATE ON public.party_access FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_hq_tpl_upd BEFORE UPDATE ON public.hq_structure_templates FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_hqs_upd BEFORE UPDATE ON public.party_hqs FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_hq_members_upd BEFORE UPDATE ON public.hq_members FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_precincts_upd BEFORE UPDATE ON public.precincts FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_precinct_members_upd BEFORE UPDATE ON public.precinct_members FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();