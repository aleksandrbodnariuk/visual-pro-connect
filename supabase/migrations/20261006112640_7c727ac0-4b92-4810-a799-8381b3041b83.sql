REVOKE EXECUTE ON FUNCTION public.get_user_by_phone(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_by_phone(text) TO service_role;