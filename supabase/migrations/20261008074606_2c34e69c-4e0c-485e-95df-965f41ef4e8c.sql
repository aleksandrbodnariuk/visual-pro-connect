CREATE POLICY protocols_precinct_member ON public.precinct_protocols FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.precinct_members m WHERE m.precinct_id = precinct_protocols.precinct_id AND m.organization_id = precinct_protocols.organization_id AND m.user_id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM public.precinct_members m WHERE m.precinct_id = precinct_protocols.precinct_id AND m.organization_id = precinct_protocols.organization_id AND m.user_id = auth.uid()));
CREATE POLICY votes_precinct_member ON public.protocol_votes FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.precinct_protocols pp JOIN public.precinct_members m ON m.precinct_id = pp.precinct_id AND m.organization_id = pp.organization_id WHERE pp.id = protocol_votes.protocol_id AND m.user_id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM public.precinct_protocols pp JOIN public.precinct_members m ON m.precinct_id = pp.precinct_id AND m.organization_id = pp.organization_id WHERE pp.id = protocol_votes.protocol_id AND m.user_id = auth.uid()));
ALTER TABLE public.election_day_reports
  ADD COLUMN IF NOT EXISTS incident_status text NOT NULL DEFAULT 'new',
  ADD COLUMN IF NOT EXISTS legal_notes text,
  ADD COLUMN IF NOT EXISTS handled_by uuid;
ALTER TABLE public.election_day_reports ADD CONSTRAINT edr_incident_status_chk CHECK (incident_status IN ('new','in_work','act','complaint','closed'));