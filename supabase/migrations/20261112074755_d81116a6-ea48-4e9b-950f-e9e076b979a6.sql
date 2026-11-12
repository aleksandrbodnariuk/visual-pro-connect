ALTER TABLE public.team_partners ADD COLUMN IF NOT EXISTS co_user_id uuid, ADD COLUMN IF NOT EXISTS co_full_name text, ADD COLUMN IF NOT EXISTS co_phone text;
CREATE INDEX IF NOT EXISTS team_partners_user_idx ON public.team_partners(organization_id, user_id);
CREATE INDEX IF NOT EXISTS team_partners_co_user_idx ON public.team_partners(organization_id, co_user_id);

CREATE OR REPLACE FUNCTION public.team_my_partner_id(_org_id uuid, _user_id uuid)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT id FROM public.team_partners WHERE organization_id = _org_id AND (user_id = _user_id OR co_user_id = _user_id) ORDER BY created_at LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.team_in_my_subtree(_partner_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH RECURSIVE up AS (
    SELECT id, sponsor_id, user_id, co_user_id, 0 AS d FROM public.team_partners WHERE id = _partner_id
    UNION ALL
    SELECT p.id, p.sponsor_id, p.user_id, p.co_user_id, up.d + 1 FROM public.team_partners p JOIN up ON p.id = up.sponsor_id WHERE up.d < 60
  )
  SELECT _user_id IS NOT NULL AND EXISTS (SELECT 1 FROM up WHERE user_id = _user_id OR co_user_id = _user_id);
$$;

CREATE OR REPLACE FUNCTION public.team_group_pv(_partner_id uuid)
RETURNS numeric LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH RECURSIVE down AS (
    SELECT id, personal_pv, 0 AS d FROM public.team_partners WHERE id = _partner_id
    UNION ALL
    SELECT p.id, p.personal_pv, down.d + 1 FROM public.team_partners p JOIN down ON p.sponsor_id = down.id WHERE down.d < 60
  )
  SELECT COALESCE(SUM(personal_pv), 0) FROM down;
$$;

CREATE OR REPLACE FUNCTION public.is_team_album_editor(_org_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.is_org_manager(_org_id, _user_id)
    OR EXISTS (SELECT 1 FROM public.organization_members m WHERE m.organization_id = _org_id AND m.user_id = _user_id AND m.role = 'leader')
    OR EXISTS (SELECT 1 FROM public.team_partners p WHERE p.organization_id = _org_id AND (p.user_id = _user_id OR p.co_user_id = _user_id) AND public.team_group_pv(p.id) >= 600);
$$;

REVOKE ALL ON FUNCTION public.team_my_partner_id(uuid, uuid), public.team_in_my_subtree(uuid, uuid), public.team_group_pv(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.team_my_partner_id(uuid, uuid), public.team_in_my_subtree(uuid, uuid), public.team_group_pv(uuid) TO authenticated, service_role;

-- Partners may add/edit people inside their own branch; deleting stays with managers.
CREATE POLICY team_partners_branch_insert ON public.team_partners FOR INSERT TO authenticated
  WITH CHECK (public.is_org_member(organization_id, auth.uid()) AND sponsor_id IS NOT NULL AND public.team_in_my_subtree(sponsor_id, auth.uid()));
CREATE POLICY team_partners_branch_update ON public.team_partners FOR UPDATE TO authenticated
  USING (public.team_in_my_subtree(id, auth.uid())) WITH CHECK (public.team_in_my_subtree(id, auth.uid()));

CREATE OR REPLACE FUNCTION public.team_partners_guard()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
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
DROP TRIGGER IF EXISTS trg_team_partners_guard ON public.team_partners;
CREATE TRIGGER trg_team_partners_guard BEFORE INSERT OR UPDATE ON public.team_partners FOR EACH ROW EXECUTE FUNCTION public.team_partners_guard();

CREATE OR REPLACE FUNCTION public.bind_team_partner(_partner_id uuid, _user_id uuid, _as_co boolean DEFAULT false)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
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
  IF _as_co THEN
    UPDATE public.team_partners SET co_user_id = _user_id WHERE id = p.id;
  ELSE
    UPDATE public.team_partners SET user_id = _user_id WHERE id = p.id;
  END IF;
  IF _user_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.organization_members m WHERE m.organization_id = p.organization_id AND m.user_id = _user_id) THEN
    INSERT INTO public.organization_members(organization_id, user_id, role) VALUES (p.organization_id, _user_id, 'member');
  END IF;
END $$;
REVOKE ALL ON FUNCTION public.bind_team_partner(uuid, uuid, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.bind_team_partner(uuid, uuid, boolean) TO authenticated, service_role;