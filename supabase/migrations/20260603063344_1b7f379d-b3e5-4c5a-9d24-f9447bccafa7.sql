
-- 1. Prevent privilege escalation via users self-update
DROP POLICY IF EXISTS "Users can manage their own profile" ON public.users;
CREATE POLICY "Users can manage their own profile"
ON public.users
FOR UPDATE
USING ((id = auth.uid()) OR check_admin_access())
WITH CHECK (
  check_admin_access()
  OR (
    id = auth.uid()
    AND is_admin     IS NOT DISTINCT FROM (SELECT u.is_admin     FROM public.users u WHERE u.id = auth.uid())
    AND founder_admin IS NOT DISTINCT FROM (SELECT u.founder_admin FROM public.users u WHERE u.id = auth.uid())
    AND is_shareholder IS NOT DISTINCT FROM (SELECT u.is_shareholder FROM public.users u WHERE u.id = auth.uid())
    AND is_blocked    IS NOT DISTINCT FROM (SELECT u.is_blocked   FROM public.users u WHERE u.id = auth.uid())
  )
);

-- 2. user_certificates: only owner / purchaser / admin can read
DROP POLICY IF EXISTS "Authenticated users can view certificates" ON public.user_certificates;
CREATE POLICY "Users view own certificates"
ON public.user_certificates
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
  OR purchased_by = auth.uid()
  OR is_user_admin(auth.uid())
);

-- 3. user_vip_memberships: only owner / admin can read
DROP POLICY IF EXISTS "Anyone authenticated can view memberships" ON public.user_vip_memberships;
CREATE POLICY "Users view own VIP membership"
ON public.user_vip_memberships
FOR SELECT
USING (
  user_id = auth.uid()
  OR is_user_admin(auth.uid())
);

-- 4. marketplace_listings: require auth to view (hides phone from anonymous web)
DROP POLICY IF EXISTS "Anyone can view active listings" ON public.marketplace_listings;
CREATE POLICY "Authenticated users can view active listings"
ON public.marketplace_listings
FOR SELECT
TO authenticated
USING (
  status = ANY (ARRAY['active'::text, 'reserved'::text, 'sold'::text])
  OR user_id = auth.uid()
  OR is_user_admin(auth.uid())
);

-- 5. Scope global storage public-read policy to known public buckets only
DROP POLICY IF EXISTS "Public read access" ON storage.objects;
CREATE POLICY "Public read access for public buckets"
ON storage.objects
FOR SELECT
USING (
  bucket_id = ANY (ARRAY[
    'avatars','banners','group-avatars','logos',
    'marketplace','portfolio','posts'
  ])
);
