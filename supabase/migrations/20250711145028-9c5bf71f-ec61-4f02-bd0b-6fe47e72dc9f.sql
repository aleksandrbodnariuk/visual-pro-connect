
-- Спочатку видалимо існуючі політики, якщо вони є
DROP POLICY IF EXISTS "Allow authenticated users to upload files" ON storage.objects;
DROP POLICY IF EXISTS "Allow public access to files" ON storage.objects;
DROP POLICY IF EXISTS "Allow users to update their own files" ON storage.objects;
DROP POLICY IF EXISTS "Allow users to delete their own files" ON storage.objects;
DROP POLICY IF EXISTS "Allow admins full access to storage" ON storage.objects;

-- Створюємо RLS політики для storage.objects таблиці
-- Дозволяємо всім автентифікованим користувачам завантажувати файли
CREATE POLICY "Allow authenticated users to upload files" ON storage.objects
FOR INSERT 
TO authenticated
WITH CHECK (true);

-- Дозволяємо всім переглядати публічні файли
CREATE POLICY "Allow public access to files" ON storage.objects
FOR SELECT 
TO public
USING (bucket_id IN ('avatars', 'banners', 'logos', 'posts', 'portfolio'));

-- Дозволяємо власникам файлів оновлювати їх (правильне приведення типів)
CREATE POLICY "Allow users to update their own files" ON storage.objects
FOR UPDATE 
TO authenticated
USING (owner = (auth.uid())::text);

-- Дозволяємо власникам файлів видаляти їх (правильне приведення типів)
CREATE POLICY "Allow users to delete their own files" ON storage.objects
FOR DELETE 
TO authenticated
USING (owner = (auth.uid())::text);

-- Створюємо додаткову політику для адміністраторів (правильне приведення типів в обох напрямках)
CREATE POLICY "Allow admins full access to storage" ON storage.objects
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE id::text = (auth.uid())::text AND (is_admin = true OR founder_admin = true)
  )
);

-- Увімкнемо RLS на storage.objects, якщо вона ще не увімкнена
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
