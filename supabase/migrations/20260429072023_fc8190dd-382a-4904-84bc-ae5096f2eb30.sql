-- Helper: invoke send-push-notification edge function asynchronously via pg_net
CREATE OR REPLACE FUNCTION public.invoke_push_notification(
  _user_id uuid,
  _title text,
  _body text,
  _url text
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  _project_url text := 'https://cxdkaxjeibqdmpvozirz.supabase.co';
  _anon_key text := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN4ZGtheGplaWJxZG1wdm96aXJ6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ4MzUxMzcsImV4cCI6MjA2MDQxMTEzN30.mjqEyiJX59YLQpjb-_N4qS_3byUY_zpgS2g6X5xqM2U';
BEGIN
  -- Skip users that have no push subscription to avoid wasted calls
  IF NOT EXISTS (SELECT 1 FROM public.push_subscriptions WHERE user_id = _user_id) THEN
    RETURN;
  END IF;

  PERFORM net.http_post(
    url := _project_url || '/functions/v1/send-push-notification',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || _anon_key,
      'apikey', _anon_key
    ),
    body := jsonb_build_object(
      'user_id', _user_id,
      'title', _title,
      'body', _body,
      'url', _url
    )
  );
END;
$$;

-- Trigger function: new direct/group message -> push to all other conversation members
CREATE OR REPLACE FUNCTION public.tg_push_on_new_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _recipient uuid;
  _sender_name text;
  _preview text;
  _url text;
  _conv_type text;
  _conv_title text;
BEGIN
  -- Build sender display name
  SELECT COALESCE(NULLIF(TRIM(CONCAT_WS(' ', first_name, last_name)), ''), email, 'Користувач')
    INTO _sender_name
  FROM public.profiles WHERE id = NEW.sender_id;

  IF _sender_name IS NULL THEN _sender_name := 'Нове повідомлення'; END IF;

  -- Build preview (first 120 chars)
  IF NEW.attachment_url IS NOT NULL AND COALESCE(TRIM(NEW.content), '') = '' THEN
    _preview := '📎 Вкладення';
  ELSE
    _preview := LEFT(COALESCE(NEW.content, ''), 120);
  END IF;

  _url := '/messages';

  -- Direct (legacy) message
  IF NEW.receiver_id IS NOT NULL THEN
    PERFORM public.invoke_push_notification(
      NEW.receiver_id,
      _sender_name,
      _preview,
      _url
    );
    RETURN NEW;
  END IF;

  -- Conversation message
  IF NEW.conversation_id IS NOT NULL THEN
    SELECT type, title INTO _conv_type, _conv_title
    FROM public.conversations WHERE id = NEW.conversation_id;

    -- For group chats prefix with group title
    IF _conv_type = 'group' AND _conv_title IS NOT NULL THEN
      _sender_name := _conv_title || ' • ' || _sender_name;
    END IF;

    FOR _recipient IN
      SELECT user_id
      FROM public.conversation_members
      WHERE conversation_id = NEW.conversation_id
        AND user_id <> NEW.sender_id
        AND COALESCE(is_muted, false) = false
    LOOP
      PERFORM public.invoke_push_notification(
        _recipient,
        _sender_name,
        _preview,
        _url
      );
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS push_on_new_message ON public.messages;
CREATE TRIGGER push_on_new_message
AFTER INSERT ON public.messages
FOR EACH ROW
EXECUTE FUNCTION public.tg_push_on_new_message();

-- Trigger function: every new in-app notification -> push
CREATE OR REPLACE FUNCTION public.tg_push_on_new_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _preview text;
BEGIN
  IF NEW.user_id IS NULL THEN
    RETURN NEW;
  END IF;

  _preview := LEFT(COALESCE(NEW.message, ''), 140);

  PERFORM public.invoke_push_notification(
    NEW.user_id,
    'Спільнота B&C',
    _preview,
    COALESCE(NEW.link, '/notifications')
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS push_on_new_notification ON public.notifications;
CREATE TRIGGER push_on_new_notification
AFTER INSERT ON public.notifications
FOR EACH ROW
EXECUTE FUNCTION public.tg_push_on_new_notification();