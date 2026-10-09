CREATE TABLE public.party_unit_officers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  unit_name text NOT NULL CHECK (char_length(unit_name) BETWEEN 1 AND 200),
  body text NOT NULL CHECK (body IN ('head','deputy','secretary','council','audit')),
  full_name text NOT NULL CHECK (char_length(full_name) BETWEEN 2 AND 200),
  phone text CHECK (phone IS NULL OR char_length(phone) <= 40),
  party_member_id uuid REFERENCES public.party_members(id) ON DELETE SET NULL,
  term_start date,
  term_end date,
  decision text CHECK (decision IS NULL OR char_length(decision) <= 500),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX party_unit_officers_org_idx ON public.party_unit_officers(organization_id, unit_name);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.party_unit_officers TO authenticated;
GRANT ALL ON public.party_unit_officers TO service_role;
ALTER TABLE public.party_unit_officers ENABLE ROW LEVEL SECURITY;
CREATE POLICY party_unit_officers_select ON public.party_unit_officers FOR SELECT TO authenticated USING (public.has_party_access(organization_id, auth.uid()));
CREATE POLICY party_unit_officers_write ON public.party_unit_officers FOR ALL TO authenticated USING (public.is_org_manager(organization_id, auth.uid())) WITH CHECK (public.is_org_manager(organization_id, auth.uid()));