-- Створюємо таблицю коментарів
CREATE TABLE public.comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Включаємо RLS
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

-- RLS політики для коментарів
CREATE POLICY "Authenticated users can view comments"
ON public.comments
FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can create their own comments"
ON public.comments
FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own comments"
ON public.comments
FOR DELETE
USING (user_id = auth.uid() OR is_user_admin(auth.uid()));

-- Тригер для оновлення comments_count в posts
CREATE OR REPLACE FUNCTION public.update_post_comments_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.posts SET comments_count = comments_count + 1 WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.posts SET comments_count = GREATEST(0, comments_count - 1) WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER update_comments_count_trigger
AFTER INSERT OR DELETE ON public.comments
FOR EACH ROW
EXECUTE FUNCTION public.update_post_comments_count();