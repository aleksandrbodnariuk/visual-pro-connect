CREATE OR REPLACE FUNCTION public.election_campaigns_mode_guard()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.mode NOT IN ('real','test','training','demo') THEN RAISE EXCEPTION 'Невідомий режим кампанії'; END IF;
  NEW.is_test := NEW.mode <> 'real';
  RETURN NEW;
END $$;

CREATE TABLE public.campaign_trainees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  campaign_id uuid NOT NULL REFERENCES public.election_campaigns(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  full_name text,
  role text NOT NULL CHECK (role IN ('observer','lawyer','agitation','analyst')),
  precinct_id uuid REFERENCES public.precincts(id) ON DELETE CASCADE,
  created_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (campaign_id, user_id, role, precinct_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.campaign_trainees TO authenticated;
GRANT ALL ON public.campaign_trainees TO service_role;
ALTER TABLE public.campaign_trainees ENABLE ROW LEVEL SECURITY;
CREATE POLICY trainees_select ON public.campaign_trainees FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_org_manager(organization_id, auth.uid()));
CREATE POLICY trainees_manage ON public.campaign_trainees FOR ALL TO authenticated
  USING (public.is_org_manager(organization_id, auth.uid()))
  WITH CHECK (public.is_org_manager(organization_id, auth.uid()));

CREATE OR REPLACE FUNCTION public.is_campaign_trainee(_campaign_id uuid, _user_id uuid, _role text, _precinct_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.campaign_trainees t
    JOIN public.election_campaigns c ON c.id = t.campaign_id AND c.mode = 'training' AND c.status <> 'finished'
    WHERE t.campaign_id = _campaign_id AND t.user_id = _user_id AND t.role = _role
      AND (_precinct_id IS NULL OR t.precinct_id = _precinct_id))
$$;
REVOKE ALL ON FUNCTION public.is_campaign_trainee(uuid, uuid, text, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_campaign_trainee(uuid, uuid, text, uuid) TO authenticated;

CREATE POLICY edr_trainee_observer ON public.election_day_reports FOR ALL TO authenticated
  USING (public.is_campaign_trainee(campaign_id, auth.uid(), 'observer', precinct_id))
  WITH CHECK (public.is_campaign_trainee(campaign_id, auth.uid(), 'observer', precinct_id));
CREATE POLICY edr_trainee_lawyer ON public.election_day_reports FOR UPDATE TO authenticated
  USING (kind = 'incident' AND public.is_campaign_trainee(campaign_id, auth.uid(), 'lawyer', NULL))
  WITH CHECK (kind = 'incident' AND public.is_campaign_trainee(campaign_id, auth.uid(), 'lawyer', NULL));
CREATE POLICY protocols_trainee_observer ON public.precinct_protocols FOR ALL TO authenticated
  USING (public.is_campaign_trainee(campaign_id, auth.uid(), 'observer', precinct_id))
  WITH CHECK (public.is_campaign_trainee(campaign_id, auth.uid(), 'observer', precinct_id));
CREATE POLICY votes_trainee_observer ON public.protocol_votes FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.precinct_protocols pp WHERE pp.id = protocol_votes.protocol_id AND public.is_campaign_trainee(pp.campaign_id, auth.uid(), 'observer', pp.precinct_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.precinct_protocols pp WHERE pp.id = protocol_votes.protocol_id AND public.is_campaign_trainee(pp.campaign_id, auth.uid(), 'observer', pp.precinct_id)));