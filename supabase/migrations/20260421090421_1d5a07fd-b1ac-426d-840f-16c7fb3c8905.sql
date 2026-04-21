-- 1. Add user_id column
ALTER TABLE public.analytics_events
  ADD COLUMN IF NOT EXISTS user_id uuid;

CREATE INDEX IF NOT EXISTS idx_analytics_events_user_id
  ON public.analytics_events (user_id)
  WHERE user_id IS NOT NULL;

-- 2. Update RPC with traffic filter
CREATE OR REPLACE FUNCTION public.get_analytics_overview(
  _start_date timestamp with time zone,
  _end_date timestamp with time zone,
  _path_filter text DEFAULT NULL::text,
  _country_filter text DEFAULT NULL::text,
  _traffic_filter text DEFAULT 'all'::text
)
RETURNS TABLE(
  total_pageviews bigint,
  unique_visitors bigint,
  total_sessions bigint,
  daily_stats jsonb,
  top_pages jsonb,
  top_countries jsonb,
  top_sources jsonb
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.is_user_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  RETURN QUERY
  WITH base AS (
    SELECT ae.* FROM public.analytics_events ae
    WHERE ae.occurred_at >= _start_date
      AND ae.occurred_at < _end_date
      AND (_path_filter IS NULL OR ae.path = _path_filter)
      AND (_country_filter IS NULL OR ae.country_code = _country_filter)
  ),
  -- Sessions with at least 2 page views (treated as quality / human traffic)
  quality_sessions AS (
    SELECT b.session_id
    FROM base b
    GROUP BY b.session_id
    HAVING count(*) >= 2
  ),
  filtered AS (
    SELECT b.* FROM base b
    WHERE
      CASE
        WHEN _traffic_filter = 'authenticated' THEN b.user_id IS NOT NULL
        WHEN _traffic_filter = 'quality' THEN b.session_id IN (SELECT session_id FROM quality_sessions)
        ELSE TRUE
      END
  ),
  daily AS (
    SELECT
      (f.occurred_at AT TIME ZONE 'Europe/Kyiv')::date as day,
      count(*) as views,
      count(DISTINCT f.visitor_id) as visitors,
      count(DISTINCT f.session_id) as sessions
    FROM filtered f
    GROUP BY 1
    ORDER BY day
  ),
  pages AS (
    SELECT f.path, count(*) as views, count(DISTINCT f.visitor_id) as visitors
    FROM filtered f
    GROUP BY f.path
    ORDER BY views DESC
    LIMIT 20
  ),
  countries AS (
    SELECT
      COALESCE(f.country_code, f.country) as cc,
      f.country,
      f.region,
      f.city,
      count(*) as views,
      count(DISTINCT f.visitor_id) as visitors
    FROM filtered f
    WHERE f.country_code IS NOT NULL OR f.country IS NOT NULL
    GROUP BY f.country_code, f.country, f.region, f.city
    ORDER BY views DESC
    LIMIT 30
  ),
  sources AS (
    SELECT
      COALESCE(f.ref_domain, 'Direct') as source,
      f.utm_source,
      f.utm_medium,
      f.utm_campaign,
      count(*) as views,
      count(DISTINCT f.visitor_id) as visitors
    FROM filtered f
    GROUP BY f.ref_domain, f.utm_source, f.utm_medium, f.utm_campaign
    ORDER BY views DESC
    LIMIT 20
  )
  SELECT
    (SELECT count(*) FROM filtered)::bigint,
    (SELECT count(DISTINCT f2.visitor_id) FROM filtered f2)::bigint,
    (SELECT count(DISTINCT f3.session_id) FROM filtered f3)::bigint,
    (SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'date', d.day, 'views', d.views, 'visitors', d.visitors, 'sessions', d.sessions
    ) ORDER BY d.day), '[]'::jsonb) FROM daily d),
    (SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'path', p.path, 'views', p.views, 'visitors', p.visitors
    ) ORDER BY p.views DESC), '[]'::jsonb) FROM pages p),
    (SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'country_code', c.cc, 'country', c.country, 'region', c.region, 'city', c.city, 'views', c.views, 'visitors', c.visitors
    ) ORDER BY c.views DESC), '[]'::jsonb) FROM countries c),
    (SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'source', s.source, 'utm_source', s.utm_source, 'utm_medium', s.utm_medium, 'utm_campaign', s.utm_campaign, 'views', s.views, 'visitors', s.visitors
    ) ORDER BY s.views DESC), '[]'::jsonb) FROM sources s);
END;
$function$;