
CREATE OR REPLACE FUNCTION public.get_user_friends(_user_id uuid)
RETURNS TABLE(
  id uuid,
  full_name text,
  avatar_url text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT u.id, u.full_name, u.avatar_url
  FROM friend_requests fr
  JOIN users u ON (
    CASE 
      WHEN fr.sender_id = _user_id THEN u.id = fr.receiver_id
      WHEN fr.receiver_id = _user_id THEN u.id = fr.sender_id
    END
  )
  WHERE fr.status = 'accepted'
    AND (fr.sender_id = _user_id OR fr.receiver_id = _user_id)
$$;
