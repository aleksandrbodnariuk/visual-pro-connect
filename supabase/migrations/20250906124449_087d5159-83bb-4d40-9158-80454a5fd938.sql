-- Оновлюємо новий email акаунт для надання йому статусу засновника
UPDATE users 
SET 
  founder_admin = true,
  title = 'Імператор'
WHERE phone_number = 'aleksandrbodnariuk@gmail.com';

-- Остаточно деактивуємо старий акаунт засновника
UPDATE users 
SET 
  founder_admin = false,
  is_admin = false
WHERE phone_number = '0507068007';