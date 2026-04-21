-- 1) Add description (group rules) to conversations
ALTER TABLE public.conversations 
  ADD COLUMN IF NOT EXISTS description text;

-- 2) Storage bucket for group avatars (public)
INSERT INTO storage.buckets (id, name, public)
VALUES ('group-avatars', 'group-avatars', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Group avatars are public" ON storage.objects;
CREATE POLICY "Group avatars are public"
ON storage.objects FOR SELECT
USING (bucket_id = 'group-avatars');

DROP POLICY IF EXISTS "Authenticated can upload group avatars" ON storage.objects;
CREATE POLICY "Authenticated can upload group avatars"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'group-avatars' AND auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Authenticated can update group avatars" ON storage.objects;
CREATE POLICY "Authenticated can update group avatars"
ON storage.objects FOR UPDATE
USING (bucket_id = 'group-avatars' AND auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Authenticated can delete group avatars" ON storage.objects;
CREATE POLICY "Authenticated can delete group avatars"
ON storage.objects FOR DELETE
USING (bucket_id = 'group-avatars' AND auth.uid() IS NOT NULL);

-- 3) Drop existing get_user_conversations to allow return type change
DROP FUNCTION IF EXISTS public.get_user_conversations(uuid);

CREATE FUNCTION public.get_user_conversations(_user_id uuid)
RETURNS TABLE (
  conversation_id uuid,
  type text,
  title text,
  avatar_url text,
  description text,
  member_ids uuid[],
  member_count bigint,
  my_role text,
  unread_count bigint,
  last_message_at timestamptz,
  last_message_text text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH my_convs AS (
    SELECT cm.conversation_id, cm.role, cm.last_read_at
    FROM public.conversation_members cm
    WHERE cm.user_id = _user_id
  ),
  agg AS (
    SELECT 
      mc.conversation_id,
      array_agg(cm2.user_id) AS member_ids,
      count(cm2.user_id) AS member_count
    FROM my_convs mc
    JOIN public.conversation_members cm2 ON cm2.conversation_id = mc.conversation_id
    GROUP BY mc.conversation_id
  ),
  unread AS (
    SELECT mc.conversation_id,
      (SELECT count(*) FROM public.messages m
        WHERE m.conversation_id = mc.conversation_id
          AND m.sender_id <> _user_id
          AND m.created_at > mc.last_read_at) AS unread_count
    FROM my_convs mc
  ),
  last_msg AS (
    SELECT DISTINCT ON (m.conversation_id)
      m.conversation_id, m.created_at, m.content
    FROM public.messages m
    WHERE m.conversation_id IN (SELECT conversation_id FROM my_convs)
    ORDER BY m.conversation_id, m.created_at DESC
  )
  SELECT 
    c.id AS conversation_id,
    c.type,
    c.title,
    c.avatar_url,
    c.description,
    a.member_ids,
    a.member_count,
    mc.role AS my_role,
    COALESCE(u.unread_count, 0) AS unread_count,
    COALESCE(lm.created_at, c.last_message_at) AS last_message_at,
    lm.content AS last_message_text
  FROM my_convs mc
  JOIN public.conversations c ON c.id = mc.conversation_id
  LEFT JOIN agg a ON a.conversation_id = mc.conversation_id
  LEFT JOIN unread u ON u.conversation_id = mc.conversation_id
  LEFT JOIN last_msg lm ON lm.conversation_id = mc.conversation_id
  ORDER BY COALESCE(lm.created_at, c.last_message_at) DESC NULLS LAST;
$$;

-- 4) Update group avatar (owner/admin)
CREATE OR REPLACE FUNCTION public.update_conversation_avatar(_conv_id uuid, _avatar_url text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  my_role text;
BEGIN
  SELECT role INTO my_role FROM public.conversation_members
  WHERE conversation_id = _conv_id AND user_id = auth.uid();
  IF my_role NOT IN ('owner', 'admin') THEN
    RAISE EXCEPTION 'Тільки власник або адмін може змінити аватар';
  END IF;
  UPDATE public.conversations SET avatar_url = _avatar_url, updated_at = now() WHERE id = _conv_id;

  INSERT INTO public.messages (sender_id, conversation_id, content, system_event)
  VALUES (auth.uid(), _conv_id, 'avatar_updated', 
    jsonb_build_object('type', 'avatar_updated', 'by', auth.uid()));
END;
$$;

-- 5) Update group description / rules (owner/admin)
CREATE OR REPLACE FUNCTION public.update_conversation_description(_conv_id uuid, _description text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  my_role text;
BEGIN
  SELECT role INTO my_role FROM public.conversation_members
  WHERE conversation_id = _conv_id AND user_id = auth.uid();
  IF my_role NOT IN ('owner', 'admin') THEN
    RAISE EXCEPTION 'Тільки власник або адмін може оновити правила';
  END IF;
  UPDATE public.conversations SET description = _description, updated_at = now() WHERE id = _conv_id;

  INSERT INTO public.messages (sender_id, conversation_id, content, system_event)
  VALUES (auth.uid(), _conv_id, 'rules_updated',
    jsonb_build_object('type', 'rules_updated', 'by', auth.uid()));
END;
$$;

-- 6) Change member role (only owner)
CREATE OR REPLACE FUNCTION public.update_member_role(_conv_id uuid, _user_id uuid, _new_role text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  my_role text;
  target_role text;
BEGIN
  IF _new_role NOT IN ('admin', 'member') THEN
    RAISE EXCEPTION 'Невірна роль. Допустимі: admin, member';
  END IF;
  IF _user_id = auth.uid() THEN
    RAISE EXCEPTION 'Не можна змінити власну роль';
  END IF;
  SELECT role INTO my_role FROM public.conversation_members
  WHERE conversation_id = _conv_id AND user_id = auth.uid();
  IF my_role <> 'owner' THEN
    RAISE EXCEPTION 'Тільки власник може змінювати ролі';
  END IF;
  SELECT role INTO target_role FROM public.conversation_members
  WHERE conversation_id = _conv_id AND user_id = _user_id;
  IF target_role IS NULL THEN
    RAISE EXCEPTION 'Користувач не є учасником';
  END IF;
  IF target_role = 'owner' THEN
    RAISE EXCEPTION 'Не можна змінити роль власника';
  END IF;

  UPDATE public.conversation_members SET role = _new_role
  WHERE conversation_id = _conv_id AND user_id = _user_id;

  INSERT INTO public.messages (sender_id, conversation_id, content, system_event)
  VALUES (auth.uid(), _conv_id, 'role_changed',
    jsonb_build_object('type', 'role_changed', 'user_id', _user_id, 'new_role', _new_role, 'by', auth.uid()));
END;
$$;