CREATE POLICY "Group admins can upload group logos"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'group-avatars'
  AND (storage.foldername(name))[1] = 'groups'
  AND EXISTS (
    SELECT 1 FROM public.group_members gm
    WHERE gm.user_id = auth.uid()
      AND gm.status = 'approved'
      AND gm.role IN ('owner','admin')
      AND gm.group_id::text = (storage.foldername(name))[2]
  )
);

CREATE POLICY "Group admins can update group logos"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'group-avatars'
  AND (storage.foldername(name))[1] = 'groups'
  AND EXISTS (
    SELECT 1 FROM public.group_members gm
    WHERE gm.user_id = auth.uid()
      AND gm.status = 'approved'
      AND gm.role IN ('owner','admin')
      AND gm.group_id::text = (storage.foldername(name))[2]
  )
);

CREATE POLICY "Group admins can delete group logos"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'group-avatars'
  AND (storage.foldername(name))[1] = 'groups'
  AND EXISTS (
    SELECT 1 FROM public.group_members gm
    WHERE gm.user_id = auth.uid()
      AND gm.status = 'approved'
      AND gm.role IN ('owner','admin')
      AND gm.group_id::text = (storage.foldername(name))[2]
  )
);