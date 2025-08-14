-- Fix the function search path security warning
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert into users table when a new auth user is created
  INSERT INTO public.users (
    id,
    phone_number,
    full_name,
    is_admin,
    founder_admin,
    is_shareholder,
    created_at
  ) VALUES (
    NEW.id,
    COALESCE(NEW.phone, NEW.email), -- Use phone if available, otherwise email
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    CASE WHEN NEW.phone = '0507068007' THEN true ELSE false END,
    CASE WHEN NEW.phone = '0507068007' THEN true ELSE false END,
    CASE WHEN NEW.phone = '0507068007' THEN true ELSE false END,
    NOW()
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public';