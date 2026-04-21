-- =============================================================
-- STEP 1: New tables for conversations & members
-- =============================================================

CREATE TABLE IF NOT EXISTS public.conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL CHECK (type IN ('direct', 'group')),
  title text,
  avatar_url text,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  last_message_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_conversations_type ON public.conversations(type);
CREATE INDEX IF NOT EXISTS idx_conversations_last_message_at ON public.conversations(last_message_at DESC);

CREATE TABLE IF NOT EXISTS public.conversation_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role text NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
  joined_at timestamptz NOT NULL DEFAULT now(),
  last_read_at timestamptz NOT NULL DEFAULT '1970-01-01'::timestamptz,
  is_muted boolean NOT NULL DEFAULT false,
  is_archived boolean NOT NULL DEFAULT false,
  UNIQUE (conversation_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_conv_members_user ON public.conversation_members(user_id);
CREATE INDEX IF NOT EXISTS idx_conv_members_conv ON public.conversation_members(conversation_id);

-- =============================================================
-- STEP 2: Extend messages table
-- =============================================================

ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS conversation_id uuid REFERENCES public.conversations(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS system_event jsonb;

ALTER TABLE public.messages ALTER COLUMN receiver_id DROP NOT NULL;

CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON public.messages(conversation_id, created_at DESC);

-- =============================================================
-- STEP 3: Helper - membership check (SECURITY DEFINER, no recursion)
-- =============================================================

CREATE OR REPLACE FUNCTION public.is_conversation_member(_conv_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.conversation_members
    WHERE conversation_id = _conv_id AND user_id = _user_id
  );
$$;

CREATE OR REPLACE FUNCTION public.get_conversation_member_role(_conv_id uuid, _user_id uuid)
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.conversation_members
  WHERE conversation_id = _conv_id AND user_id = _user_id
  LIMIT 1;
$$;

-- =============================================================
-- STEP 4: Migrate existing 1-on-1 chats into conversations
-- =============================================================

DO $migrate$
DECLARE
  pair RECORD;
  conv_id uuid;
  earliest_at timestamptz;
  latest_at timestamptz;
BEGIN
  -- For each unique (smaller_uid, larger_uid) pair from messages without conversation_id
  FOR pair IN
    SELECT DISTINCT
      LEAST(sender_id, receiver_id) AS u1,
      GREATEST(sender_id, receiver_id) AS u2
    FROM public.messages
    WHERE conversation_id IS NULL AND receiver_id IS NOT NULL
  LOOP
    SELECT MIN(created_at), MAX(created_at)
      INTO earliest_at, latest_at
      FROM public.messages
      WHERE conversation_id IS NULL
        AND ((sender_id = pair.u1 AND receiver_id = pair.u2)
          OR (sender_id = pair.u2 AND receiver_id = pair.u1));

    INSERT INTO public.conversations (type, created_by, created_at, last_message_at)
    VALUES ('direct', pair.u1, COALESCE(earliest_at, now()), COALESCE(latest_at, now()))
    RETURNING id INTO conv_id;

    INSERT INTO public.conversation_members (conversation_id, user_id, role, joined_at)
    VALUES
      (conv_id, pair.u1, 'member', COALESCE(earliest_at, now())),
      (conv_id, pair.u2, 'member', COALESCE(earliest_at, now()))
    ON CONFLICT DO NOTHING;

    UPDATE public.messages
    SET conversation_id = conv_id
    WHERE conversation_id IS NULL
      AND ((sender_id = pair.u1 AND receiver_id = pair.u2)
        OR (sender_id = pair.u2 AND receiver_id = pair.u1));
  END LOOP;
END
$migrate$;

-- =============================================================
-- STEP 5: RLS policies
-- =============================================================

ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can view their conversations" ON public.conversations;
CREATE POLICY "Members can view their conversations" ON public.conversations
  FOR SELECT USING (public.is_conversation_member(id, auth.uid()) OR check_admin_access());

DROP POLICY IF EXISTS "Authenticated users can create conversations" ON public.conversations;
CREATE POLICY "Authenticated users can create conversations" ON public.conversations
  FOR INSERT WITH CHECK (auth.uid() = created_by);

DROP POLICY IF EXISTS "Owners and admins can update conversations" ON public.conversations;
CREATE POLICY "Owners and admins can update conversations" ON public.conversations
  FOR UPDATE USING (
    public.get_conversation_member_role(id, auth.uid()) IN ('owner','admin')
    OR check_admin_access()
  );

DROP POLICY IF EXISTS "Owners can delete conversations" ON public.conversations;
CREATE POLICY "Owners can delete conversations" ON public.conversations
  FOR DELETE USING (
    public.get_conversation_member_role(id, auth.uid()) = 'owner'
    OR check_admin_access()
  );

DROP POLICY IF EXISTS "Members can view co-members" ON public.conversation_members;
CREATE POLICY "Members can view co-members" ON public.conversation_members
  FOR SELECT USING (
    public.is_conversation_member(conversation_id, auth.uid())
    OR check_admin_access()
  );

DROP POLICY IF EXISTS "Members can update own membership" ON public.conversation_members;
CREATE POLICY "Members can update own membership" ON public.conversation_members
  FOR UPDATE USING (user_id = auth.uid() OR check_admin_access())
  WITH CHECK (user_id = auth.uid() OR check_admin_access());

-- Insert/delete for members handled exclusively through SECURITY DEFINER RPCs below.

-- =============================================================
-- STEP 6: Update messages RLS — allow conversation members
-- =============================================================

DROP POLICY IF EXISTS "Users can view their own messages only" ON public.messages;
CREATE POLICY "Users can view their messages" ON public.messages
  FOR SELECT USING (
    sender_id = auth.uid()
    OR receiver_id = auth.uid()
    OR (conversation_id IS NOT NULL AND public.is_conversation_member(conversation_id, auth.uid()))
    OR check_admin_access()
  );

DROP POLICY IF EXISTS "Users can send messages" ON public.messages;
CREATE POLICY "Users can send messages" ON public.messages
  FOR INSERT WITH CHECK (
    sender_id = auth.uid()
    AND (
      receiver_id IS NOT NULL  -- legacy 1-on-1 path
      OR (conversation_id IS NOT NULL AND public.is_conversation_member(conversation_id, auth.uid()))
    )
  );

-- =============================================================
-- STEP 7: RPCs for conversation management
-- =============================================================

CREATE OR REPLACE FUNCTION public.get_or_create_direct_conversation(_other_user_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  me uuid := auth.uid();
  existing uuid;
  new_conv uuid;
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF me = _other_user_id THEN RAISE EXCEPTION 'Cannot start chat with yourself'; END IF;

  -- Find existing direct conversation between exactly these two users
  SELECT c.id INTO existing
  FROM public.conversations c
  WHERE c.type = 'direct'
    AND EXISTS (SELECT 1 FROM public.conversation_members WHERE conversation_id = c.id AND user_id = me)
    AND EXISTS (SELECT 1 FROM public.conversation_members WHERE conversation_id = c.id AND user_id = _other_user_id)
    AND (SELECT COUNT(*) FROM public.conversation_members WHERE conversation_id = c.id) = 2
  LIMIT 1;

  IF existing IS NOT NULL THEN
    RETURN existing;
  END IF;

  INSERT INTO public.conversations (type, created_by) VALUES ('direct', me) RETURNING id INTO new_conv;
  INSERT INTO public.conversation_members (conversation_id, user_id, role) VALUES
    (new_conv, me, 'member'),
    (new_conv, _other_user_id, 'member');

  RETURN new_conv;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_group_conversation(_title text, _member_ids uuid[])
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  me uuid := auth.uid();
  new_conv uuid;
  uid uuid;
  total_members int;
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF _title IS NULL OR length(trim(_title)) = 0 THEN RAISE EXCEPTION 'Group title required'; END IF;
  IF _member_ids IS NULL OR array_length(_member_ids, 1) IS NULL THEN
    RAISE EXCEPTION 'At least one other member required';
  END IF;

  total_members := 1 + (SELECT COUNT(DISTINCT u) FROM unnest(_member_ids) u WHERE u <> me);
  IF total_members > 50 THEN
    RAISE EXCEPTION 'Group cannot exceed 50 members';
  END IF;
  IF total_members < 2 THEN
    RAISE EXCEPTION 'Group requires at least 2 members';
  END IF;

  INSERT INTO public.conversations (type, title, created_by)
  VALUES ('group', trim(_title), me) RETURNING id INTO new_conv;

  INSERT INTO public.conversation_members (conversation_id, user_id, role)
  VALUES (new_conv, me, 'owner');

  FOREACH uid IN ARRAY _member_ids LOOP
    IF uid <> me THEN
      INSERT INTO public.conversation_members (conversation_id, user_id, role)
      VALUES (new_conv, uid, 'member')
      ON CONFLICT DO NOTHING;
    END IF;
  END LOOP;

  -- system event message
  INSERT INTO public.messages (conversation_id, sender_id, content, system_event)
  VALUES (new_conv, me, 'Групу створено', jsonb_build_object('type','group_created','actor', me));

  RETURN new_conv;
END;
$$;

CREATE OR REPLACE FUNCTION public.add_members_to_group(_conv_id uuid, _user_ids uuid[])
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  me uuid := auth.uid();
  my_role text;
  uid uuid;
  current_count int;
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  my_role := public.get_conversation_member_role(_conv_id, me);
  IF my_role NOT IN ('owner','admin') THEN
    RAISE EXCEPTION 'Only owner or admin can add members';
  END IF;

  SELECT COUNT(*) INTO current_count FROM public.conversation_members WHERE conversation_id = _conv_id;
  IF current_count + COALESCE(array_length(_user_ids,1),0) > 50 THEN
    RAISE EXCEPTION 'Group cannot exceed 50 members';
  END IF;

  FOREACH uid IN ARRAY _user_ids LOOP
    INSERT INTO public.conversation_members (conversation_id, user_id, role)
    VALUES (_conv_id, uid, 'member')
    ON CONFLICT DO NOTHING;

    INSERT INTO public.messages (conversation_id, sender_id, content, system_event)
    VALUES (_conv_id, me, 'Учасник доданий', jsonb_build_object('type','member_added','actor',me,'target',uid));
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public.remove_member_from_group(_conv_id uuid, _user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  me uuid := auth.uid();
  my_role text;
  target_role text;
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  my_role := public.get_conversation_member_role(_conv_id, me);
  target_role := public.get_conversation_member_role(_conv_id, _user_id);
  IF my_role NOT IN ('owner','admin') THEN
    RAISE EXCEPTION 'Only owner or admin can remove members';
  END IF;
  IF target_role = 'owner' THEN
    RAISE EXCEPTION 'Cannot remove owner';
  END IF;

  DELETE FROM public.conversation_members
  WHERE conversation_id = _conv_id AND user_id = _user_id;

  INSERT INTO public.messages (conversation_id, sender_id, content, system_event)
  VALUES (_conv_id, me, 'Учасник видалений', jsonb_build_object('type','member_removed','actor',me,'target',_user_id));
END;
$$;

CREATE OR REPLACE FUNCTION public.leave_conversation(_conv_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  me uuid := auth.uid();
  my_role text;
  remaining_count int;
  new_owner uuid;
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  my_role := public.get_conversation_member_role(_conv_id, me);
  IF my_role IS NULL THEN RAISE EXCEPTION 'Not a member'; END IF;

  DELETE FROM public.conversation_members WHERE conversation_id = _conv_id AND user_id = me;

  -- If owner left, promote oldest remaining member
  IF my_role = 'owner' THEN
    SELECT user_id INTO new_owner FROM public.conversation_members
    WHERE conversation_id = _conv_id ORDER BY joined_at ASC LIMIT 1;
    IF new_owner IS NOT NULL THEN
      UPDATE public.conversation_members SET role = 'owner'
      WHERE conversation_id = _conv_id AND user_id = new_owner;
    END IF;
  END IF;

  -- If no members left, delete conversation
  SELECT COUNT(*) INTO remaining_count FROM public.conversation_members WHERE conversation_id = _conv_id;
  IF remaining_count = 0 THEN
    DELETE FROM public.conversations WHERE id = _conv_id;
  ELSE
    INSERT INTO public.messages (conversation_id, sender_id, content, system_event)
    VALUES (_conv_id, me, 'Учасник вийшов', jsonb_build_object('type','member_left','actor',me));
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.mark_conversation_read(_conv_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.conversation_members
  SET last_read_at = now()
  WHERE conversation_id = _conv_id AND user_id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.update_conversation_title(_conv_id uuid, _title text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  my_role text;
BEGIN
  my_role := public.get_conversation_member_role(_conv_id, auth.uid());
  IF my_role NOT IN ('owner','admin') THEN
    RAISE EXCEPTION 'Only owner or admin can rename group';
  END IF;
  IF _title IS NULL OR length(trim(_title)) = 0 THEN
    RAISE EXCEPTION 'Title cannot be empty';
  END IF;
  UPDATE public.conversations SET title = trim(_title), updated_at = now()
  WHERE id = _conv_id AND type = 'group';
END;
$$;

-- =============================================================
-- STEP 8: List user conversations with unread count
-- =============================================================

CREATE OR REPLACE FUNCTION public.get_user_conversations(_user_id uuid)
RETURNS TABLE (
  conversation_id uuid,
  type text,
  title text,
  avatar_url text,
  last_message_at timestamptz,
  last_message_text text,
  last_message_sender_id uuid,
  unread_count bigint,
  member_count bigint,
  my_role text,
  member_ids uuid[]
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  WITH my_convs AS (
    SELECT cm.conversation_id, cm.last_read_at, cm.role
    FROM public.conversation_members cm
    WHERE cm.user_id = _user_id
  ),
  last_msgs AS (
    SELECT DISTINCT ON (m.conversation_id)
      m.conversation_id, m.content, m.sender_id, m.created_at
    FROM public.messages m
    WHERE m.conversation_id IN (SELECT conversation_id FROM my_convs)
    ORDER BY m.conversation_id, m.created_at DESC
  ),
  unread AS (
    SELECT m.conversation_id, COUNT(*)::bigint AS cnt
    FROM public.messages m
    JOIN my_convs mc ON mc.conversation_id = m.conversation_id
    WHERE m.created_at > mc.last_read_at AND m.sender_id <> _user_id
    GROUP BY m.conversation_id
  ),
  member_agg AS (
    SELECT cm.conversation_id, COUNT(*)::bigint AS cnt, array_agg(cm.user_id) AS ids
    FROM public.conversation_members cm
    WHERE cm.conversation_id IN (SELECT conversation_id FROM my_convs)
    GROUP BY cm.conversation_id
  )
  SELECT
    c.id,
    c.type,
    c.title,
    c.avatar_url,
    COALESCE(lm.created_at, c.created_at),
    lm.content,
    lm.sender_id,
    COALESCE(u.cnt, 0),
    COALESCE(ma.cnt, 0),
    mc.role,
    ma.ids
  FROM public.conversations c
  JOIN my_convs mc ON mc.conversation_id = c.id
  LEFT JOIN last_msgs lm ON lm.conversation_id = c.id
  LEFT JOIN unread u ON u.conversation_id = c.id
  LEFT JOIN member_agg ma ON ma.conversation_id = c.id
  ORDER BY COALESCE(lm.created_at, c.created_at) DESC;
$$;

-- =============================================================
-- STEP 9: Trigger - update conversation.last_message_at on new message
-- =============================================================

CREATE OR REPLACE FUNCTION public.touch_conversation_on_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.conversation_id IS NOT NULL THEN
    UPDATE public.conversations
    SET last_message_at = NEW.created_at, updated_at = now()
    WHERE id = NEW.conversation_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_touch_conversation_on_message ON public.messages;
CREATE TRIGGER trg_touch_conversation_on_message
AFTER INSERT ON public.messages
FOR EACH ROW EXECUTE FUNCTION public.touch_conversation_on_message();

-- =============================================================
-- STEP 10: Enable Realtime on new tables
-- =============================================================

ALTER TABLE public.conversations REPLICA IDENTITY FULL;
ALTER TABLE public.conversation_members REPLICA IDENTITY FULL;
ALTER TABLE public.messages REPLICA IDENTITY FULL;

DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.conversation_members;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;