-- Insert missing notification for the existing invite that was created before the trigger
INSERT INTO notifications (user_id, message, link)
SELECT 
  ri.invited_user_id,
  COALESCE(u.full_name, 'Користувач') || ' запрошує вас стати представником',
  '/accept-invite/' || ri.id::text
FROM representative_invites ri
JOIN representatives r ON r.id = ri.inviter_id
JOIN users u ON u.id = r.user_id
WHERE ri.status = 'pending'
AND NOT EXISTS (
  SELECT 1 FROM notifications n 
  WHERE n.link = '/accept-invite/' || ri.id::text
);