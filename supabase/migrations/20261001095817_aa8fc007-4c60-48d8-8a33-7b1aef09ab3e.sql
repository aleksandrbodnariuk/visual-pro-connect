REVOKE ALL ON FUNCTION public.is_org_manager(uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.has_party_access(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_org_manager(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.has_party_access(uuid, uuid) TO authenticated, service_role;