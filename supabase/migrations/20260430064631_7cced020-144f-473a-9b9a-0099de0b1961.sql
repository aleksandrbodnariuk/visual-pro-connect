
-- Allow guest support tickets (from non-authenticated users on auth page)
ALTER TABLE public.support_tickets ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE public.support_tickets ADD COLUMN IF NOT EXISTS guest_email text;
ALTER TABLE public.support_tickets ADD COLUMN IF NOT EXISTS guest_name text;

-- Allow anonymous users to create guest tickets (must have guest_email, no user_id)
CREATE POLICY "Anyone can create guest tickets"
ON public.support_tickets
FOR INSERT
TO anon, authenticated
WITH CHECK (
  user_id IS NULL
  AND guest_email IS NOT NULL
  AND length(guest_email) > 3
  AND length(guest_email) < 255
  AND length(subject) > 0
  AND length(subject) <= 200
  AND length(message) > 0
  AND length(message) <= 2000
);

-- Allow anon to upload attachments to a guest folder in support-attachments bucket
CREATE POLICY "Anyone can upload guest support attachments"
ON storage.objects
FOR INSERT
TO anon, authenticated
WITH CHECK (
  bucket_id = 'support-attachments'
  AND (storage.foldername(name))[1] = 'guest'
);
