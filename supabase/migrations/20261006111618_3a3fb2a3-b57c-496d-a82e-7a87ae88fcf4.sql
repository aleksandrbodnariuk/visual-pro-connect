CREATE INDEX IF NOT EXISTS idx_posts_created_at_desc
  ON public.posts (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_posts_group_created_at_desc
  ON public.posts (group_id, created_at DESC)
  WHERE group_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_comments_post_created_at
  ON public.comments (post_id, created_at ASC);