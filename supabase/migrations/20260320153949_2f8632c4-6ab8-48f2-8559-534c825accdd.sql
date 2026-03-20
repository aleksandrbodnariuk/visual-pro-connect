
CREATE OR REPLACE FUNCTION public.notify_representative_invite()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _inviter_user_id uuid;
  _inviter_name text;
BEGIN
  -- Get the inviter's user_id from representatives table
  SELECT r.user_id INTO _inviter_user_id
  FROM representatives r
  WHERE r.id = NEW.inviter_id;

  -- Get inviter's name
  SELECT COALESCE(u.full_name, 'Користувач') INTO _inviter_name
  FROM users u
  WHERE u.id = _inviter_user_id;

  -- Create notification for the invited user
  INSERT INTO notifications (user_id, message, link)
  VALUES (
    NEW.invited_user_id,
    _inviter_name || ' запрошує вас стати представником',
    '/accept-invite/' || NEW.id::text
  );

  RETURN NEW;
END;
$$;

-- Drop trigger if exists, then create
DROP TRIGGER IF EXISTS on_representative_invite_created ON representative_invites;
CREATE TRIGGER on_representative_invite_created
  AFTER INSERT ON representative_invites
  FOR EACH ROW
  EXECUTE FUNCTION notify_representative_invite();
