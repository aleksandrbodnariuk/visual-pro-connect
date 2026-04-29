
-- 1. Private secrets table (no RLS access for anyone via API; only SECURITY DEFINER funcs and service role)
CREATE TABLE IF NOT EXISTS public.app_secrets (
  key text PRIMARY KEY,
  value text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.app_secrets ENABLE ROW LEVEL SECURITY;
-- No policies = no access for anon/authenticated. service_role bypasses RLS.

-- Seed the push internal secret
INSERT INTO public.app_secrets (key, value)
VALUES ('push_internal_secret', 'e89b8c367bcc8b35c1e470e8c98c9f4d8ab2e86773f350cc1401b87bbdac39b2')
ON CONFLICT (key) DO NOTHING;

-- 2. Update invoke_push_notification to include internal secret header
CREATE OR REPLACE FUNCTION public.invoke_push_notification(
  _user_id uuid,
  _title text,
  _body text,
  _url text
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  _project_url text := 'https://cxdkaxjeibqdmpvozirz.supabase.co';
  _anon_key text := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN4ZGtheGplaWJxZG1wdm96aXJ6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ4MzUxMzcsImV4cCI6MjA2MDQxMTEzN30.mjqEyiJX59YLQpjb-_N4qS_3byUY_zpgS2g6X5xqM2U';
  _internal_secret text;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.push_subscriptions WHERE user_id = _user_id) THEN
    RETURN;
  END IF;

  SELECT value INTO _internal_secret FROM public.app_secrets WHERE key = 'push_internal_secret';

  PERFORM net.http_post(
    url := _project_url || '/functions/v1/send-push-notification',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || _anon_key,
      'apikey', _anon_key,
      'x-internal-secret', COALESCE(_internal_secret, '')
    ),
    body := jsonb_build_object(
      'user_id', _user_id,
      'title', _title,
      'body', _body,
      'url', _url
    )
  );
END;
$$;

-- 3. Tighten comment_likes SELECT to authenticated users only
DROP POLICY IF EXISTS "Users can view all comment likes" ON public.comment_likes;
CREATE POLICY "Authenticated users can view comment likes"
ON public.comment_likes
FOR SELECT
TO authenticated
USING (true);
