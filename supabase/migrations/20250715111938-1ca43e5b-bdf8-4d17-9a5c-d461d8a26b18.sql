-- Виправляємо проблему з RLS для повідомлень
-- Видаляємо конфліктуючі політики
DROP POLICY IF EXISTS "Users can send messages" ON public.messages;
DROP POLICY IF EXISTS "Users can create their own messages" ON public.messages;
DROP POLICY IF EXISTS "Users can insert messages they send" ON public.messages;

-- Створюємо правильну політику для відправки повідомлень
CREATE POLICY "Users can send messages" 
ON public.messages 
FOR INSERT 
WITH CHECK (sender_id = auth.uid());

-- Виправляємо проблему з RLS для постів
-- Видаляємо конфліктуючі політики для постів
DROP POLICY IF EXISTS "Users can create their own posts" ON public.posts;

-- Створюємо правильну політику для створення постів
CREATE POLICY "Users can create their own posts" 
ON public.posts 
FOR INSERT 
WITH CHECK (user_id = auth.uid());

-- Даємо можливість адміну змінювати налаштування сайту
-- Перевіряємо чи є функція is_admin_user
CREATE OR REPLACE FUNCTION public.check_admin_access()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Перевіряємо чи користувач є адміном або засновником
  RETURN EXISTS (
    SELECT 1 
    FROM public.users 
    WHERE id = auth.uid() 
    AND (is_admin = true OR founder_admin = true)
  );
END;
$$;

-- Оновлюємо політики для site_settings
DROP POLICY IF EXISTS "Allow admins to insert site settings" ON public.site_settings;
DROP POLICY IF EXISTS "Allow admins to update site settings" ON public.site_settings;

CREATE POLICY "Allow admins to insert site settings" 
ON public.site_settings 
FOR INSERT 
WITH CHECK (check_admin_access());

CREATE POLICY "Allow admins to update site settings" 
ON public.site_settings 
FOR UPDATE 
USING (check_admin_access());