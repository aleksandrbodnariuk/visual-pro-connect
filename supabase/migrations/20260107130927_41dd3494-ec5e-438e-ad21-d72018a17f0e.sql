-- Створення bucket для вкладень в повідомленнях
INSERT INTO storage.buckets (id, name, public)
VALUES ('message-attachments', 'message-attachments', true)
ON CONFLICT (id) DO NOTHING;

-- RLS політики для bucket
CREATE POLICY "Authenticated users can upload message attachments"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'message-attachments');

CREATE POLICY "Public read access for message attachments"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'message-attachments');

CREATE POLICY "Users can delete own message attachments"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'message-attachments');

-- Додати поля для вкладень до таблиці messages
ALTER TABLE messages
ADD COLUMN IF NOT EXISTS attachment_url TEXT,
ADD COLUMN IF NOT EXISTS attachment_type TEXT;