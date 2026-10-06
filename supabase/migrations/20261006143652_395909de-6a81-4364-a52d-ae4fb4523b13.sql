CREATE TABLE public.campaign_tents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  campaign_id uuid NOT NULL REFERENCES public.election_campaigns(id) ON DELETE CASCADE,
  hq_id uuid NOT NULL REFERENCES public.party_hqs(id) ON DELETE CASCADE,
  address text NOT NULL,
  responsible_name text,
  phone text,
  schedule text,
  notes text,
  created_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.campaign_tents TO authenticated;
GRANT ALL ON public.campaign_tents TO service_role;
ALTER TABLE public.campaign_tents ENABLE ROW LEVEL SECURITY;
CREATE POLICY tents_select ON public.campaign_tents FOR SELECT TO authenticated USING (public.has_party_access(organization_id, auth.uid()));
CREATE POLICY tents_manage ON public.campaign_tents FOR ALL TO authenticated USING (public.can_manage_hq(hq_id, auth.uid())) WITH CHECK (public.can_manage_hq(hq_id, auth.uid()));
CREATE INDEX campaign_tents_campaign_idx ON public.campaign_tents(campaign_id);

CREATE TABLE public.tent_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tent_id uuid NOT NULL REFERENCES public.campaign_tents(id) ON DELETE CASCADE,
  report_date date NOT NULL DEFAULT current_date,
  newspapers integer NOT NULL DEFAULT 0,
  booklets integer NOT NULL DEFAULT 0,
  other_materials integer NOT NULL DEFAULT 0,
  contacts integer NOT NULL DEFAULT 0,
  notes text,
  created_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tent_id, report_date)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tent_reports TO authenticated;
GRANT ALL ON public.tent_reports TO service_role;
ALTER TABLE public.tent_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY tent_reports_select ON public.tent_reports FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.campaign_tents t WHERE t.id = tent_id AND public.has_party_access(t.organization_id, auth.uid())));
CREATE POLICY tent_reports_manage ON public.tent_reports FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.campaign_tents t WHERE t.id = tent_id AND public.can_manage_hq(t.hq_id, auth.uid()))) WITH CHECK (EXISTS (SELECT 1 FROM public.campaign_tents t WHERE t.id = tent_id AND public.can_manage_hq(t.hq_id, auth.uid())));

-- Tents work only during an active (not finished) campaign
CREATE OR REPLACE FUNCTION public.campaign_tents_active_guard()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE st text; cid uuid;
BEGIN
  IF TG_TABLE_NAME = 'campaign_tents' THEN cid := NEW.campaign_id;
  ELSE SELECT campaign_id INTO cid FROM public.campaign_tents WHERE id = NEW.tent_id; END IF;
  SELECT status INTO st FROM public.election_campaigns WHERE id = cid;
  IF st = 'finished' THEN RAISE EXCEPTION 'Кампанія завершена — агітаційні намети більше не працюють'; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER campaign_tents_guard BEFORE INSERT OR UPDATE ON public.campaign_tents FOR EACH ROW EXECUTE FUNCTION public.campaign_tents_active_guard();
CREATE TRIGGER tent_reports_guard BEFORE INSERT OR UPDATE ON public.tent_reports FOR EACH ROW EXECUTE FUNCTION public.campaign_tents_active_guard();
REVOKE EXECUTE ON FUNCTION public.campaign_tents_active_guard() FROM PUBLIC, anon, authenticated;