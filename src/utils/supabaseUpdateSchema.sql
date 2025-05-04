

-- Додаємо поле banner_url до таблиці users, якщо воно ще не існує
ALTER TABLE users ADD COLUMN IF NOT EXISTS banner_url text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS title text;

-- Створюємо сховище для банерів, якщо воно ще не існує
INSERT INTO storage.buckets (id, name, public)
VALUES ('banners', 'banners', true)
ON CONFLICT (id) DO NOTHING;

-- Створюємо сховище для логотипів, якщо воно ще не існує
INSERT INTO storage.buckets (id, name, public)
VALUES ('logos', 'logos', true)
ON CONFLICT (id) DO NOTHING;

