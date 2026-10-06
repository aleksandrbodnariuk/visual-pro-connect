CREATE TABLE public.election_day_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  campaign_id uuid NOT NULL REFERENCES public.election_campaigns(id) ON DELETE CASCADE,
  precinct_id uuid NOT NULL REFERENCES public.precincts(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('opened','turnout','incident')),
  slot text CHECK (slot IN ('12','16','20')),
  voted integer CHECK (voted IS NULL OR voted >= 0),
  quorum boolean,
  notes text CHECK (notes IS NULL OR char_length(notes) <= 2000),
  photos jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_by uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX edr_opened_uniq ON public.election_day_reports(campaign_id, precinct_id) WHERE kind = 'opened';
CREATE UNIQUE INDEX edr_turnout_uniq ON public.election_day_reports(campaign_id, precinct_id, slot) WHERE kind = 'turnout';
CREATE INDEX edr_campaign_idx ON public.election_day_reports(campaign_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.election_day_reports TO authenticated;
GRANT ALL ON public.election_day_reports TO service_role;
ALTER TABLE public.election_day_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY edr_select ON public.election_day_reports FOR SELECT TO authenticated USING (public.has_party_access(organization_id, auth.uid()));
CREATE POLICY edr_write ON public.election_day_reports FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.precincts p WHERE p.id = precinct_id AND p.organization_id = election_day_reports.organization_id AND (public.can_manage_hq(p.hq_id, auth.uid()) OR EXISTS (SELECT 1 FROM public.precinct_members m WHERE m.precinct_id = p.id AND m.user_id = auth.uid()))))
WITH CHECK (EXISTS (SELECT 1 FROM public.precincts p WHERE p.id = precinct_id AND p.organization_id = election_day_reports.organization_id AND (public.can_manage_hq(p.hq_id, auth.uid()) OR EXISTS (SELECT 1 FROM public.precinct_members m WHERE m.precinct_id = p.id AND m.user_id = auth.uid()))));