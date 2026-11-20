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
    IF NEW.organization_id <> OLD.organization_id THEN
      RAISE EXCEPTION 'Недостатньо прав для цієї зміни';
    END IF;
    -- Account binding is allowed only inside bind_team_partner, which checks branch rights itself
    IF (NEW.user_id IS DISTINCT FROM OLD.user_id OR NEW.co_user_id IS DISTINCT FROM OLD.co_user_id)
       AND coalesce(current_setting('app.team_bind', true), '') <> 'on' THEN
      RAISE EXCEPTION 'Недостатньо прав для цієї зміни';
    END IF;
    IF NEW.sponsor_id IS DISTINCT FROM OLD.sponsor_id AND (OLD.user_id = auth.uid() OR OLD.co_user_id = auth.uid()) THEN
      RAISE EXCEPTION 'Змінити власного спонсора може лише керівник команди';
    END IF;
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.team_partners_guard() FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.bind_team_partner(_partner_id uuid, _user_id uuid, _as_co boolean DEFAULT false)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE p public.team_partners;
BEGIN
  SELECT * INTO p FROM public.team_partners WHERE id = _partner_id;
  IF p.id IS NULL THEN RAISE EXCEPTION 'Місце в структурі не знайдено'; END IF;
  IF NOT (public.is_org_manager(p.organization_id, auth.uid())
          OR (p.sponsor_id IS NOT NULL AND public.team_in_my_subtree(p.sponsor_id, auth.uid()))) THEN
    RAISE EXCEPTION 'Недостатньо прав';
  END IF;
  IF _user_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.team_partners x WHERE x.organization_id = p.organization_id AND x.id <> p.id AND (x.user_id = _user_id OR x.co_user_id = _user_id)) THEN
    RAISE EXCEPTION 'Цей акаунт уже має місце в структурі';
  END IF;
  PERFORM set_config('app.team_bind', 'on', true);
  IF _as_co THEN
    UPDATE public.team_partners SET co_user_id = _user_id WHERE id = p.id;
  ELSE
    UPDATE public.team_partners SET user_id = _user_id WHERE id = p.id;
  END IF;
  PERFORM set_config('app.team_bind', '', true);
  IF _user_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.organization_members m WHERE m.organization_id = p.organization_id AND m.user_id = _user_id) THEN
    INSERT INTO public.organization_members(organization_id, user_id, role) VALUES (p.organization_id, _user_id, 'member');
  END IF;
END $function$;