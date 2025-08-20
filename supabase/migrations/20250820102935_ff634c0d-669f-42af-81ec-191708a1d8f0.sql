-- Оновлюємо новий акаунт з email, щоб зробити його засновником
UPDATE users 
SET founder_admin = true 
WHERE phone_number = 'aleksandrbodnariuk@gmail.com';

-- Деактивуємо старий акаунт засновника з телефоном (але не видаляємо для збереження історії)
UPDATE users 
SET is_admin = false, founder_admin = false
WHERE phone_number = '0507068007' AND id != (
  SELECT id FROM users WHERE phone_number = 'aleksandrbodnariuk@gmail.com' LIMIT 1
);

-- Додаємо коментар про статус для старих акаунтів
UPDATE users 
SET full_name = full_name || ' (Старий акаунт - потрібна повторна реєстрація)'
WHERE phone_number IN ('0687068007', '0635158755', '0507068007') 
AND phone_number != 'aleksandrbodnariuk@gmail.com';