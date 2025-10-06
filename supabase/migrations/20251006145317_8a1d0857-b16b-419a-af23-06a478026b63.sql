-- Create policy to allow the auth trigger to insert roles and allow users to self-assign only the default 'user' role
DO $$
BEGIN
  -- Drop previous version if exists to avoid duplicates
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'user_roles' AND policyname = 'Allow trigger and self default role insert'
  ) THEN
    EXECUTE 'DROP POLICY "Allow trigger and self default role insert" ON public.user_roles';
  END IF;
END$$;

CREATE POLICY "Allow trigger and self default role insert"
ON public.user_roles
FOR INSERT
TO public
WITH CHECK (
  (auth.uid() IS NULL) -- allow from triggers where there is no auth context
  OR (user_id = auth.uid() AND role = 'user'::app_role) -- allow users to add only their default role
);
