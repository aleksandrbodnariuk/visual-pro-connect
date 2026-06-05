
DROP POLICY IF EXISTS "Users can view reactions on their messages" ON public.message_reactions;
DROP POLICY IF EXISTS "Users can add reactions" ON public.message_reactions;

CREATE POLICY "Users can view reactions on accessible messages"
ON public.message_reactions FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.messages m
    WHERE m.id = message_reactions.message_id
      AND (
        m.sender_id = auth.uid()
        OR m.receiver_id = auth.uid()
        OR (
          m.conversation_id IS NOT NULL
          AND EXISTS (
            SELECT 1 FROM public.conversation_members cm
            WHERE cm.conversation_id = m.conversation_id
              AND cm.user_id = auth.uid()
          )
        )
      )
  )
);

CREATE POLICY "Users can add reactions on accessible messages"
ON public.message_reactions FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1 FROM public.messages m
    WHERE m.id = message_reactions.message_id
      AND (
        m.sender_id = auth.uid()
        OR m.receiver_id = auth.uid()
        OR (
          m.conversation_id IS NOT NULL
          AND EXISTS (
            SELECT 1 FROM public.conversation_members cm
            WHERE cm.conversation_id = m.conversation_id
              AND cm.user_id = auth.uid()
          )
        )
      )
  )
);
