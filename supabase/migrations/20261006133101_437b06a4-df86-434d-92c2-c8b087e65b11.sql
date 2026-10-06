ALTER TABLE public.election_campaigns ADD COLUMN IF NOT EXISTS is_test boolean NOT NULL DEFAULT false;
ALTER TABLE public.party_hqs ADD COLUMN IF NOT EXISTS is_test boolean NOT NULL DEFAULT false;