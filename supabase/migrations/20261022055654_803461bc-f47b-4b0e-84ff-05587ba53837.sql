CREATE TABLE public.group_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  inviter_id uuid NOT NULL,
  invitee_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (group_id, invitee_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.group_invites TO authenticated;
GRANT ALL ON public.group_invites TO service_role;
ALTER TABLE public.group_invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "See own invites" ON public.group_invites FOR SELECT TO authenticated
  USING (invitee_id = auth.uid() OR inviter_id = auth.uid() OR public.is_group_admin(group_id, auth.uid()));
CREATE POLICY "Members invite friends" ON public.group_invites FOR INSERT TO authenticated
  WITH CHECK (
    inviter_id = auth.uid() AND status = 'pending'
    AND EXISTS (SELECT 1 FROM public.group_members m WHERE m.group_id = group_invites.group_id AND m.user_id = auth.uid() AND m.status = 'approved')
    AND EXISTS (SELECT 1 FROM public.friend_requests f WHERE f.status = 'accepted'
      AND ((f.sender_id = auth.uid() AND f.receiver_id = invitee_id) OR (f.receiver_id = auth.uid() AND f.sender_id = invitee_id)))
  );
CREATE POLICY "Invitee responds" ON public.group_invites FOR UPDATE TO authenticated
  USING (invitee_id = auth.uid()) WITH CHECK (invitee_id = auth.uid() AND status IN ('accepted','declined'));
CREATE POLICY "Remove invites" ON public.group_invites FOR DELETE TO authenticated
  USING (invitee_id = auth.uid() OR inviter_id = auth.uid() OR public.is_group_admin(group_id, auth.uid()));

-- Notify invitee
CREATE OR REPLACE FUNCTION public.group_invites_notify()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE g text;
BEGIN
  SELECT name INTO g FROM public.groups WHERE id = NEW.group_id;
  INSERT INTO public.notifications (user_id, message, link)
  VALUES (NEW.invitee_id, 'Вас запросили до групи «' || coalesce(g,'') || '»', '/groups/' || NEW.group_id);
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.group_invites_notify() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER group_invites_notify_trg AFTER INSERT ON public.group_invites FOR EACH ROW EXECUTE FUNCTION public.group_invites_notify();

-- Invited users joining a private group are approved immediately
CREATE OR REPLACE FUNCTION public.group_members_enforce()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE v_privacy text; v_invited boolean;
BEGIN
  SELECT privacy INTO v_privacy FROM public.groups WHERE id = NEW.group_id;
  IF NEW.user_id = auth.uid() AND NOT public.is_group_admin(NEW.group_id, auth.uid()) THEN
    SELECT EXISTS (SELECT 1 FROM public.group_invites i WHERE i.group_id = NEW.group_id AND i.invitee_id = NEW.user_id AND i.status = 'pending') INTO v_invited;
    NEW.role := 'member';
    NEW.status := CASE WHEN v_privacy = 'private' AND NOT v_invited THEN 'pending' ELSE 'approved' END;
  END IF;
  IF NEW.role NOT IN ('owner','admin','member') THEN NEW.role := 'member'; END IF;
  RETURN NEW;
END $function$;