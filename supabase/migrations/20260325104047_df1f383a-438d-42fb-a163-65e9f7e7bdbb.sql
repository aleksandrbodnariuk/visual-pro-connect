-- Recreate push notification triggers for real-time events

-- Messages -> push to receiver
DROP TRIGGER IF EXISTS trg_notify_new_message ON public.messages;
CREATE TRIGGER trg_notify_new_message
AFTER INSERT ON public.messages
FOR EACH ROW
EXECUTE FUNCTION public.notify_new_message();

-- Comments -> push to post owner
DROP TRIGGER IF EXISTS trg_notify_new_comment ON public.comments;
CREATE TRIGGER trg_notify_new_comment
AFTER INSERT ON public.comments
FOR EACH ROW
EXECUTE FUNCTION public.notify_new_comment();

-- Post likes -> push to post owner
DROP TRIGGER IF EXISTS trg_notify_new_like ON public.post_likes;
CREATE TRIGGER trg_notify_new_like
AFTER INSERT ON public.post_likes
FOR EACH ROW
EXECUTE FUNCTION public.notify_new_like();