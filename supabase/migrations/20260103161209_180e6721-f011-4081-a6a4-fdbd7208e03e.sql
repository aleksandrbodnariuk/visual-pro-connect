-- Add columns to track message editing
ALTER TABLE messages 
ADD COLUMN IF NOT EXISTS edited_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS is_edited boolean DEFAULT false;

-- Drop existing UPDATE policy that only allows receiver updates
DROP POLICY IF EXISTS "Users can update messages they received" ON messages;

-- Create new UPDATE policy that allows:
-- 1. Senders to edit their own messages (content, edited_at, is_edited)
-- 2. Receivers to mark messages as read
-- 3. Admins to do anything
CREATE POLICY "Users can update their own or received messages" 
ON messages FOR UPDATE 
USING (
  (sender_id = auth.uid()) OR 
  (receiver_id = auth.uid()) OR 
  check_admin_access()
)
WITH CHECK (
  (sender_id = auth.uid()) OR 
  (receiver_id = auth.uid()) OR 
  check_admin_access()
);