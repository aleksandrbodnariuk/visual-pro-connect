
CREATE OR REPLACE FUNCTION public.get_my_representative_stats()
 RETURNS TABLE(total_earnings numeric, orders_count bigint, avg_check numeric, team_size bigint)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $$
DECLARE
  _rep_id uuid;
BEGIN
  -- Get the representative record for the current user
  SELECT r.id INTO _rep_id
  FROM public.representatives r
  WHERE r.user_id = auth.uid();

  RETURN QUERY
  SELECT
    coalesce(e.total_earnings, 0::numeric),
    coalesce(e.orders_count, 0::bigint),
    coalesce(e.avg_check, 0::numeric),
    coalesce(t.team_size, 0::bigint)
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
    -- Count both direct children AND grandchildren (same as get_team_tree)
    SELECT count(*)::bigint AS team_size
    FROM (
      -- Level 1: direct children
      SELECT r1.id
      FROM representatives r1
      WHERE r1.parent_id = _rep_id

      UNION ALL

      -- Level 2: grandchildren
      SELECT r2.id
      FROM representatives r2
      WHERE r2.parent_id IN (
        SELECT r1.id FROM representatives r1 WHERE r1.parent_id = _rep_id
      )
    ) all_team
  ) t;
END;
$$;
