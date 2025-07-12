-- Створюємо нові спрощені політики для повідомлень
CREATE POLICY "Users can insert messages they send" 
ON public.messages 
FOR INSERT 
WITH CHECK (sender_id = auth.uid());

CREATE POLICY "Users can view messages they are involved in" 
ON public.messages 
FOR SELECT 
USING (sender_id = auth.uid() OR receiver_id = auth.uid() OR is_admin(auth.uid()));

CREATE POLICY "Users can update messages they received" 
ON public.messages 
FOR UPDATE 
USING (receiver_id = auth.uid() OR is_admin(auth.uid()));

CREATE POLICY "Users can delete messages they sent" 
ON public.messages 
FOR DELETE 
USING (sender_id = auth.uid() OR is_admin(auth.uid()));