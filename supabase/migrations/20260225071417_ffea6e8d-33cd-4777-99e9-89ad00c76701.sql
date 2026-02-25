ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can update their own comments"
ON public.comments
FOR UPDATE
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());