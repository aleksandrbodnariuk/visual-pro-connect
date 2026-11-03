CREATE OR REPLACE FUNCTION public.search_greeting_recipients(_q text)
RETURNS TABLE(id uuid, full_name text, avatar_url text, date_of_birth date)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Потрібна авторизація'; END IF;
  IF NOT (public.is_user_admin(auth.uid()) OR EXISTS (
    SELECT 1 FROM public.groups g WHERE g.song_orders_enabled AND public.is_group_admin(g.id, auth.uid())
  )) THEN
    RAISE EXCEPTION 'Пошук іменинників доступний лише адміністраторам груп привітань';
  END IF;
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