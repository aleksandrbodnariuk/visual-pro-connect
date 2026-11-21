ALTER TABLE public.team_partners ADD COLUMN IF NOT EXISTS is_platinum boolean NOT NULL DEFAULT false;
ALTER TABLE public.team_messages ADD COLUMN IF NOT EXISTS attachment_url text, ADD COLUMN IF NOT EXISTS attachment_type text, ADD COLUMN IF NOT EXISTS attachment_name text;
ALTER TABLE public.team_messages DROP CONSTRAINT IF EXISTS team_messages_content_check;
ALTER TABLE public.team_messages ADD CONSTRAINT team_messages_content_check CHECK (char_length(content) <= 5000 AND (char_length(content) >= 1 OR attachment_url IS NOT NULL));

CREATE TABLE public.team_message_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES public.team_messages(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL,
  user_id uuid NOT NULL DEFAULT auth.uid(),
  emoji text NOT NULL CHECK (char_length(emoji) BETWEEN 1 AND 16),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (message_id, user_id, emoji)
);
GRANT SELECT, INSERT, DELETE ON public.team_message_reactions TO authenticated;
GRANT ALL ON public.team_message_reactions TO service_role;
ALTER TABLE public.team_message_reactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY tmr_read ON public.team_message_reactions FOR SELECT TO authenticated USING (public.is_org_member(organization_id, auth.uid()));
CREATE POLICY tmr_ins ON public.team_message_reactions FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() AND public.is_org_member(organization_id, auth.uid()) AND EXISTS (SELECT 1 FROM public.team_messages m WHERE m.id = message_id AND m.organization_id = team_message_reactions.organization_id));
CREATE POLICY tmr_del ON public.team_message_reactions FOR DELETE TO authenticated USING (user_id = auth.uid());
ALTER PUBLICATION supabase_realtime ADD TABLE public.team_message_reactions;

CREATE OR REPLACE FUNCTION public.get_my_team_platinum(_org_id uuid)
RETURNS TABLE(full_name text, co_full_name text, phone text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH RECURSIVE me AS (SELECT id, sponsor_id FROM public.team_partners WHERE organization_id = _org_id AND (user_id = auth.uid() OR co_user_id = auth.uid()) LIMIT 1),
  up AS (SELECT s.id, s.sponsor_id, s.is_platinum, s.full_name, s.co_full_name, s.phone, 1 d FROM me JOIN public.team_partners s ON s.id = me.sponsor_id
    UNION ALL SELECT s.id, s.sponsor_id, s.is_platinum, s.full_name, s.co_full_name, s.phone, up.d + 1 FROM up JOIN public.team_partners s ON s.id = up.sponsor_id WHERE up.d < 60)
  SELECT full_name, co_full_name, phone FROM up WHERE is_platinum ORDER BY d LIMIT 1;
$$;
REVOKE ALL ON FUNCTION public.get_my_team_platinum(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_team_platinum(uuid) TO authenticated;