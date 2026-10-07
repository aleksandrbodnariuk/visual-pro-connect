CREATE TABLE public.party_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  unit_name text,
  full_name text NOT NULL CHECK (char_length(full_name) BETWEEN 2 AND 200),
  phone text,
  email text,
  card_number text,
  joined_date date,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','candidate','honorary','suspended')),
  position text,
  user_id uuid,
  notes text CHECK (notes IS NULL OR char_length(notes) <= 2000),
  created_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.party_members TO authenticated;
GRANT ALL ON public.party_members TO service_role;
ALTER TABLE public.party_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY party_members_select ON public.party_members FOR SELECT TO authenticated
  USING (public.has_party_access(organization_id, auth.uid()));
CREATE POLICY party_members_write ON public.party_members FOR ALL TO authenticated
  USING (public.is_org_manager(organization_id, auth.uid()))
  WITH CHECK (public.is_org_manager(organization_id, auth.uid()));
CREATE INDEX party_members_org_idx ON public.party_members(organization_id, full_name);
CREATE OR REPLACE FUNCTION public.party_members_touch() RETURNS trigger
LANGUAGE plpgsql SET search_path = public AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;
REVOKE EXECUTE ON FUNCTION public.party_members_touch() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER party_members_updated BEFORE UPDATE ON public.party_members
  FOR EACH ROW EXECUTE FUNCTION public.party_members_touch();
ALTER TABLE public.hq_members ADD COLUMN IF NOT EXISTS party_member_id uuid REFERENCES public.party_members(id) ON DELETE SET NULL;