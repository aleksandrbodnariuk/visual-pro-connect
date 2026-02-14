-- Enable realtime for missing tables
ALTER PUBLICATION supabase_realtime ADD TABLE posts;
ALTER PUBLICATION supabase_realtime ADD TABLE comments;
ALTER PUBLICATION supabase_realtime ADD TABLE comment_likes;
ALTER PUBLICATION supabase_realtime ADD TABLE post_likes;

-- Add missing UPDATE policy for post_likes (needed to change reaction type)
CREATE POLICY "Users can update their post reactions"
  ON post_likes FOR UPDATE
  USING (user_id = auth.uid());