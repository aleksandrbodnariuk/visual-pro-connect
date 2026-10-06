CREATE OR REPLACE FUNCTION public.get_daily_popular_posts(_day_start timestamptz, _day_end timestamptz)
RETURNS TABLE(id uuid, user_id uuid, content text, media_url text, created_at timestamp without time zone, category text, group_id uuid, posted_as_group boolean, reaction_count bigint)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public
AS $$
 SELECT p.id, p.user_id, p.content, p.media_url, p.created_at, p.category, p.group_id, p.posted_as_group, count(l.id) AS reaction_count
 FROM public.posts p
 JOIN public.post_likes l ON l.post_id = p.id
 WHERE auth.uid() IS NOT NULL
 AND _day_end > _day_start AND _day_end - _day_start <= interval '25 hours'
 AND p.created_at >= (_day_start AT TIME ZONE 'UTC')
 AND p.created_at < (_day_end AT TIME ZONE 'UTC')
 GROUP BY p.id
 ORDER BY count(l.id) DESC, p.created_at DESC, p.id
 LIMIT 10;
$$;
REVOKE ALL ON FUNCTION public.get_daily_popular_posts(timestamptz,timestamptz) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_daily_popular_posts(timestamptz,timestamptz) TO authenticated, service_role;