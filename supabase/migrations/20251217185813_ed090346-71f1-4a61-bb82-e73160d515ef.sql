-- Drop all existing INSERT policies for friend_requests
DROP POLICY IF EXISTS "Users can create friend requests" ON friend_requests;
DROP POLICY IF EXISTS "Users can create their own friend requests" ON friend_requests;

-- Drop all existing SELECT policies
DROP POLICY IF EXISTS "Users can view friend requests they're involved in" ON friend_requests;
DROP POLICY IF EXISTS "Users can view their own friend requests" ON friend_requests;

-- Drop all existing UPDATE policies
DROP POLICY IF EXISTS "Users can update friend requests they received" ON friend_requests;
DROP POLICY IF EXISTS "Users can update received friend requests" ON friend_requests;

-- Drop all existing DELETE policies
DROP POLICY IF EXISTS "Users can delete friend requests they're involved in" ON friend_requests;

-- Create new PERMISSIVE policies (default is PERMISSIVE)
CREATE POLICY "Users can create friend requests"
ON friend_requests FOR INSERT
TO authenticated
WITH CHECK (sender_id = auth.uid());

CREATE POLICY "Users can view their friend requests"
ON friend_requests FOR SELECT
TO authenticated
USING (sender_id = auth.uid() OR receiver_id = auth.uid());

CREATE POLICY "Users can update received requests"
ON friend_requests FOR UPDATE
TO authenticated
USING (receiver_id = auth.uid());

CREATE POLICY "Users can delete their friend requests"
ON friend_requests FOR DELETE
TO authenticated
USING (sender_id = auth.uid() OR receiver_id = auth.uid());