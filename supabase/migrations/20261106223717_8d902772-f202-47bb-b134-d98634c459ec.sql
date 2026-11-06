CREATE TABLE public.vip_bible_state (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vip_bible_state TO authenticated;
GRANT ALL ON public.vip_bible_state TO service_role;
ALTER TABLE public.vip_bible_state ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own bible state" ON public.vip_bible_state FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE OR REPLACE FUNCTION public.vip_bible_touch() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;
CREATE TRIGGER vip_bible_state_touch BEFORE UPDATE ON public.vip_bible_state FOR EACH ROW EXECUTE FUNCTION public.vip_bible_touch();