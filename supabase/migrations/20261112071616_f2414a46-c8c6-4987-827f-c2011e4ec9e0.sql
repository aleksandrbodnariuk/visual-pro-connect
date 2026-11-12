-- Comments: only visible when the parent post is visible to the caller (post RLS applies)
DROP POLICY IF EXISTS "Authenticated users can view comments" ON public.comments;
CREATE POLICY "Users can view comments on visible posts" ON public.comments
FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.posts p WHERE p.id = comments.post_id));

-- AI assistant settings: table readable only by admins; safe fields via RPC
DROP POLICY IF EXISTS "ai settings readable" ON public.ai_assistant_settings;
CREATE POLICY "ai settings admin read" ON public.ai_assistant_settings
FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));

CREATE OR REPLACE FUNCTION public.get_assistant_settings()
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE r public.ai_assistant_settings;
BEGIN
  SELECT * INTO r FROM public.ai_assistant_settings WHERE id = 1;
  IF NOT FOUND THEN RETURN NULL; END IF;
  IF auth.uid() IS NOT NULL AND public.is_admin(auth.uid()) THEN
    RETURN to_jsonb(r);
  END IF;
  RETURN jsonb_build_object(
    'assistant_name', r.assistant_name, 'greeting', r.greeting,
    'quick_questions', r.quick_questions, 'studio_url', r.studio_url,
    'is_active', r.is_active, 'knowledge_base', '', 'instructions', '',
    'model', '', 'monthly_credit_limit', 0);
END $$;
REVOKE ALL ON FUNCTION public.get_assistant_settings() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_assistant_settings() TO anon, authenticated;

-- Message attachments: delete only own folder
DROP POLICY IF EXISTS "Users can delete own message attachments" ON storage.objects;
CREATE POLICY "Users can delete own message attachments" ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'message-attachments' AND (storage.foldername(name))[1] = (select auth.uid()::text));