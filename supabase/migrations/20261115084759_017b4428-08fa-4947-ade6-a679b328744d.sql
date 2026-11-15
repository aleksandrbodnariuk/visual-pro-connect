CREATE OR REPLACE FUNCTION public.team_can_view_partner(_partner_id uuid, _user_id uuid)
 RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  WITH RECURSIVE p AS (SELECT organization_id FROM public.team_partners WHERE id = _partner_id),
  me AS (SELECT t.id, t.sponsor_id FROM public.team_partners t, p WHERE t.organization_id = p.organization_id AND (t.user_id = _user_id OR t.co_user_id = _user_id)),
  up AS (
    SELECT s.id, s.sponsor_id, s.status, 1 AS depth FROM me JOIN public.team_partners s ON s.id = me.sponsor_id
    UNION ALL
    SELECT s.id, s.sponsor_id, s.status, up.depth + 1 FROM up JOIN public.team_partners s ON s.id = up.sponsor_id WHERE up.depth < 50
  ),
  active_up AS (SELECT id FROM up WHERE status <> 'inactive' ORDER BY depth LIMIT 3)
  SELECT _user_id IS NOT NULL AND (
    EXISTS (SELECT 1 FROM p WHERE public.is_org_manager(p.organization_id, _user_id))
    OR public.team_in_my_subtree(_partner_id, _user_id)
    OR _partner_id IN (SELECT id FROM active_up)
  );
$function$;
REVOKE ALL ON FUNCTION public.team_can_view_partner(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.team_can_view_partner(uuid, uuid) TO authenticated;