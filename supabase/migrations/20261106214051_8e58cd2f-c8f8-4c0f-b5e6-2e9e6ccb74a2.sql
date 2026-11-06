CREATE TABLE public.studio_partners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category text NOT NULL DEFAULT 'other',
  description text,
  logo_url text,
  website_url text,
  instagram_url text,
  phone text,
  discount_offer text,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.studio_partners TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.studio_partners TO authenticated;
GRANT ALL ON public.studio_partners TO service_role;
ALTER TABLE public.studio_partners ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public sees active partners" ON public.studio_partners FOR SELECT USING (is_active OR public.is_user_admin(auth.uid()));
CREATE POLICY "Admins manage partners" ON public.studio_partners FOR ALL TO authenticated USING (public.is_user_admin(auth.uid())) WITH CHECK (public.is_user_admin(auth.uid()));
CREATE OR REPLACE FUNCTION public.studio_partners_touch() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;
CREATE TRIGGER studio_partners_touch BEFORE UPDATE ON public.studio_partners FOR EACH ROW EXECUTE FUNCTION public.studio_partners_touch();