-- HQ managers
CREATE TABLE public.hq_managers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  hq_id uuid NOT NULL REFERENCES public.party_hqs(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  granted_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (hq_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.hq_managers TO authenticated;
GRANT ALL ON public.hq_managers TO service_role;
ALTER TABLE public.hq_managers ENABLE ROW LEVEL SECURITY;
CREATE POLICY hq_managers_select ON public.hq_managers FOR SELECT TO authenticated USING (public.has_party_access(organization_id, auth.uid()) OR user_id = auth.uid());
CREATE POLICY hq_managers_manage ON public.hq_managers FOR ALL TO authenticated USING (public.is_org_manager(organization_id, auth.uid())) WITH CHECK (public.is_org_manager(organization_id, auth.uid()));

CREATE OR REPLACE FUNCTION public.can_manage_hq(_hq_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH RECURSIVE anc AS (
    SELECT id, parent_id, organization_id FROM public.party_hqs WHERE id = _hq_id
    UNION ALL
    SELECT h.id, h.parent_id, h.organization_id FROM public.party_hqs h JOIN anc a ON h.id = a.parent_id
  )
  SELECT _hq_id IS NOT NULL AND (
    EXISTS (SELECT 1 FROM anc WHERE public.is_org_manager(anc.organization_id, _user_id))
    OR EXISTS (SELECT 1 FROM public.hq_managers m JOIN anc ON anc.id = m.hq_id WHERE m.user_id = _user_id)
  );
$$;
REVOKE EXECUTE ON FUNCTION public.can_manage_hq(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_manage_hq(uuid, uuid) TO authenticated, service_role;

-- Manager write access
CREATE POLICY hqs_manager_update ON public.party_hqs FOR UPDATE TO authenticated USING (public.can_manage_hq(id, auth.uid())) WITH CHECK (public.can_manage_hq(id, auth.uid()));
CREATE POLICY hqs_manager_insert ON public.party_hqs FOR INSERT TO authenticated WITH CHECK (parent_id IS NOT NULL AND public.can_manage_hq(parent_id, auth.uid()));
CREATE POLICY hqs_manager_delete ON public.party_hqs FOR DELETE TO authenticated USING (parent_id IS NOT NULL AND public.can_manage_hq(parent_id, auth.uid()));
CREATE POLICY hq_members_manager ON public.hq_members FOR ALL TO authenticated USING (public.can_manage_hq(hq_id, auth.uid())) WITH CHECK (public.can_manage_hq(hq_id, auth.uid()));
CREATE POLICY precincts_manager ON public.precincts FOR ALL TO authenticated USING (public.can_manage_hq(hq_id, auth.uid())) WITH CHECK (public.can_manage_hq(hq_id, auth.uid()));
CREATE POLICY precinct_members_manager ON public.precinct_members FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.precincts p WHERE p.id = precinct_id AND public.can_manage_hq(p.hq_id, auth.uid())))
  WITH CHECK (EXISTS (SELECT 1 FROM public.precincts p WHERE p.id = precinct_id AND public.can_manage_hq(p.hq_id, auth.uid())));

-- Party chats
CREATE TABLE public.party_chats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  hq_id uuid REFERENCES public.party_hqs(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('internal','network','general')),
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX party_chats_uniq ON public.party_chats (organization_id, COALESCE(hq_id, '00000000-0000-0000-0000-000000000000'::uuid), kind);
GRANT SELECT ON public.party_chats TO authenticated;
GRANT ALL ON public.party_chats TO service_role;
ALTER TABLE public.party_chats ENABLE ROW LEVEL SECURITY;
CREATE POLICY party_chats_select ON public.party_chats FOR SELECT TO authenticated USING (public.has_party_access(organization_id, auth.uid()));

CREATE OR REPLACE FUNCTION public.open_party_chat(_org_id uuid, _hq_id uuid, _kind text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  me uuid := auth.uid();
  conv uuid;
  ttl text;
  hq record;
  allowed boolean;
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF NOT public.has_party_access(_org_id, me) THEN RAISE EXCEPTION 'Немає доступу до партії'; END IF;
  IF _kind NOT IN ('internal','network','general') THEN RAISE EXCEPTION 'Invalid kind'; END IF;
  IF _kind = 'general' THEN _hq_id := NULL;
  ELSE
    SELECT * INTO hq FROM public.party_hqs WHERE id = _hq_id AND organization_id = _org_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'Штаб не знайдено'; END IF;
  END IF;

  -- collect members
  CREATE TEMP TABLE IF NOT EXISTS _pc_members (uid uuid PRIMARY KEY) ON COMMIT DROP;
  DELETE FROM _pc_members;
  IF _kind = 'general' THEN
    INSERT INTO _pc_members SELECT DISTINCT user_id FROM public.party_access WHERE organization_id = _org_id ON CONFLICT DO NOTHING;
    INSERT INTO _pc_members SELECT DISTINCT user_id FROM public.hq_managers WHERE organization_id = _org_id ON CONFLICT DO NOTHING;
    INSERT INTO _pc_members SELECT DISTINCT user_id FROM public.hq_members WHERE organization_id = _org_id AND user_id IS NOT NULL ON CONFLICT DO NOTHING;
    ttl := 'Загальнопартійний чат';
  ELSE
    INSERT INTO _pc_members SELECT user_id FROM public.hq_managers WHERE hq_id = _hq_id ON CONFLICT DO NOTHING;
    INSERT INTO _pc_members SELECT user_id FROM public.hq_members WHERE hq_id = _hq_id AND user_id IS NOT NULL ON CONFLICT DO NOTHING;
    IF _kind = 'network' THEN
      INSERT INTO _pc_members SELECT m.user_id FROM public.hq_managers m JOIN public.party_hqs h ON h.id = m.hq_id WHERE h.parent_id = _hq_id ON CONFLICT DO NOTHING;
      ttl := hq.name || ' — з підлеглими штабами';
    ELSE
      ttl := hq.name || ' — внутрішній';
    END IF;
  END IF;

  allowed := public.is_org_manager(_org_id, me) OR EXISTS (SELECT 1 FROM _pc_members WHERE uid = me)
    OR (_hq_id IS NOT NULL AND public.can_manage_hq(_hq_id, me));
  IF NOT allowed THEN RAISE EXCEPTION 'Ви не є учасником цього чату'; END IF;
  INSERT INTO _pc_members VALUES (me) ON CONFLICT DO NOTHING;

  SELECT conversation_id INTO conv FROM public.party_chats
   WHERE organization_id = _org_id AND kind = _kind AND hq_id IS NOT DISTINCT FROM _hq_id;
  IF conv IS NULL THEN
    INSERT INTO public.conversations (type, title, created_by) VALUES ('group', ttl, me) RETURNING id INTO conv;
    INSERT INTO public.party_chats (organization_id, hq_id, kind, conversation_id) VALUES (_org_id, _hq_id, _kind, conv);
    INSERT INTO public.messages (conversation_id, sender_id, content, system_event)
    VALUES (conv, me, 'Штабний чат створено', jsonb_build_object('type','group_created','actor', me));
  END IF;

  INSERT INTO public.conversation_members (conversation_id, user_id, role)
  SELECT conv, uid, CASE WHEN public.is_org_manager(_org_id, uid) THEN 'admin' ELSE 'member' END FROM _pc_members
  ON CONFLICT DO NOTHING;

  RETURN conv;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.open_party_chat(uuid, uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.open_party_chat(uuid, uuid, text) TO authenticated;

-- Campaigns
CREATE TABLE public.election_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  election_type text NOT NULL CHECK (election_type IN ('presidential','parliamentary','local')),
  local_kind text CHECK (local_kind IN ('mayor','oblast_council','raion_council','city_council','village_council')),
  name text NOT NULL,
  election_date date,
  round int NOT NULL DEFAULT 1,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('draft','active','finished')),
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.election_campaigns TO authenticated;
GRANT ALL ON public.election_campaigns TO service_role;
ALTER TABLE public.election_campaigns ENABLE ROW LEVEL SECURITY;
CREATE POLICY campaigns_select ON public.election_campaigns FOR SELECT TO authenticated USING (public.has_party_access(organization_id, auth.uid()));
CREATE POLICY campaigns_manage ON public.election_campaigns FOR ALL TO authenticated USING (public.is_org_manager(organization_id, auth.uid())) WITH CHECK (public.is_org_manager(organization_id, auth.uid()));

CREATE TABLE public.campaign_candidates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES public.election_campaigns(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  party text,
  ballot_number int,
  is_ours boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.campaign_candidates TO authenticated;
GRANT ALL ON public.campaign_candidates TO service_role;
ALTER TABLE public.campaign_candidates ENABLE ROW LEVEL SECURITY;
CREATE POLICY candidates_select ON public.campaign_candidates FOR SELECT TO authenticated USING (public.has_party_access(organization_id, auth.uid()));
CREATE POLICY candidates_manage ON public.campaign_candidates FOR ALL TO authenticated USING (public.is_org_manager(organization_id, auth.uid())) WITH CHECK (public.is_org_manager(organization_id, auth.uid()));

CREATE TABLE public.precinct_protocols (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES public.election_campaigns(id) ON DELETE CASCADE,
  precinct_id uuid NOT NULL REFERENCES public.precincts(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  voters_on_list int NOT NULL DEFAULT 0,
  ballots_issued int NOT NULL DEFAULT 0,
  invalid_ballots int NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'submitted' CHECK (status IN ('draft','submitted','verified')),
  notes text,
  submitted_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (campaign_id, precinct_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.precinct_protocols TO authenticated;
GRANT ALL ON public.precinct_protocols TO service_role;
ALTER TABLE public.precinct_protocols ENABLE ROW LEVEL SECURITY;
CREATE POLICY protocols_select ON public.precinct_protocols FOR SELECT TO authenticated USING (public.has_party_access(organization_id, auth.uid()));
CREATE POLICY protocols_manage ON public.precinct_protocols FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.precincts p WHERE p.id = precinct_id AND public.can_manage_hq(p.hq_id, auth.uid())))
  WITH CHECK (EXISTS (SELECT 1 FROM public.precincts p WHERE p.id = precinct_id AND p.organization_id = organization_id AND public.can_manage_hq(p.hq_id, auth.uid())));

CREATE TABLE public.protocol_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  protocol_id uuid NOT NULL REFERENCES public.precinct_protocols(id) ON DELETE CASCADE,
  candidate_id uuid NOT NULL REFERENCES public.campaign_candidates(id) ON DELETE CASCADE,
  votes int NOT NULL DEFAULT 0 CHECK (votes >= 0),
  UNIQUE (protocol_id, candidate_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.protocol_votes TO authenticated;
GRANT ALL ON public.protocol_votes TO service_role;
ALTER TABLE public.protocol_votes ENABLE ROW LEVEL SECURITY;
CREATE POLICY votes_select ON public.protocol_votes FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.precinct_protocols pp WHERE pp.id = protocol_id AND public.has_party_access(pp.organization_id, auth.uid())));
CREATE POLICY votes_manage ON public.protocol_votes FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.precinct_protocols pp JOIN public.precincts p ON p.id = pp.precinct_id WHERE pp.id = protocol_id AND public.can_manage_hq(p.hq_id, auth.uid())))
  WITH CHECK (EXISTS (SELECT 1 FROM public.precinct_protocols pp JOIN public.precincts p ON p.id = pp.precinct_id WHERE pp.id = protocol_id AND public.can_manage_hq(p.hq_id, auth.uid())));

CREATE TRIGGER trg_campaigns_updated BEFORE UPDATE ON public.election_campaigns FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_protocols_updated BEFORE UPDATE ON public.precinct_protocols FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Results aggregation: per HQ (including all subordinate HQs) and grand total (hq_id NULL)
CREATE OR REPLACE FUNCTION public.campaign_results(_campaign_id uuid)
RETURNS TABLE (hq_id uuid, candidate_id uuid, votes bigint)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE org uuid;
BEGIN
  SELECT organization_id INTO org FROM public.election_campaigns WHERE id = _campaign_id;
  IF org IS NULL OR NOT public.has_party_access(org, auth.uid()) THEN RETURN; END IF;
  RETURN QUERY
  WITH RECURSIVE anc AS (
    SELECT h.id AS base, h.id AS anc_id, h.parent_id FROM public.party_hqs h WHERE h.organization_id = org
    UNION ALL
    SELECT a.base, p.id, p.parent_id FROM anc a JOIN public.party_hqs p ON p.id = a.parent_id
  ), v AS (
    SELECT pr.hq_id AS base, pv.candidate_id, pv.votes
    FROM public.protocol_votes pv
    JOIN public.precinct_protocols pp ON pp.id = pv.protocol_id
    JOIN public.precincts pr ON pr.id = pp.precinct_id
    WHERE pp.campaign_id = _campaign_id
  )
  SELECT anc.anc_id, v.candidate_id, SUM(v.votes)::bigint FROM v JOIN anc ON anc.base = v.base GROUP BY 1, 2
  UNION ALL
  SELECT NULL::uuid, v.candidate_id, SUM(v.votes)::bigint FROM v GROUP BY 2;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.campaign_results(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.campaign_results(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.campaign_progress(_campaign_id uuid)
RETURNS TABLE (hq_id uuid, precincts bigint, protocols bigint, voters bigint, ballots bigint, invalid bigint)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE org uuid;
BEGIN
  SELECT organization_id INTO org FROM public.election_campaigns WHERE id = _campaign_id;
  IF org IS NULL OR NOT public.has_party_access(org, auth.uid()) THEN RETURN; END IF;
  RETURN QUERY
  WITH RECURSIVE anc AS (
    SELECT h.id AS base, h.id AS anc_id, h.parent_id FROM public.party_hqs h WHERE h.organization_id = org
    UNION ALL
    SELECT a.base, p.id, p.parent_id FROM anc a JOIN public.party_hqs p ON p.id = a.parent_id
  ), x AS (
    SELECT pr.hq_id AS base, pr.voters_count, pp.id AS pid, pp.voters_on_list, pp.ballots_issued, pp.invalid_ballots
    FROM public.precincts pr
    LEFT JOIN public.precinct_protocols pp ON pp.precinct_id = pr.id AND pp.campaign_id = _campaign_id
    WHERE pr.organization_id = org
  )
  SELECT anc.anc_id, COUNT(*)::bigint, COUNT(x.pid)::bigint,
         SUM(COALESCE(NULLIF(x.voters_on_list,0), x.voters_count))::bigint,
         SUM(COALESCE(x.ballots_issued,0))::bigint, SUM(COALESCE(x.invalid_ballots,0))::bigint
  FROM x JOIN anc ON anc.base = x.base GROUP BY 1
  UNION ALL
  SELECT NULL::uuid, COUNT(*)::bigint, COUNT(x.pid)::bigint,
         SUM(COALESCE(NULLIF(x.voters_on_list,0), x.voters_count))::bigint,
         SUM(COALESCE(x.ballots_issued,0))::bigint, SUM(COALESCE(x.invalid_ballots,0))::bigint
  FROM x;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.campaign_progress(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.campaign_progress(uuid) TO authenticated;