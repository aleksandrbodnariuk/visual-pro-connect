-- Удаляем старый аккаунт и обновляем новый
DELETE FROM users WHERE id = '0fe01b8e-14ed-43f3-b8e3-44be886d9966' AND full_name LIKE '%Старий акаунт%';

-- Обновляем новый аккаунт, делаем его администратором-основателем
UPDATE users 
SET 
  phone_number = '0507068007',
  founder_admin = true,
  is_admin = true,
  is_shareholder = true,
  full_name = 'Олександр Боднарюк'
WHERE id = 'c836df06-8923-468e-b4c1-9331cadbe183';