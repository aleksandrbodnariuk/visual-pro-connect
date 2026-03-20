
-- get_my_representative_stats: personal stats for the current user
-- Returns own earnings, orders_count, avg_check, team_size
-- Access: only the authenticated user themselves
CREATE OR REPLACE FUNCTION public.get_my_representative_stats()
RETURNS TABLE(
  total_earnings numeric,
  orders_count bigint,
  avg_check numeric,
  team_size bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    coalesce(e.total_earnings, 0),
    coalesce(e.orders_count, 0),
    coalesce(e.avg_check, 0),
    coalesce(t.team_size, 0)
  FROM (
    SELECT
      sum(re.amount) AS total_earnings,
      count(DISTINCT re.order_id) AS orders_count,
      CASE WHEN count(DISTINCT re.order_id) > 0
           THEN sum(re.amount) / count(DISTINCT re.order_id)
           ELSE 0
      END AS avg_check
    FROM representative_earnings re
    JOIN representatives r ON r.id = re.representative_id
    WHERE r.user_id = auth.uid()
  ) e
  CROSS JOIN (
    SELECT count(*)::bigint AS team_size
    FROM representatives child
    JOIN representatives parent ON child.parent_id = parent.id
    WHERE parent.user_id = auth.uid()
  ) t;
$$;
