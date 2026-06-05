
CREATE TABLE public.polls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  message_id uuid REFERENCES public.messages(id) ON DELETE CASCADE,
  created_by uuid NOT NULL,
  question text NOT NULL,
  allow_multiple boolean NOT NULL DEFAULT false,
  is_anonymous boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.poll_options (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id uuid NOT NULL REFERENCES public.polls(id) ON DELETE CASCADE,
  text text NOT NULL,
  position int NOT NULL DEFAULT 0
);

CREATE TABLE public.poll_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id uuid NOT NULL REFERENCES public.polls(id) ON DELETE CASCADE,
  option_id uuid NOT NULL REFERENCES public.poll_options(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (option_id, user_id)
);

CREATE INDEX idx_polls_conversation ON public.polls(conversation_id);
CREATE INDEX idx_poll_options_poll ON public.poll_options(poll_id);
CREATE INDEX idx_poll_votes_poll ON public.poll_votes(poll_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.polls TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.poll_options TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.poll_votes TO authenticated;
GRANT ALL ON public.polls TO service_role;
GRANT ALL ON public.poll_options TO service_role;
GRANT ALL ON public.poll_votes TO service_role;

ALTER TABLE public.polls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.poll_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.poll_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view polls" ON public.polls
  FOR SELECT TO authenticated
  USING (public.is_conversation_member(conversation_id, auth.uid()));

CREATE POLICY "Members can create polls" ON public.polls
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = created_by
    AND public.is_conversation_member(conversation_id, auth.uid())
  );

CREATE POLICY "Author can delete own poll" ON public.polls
  FOR DELETE TO authenticated
  USING (auth.uid() = created_by);

CREATE POLICY "Members can view options" ON public.poll_options
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.polls p
    WHERE p.id = poll_id AND public.is_conversation_member(p.conversation_id, auth.uid())
  ));

CREATE POLICY "Poll author can insert options" ON public.poll_options
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.polls p
    WHERE p.id = poll_id AND p.created_by = auth.uid()
  ));

CREATE POLICY "Members can view votes" ON public.poll_votes
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.polls p
    WHERE p.id = poll_id AND public.is_conversation_member(p.conversation_id, auth.uid())
  ));

CREATE POLICY "Members can vote" ON public.poll_votes
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.polls p
      WHERE p.id = poll_id AND public.is_conversation_member(p.conversation_id, auth.uid())
    )
  );

CREATE POLICY "Users can remove own vote" ON public.poll_votes
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);
