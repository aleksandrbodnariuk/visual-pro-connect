-- Створюємо storage buckets
INSERT INTO storage.buckets (id, name, public) VALUES ('logos', 'logos', true);
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true);
INSERT INTO storage.buckets (id, name, public) VALUES ('banners', 'banners', true);
INSERT INTO storage.buckets (id, name, public) VALUES ('portfolio', 'portfolio', true);
INSERT INTO storage.buckets (id, name, public) VALUES ('posts', 'posts', true);

-- Створюємо RLS policies для storage buckets
CREATE POLICY "Allow all operations on logos bucket" ON storage.objects
FOR ALL USING (bucket_id = 'logos');

CREATE POLICY "Allow all operations on avatars bucket" ON storage.objects
FOR ALL USING (bucket_id = 'avatars');

CREATE POLICY "Allow all operations on banners bucket" ON storage.objects
FOR ALL USING (bucket_id = 'banners');

CREATE POLICY "Allow all operations on portfolio bucket" ON storage.objects
FOR ALL USING (bucket_id = 'portfolio');

CREATE POLICY "Allow all operations on posts bucket" ON storage.objects
FOR ALL USING (bucket_id = 'posts');