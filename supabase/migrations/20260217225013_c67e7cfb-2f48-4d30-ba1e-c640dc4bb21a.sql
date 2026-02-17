UPDATE storage.buckets 
SET allowed_mime_types = array_cat(
  COALESCE(allowed_mime_types, ARRAY[]::text[]),
  ARRAY['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/flac', 'audio/aac', 'audio/mp4', 'audio/x-m4a', 'audio/webm', 'audio/x-wav']
)
WHERE id = 'posts'
AND (allowed_mime_types IS NULL OR NOT allowed_mime_types @> ARRAY['audio/mpeg']);