CREATE OR REPLACE FUNCTION public.open_party_chat(_org_id uuid, _hq_id uuid, _kind text)
 RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  me uuid := auth.uid();
  conv uuid; ttl text; hq record; allowed boolean;
  mems uuid[] := '{}';
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'Потрібно увійти в акаунт'; END IF;
  IF NOT public.has_party_access(_org_id, me) THEN RAISE EXCEPTION 'Немає доступу до партії'; END IF;
  IF _kind NOT IN ('internal','network','general') THEN RAISE EXCEPTION 'Невідомий тип чату'; END IF;
  IF _kind = 'general' THEN _hq_id := NULL;
  ELSE
    SELECT * INTO hq FROM public.party_hqs WHERE id = _hq_id AND organization_id = _org_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'Штаб не знайдено'; END IF;
  END IF;

  IF _kind = 'general' THEN
    SELECT COALESCE(array_agg(DISTINCT u), '{}') INTO mems FROM (
      SELECT user_id u FROM public.party_access WHERE organization_id = _org_id
      UNION SELECT user_id FROM public.hq_managers WHERE organization_id = _org_id
      UNION SELECT user_id FROM public.hq_members WHERE organization_id = _org_id AND user_id IS NOT NULL) s;
    ttl := 'Загальнопартійний чат';
  ELSE
    SELECT COALESCE(array_agg(DISTINCT u), '{}') INTO mems FROM (
      SELECT user_id u FROM public.hq_managers WHERE hq_id = _hq_id
      UNION SELECT user_id FROM public.hq_members WHERE hq_id = _hq_id AND user_id IS NOT NULL
      UNION SELECT m.user_id FROM public.hq_managers m JOIN public.party_hqs h ON h.id = m.hq_id
        WHERE _kind = 'network' AND h.parent_id = _hq_id) s;
    ttl := hq.name || CASE WHEN _kind = 'network' THEN ' — з підлеглими штабами' ELSE ' — внутрішній' END;
  END IF;

  allowed := public.is_org_manager(_org_id, me) OR me = ANY(mems)
    OR (_hq_id IS NOT NULL AND public.can_manage_hq(_hq_id, me));
  IF NOT allowed THEN RAISE EXCEPTION 'Ви не є учасником цього чату'; END IF;
  IF NOT (me = ANY(mems)) THEN mems := mems || me; END IF;

  SELECT conversation_id INTO conv FROM public.party_chats
   WHERE organization_id = _org_id AND kind = _kind AND hq_id IS NOT DISTINCT FROM _hq_id;
  IF conv IS NULL THEN
    INSERT INTO public.conversations (type, title, created_by) VALUES ('group', ttl, me) RETURNING id INTO conv;
    INSERT INTO public.party_chats (organization_id, hq_id, kind, conversation_id) VALUES (_org_id, _hq_id, _kind, conv);
    INSERT INTO public.messages (conversation_id, sender_id, content, system_event)
    VALUES (conv, me, 'Штабний чат створено', jsonb_build_object('type','group_created','actor', me));
  END IF;

  INSERT INTO public.conversation_members (conversation_id, user_id, role)
  SELECT conv, u, CASE WHEN public.is_org_manager(_org_id, u) THEN 'admin' ELSE 'member' END FROM unnest(mems) u
  ON CONFLICT DO NOTHING;
  RETURN conv;
END;
$function$;