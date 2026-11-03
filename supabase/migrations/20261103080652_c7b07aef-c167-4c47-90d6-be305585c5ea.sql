ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS target_user_id uuid;
CREATE INDEX IF NOT EXISTS posts_target_user_id_created_idx ON public.posts (target_user_id, created_at DESC) WHERE target_user_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.posts_greeting_guard()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.target_user_id IS NULL THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' AND NEW.target_user_id IS NOT DISTINCT FROM OLD.target_user_id THEN RETURN NEW; END IF;
  IF NEW.group_id IS NULL THEN
    RAISE EXCEPTION 'Привітання для іменинника можна публікувати лише в групі';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.groups g WHERE g.id = NEW.group_id AND g.song_orders_enabled) THEN
    RAISE EXCEPTION 'У цій групі не ввімкнено привітання для іменинників';
  END IF;
  IF NOT (public.is_group_admin(NEW.group_id, auth.uid()) OR public.is_user_admin(auth.uid())) THEN
    RAISE EXCEPTION 'Позначати іменинника можуть лише адміністратори групи';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.users u WHERE u.id = NEW.target_user_id) THEN
    RAISE EXCEPTION 'Іменинника не знайдено';
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.posts_greeting_guard() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS posts_greeting_guard_trg ON public.posts;
CREATE TRIGGER posts_greeting_guard_trg BEFORE INSERT OR UPDATE OF target_user_id ON public.posts
FOR EACH ROW EXECUTE FUNCTION public.posts_greeting_guard();

CREATE OR REPLACE FUNCTION public.posts_greeting_notify()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _gname text;
BEGIN
  IF NEW.target_user_id IS NULL OR NEW.target_user_id = NEW.user_id THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' AND NEW.target_user_id IS NOT DISTINCT FROM OLD.target_user_id THEN RETURN NEW; END IF;
  SELECT name INTO _gname FROM public.groups WHERE id = NEW.group_id;
  INSERT INTO public.notifications (user_id, message, link)
  VALUES (NEW.target_user_id,
          '🎂 Для вас опубліковано привітання в групі «' || COALESCE(_gname, 'група') || '». Воно також є на вашій сторінці.',
          '/post/' || NEW.id::text);
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.posts_greeting_notify() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS posts_greeting_notify_trg ON public.posts;
CREATE TRIGGER posts_greeting_notify_trg AFTER INSERT OR UPDATE OF target_user_id ON public.posts
FOR EACH ROW EXECUTE FUNCTION public.posts_greeting_notify();

CREATE OR REPLACE FUNCTION public.search_greeting_recipients(_q text)
RETURNS TABLE(id uuid, full_name text, avatar_url text, date_of_birth date)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Потрібна авторизація'; END IF;
  IF length(trim(coalesce(_q, ''))) < 2 THEN RETURN; END IF;
  RETURN QUERY
    SELECT u.id, u.full_name, u.avatar_url, NULL::date
    FROM public.users u
    WHERE u.full_name ILIKE '%' || trim(_q) || '%' AND COALESCE(u.is_blocked, false) = false
    ORDER BY u.full_name
    LIMIT 20;
END $$;
REVOKE ALL ON FUNCTION public.search_greeting_recipients(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.search_greeting_recipients(text) TO authenticated;