CREATE TABLE public.team_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid(),
  content text NOT NULL CHECK (char_length(content) BETWEEN 1 AND 5000),
  is_pinned boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX team_messages_org_created_idx ON public.team_messages (organization_id, created_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.team_messages TO authenticated;
GRANT ALL ON public.team_messages TO service_role;
ALTER TABLE public.team_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "team_messages_read" ON public.team_messages FOR SELECT TO authenticated
  USING (public.is_org_member(organization_id, auth.uid()) OR public.is_org_manager(organization_id, auth.uid()));
CREATE POLICY "team_messages_insert" ON public.team_messages FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND (public.is_org_member(organization_id, auth.uid()) OR public.is_org_manager(organization_id, auth.uid()))
    AND (is_pinned = false OR public.is_org_manager(organization_id, auth.uid())));
CREATE POLICY "team_messages_update_manager" ON public.team_messages FOR UPDATE TO authenticated
  USING (public.is_org_manager(organization_id, auth.uid())) WITH CHECK (public.is_org_manager(organization_id, auth.uid()));
CREATE POLICY "team_messages_delete" ON public.team_messages FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR public.is_org_manager(organization_id, auth.uid()));
ALTER PUBLICATION supabase_realtime ADD TABLE public.team_messages;