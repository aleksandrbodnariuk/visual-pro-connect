
-- Trigger function to update posts.likes_count from post_likes
CREATE OR REPLACE FUNCTION public.update_post_likes_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE posts SET likes_count = (SELECT COUNT(*) FROM post_likes WHERE post_id = NEW.post_id) WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE posts SET likes_count = (SELECT COUNT(*) FROM post_likes WHERE post_id = OLD.post_id) WHERE id = OLD.post_id;
  ELSIF TG_OP = 'UPDATE' THEN
    -- reaction type changed, count stays same
    NULL;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_update_post_likes_count
AFTER INSERT OR DELETE ON post_likes
FOR EACH ROW EXECUTE FUNCTION update_post_likes_count();

-- Trigger function to update posts.comments_count from comments
CREATE OR REPLACE FUNCTION public.update_post_comments_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE posts SET comments_count = (SELECT COUNT(*) FROM comments WHERE post_id = NEW.post_id) WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE posts SET comments_count = (SELECT COUNT(*) FROM comments WHERE post_id = OLD.post_id) WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_update_post_comments_count
AFTER INSERT OR DELETE ON comments
FOR EACH ROW EXECUTE FUNCTION update_post_comments_count();

-- Sync existing counts
UPDATE posts SET likes_count = (SELECT COUNT(*) FROM post_likes WHERE post_likes.post_id = posts.id);
UPDATE posts SET comments_count = (SELECT COUNT(*) FROM comments WHERE comments.post_id = posts.id);
