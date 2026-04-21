-- Trigger function (independent, no dependency on other functions)
CREATE OR REPLACE FUNCTION public.set_marketplace_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- 1. CATEGORIES
CREATE TABLE public.marketplace_categories (
  id text PRIMARY KEY,
  parent_id text REFERENCES public.marketplace_categories(id) ON DELETE CASCADE,
  label text NOT NULL,
  icon text NOT NULL DEFAULT 'Package',
  sort_order integer NOT NULL DEFAULT 0,
  is_visible boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.marketplace_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view marketplace categories"
  ON public.marketplace_categories FOR SELECT USING (true);

CREATE POLICY "Admins can manage marketplace categories"
  ON public.marketplace_categories FOR ALL
  USING (is_user_admin(auth.uid()))
  WITH CHECK (is_user_admin(auth.uid()));

-- 2. LISTINGS
CREATE TABLE public.marketplace_listings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  category_id text NOT NULL REFERENCES public.marketplace_categories(id),
  title text NOT NULL,
  description text,
  price numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'UAH',
  is_negotiable boolean NOT NULL DEFAULT false,
  condition text NOT NULL DEFAULT 'new',
  deal_type text NOT NULL DEFAULT 'sale',
  city text,
  contact_phone text,
  contact_method text DEFAULT 'chat',
  status text NOT NULL DEFAULT 'active',
  views_count integer NOT NULL DEFAULT 0,
  is_vip_boost boolean NOT NULL DEFAULT false,
  cover_image_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_marketplace_listings_status ON public.marketplace_listings(status);
CREATE INDEX idx_marketplace_listings_category ON public.marketplace_listings(category_id);
CREATE INDEX idx_marketplace_listings_user ON public.marketplace_listings(user_id);
CREATE INDEX idx_marketplace_listings_created ON public.marketplace_listings(created_at DESC);
CREATE INDEX idx_marketplace_listings_search ON public.marketplace_listings USING gin (to_tsvector('simple', coalesce(title,'') || ' ' || coalesce(description,'')));

ALTER TABLE public.marketplace_listings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active listings"
  ON public.marketplace_listings FOR SELECT
  USING (status IN ('active','reserved','sold') OR user_id = auth.uid() OR is_user_admin(auth.uid()));

CREATE POLICY "Users can create own listings"
  ON public.marketplace_listings FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own listings"
  ON public.marketplace_listings FOR UPDATE
  USING (user_id = auth.uid() OR is_user_admin(auth.uid()))
  WITH CHECK (user_id = auth.uid() OR is_user_admin(auth.uid()));

CREATE POLICY "Users can delete own listings"
  ON public.marketplace_listings FOR DELETE
  USING (user_id = auth.uid() OR is_user_admin(auth.uid()));

CREATE TRIGGER trg_marketplace_listings_updated
  BEFORE UPDATE ON public.marketplace_listings
  FOR EACH ROW EXECUTE FUNCTION public.set_marketplace_updated_at();

-- 3. IMAGES
CREATE TABLE public.marketplace_listing_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL REFERENCES public.marketplace_listings(id) ON DELETE CASCADE,
  image_url text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  is_cover boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_marketplace_images_listing ON public.marketplace_listing_images(listing_id);

ALTER TABLE public.marketplace_listing_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view images of visible listings"
  ON public.marketplace_listing_images FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.marketplace_listings l
      WHERE l.id = listing_id
        AND (l.status IN ('active','reserved','sold') OR l.user_id = auth.uid() OR is_user_admin(auth.uid()))
    )
  );

CREATE POLICY "Owners can manage images"
  ON public.marketplace_listing_images FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.marketplace_listings l WHERE l.id = listing_id AND (l.user_id = auth.uid() OR is_user_admin(auth.uid())))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.marketplace_listings l WHERE l.id = listing_id AND (l.user_id = auth.uid() OR is_user_admin(auth.uid())))
  );

-- 4. FAVORITES
CREATE TABLE public.marketplace_favorites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  listing_id uuid NOT NULL REFERENCES public.marketplace_listings(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, listing_id)
);

CREATE INDEX idx_marketplace_favorites_user ON public.marketplace_favorites(user_id);

ALTER TABLE public.marketplace_favorites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own favorites"
  ON public.marketplace_favorites FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can add favorites"
  ON public.marketplace_favorites FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can remove own favorites"
  ON public.marketplace_favorites FOR DELETE USING (user_id = auth.uid());

-- 5. RESERVATIONS
CREATE TABLE public.marketplace_reservations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL REFERENCES public.marketplace_listings(id) ON DELETE CASCADE,
  buyer_id uuid NOT NULL,
  seller_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  buyer_note text,
  seller_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_marketplace_reservations_listing ON public.marketplace_reservations(listing_id);
CREATE INDEX idx_marketplace_reservations_buyer ON public.marketplace_reservations(buyer_id);
CREATE INDEX idx_marketplace_reservations_seller ON public.marketplace_reservations(seller_id);

ALTER TABLE public.marketplace_reservations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Buyer and seller can view reservations"
  ON public.marketplace_reservations FOR SELECT
  USING (buyer_id = auth.uid() OR seller_id = auth.uid() OR is_user_admin(auth.uid()));

CREATE POLICY "Buyers can create reservations"
  ON public.marketplace_reservations FOR INSERT WITH CHECK (buyer_id = auth.uid());

CREATE POLICY "Buyer or seller can update reservations"
  ON public.marketplace_reservations FOR UPDATE
  USING (buyer_id = auth.uid() OR seller_id = auth.uid() OR is_user_admin(auth.uid()))
  WITH CHECK (buyer_id = auth.uid() OR seller_id = auth.uid() OR is_user_admin(auth.uid()));

CREATE TRIGGER trg_marketplace_reservations_updated
  BEFORE UPDATE ON public.marketplace_reservations
  FOR EACH ROW EXECUTE FUNCTION public.set_marketplace_updated_at();

-- 6. STORAGE
INSERT INTO storage.buckets (id, name, public)
VALUES ('marketplace', 'marketplace', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Marketplace images are publicly viewable"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'marketplace');

CREATE POLICY "Authenticated users can upload to own marketplace folder"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'marketplace'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can update own marketplace files"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'marketplace'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete own marketplace files"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'marketplace'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- 7. SEED CATEGORIES
INSERT INTO public.marketplace_categories (id, label, icon, sort_order) VALUES
  ('services', 'Послуги', 'Briefcase', 1),
  ('digital', 'Цифрові товари', 'Download', 2),
  ('equipment', 'Техніка та обладнання', 'Camera', 3),
  ('rental', 'Оренда обладнання', 'Package', 4)
ON CONFLICT (id) DO NOTHING;