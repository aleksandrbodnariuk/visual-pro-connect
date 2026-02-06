-- Додати колонку parent_id для вкладених коментарів
ALTER TABLE public.comments 
ADD COLUMN IF NOT EXISTS parent_id uuid REFERENCES public.comments(id) ON DELETE CASCADE;

-- Індекс для швидкого пошуку відповідей
CREATE INDEX IF NOT EXISTS idx_comments_parent_id ON public.comments(parent_id);