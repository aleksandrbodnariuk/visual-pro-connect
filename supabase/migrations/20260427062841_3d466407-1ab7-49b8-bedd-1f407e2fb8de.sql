CREATE OR REPLACE FUNCTION public.mark_conversation_read(_conv_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  me uuid := auth.uid();
BEGIN
  IF me IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT public.is_conversation_member(_conv_id, me) THEN
    RAISE EXCEPTION 'Not a conversation member';
  END IF;

  UPDATE public.conversation_members
  SET last_read_at = now()
  WHERE conversation_id = _conv_id
    AND user_id = me;

  UPDATE public.messages
  SET read = true
  WHERE conversation_id = _conv_id
    AND sender_id <> me
    AND COALESCE(read, false) = false;
END;
$$;