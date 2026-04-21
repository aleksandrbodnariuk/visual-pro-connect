
DROP POLICY IF EXISTS "Public can view support attachments" ON storage.objects;

CREATE POLICY "Owners and admins can list support attachments"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'support-attachments'
  AND (
    auth.uid()::text = (storage.foldername(name))[1]
    OR public.is_user_admin(auth.uid())
  )
);
