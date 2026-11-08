ALTER TABLE public.party_hqs ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'party';
CREATE OR REPLACE FUNCTION public.party_hqs_kind_guard() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.kind NOT IN ('party','campaign') THEN RAISE EXCEPTION 'Невірний тип структури'; END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS party_hqs_kind_guard ON public.party_hqs;
CREATE TRIGGER party_hqs_kind_guard BEFORE INSERT OR UPDATE ON public.party_hqs FOR EACH ROW EXECUTE FUNCTION public.party_hqs_kind_guard();
UPDATE public.party_hqs SET kind='campaign' WHERE name ILIKE '%штаб%' OR id IN (SELECT DISTINCT hq_id FROM public.precincts);
CREATE INDEX IF NOT EXISTS party_hqs_org_kind_idx ON public.party_hqs(organization_id, kind);