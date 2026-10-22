ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS play_count integer NOT NULL DEFAULT 0;
ALTER TABLE public.groups ADD COLUMN IF NOT EXISTS song_orders_enabled boolean NOT NULL DEFAULT false;
UPDATE public.groups SET song_orders_enabled = true WHERE id = '644a58be-ad07-4907-a94c-3a8ffa97034c';

CREATE OR REPLACE FUNCTION public.increment_post_play(_post_id uuid)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE n integer;
BEGIN
  IF auth.uid() IS NULL THEN RETURN NULL; END IF;
  -- only count posts the caller can see (posts RLS via invoker check)
  UPDATE public.posts SET play_count = play_count + 1 WHERE id = _post_id RETURNING play_count INTO n;
  RETURN n;
END $$;
REVOKE ALL ON FUNCTION public.increment_post_play(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.increment_post_play(uuid) TO authenticated;