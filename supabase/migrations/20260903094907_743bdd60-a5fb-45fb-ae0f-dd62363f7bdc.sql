CREATE TABLE IF NOT EXISTS public.group_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.group_views TO authenticated;
GRANT ALL ON public.group_views TO service_role;

ALTER TABLE public.group_views ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_group_views_group_created ON public.group_views(group_id, created_at DESC);

DROP POLICY IF EXISTS "Authenticated can log group views" ON public.group_views;
CREATE POLICY "Authenticated can log group views"
ON public.group_views FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Group admins can read views" ON public.group_views;
CREATE POLICY "Group admins can read views"
ON public.group_views FOR SELECT TO authenticated
USING (public.is_group_admin(group_id, auth.uid()) OR public.is_admin(auth.uid()));

CREATE OR REPLACE FUNCTION public.get_group_stats(_group_id uuid)
RETURNS TABLE (
  views_total bigint,
  views_7d bigint,
  views_30d bigint,
  unique_viewers bigint,
  members_count bigint,
  posts_count bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    (SELECT count(*) FROM public.group_views v WHERE v.group_id = _group_id),
    (SELECT count(*) FROM public.group_views v WHERE v.group_id = _group_id AND v.created_at > now() - interval '7 days'),
    (SELECT count(*) FROM public.group_views v WHERE v.group_id = _group_id AND v.created_at > now() - interval '30 days'),
    (SELECT count(DISTINCT v.user_id) FROM public.group_views v WHERE v.group_id = _group_id AND v.user_id IS NOT NULL),
    (SELECT count(*) FROM public.group_members m WHERE m.group_id = _group_id AND m.status = 'approved'),
    (SELECT count(*) FROM public.posts p WHERE p.group_id = _group_id)
$$;

REVOKE ALL ON FUNCTION public.get_group_stats(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.get_group_stats(uuid) TO authenticated;