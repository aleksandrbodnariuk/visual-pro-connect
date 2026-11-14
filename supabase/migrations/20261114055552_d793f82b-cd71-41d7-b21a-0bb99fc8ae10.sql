CREATE OR REPLACE FUNCTION public.team_can_view_partner(_partner_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH p AS (SELECT organization_id FROM public.team_partners WHERE id = _partner_id),
  me AS (SELECT t.id FROM public.team_partners t, p WHERE t.organization_id = p.organization_id AND (t.user_id = _user_id OR t.co_user_id = _user_id)),
  RECURSIVE_UP AS (SELECT 1)
  SELECT _user_id IS NOT NULL AND (
    EXISTS (SELECT 1 FROM p WHERE public.is_org_manager(p.organization_id, _user_id))
    OR public.team_in_my_subtree(_partner_id, _user_id)
    OR EXISTS (
      SELECT 1 FROM me
      JOIN public.team_partners s1 ON s1.id = (SELECT sponsor_id FROM public.team_partners WHERE id = me.id)
      LEFT JOIN public.team_partners s2 ON s2.id = s1.sponsor_id
      LEFT JOIN public.team_partners s3 ON s3.id = s2.sponsor_id
      WHERE _partner_id IN (s1.id, s2.id, s3.id)
    )
  );
$$;
REVOKE ALL ON FUNCTION public.team_can_view_partner(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.team_can_view_partner(uuid, uuid) TO authenticated, service_role;

DROP POLICY IF EXISTS team_partners_read ON public.team_partners;
CREATE POLICY team_partners_read ON public.team_partners FOR SELECT TO authenticated
  USING (public.team_can_view_partner(id, auth.uid()));