-- Fix SQL injection vulnerability in search_users_public function
-- Sanitize ILIKE wildcards and limit input length to prevent pattern injection

CREATE OR REPLACE FUNCTION public.search_users_public(search_term text)
 RETURNS TABLE(id uuid, full_name text, avatar_url text, title text, is_shareholder boolean)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  sanitized_term text;
BEGIN
  -- Escape ILIKE wildcards to prevent pattern injection
  sanitized_term := replace(replace(COALESCE(search_term, ''), '%', '\%'), '_', '\_');
  -- Limit length to prevent abuse
  sanitized_term := left(sanitized_term, 100);
  
  -- Return empty if search term is too short after sanitization
  IF length(trim(sanitized_term)) < 1 THEN
    RETURN;
  END IF;
  
  -- Allow searching by name and title only, return minimal info
  RETURN QUERY
  SELECT 
    u.id, u.full_name, u.avatar_url, u.title, u.is_shareholder
  FROM public.users u
  WHERE 
    (u.full_name ILIKE '%' || sanitized_term || '%' OR 
     u.title ILIKE '%' || sanitized_term || '%')
  ORDER BY u.created_at DESC
  LIMIT 50;
END;
$function$;