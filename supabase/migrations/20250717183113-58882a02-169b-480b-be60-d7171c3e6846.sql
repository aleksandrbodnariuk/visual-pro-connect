-- Виправляємо RLS політики для повідомлень
DROP POLICY IF EXISTS "Users can send messages" ON public.messages;
DROP POLICY IF EXISTS "Users can view messages they are involved in" ON public.messages;
DROP POLICY IF EXISTS "Users can update messages they received" ON public.messages;
DROP POLICY IF EXISTS "Users can delete messages they sent" ON public.messages;

-- Створюємо нові політики для повідомлень
CREATE POLICY "Users can send messages" ON public.messages
FOR INSERT 
WITH CHECK (auth.uid()::text = sender_id::text);

CREATE POLICY "Users can view messages they are involved in" ON public.messages
FOR SELECT 
USING (auth.uid()::text = sender_id::text OR auth.uid()::text = receiver_id::text OR is_admin(auth.uid()));

CREATE POLICY "Users can update messages they received" ON public.messages
FOR UPDATE 
USING (auth.uid()::text = receiver_id::text OR is_admin(auth.uid()));

CREATE POLICY "Users can delete messages they sent" ON public.messages
FOR DELETE 
USING (auth.uid()::text = sender_id::text OR is_admin(auth.uid()));