
CREATE OR REPLACE FUNCTION public.notify_new_like()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  post_owner_id uuid;
  liker_name text;
BEGIN
  SELECT user_id INTO post_owner_id FROM public.posts WHERE id = NEW.post_id;
  
  IF post_owner_id IS NULL OR post_owner_id = NEW.user_id THEN
    RETURN NEW;
  END IF;
  
  SELECT COALESCE(full_name, 'Користувач') INTO liker_name 
  FROM public.users WHERE id = NEW.user_id;
  
  INSERT INTO public.notifications (user_id, message, is_read, link)
  VALUES (post_owner_id, liker_name || ' вподобав(ла) вашу публікацію', false, '/post/' || NEW.post_id::text);
  
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
$function$;

CREATE OR REPLACE FUNCTION public.notify_new_comment()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  post_owner_id uuid;
  commenter_name text;
BEGIN
  SELECT user_id INTO post_owner_id FROM public.posts WHERE id = NEW.post_id;
  
  IF post_owner_id IS NULL OR post_owner_id = NEW.user_id THEN
    RETURN NEW;
  END IF;
  
  SELECT COALESCE(full_name, 'Користувач') INTO commenter_name 
  FROM public.users WHERE id = NEW.user_id;
  
  INSERT INTO public.notifications (user_id, message, is_read, link)
  VALUES (post_owner_id, commenter_name || ' прокоментував(ла) вашу публікацію', false, '/post/' || NEW.post_id::text);
  
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
$function$;
