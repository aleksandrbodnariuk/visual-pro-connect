
-- Fix avatars bucket: enforce that the first folder segment equals auth.uid()
DROP POLICY IF EXISTS "Users can upload their own avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own avatars" ON storage.objects;

CREATE POLICY "Users can upload their own avatars"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can update their own avatars"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can delete their own avatars"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Fix group-avatars bucket: enforce that the user is a member of the conversation
-- (files are stored under `${conversation_id}/...`)
DROP POLICY IF EXISTS "Authenticated can upload group avatars" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated can update group avatars" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated can delete group avatars" ON storage.objects;

CREATE POLICY "Members can upload group avatars"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'group-avatars'
  AND EXISTS (
    SELECT 1 FROM public.conversation_members cm
    WHERE cm.user_id = auth.uid()
      AND cm.conversation_id::text = (storage.foldername(name))[1]
  )
);

CREATE POLICY "Members can update group avatars"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'group-avatars'
  AND EXISTS (
    SELECT 1 FROM public.conversation_members cm
    WHERE cm.user_id = auth.uid()
      AND cm.conversation_id::text = (storage.foldername(name))[1]
  )
);

CREATE POLICY "Members can delete group avatars"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'group-avatars'
  AND EXISTS (
    SELECT 1 FROM public.conversation_members cm
    WHERE cm.user_id = auth.uid()
      AND cm.conversation_id::text = (storage.foldername(name))[1]
  )
);
