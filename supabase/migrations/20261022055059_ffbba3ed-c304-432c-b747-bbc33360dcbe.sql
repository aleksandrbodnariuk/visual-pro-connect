DROP FUNCTION IF EXISTS public.increment_post_play(uuid);

CREATE TABLE public.post_plays (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT INSERT ON public.post_plays TO authenticated;
GRANT ALL ON public.post_plays TO service_role;
ALTER TABLE public.post_plays ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users log own plays" ON public.post_plays FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND EXISTS (SELECT 1 FROM public.posts p WHERE p.id = post_id));
CREATE INDEX post_plays_post_idx ON public.post_plays(post_id);

CREATE OR REPLACE FUNCTION public.post_plays_bump()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.posts SET play_count = play_count + 1 WHERE id = NEW.post_id;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.post_plays_bump() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER post_plays_bump_trg AFTER INSERT ON public.post_plays FOR EACH ROW EXECUTE FUNCTION public.post_plays_bump();