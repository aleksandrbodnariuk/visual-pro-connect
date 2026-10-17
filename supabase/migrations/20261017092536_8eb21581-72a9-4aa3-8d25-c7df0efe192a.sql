CREATE OR REPLACE FUNCTION public.can_access_protocol_file(_name text, _write boolean)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE _camp uuid; _prec uuid; _org uuid; _hq uuid; _uid uuid := auth.uid();
BEGIN
  IF _uid IS NULL THEN RETURN false; END IF;
  BEGIN
    _camp := split_part(_name, '/', 1)::uuid;
    _prec := split_part(_name, '/', 2)::uuid;
  EXCEPTION WHEN others THEN RETURN false; END;
  SELECT organization_id INTO _org FROM election_campaigns WHERE id = _camp;
  SELECT hq_id INTO _hq FROM precincts WHERE id = _prec AND organization_id = _org;
  IF _org IS NULL OR _hq IS NULL THEN RETURN false; END IF;
  IF is_campaign_trainee(_camp, _uid, 'observer', _prec) THEN RETURN true; END IF;
  IF NOT _write THEN RETURN has_party_access(_org, _uid); END IF;
  RETURN can_manage_hq(_hq, _uid)
    OR EXISTS (SELECT 1 FROM precinct_members WHERE precinct_id = _prec AND user_id = _uid);
END $$;
REVOKE ALL ON FUNCTION public.can_access_protocol_file(text, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_access_protocol_file(text, boolean) TO authenticated;