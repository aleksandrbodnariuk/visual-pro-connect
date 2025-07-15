-- Створюємо тільки політики для storage (bucket'и вже існують)
-- Спочатку видаляємо існуючі політики, якщо вони є
DROP POLICY IF EXISTS "Anyone can view logos" ON storage.objects;
DROP POLICY IF EXISTS "Admins can upload logos" ON storage.objects;
DROP POLICY IF EXISTS "Admins can update logos" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete logos" ON storage.objects;

-- Політики для logos bucket
CREATE POLICY "Anyone can view logos" ON storage.objects
FOR SELECT USING (bucket_id = 'logos');

CREATE POLICY "Admins can upload logos" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'logos' AND check_admin_access());

CREATE POLICY "Admins can update logos" ON storage.objects
FOR UPDATE USING (bucket_id = 'logos' AND check_admin_access());

CREATE POLICY "Admins can delete logos" ON storage.objects
FOR DELETE USING (bucket_id = 'logos' AND check_admin_access());

-- Додаємо політики для інших bucket'ів, якщо їх немає
DROP POLICY IF EXISTS "Anyone can view avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload their own avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own avatars" ON storage.objects;

CREATE POLICY "Anyone can view avatars" ON storage.objects
FOR SELECT USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload their own avatars" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'avatars');

CREATE POLICY "Users can update their own avatars" ON storage.objects
FOR UPDATE USING (bucket_id = 'avatars');

CREATE POLICY "Users can delete their own avatars" ON storage.objects
FOR DELETE USING (bucket_id = 'avatars');