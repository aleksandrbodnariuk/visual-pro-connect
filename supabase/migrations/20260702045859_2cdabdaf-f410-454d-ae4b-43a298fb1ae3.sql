
-- Allow polls to exist without a conversation (post-level polls)
ALTER TABLE public.polls ALTER COLUMN conversation_id DROP NOT NULL;
ALTER TABLE public.polls ADD COLUMN IF NOT EXISTS post_id uuid;
CREATE INDEX IF NOT EXISTS idx_polls_post ON public.polls(post_id);

-- Link a post to an optional poll
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS poll_id uuid;
CREATE INDEX IF NOT EXISTS idx_posts_poll ON public.posts(poll_id);

-- Recreate poll policies to support post-based polls
DROP POLICY IF EXISTS "Members can view polls" ON public.polls;
DROP POLICY IF EXISTS "Members can create polls" ON public.polls;
DROP POLICY IF EXISTS "Author can delete own poll" ON public.polls;

CREATE POLICY "View polls" ON public.polls
  FOR SELECT TO authenticated
  USING (
    (conversation_id IS NOT NULL AND public.is_conversation_member(conversation_id, auth.uid()))
    OR post_id IS NOT NULL
    OR (conversation_id IS NULL AND post_id IS NULL AND created_by = auth.uid())
  );

CREATE POLICY "Create polls" ON public.polls
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = created_by
    AND (
      (conversation_id IS NOT NULL AND public.is_conversation_member(conversation_id, auth.uid()))
      OR (conversation_id IS NULL AND public.is_admin(auth.uid()))
    )
  );

CREATE POLICY "Author can update own poll" ON public.polls
  FOR UPDATE TO authenticated
  USING (auth.uid() = created_by)
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Author can delete own poll" ON public.polls
  FOR DELETE TO authenticated
  USING (auth.uid() = created_by OR public.is_admin(auth.uid()));

-- Update poll_options RLS to include post polls
DROP POLICY IF EXISTS "Members can view options" ON public.poll_options;
CREATE POLICY "View poll options" ON public.poll_options
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.polls p
    WHERE p.id = poll_id AND (
      (p.conversation_id IS NOT NULL AND public.is_conversation_member(p.conversation_id, auth.uid()))
      OR p.post_id IS NOT NULL
      OR p.created_by = auth.uid()
    )
  ));

-- Update poll_votes RLS to include post polls
DROP POLICY IF EXISTS "Members can view votes" ON public.poll_votes;
DROP POLICY IF EXISTS "Members can vote" ON public.poll_votes;

CREATE POLICY "View poll votes" ON public.poll_votes
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.polls p
    WHERE p.id = poll_id AND (
      (p.conversation_id IS NOT NULL AND public.is_conversation_member(p.conversation_id, auth.uid()))
      OR p.post_id IS NOT NULL
    )
  ));

CREATE POLICY "Cast poll votes" ON public.poll_votes
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.polls p
      WHERE p.id = poll_id AND (
        (p.conversation_id IS NOT NULL AND public.is_conversation_member(p.conversation_id, auth.uid()))
        OR p.post_id IS NOT NULL
      )
    )
  );
