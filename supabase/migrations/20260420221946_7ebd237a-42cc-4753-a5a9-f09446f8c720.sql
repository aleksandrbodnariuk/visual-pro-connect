CREATE TABLE IF NOT EXISTS public.portfolio_categories (
  id text PRIMARY KEY,
  label text NOT NULL,
  icon text NOT NULL DEFAULT 'Folder',
  sort_order integer NOT NULL DEFAULT 0,
  is_visible boolean NOT NULL DEFAULT true,
  is_system boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.portfolio_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view portfolio categories"
ON public.portfolio_categories
FOR SELECT
USING (true);

CREATE POLICY "Admins can manage portfolio categories"
ON public.portfolio_categories
FOR ALL
USING (is_user_admin(auth.uid()))
WITH CHECK (is_user_admin(auth.uid()));

CREATE OR REPLACE FUNCTION public.touch_portfolio_categories_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_portfolio_categories_updated_at
BEFORE UPDATE ON public.portfolio_categories
FOR EACH ROW
EXECUTE FUNCTION public.touch_portfolio_categories_updated_at();

INSERT INTO public.portfolio_categories (id, label, icon, sort_order, is_system) VALUES
  ('wedding', 'Весілля', 'Heart', 10, true),
  ('graduation', 'Випуск', 'GraduationCap', 20, true),
  ('photoshoot', 'Фотосесія', 'Camera', 30, true),
  ('baptism', 'Хрестини', 'Church', 40, true),
  ('engagement', 'Вінчання', 'Sparkles', 50, true),
  ('birthday', 'Дні народження', 'Cake', 60, true)
ON CONFLICT (id) DO NOTHING;