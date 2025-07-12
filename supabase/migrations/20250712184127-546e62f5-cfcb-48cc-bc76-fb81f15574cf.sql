-- Видаляємо всі існуючі політики для messages
DROP POLICY IF EXISTS "Users can send messages" ON public.messages;
DROP POLICY IF EXISTS "Users can view their own messages" ON public.messages;
DROP POLICY IF EXISTS "Users can create their own messages" ON public.messages;
DROP POLICY IF EXISTS "Users can create messages" ON public.messages;
DROP POLICY IF EXISTS "Users can update messages they received" ON public.messages;
DROP POLICY IF EXISTS "Users can view messages they're involved in" ON public.messages;
DROP POLICY IF EXISTS "Users can delete messages they sent" ON public.messages;

-- Виправляємо RLS політику для site_settings
DROP POLICY IF EXISTS "Allow authenticated users to read site settings" ON public.site_settings;

CREATE POLICY "Allow everyone to read site settings" 
ON public.site_settings 
FOR SELECT 
USING (true);