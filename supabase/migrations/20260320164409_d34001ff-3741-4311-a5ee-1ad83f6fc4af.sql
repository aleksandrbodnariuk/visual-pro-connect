
CREATE OR REPLACE FUNCTION public.get_team_tree(_representative_id uuid)
RETURNS TABLE(id uuid, user_id uuid, role text, parent_id uuid, full_name text, avatar_url text, level integer)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT * FROM (
    -- Level 1: direct children
    SELECT
      r.id, r.user_id, r.role::text, r.parent_id,
      COALESCE(u.full_name, 'Невідомий')::text AS full_name,
      COALESCE(u.avatar_url, '')::text AS avatar_url,
      1 AS level
    FROM representatives r
    LEFT JOIN users u ON u.id = r.user_id
    WHERE r.parent_id = _representative_id

    UNION ALL

    -- Level 2: grandchildren
    SELECT
      r2.id, r2.user_id, r2.role::text, r2.parent_id,
      COALESCE(u2.full_name, 'Невідомий')::text AS full_name,
      COALESCE(u2.avatar_url, '')::text AS avatar_url,
      2 AS level
    FROM representatives r2
    LEFT JOIN users u2 ON u2.id = r2.user_id
    WHERE r2.parent_id IN (
      SELECT r1.id FROM representatives r1 WHERE r1.parent_id = _representative_id
    )
  ) sub
  ORDER BY sub.level, sub.full_name;
END;
$$;
