-- Оновлюємо права користувача з email aleksandrbodnariuk@gmail.com
UPDATE users 
SET founder_admin = true, is_admin = true, is_shareholder = true 
WHERE phone_number = 'aleksandrbodnariuk@gmail.com';