
-- 1. Add attachment column to support_tickets
ALTER TABLE public.support_tickets
ADD COLUMN IF NOT EXISTS attachment_url text;

-- 2. Create public storage bucket for support screenshots
INSERT INTO storage.buckets (id, name, public)
VALUES ('support-attachments', 'support-attachments', true)
ON CONFLICT (id) DO NOTHING;

-- 3. Storage policies: users upload to their own folder, anyone can read (public bucket)
CREATE POLICY "Public can view support attachments"
ON storage.objects FOR SELECT
USING (bucket_id = 'support-attachments');

CREATE POLICY "Users can upload their own support attachments"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'support-attachments'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own support attachments"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'support-attachments'
  AND auth.uid()::text = (storage.foldername(name))[1]
);
