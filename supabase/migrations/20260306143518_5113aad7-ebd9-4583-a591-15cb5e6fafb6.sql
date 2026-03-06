
-- Enable pg_net extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Create push_subscriptions table
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint text NOT NULL,
  p256dh text NOT NULL,
  auth text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(endpoint)
);

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Users can manage their own subscriptions
CREATE POLICY "Users can view own push subscriptions" ON public.push_subscriptions FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can insert own push subscriptions" ON public.push_subscriptions FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own push subscriptions" ON public.push_subscriptions FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Users can delete own push subscriptions" ON public.push_subscriptions FOR DELETE USING (user_id = auth.uid());

-- Trigger function to notify on new messages via edge function
CREATE OR REPLACE FUNCTION public.notify_new_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Call the edge function to send push notification to receiver
  PERFORM net.http_post(
    url := 'https://cxdkaxjeibqdmpvozirz.supabase.co/functions/v1/send-push-notification',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN4ZGtheGplaWJxZG1wdm96aXJ6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ4MzUxMzcsImV4cCI6MjA2MDQxMTEzN30.mjqEyiJX59YLQpjb-_N4qS_3byUY_zpgS2g6X5xqM2U'
    ),
    body := jsonb_build_object(
      'user_id', NEW.receiver_id::text,
      'title', 'Нове повідомлення',
      'body', LEFT(NEW.content, 100),
      'url', '/messages'
    )
  );
  RETURN NEW;
END;
$$;

-- Trigger on messages table
CREATE TRIGGER on_new_message_push_notify
  AFTER INSERT ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_new_message();
