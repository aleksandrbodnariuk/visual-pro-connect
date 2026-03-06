
-- Create categories table for dynamic category management
CREATE TABLE public.categories (
  id text PRIMARY KEY,
  name text NOT NULL,
  icon text NOT NULL DEFAULT 'Camera',
  color text NOT NULL DEFAULT 'from-blue-500 to-cyan-500',
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

-- Everyone can read categories
CREATE POLICY "Anyone can view categories"
  ON public.categories FOR SELECT
  USING (true);

-- Only admins can manage categories
CREATE POLICY "Admins can manage categories"
  ON public.categories FOR ALL
  USING (public.is_user_admin(auth.uid()));

-- Seed with existing categories
INSERT INTO public.categories (id, name, icon, color, sort_order) VALUES
  ('photographer', 'Фотографи', 'Camera', 'from-blue-500 to-cyan-500', 1),
  ('videographer', 'Відеографи', 'Video', 'from-purple-500 to-violet-500', 2),
  ('musician', 'Музиканти', 'Music', 'from-orange-500 to-amber-500', 3),
  ('host', 'Ведучі', 'Users', 'from-indigo-500 to-purple-500', 4),
  ('pyrotechnician', 'Піротехніки', 'Sparkles', 'from-red-500 to-rose-500', 5),
  ('restaurant', 'Ресторани', 'UtensilsCrossed', 'from-amber-500 to-yellow-500', 6),
  ('transport', 'Транспорт', 'Car', 'from-slate-500 to-gray-600', 7),
  ('confectionery', 'Кондитери', 'Cake', 'from-pink-400 to-rose-400', 8),
  ('florist', 'Флористи', 'Flower2', 'from-green-500 to-emerald-500', 9);
