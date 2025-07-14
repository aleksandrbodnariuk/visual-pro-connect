-- Створюємо функцію для встановлення контексту поточного користувача
CREATE OR REPLACE FUNCTION public.set_current_user_context(user_uuid uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Встановлюємо UUID як текст для використання в auth.uid()
  PERFORM set_config('request.jwt.claims', json_build_object('sub', user_uuid::text)::text, true);
END;
$$;