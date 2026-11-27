DROP POLICY IF EXISTS "Android release downloads" ON storage.objects;
CREATE POLICY "Admins read Android releases" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'android-releases' AND public.check_admin_access());