CREATE OR REPLACE FUNCTION public.get_detailed_profile(target_user_id uuid)
 RETURNS TABLE(id uuid, full_name text, avatar_url text, banner_url text, title text, bio text, is_shareholder boolean, country text, city text, website text, instagram text, facebook text, viber text, categories text[], created_at timestamp without time zone, date_of_birth date)
 LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  is_own_profile boolean;
  are_friends boolean;
  is_viewer_admin boolean;
  is_spec boolean;
BEGIN
  is_own_profile := (auth.uid() = target_user_id);
  SELECT EXISTS(SELECT 1 FROM public.friend_requests
    WHERE ((sender_id = auth.uid() AND receiver_id = target_user_id)
        OR (sender_id = target_user_id AND receiver_id = auth.uid())) AND status = 'accepted') INTO are_friends;
  is_viewer_admin := auth.uid() IS NOT NULL AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'founder'));
  is_spec := public.has_role(target_user_id,'specialist');

  RETURN QUERY
  SELECT u.id, u.full_name, u.avatar_url, u.banner_url, u.title, u.bio, u.is_shareholder,
    CASE WHEN (is_own_profile OR are_friends OR is_viewer_admin OR is_spec) THEN u.country END,
    CASE WHEN (is_own_profile OR are_friends OR is_viewer_admin OR is_spec) THEN u.city END,
    CASE WHEN (is_own_profile OR are_friends OR is_viewer_admin OR is_spec) THEN u.website END,
    CASE WHEN (is_own_profile OR are_friends OR is_viewer_admin OR is_spec) THEN u.instagram END,
    CASE WHEN (is_own_profile OR are_friends OR is_viewer_admin OR is_spec) THEN u.facebook END,
    CASE WHEN (is_own_profile OR are_friends OR is_viewer_admin) THEN u.viber END,
    CASE WHEN (is_own_profile OR are_friends OR is_viewer_admin OR is_spec) THEN u.categories END,
    u.created_at,
    CASE WHEN (is_own_profile OR are_friends OR is_viewer_admin) THEN u.date_of_birth END
  FROM public.users u WHERE u.id = target_user_id;
END;
$function$;
GRANT EXECUTE ON FUNCTION public.is_user_admin(uuid) TO authenticated;