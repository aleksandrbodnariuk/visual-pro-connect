
-- Add country_code column to analytics_events
ALTER TABLE public.analytics_events ADD COLUMN IF NOT EXISTS country_code text;

-- Create indexes for fast dashboard queries
CREATE INDEX IF NOT EXISTS idx_analytics_events_occurred_at ON public.analytics_events (occurred_at);
CREATE INDEX IF NOT EXISTS idx_analytics_events_path ON public.analytics_events (path);
CREATE INDEX IF NOT EXISTS idx_analytics_events_country_code ON public.analytics_events (country_code);
CREATE INDEX IF NOT EXISTS idx_analytics_events_visitor_id ON public.analytics_events (visitor_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_session_id ON public.analytics_events (session_id);

-- Drop and recreate the RPC with country_code support and timezone-aware filtering
CREATE OR REPLACE FUNCTION public.get_analytics_overview(
  _start_date timestamptz,
  _end_date timestamptz,
  _path_filter text DEFAULT NULL,
  _country_filter text DEFAULT NULL
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
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.is_user_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  RETURN QUERY
  WITH filtered AS (
    SELECT ae.* FROM public.analytics_events ae
    WHERE ae.occurred_at >= _start_date
      AND ae.occurred_at < _end_date
      AND (_path_filter IS NULL OR ae.path = _path_filter)
      AND (_country_filter IS NULL OR ae.country_code = _country_filter)
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
$$;
