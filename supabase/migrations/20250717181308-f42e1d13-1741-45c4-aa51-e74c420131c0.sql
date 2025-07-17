-- Виправляємо RLS політики для posts щоб дозволити створення публікацій
DROP POLICY IF EXISTS "Users can create their own posts" ON public.posts;
DROP POLICY IF EXISTS "Users can update their own posts" ON public.posts;

-- Створюємо нові політики
CREATE POLICY "Users can create their own posts" ON public.posts
FOR INSERT 
WITH CHECK (auth.uid()::text = user_id::text OR is_admin(auth.uid()));

CREATE POLICY "Users can update their own posts" ON public.posts
FOR UPDATE 
USING (auth.uid()::text = user_id::text OR is_admin(auth.uid()));