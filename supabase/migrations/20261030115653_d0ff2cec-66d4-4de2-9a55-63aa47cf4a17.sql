CREATE OR REPLACE FUNCTION public.send_friend_request_notification(p_receiver_id uuid, p_sender_name text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_sender_id uuid; v_cnt int; v_req uuid;
BEGIN
  v_sender_id := auth.uid();
  IF v_sender_id IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  IF v_sender_id = p_receiver_id THEN RAISE EXCEPTION 'Cannot send notification to yourself'; END IF;
  SELECT id INTO v_req FROM friend_requests WHERE sender_id = v_sender_id AND receiver_id = p_receiver_id
    AND status = 'pending' AND created_at > NOW() - INTERVAL '5 minutes' ORDER BY created_at DESC LIMIT 1;
  IF v_req IS NULL THEN RAISE EXCEPTION 'No valid pending friend request found'; END IF;
  SELECT COUNT(*) INTO v_cnt FROM notifications WHERE user_id = p_receiver_id AND created_at > NOW() - INTERVAL '1 hour';
  IF v_cnt >= 10 THEN RAISE EXCEPTION 'Rate limit exceeded'; END IF;
  p_sender_name := LEFT(COALESCE(p_sender_name, 'Користувач'), 100);
  INSERT INTO notifications (user_id, message, is_read, link)
  VALUES (p_receiver_id, p_sender_name || ' хоче додати вас у друзі', false, '/friend-request/' || v_req::text);
END; $$;
UPDATE public.notifications SET link = '/friends' WHERE link IS NULL AND message LIKE '% хоче додати вас у друзі';