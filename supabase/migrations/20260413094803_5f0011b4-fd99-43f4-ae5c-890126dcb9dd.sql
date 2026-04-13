
-- 1. Fix storage policies: add ownership checks

-- Drop overly permissive policies
DROP POLICY IF EXISTS "Authenticated upload" ON storage.objects;
DROP POLICY IF EXISTS "Own file delete" ON storage.objects;
DROP POLICY IF EXISTS "Own file update" ON storage.objects;

-- Recreate with ownership verification (folder = user's uid)
CREATE POLICY "Authenticated upload with ownership"
ON storage.objects FOR INSERT
WITH CHECK (
  auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Own file delete with ownership"
ON storage.objects FOR DELETE
USING (
  auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Own file update with ownership"
ON storage.objects FOR UPDATE
USING (
  auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- 2. Fix user_roles privilege escalation: replace the dangerous INSERT policy
DROP POLICY IF EXISTS "Allow trigger and self default role insert" ON public.user_roles;

-- Create a SECURITY DEFINER function for trigger-based inserts
CREATE OR REPLACE FUNCTION public.assign_default_role(_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_roles (user_id, role)
  VALUES (_user_id, 'user')
  ON CONFLICT (user_id, role) DO NOTHING;
END;
$$;

-- Only allow authenticated users to insert their own 'user' role
CREATE POLICY "Self default role insert"
ON public.user_roles FOR INSERT
WITH CHECK (user_id = auth.uid() AND role = 'user'::app_role);

-- 3. Fix function search_path mutable
ALTER FUNCTION public.get_title_by_share_percent SET search_path = public;
ALTER FUNCTION public.validate_representative_hierarchy SET search_path = public;
