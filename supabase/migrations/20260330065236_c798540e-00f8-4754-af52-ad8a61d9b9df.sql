
-- Table for moderation actions (warnings, deletions)
CREATE TABLE public.moderation_actions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  moderator_id uuid NOT NULL,
  target_user_id uuid NOT NULL,
  action_type text NOT NULL DEFAULT 'warning', -- 'warning', 'post_deleted', 'comment_deleted'
  reason text NOT NULL,
  post_id uuid REFERENCES public.posts(id) ON DELETE SET NULL,
  comment_id uuid REFERENCES public.comments(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.moderation_actions ENABLE ROW LEVEL SECURITY;

-- Moderators and admins can insert
CREATE POLICY "Moderators can insert moderation actions"
ON public.moderation_actions FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'moderator') OR is_user_admin(auth.uid())
);

-- Moderators and admins can view all
CREATE POLICY "Moderators can view moderation actions"
ON public.moderation_actions FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'moderator') OR is_user_admin(auth.uid()) OR target_user_id = auth.uid()
);

-- Admins can delete
CREATE POLICY "Admins can delete moderation actions"
ON public.moderation_actions FOR DELETE
TO authenticated
USING (is_user_admin(auth.uid()));

-- Allow moderators to delete posts
CREATE POLICY "Moderators can delete posts"
ON public.posts FOR DELETE
TO authenticated
USING (
  user_id = auth.uid() OR is_user_admin(auth.uid()) OR has_role(auth.uid(), 'moderator')
);

-- Allow moderators to delete comments
CREATE POLICY "Moderators can delete comments"
ON public.comments FOR DELETE
TO authenticated
USING (
  user_id = auth.uid() OR is_user_admin(auth.uid()) OR has_role(auth.uid(), 'moderator')
);
