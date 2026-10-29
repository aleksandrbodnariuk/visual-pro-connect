CREATE TABLE public.user_follows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id uuid NOT NULL,
  following_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (follower_id, following_id)
);
CREATE INDEX user_follows_following_idx ON public.user_follows(following_id);
GRANT SELECT, INSERT, DELETE ON public.user_follows TO authenticated;
GRANT ALL ON public.user_follows TO service_role;
ALTER TABLE public.user_follows ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view follows" ON public.user_follows FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users follow as themselves" ON public.user_follows FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = follower_id AND follower_id <> following_id);
CREATE POLICY "Users unfollow themselves" ON public.user_follows FOR DELETE TO authenticated USING (auth.uid() = follower_id);

CREATE OR REPLACE FUNCTION public.notify_new_follower()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _name text;
BEGIN
  SELECT full_name INTO _name FROM public.users WHERE id = NEW.follower_id;
  INSERT INTO public.notifications(user_id, message, link, is_read)
  VALUES (NEW.following_id, COALESCE(NULLIF(_name,''),'Користувач') || ' підписався на вас', '/profile/' || NEW.follower_id, false);
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.notify_new_follower() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER user_follows_notify AFTER INSERT ON public.user_follows FOR EACH ROW EXECUTE FUNCTION public.notify_new_follower();