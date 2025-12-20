-- Drop deprecated password-related functions that should not be used
-- These functions are a security risk as they handle passwords insecurely

-- Drop set_user_password function (stores plaintext passwords)
DROP FUNCTION IF EXISTS public.set_user_password(text, text);

-- Drop update_my_password function (stores plaintext passwords)
DROP FUNCTION IF EXISTS public.update_my_password(text, text);

-- Update validate_user_credentials to just return empty - it's deprecated
-- We keep it to avoid breaking changes but make it return nothing
CREATE OR REPLACE FUNCTION public.validate_user_credentials(_phone_number text, _input_password text)
RETURNS TABLE(
  id uuid, 
  full_name text, 
  phone_number text, 
  is_admin boolean, 
  founder_admin boolean, 
  is_shareholder boolean, 
  created_at timestamp without time zone, 
  categories text[], 
  avatar_url text, 
  bio text, 
  website text, 
  instagram text, 
  facebook text, 
  viber text, 
  banner_url text, 
  title text, 
  country text, 
  city text, 
  has_password boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- This function is deprecated - use Supabase Auth instead
  -- Returns empty result to prevent any legacy code from working
  RAISE WARNING 'validate_user_credentials is deprecated. Use Supabase Auth instead.';
  RETURN;
END;
$$;

COMMENT ON FUNCTION public.validate_user_credentials IS 'DEPRECATED: This function is no longer functional. Use Supabase Auth for authentication.';