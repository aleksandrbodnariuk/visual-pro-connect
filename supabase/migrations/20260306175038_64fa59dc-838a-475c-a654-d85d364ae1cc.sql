-- Remove duplicate triggers that cause double push notifications

-- Messages: remove duplicate trigger (keep on_new_message_notify)
DROP TRIGGER IF EXISTS on_new_message_push_notify ON public.messages;

-- Comments: remove duplicate count trigger (keep trg_update_post_comments_count)
DROP TRIGGER IF EXISTS update_comments_count_trigger ON public.comments;

-- Post likes: remove duplicate count trigger (keep trg_update_post_likes_count)  
DROP TRIGGER IF EXISTS post_likes_count_trigger ON public.post_likes;