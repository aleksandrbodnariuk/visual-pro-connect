
-- get_top_representatives: top earners for a period
CREATE OR REPLACE FUNCTION public.get_top_representatives(_period text DEFAULT 'all')
RETURNS TABLE(
  user_id uuid,
  full_name text,
  avatar_url text,
  earnings numeric,
  orders_count bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    r.user_id,
    u.full_name,
    u.avatar_url,
    coalesce(sum(re.amount), 0) AS earnings,
    count(DISTINCT re.order_id) AS orders_count
  FROM representative_earnings re
  JOIN representatives r ON r.id = re.representative_id
  LEFT JOIN users u ON u.id = r.user_id
  WHERE
    CASE
      WHEN _period = 'month' THEN re.created_at >= date_trunc('month', now())
      WHEN _period = 'year'  THEN re.created_at >= date_trunc('year', now())
      WHEN _period = '30d'   THEN re.created_at >= now() - interval '30 days'
      ELSE true
    END
    AND is_user_admin(auth.uid())
  GROUP BY r.user_id, u.full_name, u.avatar_url
  ORDER BY earnings DESC
  LIMIT 20;
$$;

-- get_conversion_stats: orders → profit conversion
CREATE OR REPLACE FUNCTION public.get_conversion_stats()
RETURNS TABLE(
  total_orders bigint,
  confirmed_orders bigint,
  total_revenue numeric,
  total_profit numeric,
  conversion_rate numeric
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    count(*)::bigint AS total_orders,
    count(*) FILTER (WHERE status = 'confirmed')::bigint AS confirmed_orders,
    coalesce(sum(order_amount) FILTER (WHERE status = 'confirmed'), 0) AS total_revenue,
    coalesce(sum(order_amount - coalesce(order_expenses, 0)) FILTER (WHERE status = 'confirmed'), 0) AS total_profit,
    CASE WHEN count(*) > 0
      THEN round((count(*) FILTER (WHERE status = 'confirmed'))::numeric / count(*)::numeric * 100, 1)
      ELSE 0
    END AS conversion_rate
  FROM specialist_orders
  WHERE is_user_admin(auth.uid());
$$;
