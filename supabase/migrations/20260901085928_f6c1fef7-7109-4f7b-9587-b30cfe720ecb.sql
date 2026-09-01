
-- ========== GROUPS ==========
CREATE TABLE public.groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  description text,
  avatar_url text,
  cover_url text,
  privacy text NOT NULL DEFAULT 'public',
  post_policy text NOT NULL DEFAULT 'members',
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.groups TO authenticated;
GRANT ALL ON public.groups TO service_role;

CREATE TABLE public.group_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role text NOT NULL DEFAULT 'member',
  status text NOT NULL DEFAULT 'approved',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (group_id, user_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.group_members TO authenticated;
GRANT ALL ON public.group_members TO service_role;

CREATE INDEX idx_group_members_user ON public.group_members(user_id);
CREATE INDEX idx_group_members_group ON public.group_members(group_id);

-- ========== HELPER FUNCTIONS ==========
CREATE OR REPLACE FUNCTION public.is_group_member(_group_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.group_members
    WHERE group_id = _group_id AND user_id = _user_id AND status = 'approved'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_group_admin(_group_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.group_members
    WHERE group_id = _group_id AND user_id = _user_id
      AND status = 'approved' AND role IN ('owner','admin')
  ) OR public.is_user_admin(_user_id);
$$;

CREATE OR REPLACE FUNCTION public.is_group_public(_group_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.groups WHERE id = _group_id AND privacy = 'public');
$$;

CREATE OR REPLACE FUNCTION public.can_post_in_group(_group_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.groups g
    WHERE g.id = _group_id
      AND (
        public.is_group_admin(_group_id, _user_id)
        OR (g.post_policy = 'members' AND public.is_group_member(_group_id, _user_id))
      )
  );
$$;

-- ========== RLS: groups ==========
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view groups" ON public.groups
FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can create groups" ON public.groups
FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid());

CREATE POLICY "Group admins can update group" ON public.groups
FOR UPDATE TO authenticated
USING (public.is_group_admin(id, auth.uid()))
WITH CHECK (public.is_group_admin(id, auth.uid()));

CREATE POLICY "Group owner or admin can delete group" ON public.groups
FOR DELETE TO authenticated
USING (created_by = auth.uid() OR public.is_user_admin(auth.uid()));

-- ========== RLS: group_members ==========
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View group members" ON public.group_members
FOR SELECT TO authenticated
USING (
  user_id = auth.uid()
  OR public.is_group_public(group_id)
  OR public.is_group_member(group_id, auth.uid())
);

CREATE POLICY "Join group or admin adds" ON public.group_members
FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid() OR public.is_group_admin(group_id, auth.uid()));

CREATE POLICY "Group admins manage members" ON public.group_members
FOR UPDATE TO authenticated
USING (public.is_group_admin(group_id, auth.uid()))
WITH CHECK (public.is_group_admin(group_id, auth.uid()));

CREATE POLICY "Leave group or admin removes" ON public.group_members
FOR DELETE TO authenticated
USING (user_id = auth.uid() OR public.is_group_admin(group_id, auth.uid()));

-- ========== TRIGGERS ==========
CREATE OR REPLACE FUNCTION public.groups_set_owner()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.group_members (group_id, user_id, role, status)
  VALUES (NEW.id, NEW.created_by, 'owner', 'approved')
  ON CONFLICT (group_id, user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_groups_set_owner
AFTER INSERT ON public.groups
FOR EACH ROW EXECUTE FUNCTION public.groups_set_owner();

CREATE OR REPLACE FUNCTION public.group_members_enforce()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_privacy text;
BEGIN
  SELECT privacy INTO v_privacy FROM public.groups WHERE id = NEW.group_id;
  -- self-join: cannot grant yourself elevated role
  IF NEW.user_id = auth.uid() AND NOT public.is_group_admin(NEW.group_id, auth.uid()) THEN
    NEW.role := 'member';
    NEW.status := CASE WHEN v_privacy = 'private' THEN 'pending' ELSE 'approved' END;
  END IF;
  IF NEW.role NOT IN ('owner','admin','member') THEN
    NEW.role := 'member';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_group_members_enforce
BEFORE INSERT ON public.group_members
FOR EACH ROW EXECUTE FUNCTION public.group_members_enforce();

CREATE OR REPLACE FUNCTION public.groups_touch_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at := now(); RETURN NEW; END;
$$;

CREATE TRIGGER trg_groups_updated_at
BEFORE UPDATE ON public.groups
FOR EACH ROW EXECUTE FUNCTION public.groups_touch_updated_at();

-- ========== POSTS: group support ==========
ALTER TABLE public.posts
  ADD COLUMN group_id uuid REFERENCES public.groups(id) ON DELETE CASCADE,
  ADD COLUMN posted_as_group boolean NOT NULL DEFAULT false;

CREATE INDEX idx_posts_group ON public.posts(group_id);

DROP POLICY IF EXISTS "Authenticated users can view posts" ON public.posts;
CREATE POLICY "Authenticated users can view posts" ON public.posts
FOR SELECT TO authenticated
USING (
  auth.uid() IS NOT NULL
  AND (
    group_id IS NULL
    OR public.is_group_public(group_id)
    OR public.is_group_member(group_id, auth.uid())
  )
);

DROP POLICY IF EXISTS "Users can create their own posts" ON public.posts;
CREATE POLICY "Users can create their own posts" ON public.posts
FOR INSERT TO authenticated
WITH CHECK (
  (user_id = auth.uid() OR public.is_user_admin(auth.uid()))
  AND (group_id IS NULL OR public.can_post_in_group(group_id, auth.uid()))
);

DROP POLICY IF EXISTS "Moderators can delete posts" ON public.posts;
CREATE POLICY "Moderators can delete posts" ON public.posts
FOR DELETE TO authenticated
USING (
  user_id = auth.uid()
  OR public.is_user_admin(auth.uid())
  OR public.has_role(auth.uid(), 'moderator'::app_role)
  OR (group_id IS NOT NULL AND public.is_group_admin(group_id, auth.uid()))
);

-- ========== POLLS in groups ==========
DROP POLICY IF EXISTS "Create polls" ON public.polls;
CREATE POLICY "Create polls" ON public.polls
FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = created_by
  AND (
    (conversation_id IS NOT NULL AND public.is_conversation_member(conversation_id, auth.uid()))
    OR conversation_id IS NULL
  )
);
