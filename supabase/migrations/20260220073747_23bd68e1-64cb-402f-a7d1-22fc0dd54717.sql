
CREATE OR REPLACE FUNCTION public.get_users_last_seen(_ids uuid[])
RETURNS TABLE(id uuid, last_seen timestamp with time zone)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only authenticated users can call this function
  IF auth.uid() IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT u.id, u.last_seen
  FROM public.users u
  WHERE u.id = ANY(_ids);
END;
$$;
