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
  BEGIN
    SELECT COALESCE(NULLIF(TRIM(full_name), ''), 'Користувач')
      INTO _sender_name
    FROM public.users WHERE id = NEW.sender_id;
  EXCEPTION WHEN OTHERS THEN
    _sender_name := 'Нове повідомлення';
  END;

  IF _sender_name IS NULL THEN _sender_name := 'Нове повідомлення'; END IF;

  IF NEW.attachment_url IS NOT NULL AND COALESCE(TRIM(NEW.content), '') = '' THEN
    _preview := '📎 Вкладення';
  ELSE
    _preview := LEFT(COALESCE(NEW.content, ''), 120);
  END IF;

  _url := '/messages';

  BEGIN
    IF NEW.receiver_id IS NOT NULL THEN
      PERFORM public.invoke_push_notification(NEW.receiver_id, _sender_name, _preview, _url);
      RETURN NEW;
    END IF;

    IF NEW.conversation_id IS NOT NULL THEN
      SELECT type, title INTO _conv_type, _conv_title
      FROM public.conversations WHERE id = NEW.conversation_id;

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
        PERFORM public.invoke_push_notification(_recipient, _sender_name, _preview, _url);
      END LOOP;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    -- Never block message insertion if push dispatch fails
    RAISE WARNING 'Push notification dispatch failed: %', SQLERRM;
  END;

  RETURN NEW;
END;
$$;

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

  BEGIN
    PERFORM public.invoke_push_notification(
      NEW.user_id,
      'Спільнота B&C',
      _preview,
      COALESCE(NEW.link, '/notifications')
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Push notification dispatch failed: %', SQLERRM;
  END;

  RETURN NEW;
END;
$$;