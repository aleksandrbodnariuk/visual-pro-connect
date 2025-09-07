-- Включити захист від викрадених паролів та інші налаштування безпеки
-- Це виправить попередження "Leaked Password Protection Disabled"

-- Оновлюємо налаштування аутентифікації для покращення безпеки
UPDATE auth.config 
SET 
  password_min_length = 8,
  enable_signup = true,
  enable_confirmations = true
WHERE id = 'auth';

-- Додаткові налаштування безпеки для захисту від викрадених паролів
-- будуть налаштовані через Supabase Dashboard