
-- 1. get_financial_stats: financial summary from financial_audit_log
CREATE OR REPLACE FUNCTION public.get_financial_stats(_period text DEFAULT 'all')
RETURNS TABLE(
  total_orders bigint,
  total_profit numeric,
  total_representatives_paid numeric,
  total_shareholders_paid numeric,
  total_unallocated numeric
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    count(*)::bigint AS total_orders,
    coalesce(sum(net_profit), 0) AS total_profit,
    coalesce(sum(representatives_total), 0) AS total_representatives_paid,
    coalesce(sum(shareholders_total), 0) AS total_shareholders_paid,
    coalesce(sum(unallocated_added - unallocated_used), 0) AS total_unallocated
  FROM financial_audit_log
  WHERE
    CASE
      WHEN _period = 'month' THEN created_at >= date_trunc('month', now())
      WHEN _period = 'year'  THEN created_at >= date_trunc('year', now())
      WHEN _period = '30d'   THEN created_at >= now() - interval '30 days'
      ELSE true
    END
    AND is_user_admin(auth.uid());
$$;

-- 2. get_representative_stats: analytics for a representative
CREATE OR REPLACE FUNCTION public.get_representative_stats(_user_id uuid)
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
    WHERE r.user_id = _user_id
  ) e
  CROSS JOIN (
    SELECT count(*)::bigint AS team_size
    FROM representatives child
    JOIN representatives parent ON child.parent_id = parent.id
    WHERE parent.user_id = _user_id
  ) t
  WHERE _user_id = auth.uid() OR is_user_admin(auth.uid());
$$;
