
-- Create comment_likes table for comment reactions
CREATE TABLE public.comment_likes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  comment_id UUID NOT NULL REFERENCES public.comments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  reaction_type TEXT NOT NULL DEFAULT 'like',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(comment_id, user_id)
);

-- Enable RLS
ALTER TABLE public.comment_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all comment likes" ON public.comment_likes FOR SELECT USING (true);
CREATE POLICY "Users can like comments" ON public.comment_likes FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can unlike comments" ON public.comment_likes FOR DELETE USING (user_id = auth.uid());
CREATE POLICY "Users can update their comment reactions" ON public.comment_likes FOR UPDATE USING (user_id = auth.uid());

-- Add reaction_type to post_likes (currently only heart)
ALTER TABLE public.post_likes ADD COLUMN IF NOT EXISTS reaction_type TEXT NOT NULL DEFAULT 'like';

-- Add likes_count to comments table
ALTER TABLE public.comments ADD COLUMN IF NOT EXISTS likes_count INTEGER NOT NULL DEFAULT 0;
