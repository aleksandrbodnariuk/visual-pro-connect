CREATE OR REPLACE FUNCTION public.is_party_officer(_org_id uuid, _user_id uuid, _bodies text[])
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.party_unit_officers o
    JOIN public.party_members pm ON pm.id = o.party_member_id
    WHERE o.organization_id = _org_id
      AND pm.user_id = _user_id
      AND o.body = ANY (_bodies)
      AND (o.term_end IS NULL OR o.term_end >= CURRENT_DATE)
  )
$$;

REVOKE ALL ON FUNCTION public.is_party_officer(uuid, uuid, text[]) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_party_officer(uuid, uuid, text[]) FROM anon;
GRANT EXECUTE ON FUNCTION public.is_party_officer(uuid, uuid, text[]) TO authenticated;

-- Юрист штабу: опрацювання повідомлень про порушення (зміна статусу/нотаток)
CREATE POLICY "edr_lawyer_update" ON public.election_day_reports
FOR UPDATE TO authenticated
USING (kind = 'incident' AND public.is_party_officer(organization_id, auth.uid(), ARRAY['lawyer']))
WITH CHECK (kind = 'incident' AND public.is_party_officer(organization_id, auth.uid(), ARRAY['lawyer']));

-- Керівник агітаційного відділу: керування наметами в межах усієї організації
CREATE POLICY "tents_agitation_manage" ON public.campaign_tents
FOR ALL TO authenticated
USING (public.is_party_officer(organization_id, auth.uid(), ARRAY['agitation']))
WITH CHECK (public.is_party_officer(organization_id, auth.uid(), ARRAY['agitation']));

CREATE POLICY "tent_reports_agitation_manage" ON public.tent_reports
FOR ALL TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.campaign_tents t
  WHERE t.id = tent_reports.tent_id
    AND public.is_party_officer(t.organization_id, auth.uid(), ARRAY['agitation'])
))
WITH CHECK (EXISTS (
  SELECT 1 FROM public.campaign_tents t
  WHERE t.id = tent_reports.tent_id
    AND public.is_party_officer(t.organization_id, auth.uid(), ARRAY['agitation'])
));