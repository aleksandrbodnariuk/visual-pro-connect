CREATE OR REPLACE FUNCTION public.is_team_album_editor(_org_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.is_org_manager(_org_id, _user_id) OR EXISTS (
    SELECT 1 FROM public.organization_members m
    WHERE m.organization_id = _org_id AND m.user_id = _user_id AND m.role = 'leader');
$$;
REVOKE ALL ON FUNCTION public.is_team_album_editor(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_team_album_editor(uuid, uuid) TO authenticated, service_role;

CREATE TABLE public.team_albums (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  event_date date,
  cover_url text,
  created_by uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.team_albums TO authenticated;
GRANT ALL ON public.team_albums TO service_role;
ALTER TABLE public.team_albums ENABLE ROW LEVEL SECURITY;
CREATE POLICY team_albums_read ON public.team_albums FOR SELECT TO authenticated
  USING (public.is_org_member(organization_id, auth.uid()) OR public.is_org_manager(organization_id, auth.uid()));
CREATE POLICY team_albums_write ON public.team_albums FOR ALL TO authenticated
  USING (public.is_team_album_editor(organization_id, auth.uid()))
  WITH CHECK (public.is_team_album_editor(organization_id, auth.uid()));
CREATE TRIGGER trg_team_albums_upd BEFORE UPDATE ON public.team_albums FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.team_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  album_id uuid NOT NULL REFERENCES public.team_albums(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  url text NOT NULL,
  caption text,
  sort_order int NOT NULL DEFAULT 0,
  created_by uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX team_photos_album_idx ON public.team_photos(album_id, sort_order);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.team_photos TO authenticated;
GRANT ALL ON public.team_photos TO service_role;
ALTER TABLE public.team_photos ENABLE ROW LEVEL SECURITY;
CREATE POLICY team_photos_read ON public.team_photos FOR SELECT TO authenticated
  USING (public.is_org_member(organization_id, auth.uid()) OR public.is_org_manager(organization_id, auth.uid()));
CREATE POLICY team_photos_write ON public.team_photos FOR ALL TO authenticated
  USING (public.is_team_album_editor(organization_id, auth.uid()))
  WITH CHECK (public.is_team_album_editor(organization_id, auth.uid())
    AND EXISTS (SELECT 1 FROM public.team_albums a WHERE a.id = album_id AND a.organization_id = team_photos.organization_id));