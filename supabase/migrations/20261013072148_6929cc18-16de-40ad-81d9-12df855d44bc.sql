ALTER TYPE public.precinct_role ADD VALUE IF NOT EXISTS 'media';
ALTER TABLE public.party_hqs
  ADD COLUMN IF NOT EXISTS quota_observers integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS quota_commission integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS quota_media integer NOT NULL DEFAULT 0;