-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Users can create notifications for others" ON public.notifications;

-- Create a secure SECURITY DEFINER function for friend request notifications
CREATE OR REPLACE FUNCTION public.send_friend_request_notification(
  p_receiver_id uuid,
  p_sender_name text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_sender_id uuid;
  v_notification_count int;
BEGIN
  -- Get authenticated user
  v_sender_id := auth.uid();
  IF v_sender_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  
  -- Cannot send notification to yourself
  IF v_sender_id = p_receiver_id THEN
    RAISE EXCEPTION 'Cannot send notification to yourself';
  END IF;
  
  -- Verify friend request exists and is pending (created recently)
  IF NOT EXISTS (
    SELECT 1 FROM friend_requests 
    WHERE sender_id = v_sender_id 
    AND receiver_id = p_receiver_id
    AND status = 'pending'
    AND created_at > NOW() - INTERVAL '5 minutes'
  ) THEN
    RAISE EXCEPTION 'No valid pending friend request found';
  END IF;
  
  -- Rate limiting: max 10 notifications per receiver per hour
  SELECT COUNT(*) INTO v_notification_count
  FROM notifications
  WHERE user_id = p_receiver_id
  AND created_at > NOW() - INTERVAL '1 hour';
  
  IF v_notification_count >= 10 THEN
    RAISE EXCEPTION 'Rate limit exceeded';
  END IF;
  
  -- Sanitize sender name (limit length)
  p_sender_name := LEFT(COALESCE(p_sender_name, 'Користувач'), 100);
  
  -- Create notification
  INSERT INTO notifications (user_id, message, is_read)
  VALUES (p_receiver_id, p_sender_name || ' хоче додати вас у друзі', false);
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.send_friend_request_notification(uuid, text) TO authenticated;