CREATE INDEX IF NOT EXISTS group_views_group_created_idx ON public.group_views (group_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.get_group_stats(_group_id uuid)
 RETURNS TABLE(views_total bigint, views_7d bigint, views_30d bigint, unique_viewers bigint, members_count bigint, posts_count bigint)
 LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  IF NOT (public.is_group_admin(_group_id, auth.uid()) OR public.is_admin(auth.uid())) THEN
    RAISE EXCEPTION 'Немає доступу до статистики групи';
  END IF;
  RETURN QUERY SELECT
    (SELECT count(*) FROM public.group_views v WHERE v.group_id = _group_id),
    (SELECT count(*) FROM public.group_views v WHERE v.group_id = _group_id AND v.created_at > now() - interval '7 days'),
    (SELECT count(*) FROM public.group_views v WHERE v.group_id = _group_id AND v.created_at > now() - interval '30 days'),
    (SELECT count(DISTINCT v.user_id) FROM public.group_views v WHERE v.group_id = _group_id),
    (SELECT count(*) FROM public.group_members m WHERE m.group_id = _group_id AND m.status = 'approved'),
    (SELECT count(*) FROM public.posts p WHERE p.group_id = _group_id);
END $$;

CREATE OR REPLACE FUNCTION public.get_group_daily_stats(_group_id uuid, _days int DEFAULT 30)
 RETURNS TABLE(day date, views bigint, unique_viewers bigint, member_views bigint, guest_views bigint)
 LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE d int := LEAST(GREATEST(COALESCE(_days,30),1),365);
BEGIN
  IF NOT (public.is_group_admin(_group_id, auth.uid()) OR public.is_admin(auth.uid())) THEN
    RAISE EXCEPTION 'Немає доступу до статистики групи';
  END IF;
  RETURN QUERY
  SELECT g.day::date,
    count(v.id),
    count(DISTINCT v.user_id),
    count(v.id) FILTER (WHERE m.user_id IS NOT NULL),
    count(v.id) FILTER (WHERE v.id IS NOT NULL AND m.user_id IS NULL)
  FROM generate_series((now() AT TIME ZONE 'Europe/Kyiv')::date - (d-1), (now() AT TIME ZONE 'Europe/Kyiv')::date, interval '1 day') g(day)
  LEFT JOIN public.group_views v ON v.group_id = _group_id AND (v.created_at AT TIME ZONE 'Europe/Kyiv')::date = g.day::date
  LEFT JOIN public.group_members m ON m.group_id = _group_id AND m.user_id = v.user_id AND m.status = 'approved'
  GROUP BY g.day ORDER BY g.day;
END $$;

REVOKE ALL ON FUNCTION public.get_group_stats(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_group_daily_stats(uuid,int) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_group_stats(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_group_daily_stats(uuid,int) TO authenticated;