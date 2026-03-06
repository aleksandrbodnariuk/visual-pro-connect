
-- Create analytics_events table
CREATE TABLE public.analytics_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL DEFAULT 'page_view',
  occurred_at timestamptz NOT NULL DEFAULT now(),
  path text NOT NULL,
  ref_domain text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  visitor_id text NOT NULL,
  session_id text NOT NULL,
  country text,
  region text,
  city text,
  device_type text,
  language text,
  timezone text
);

-- Indexes
CREATE INDEX idx_ae_occurred_at ON public.analytics_events(occurred_at);
CREATE INDEX idx_ae_path ON public.analytics_events(path);
CREATE INDEX idx_ae_country ON public.analytics_events(country);
CREATE INDEX idx_ae_visitor_id ON public.analytics_events(visitor_id);
CREATE INDEX idx_ae_session_id ON public.analytics_events(session_id);

-- RLS
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read analytics"
  ON public.analytics_events FOR SELECT
  USING (public.is_user_admin(auth.uid()));

-- RPC for analytics
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
STABLE SECURITY DEFINER
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
      AND (_country_filter IS NULL OR ae.country = _country_filter)
  ),
  daily AS (
    SELECT
      (f.occurred_at AT TIME ZONE 'UTC')::date as day,
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
    SELECT f.country, f.region, f.city, count(*) as views, count(DISTINCT f.visitor_id) as visitors
    FROM filtered f
    WHERE f.country IS NOT NULL
    GROUP BY f.country, f.region, f.city
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
    (SELECT COALESCE(jsonb_agg(jsonb_build_object('date', d.day, 'views', d.views, 'visitors', d.visitors, 'sessions', d.sessions) ORDER BY d.day), '[]'::jsonb) FROM daily d),
    (SELECT COALESCE(jsonb_agg(jsonb_build_object('path', p.path, 'views', p.views, 'visitors', p.visitors) ORDER BY p.views DESC), '[]'::jsonb) FROM pages p),
    (SELECT COALESCE(jsonb_agg(jsonb_build_object('country', c.country, 'region', c.region, 'city', c.city, 'views', c.views, 'visitors', c.visitors) ORDER BY c.views DESC), '[]'::jsonb) FROM countries c),
    (SELECT COALESCE(jsonb_agg(jsonb_build_object('source', s.source, 'utm_source', s.utm_source, 'utm_medium', s.utm_medium, 'utm_campaign', s.utm_campaign, 'views', s.views, 'visitors', s.visitors) ORDER BY s.views DESC), '[]'::jsonb) FROM sources s);
END;
$$;
