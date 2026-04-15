
CREATE OR REPLACE FUNCTION public.notify_representative_invite()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _inviter_name text;
BEGIN
  SELECT COALESCE(u.full_name, 'Користувач')
    INTO _inviter_name
    FROM representatives r
    JOIN users u ON u.id = r.user_id
    WHERE r.id = NEW.inviter_id;

  INSERT INTO notifications (user_id, message, link)
  VALUES (
    NEW.invited_user_id,
    'Заробляй разом з B&C! ' || _inviter_name || ' запрошує тебе стати представником студії.',
    '/accept-invite/' || NEW.id::text
  );

  RETURN NEW;
END;
$$;
