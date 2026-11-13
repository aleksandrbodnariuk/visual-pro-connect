CREATE OR REPLACE FUNCTION public.team_partners_guard()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.sponsor_id IS DISTINCT FROM OLD.sponsor_id AND NEW.sponsor_id IS NOT NULL THEN
    IF NEW.sponsor_id = NEW.id OR EXISTS (
      WITH RECURSIVE up AS (
        SELECT id, sponsor_id, 0 AS d FROM public.team_partners WHERE id = NEW.sponsor_id
        UNION ALL
        SELECT p.id, p.sponsor_id, up.d + 1 FROM public.team_partners p JOIN up ON p.id = up.sponsor_id WHERE up.d < 60
      ) SELECT 1 FROM up WHERE id = NEW.id) THEN
      RAISE EXCEPTION 'Не можна призначити спонсором партнера з власної гілки';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.team_partners WHERE id = NEW.sponsor_id AND organization_id = NEW.organization_id) THEN
      RAISE EXCEPTION 'Спонсор має бути з цієї ж команди';
    END IF;
  END IF;
  IF auth.uid() IS NULL OR public.is_org_manager(NEW.organization_id, auth.uid()) THEN RETURN NEW; END IF;
  IF TG_OP = 'INSERT' THEN
    IF NEW.user_id IS NOT NULL OR NEW.co_user_id IS NOT NULL THEN
      RAISE EXCEPTION 'Прив''язувати акаунти можна лише через кнопку «Прикріпити акаунт»';
    END IF;
  ELSE
    IF NEW.organization_id <> OLD.organization_id OR NEW.user_id IS DISTINCT FROM OLD.user_id OR NEW.co_user_id IS DISTINCT FROM OLD.co_user_id THEN
      RAISE EXCEPTION 'Недостатньо прав для цієї зміни';
    END IF;
    IF NEW.sponsor_id IS DISTINCT FROM OLD.sponsor_id AND (OLD.user_id = auth.uid() OR OLD.co_user_id = auth.uid()) THEN
      RAISE EXCEPTION 'Змінити власного спонсора може лише керівник команди';
    END IF;
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.team_partners_guard() FROM PUBLIC, anon, authenticated;