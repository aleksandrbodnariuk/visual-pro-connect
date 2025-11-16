-- Крок 1: Оновити функцію get_users_for_admin() з логуванням
CREATE OR REPLACE FUNCTION public.get_users_for_admin()
RETURNS TABLE(
  id uuid,
  email text,
  full_name text,
  phone_number text,
  avatar_url text,
  banner_url text,
  title text,
  bio text,
  country text,
  city text,
  website text,
  instagram text,
  facebook text,
  viber text,
  categories text[],
  created_at timestamp without time zone,
  is_admin boolean,
  founder_admin boolean,
  is_shareholder boolean,
  has_password boolean
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  current_user_id uuid;
  is_admin_check boolean;
BEGIN
  current_user_id := auth.uid();
  
  -- Логування для діагностики
  RAISE NOTICE 'Current user ID: %', current_user_id;
  
  IF current_user_id IS NULL THEN
    RAISE NOTICE 'No authenticated user';
    RETURN;
  END IF;
  
  -- Перевіряємо, чи користувач є адміном
  is_admin_check := public.is_user_admin(current_user_id);
  RAISE NOTICE 'Is admin check: %', is_admin_check;
  
  IF NOT is_admin_check THEN
    RAISE NOTICE 'User is not admin';
    RETURN;
  END IF;
  
  RAISE NOTICE 'User is admin, returning data';
  
  RETURN QUERY
  SELECT
    u.id,
    au.email,
    u.full_name,
    u.phone_number,
    u.avatar_url,
    u.banner_url,
    u.title,
    u.bio,
    u.country,
    u.city,
    u.website,
    u.instagram,
    u.facebook,
    u.viber,
    u.categories,
    u.created_at,
    EXISTS(SELECT 1 FROM public.user_roles WHERE user_id = u.id AND role IN ('admin', 'founder')) as is_admin,
    EXISTS(SELECT 1 FROM public.user_roles WHERE user_id = u.id AND role = 'founder') as founder_admin,
    EXISTS(SELECT 1 FROM public.user_roles WHERE user_id = u.id AND role = 'shareholder') as is_shareholder,
    true as has_password
  FROM public.users u
  LEFT JOIN auth.users au ON u.id = au.id
  ORDER BY u.created_at DESC;
END;
$function$;

-- Крок 2: Створити таблицю для лайків
CREATE TABLE IF NOT EXISTS public.post_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  post_id uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(user_id, post_id)
);

-- Індекси для швидкого пошуку
CREATE INDEX IF NOT EXISTS idx_post_likes_user_id ON public.post_likes(user_id);
CREATE INDEX IF NOT EXISTS idx_post_likes_post_id ON public.post_likes(post_id);

-- RLS для post_likes
ALTER TABLE public.post_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all likes"
  ON public.post_likes FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can like posts"
  ON public.post_likes FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can unlike their own likes"
  ON public.post_likes FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Тригер для оновлення лічильника лайків
CREATE OR REPLACE FUNCTION public.update_post_likes_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.posts SET likes_count = likes_count + 1 WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.posts SET likes_count = GREATEST(0, likes_count - 1) WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER post_likes_count_trigger
AFTER INSERT OR DELETE ON public.post_likes
FOR EACH ROW EXECUTE FUNCTION public.update_post_likes_count();

-- Крок 3: Створити таблицю для репостів (shares)
CREATE TABLE IF NOT EXISTS public.post_shares (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  post_id uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(user_id, post_id)
);

-- Індекси для швидкого пошуку
CREATE INDEX IF NOT EXISTS idx_post_shares_user_id ON public.post_shares(user_id);
CREATE INDEX IF NOT EXISTS idx_post_shares_post_id ON public.post_shares(post_id);

-- RLS для post_shares
ALTER TABLE public.post_shares ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all shares"
  ON public.post_shares FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can share posts"
  ON public.post_shares FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can unshare their own shares"
  ON public.post_shares FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());