-- Присвоюємо адміністратора як автора для постів без user_id
UPDATE posts 
SET user_id = 'c836df06-8923-468e-b4c1-9331cadbe183'
WHERE user_id IS NULL;