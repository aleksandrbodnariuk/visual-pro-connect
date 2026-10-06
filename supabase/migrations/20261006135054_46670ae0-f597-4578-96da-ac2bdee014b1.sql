ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS flag_url text;
ALTER TABLE public.election_campaigns ADD COLUMN IF NOT EXISTS mode text NOT NULL DEFAULT 'real';
ALTER TABLE public.election_campaigns ADD COLUMN IF NOT EXISTS precinct_ids uuid[];
UPDATE public.election_campaigns SET mode = 'training' WHERE is_test = true AND mode = 'real';
CREATE OR REPLACE FUNCTION public.election_campaigns_mode_guard()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.mode NOT IN ('real','test','training') THEN RAISE EXCEPTION 'Невідомий режим кампанії'; END IF;
  NEW.is_test := NEW.mode <> 'real';
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_election_campaigns_mode ON public.election_campaigns;
CREATE TRIGGER trg_election_campaigns_mode BEFORE INSERT OR UPDATE ON public.election_campaigns
FOR EACH ROW EXECUTE FUNCTION public.election_campaigns_mode_guard();