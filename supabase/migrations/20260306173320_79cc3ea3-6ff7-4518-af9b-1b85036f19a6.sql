
-- Ensure pg_net extension is available
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Function: notify on new comment (notify post author)
CREATE OR REPLACE FUNCTION public.notify_new_comment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  post_owner_id uuid;
  commenter_name text;
BEGIN
  -- Get post owner
  SELECT user_id INTO post_owner_id FROM public.posts WHERE id = NEW.post_id;
  
  -- Don't notify yourself
  IF post_owner_id IS NULL OR post_owner_id = NEW.user_id THEN
    RETURN NEW;
  END IF;
  
  -- Get commenter name
  SELECT COALESCE(full_name, 'Користувач') INTO commenter_name 
  FROM public.users WHERE id = NEW.user_id;
  
  -- Create in-app notification
  INSERT INTO public.notifications (user_id, message, is_read)
  VALUES (post_owner_id, commenter_name || ' прокоментував(ла) вашу публікацію', false);
  
  -- Send push notification
  PERFORM net.http_post(
    url := 'https://cxdkaxjeibqdmpvozirz.supabase.co/functions/v1/send-push-notification',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN4ZGtheGplaWJxZG1wdm96aXJ6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ4MzUxMzcsImV4cCI6MjA2MDQxMTEzN30.mjqEyiJX59YLQpjb-_N4qS_3byUY_zpgS2g6X5xqM2U'
    ),
    body := jsonb_build_object(
      'user_id', post_owner_id::text,
      'title', 'Новий коментар',
      'body', commenter_name || ' прокоментував(ла) вашу публікацію',
      'url', '/post/' || NEW.post_id::text
    )
  );
  RETURN NEW;
END;
$$;

-- Function: notify on new like (notify post author)
CREATE OR REPLACE FUNCTION public.notify_new_like()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  post_owner_id uuid;
  liker_name text;
BEGIN
  -- Get post owner
  SELECT user_id INTO post_owner_id FROM public.posts WHERE id = NEW.post_id;
  
  -- Don't notify yourself
  IF post_owner_id IS NULL OR post_owner_id = NEW.user_id THEN
    RETURN NEW;
  END IF;
  
  -- Get liker name
  SELECT COALESCE(full_name, 'Користувач') INTO liker_name 
  FROM public.users WHERE id = NEW.user_id;
  
  -- Create in-app notification
  INSERT INTO public.notifications (user_id, message, is_read)
  VALUES (post_owner_id, liker_name || ' вподобав(ла) вашу публікацію', false);
  
  -- Send push notification
  PERFORM net.http_post(
    url := 'https://cxdkaxjeibqdmpvozirz.supabase.co/functions/v1/send-push-notification',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN4ZGtheGplaWJxZG1wdm96aXJ6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ4MzUxMzcsImV4cCI6MjA2MDQxMTEzN30.mjqEyiJX59YLQpjb-_N4qS_3byUY_zpgS2g6X5xqM2U'
    ),
    body := jsonb_build_object(
      'user_id', post_owner_id::text,
      'title', 'Нове вподобання',
      'body', liker_name || ' вподобав(ла) вашу публікацію',
      'url', '/post/' || NEW.post_id::text
    )
  );
  RETURN NEW;
END;
$$;

-- Create triggers (drop first to be idempotent)
DROP TRIGGER IF EXISTS on_new_comment_notify ON public.comments;
CREATE TRIGGER on_new_comment_notify
  AFTER INSERT ON public.comments
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_new_comment();

DROP TRIGGER IF EXISTS on_new_like_notify ON public.post_likes;
CREATE TRIGGER on_new_like_notify
  AFTER INSERT ON public.post_likes
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_new_like();

-- Also ensure message trigger exists
DROP TRIGGER IF EXISTS on_new_message_notify ON public.messages;
CREATE TRIGGER on_new_message_notify
  AFTER INSERT ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_new_message();
