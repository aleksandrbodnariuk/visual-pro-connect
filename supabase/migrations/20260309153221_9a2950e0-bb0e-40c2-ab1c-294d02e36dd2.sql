
-- Asset categories (розділи майна)
CREATE TABLE public.asset_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.asset_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage asset categories"
  ON public.asset_categories FOR ALL
  USING (public.is_user_admin(auth.uid()))
  WITH CHECK (public.is_user_admin(auth.uid()));

CREATE POLICY "Admins can read asset categories"
  ON public.asset_categories FOR SELECT
  USING (public.is_user_admin(auth.uid()));

-- Asset items (одиниці майна)
CREATE TABLE public.asset_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid NOT NULL REFERENCES public.asset_categories(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  quantity integer NOT NULL DEFAULT 1,
  unit_price numeric NOT NULL DEFAULT 0,
  total_price numeric GENERATED ALWAYS AS (quantity * unit_price) STORED,
  condition text DEFAULT 'good',
  acquired_at date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.asset_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage asset items"
  ON public.asset_items FOR ALL
  USING (public.is_user_admin(auth.uid()))
  WITH CHECK (public.is_user_admin(auth.uid()));

CREATE POLICY "Admins can read asset items"
  ON public.asset_items FOR SELECT
  USING (public.is_user_admin(auth.uid()));

-- Seed default categories
INSERT INTO public.asset_categories (name, sort_order) VALUES
  ('Музична', 1),
  ('Студія', 2),
  ('Музичний колектив', 3),
  ('Фото', 4),
  ('Відео', 5),
  ('ІТ', 6);
