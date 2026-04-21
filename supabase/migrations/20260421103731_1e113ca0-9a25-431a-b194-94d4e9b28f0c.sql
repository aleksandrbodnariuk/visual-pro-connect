UPDATE public.user_certificates 
SET is_active = true, discount_value = 10, discount_type = 'fixed', updated_at = now()
WHERE user_id = '92290f24-2aee-4873-9a5f-3a5ea7fc3019';