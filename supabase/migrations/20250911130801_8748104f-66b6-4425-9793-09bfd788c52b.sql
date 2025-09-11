-- Fix user privacy by creating more restrictive public profile access
-- and updating existing functions to be privacy-conscious

-- First, let's create a truly minimal public profile function
CREATE OR REPLACE FUNCTION public.get_minimal_public_profiles()
RETURNS TABLE(
  id uuid, 
  full_name text, 
  avatar_url text, 
  title text,
  is_shareholder boolean
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Only return absolutely essential public information
  RETURN QUERY
  SELECT 
    u.id, u.full_name, u.avatar_url, u.title, u.is_shareholder
  FROM public.users u
  -- Exclude sensitive location, contact, and personal info
  ORDER BY u.created_at DESC;
END;
$$;

-- Create a function for detailed profile access (requires friendship or user owns profile)
CREATE OR REPLACE FUNCTION public.get_detailed_profile(target_user_id uuid)
RETURNS TABLE(
  id uuid, 
  full_name text, 
  avatar_url text, 
  banner_url text, 
  title text, 
  bio text,
  is_shareholder boolean,
  -- Only include sensitive data if user owns profile
  country text,
  city text,
  website text,
  instagram text,
  facebook text,
  viber text,
  categories text[],
  created_at timestamp without time zone
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  is_own_profile boolean;
  are_friends boolean;
BEGIN
  -- Check if user is viewing their own profile
  is_own_profile := (auth.uid() = target_user_id);
  
  -- Check if users are friends (if friend_requests table exists and users are connected)
  SELECT EXISTS(
    SELECT 1 FROM public.friend_requests 
    WHERE ((sender_id = auth.uid() AND receiver_id = target_user_id) 
           OR (sender_id = target_user_id AND receiver_id = auth.uid()))
           AND status = 'accepted'
  ) INTO are_friends;
  
  -- Return data based on access level
  RETURN QUERY
  SELECT 
    u.id, 
    u.full_name, 
    u.avatar_url, 
    u.banner_url, 
    u.title, 
    u.bio,
    u.is_shareholder,
    -- Sensitive data only for own profile or friends
    CASE WHEN (is_own_profile OR are_friends) THEN u.country ELSE NULL END,
    CASE WHEN (is_own_profile OR are_friends) THEN u.city ELSE NULL END,
    CASE WHEN (is_own_profile OR are_friends) THEN u.website ELSE NULL END,
    CASE WHEN (is_own_profile OR are_friends) THEN u.instagram ELSE NULL END,
    CASE WHEN (is_own_profile OR are_friends) THEN u.facebook ELSE NULL END,
    CASE WHEN (is_own_profile OR are_friends) THEN u.viber ELSE NULL END,
    CASE WHEN (is_own_profile OR are_friends) THEN u.categories ELSE NULL END,
    u.created_at
  FROM public.users u
  WHERE u.id = target_user_id;
END;
$$;

-- Update the existing safe public functions to be more restrictive
CREATE OR REPLACE FUNCTION public.get_safe_public_profiles()
RETURNS TABLE(
  id uuid, 
  full_name text, 
  avatar_url text, 
  title text, 
  bio text,
  is_shareholder boolean,
  created_at timestamp without time zone
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Return only basic public information, exclude sensitive contact/location data
  RETURN QUERY
  SELECT 
    u.id, u.full_name, u.avatar_url, u.title, u.bio, u.is_shareholder, u.created_at
  FROM public.users u
  -- Note: country, city, website, social media links excluded for privacy
  ORDER BY u.created_at DESC;
END;
$$;

-- Update the by_ids version too
CREATE OR REPLACE FUNCTION public.get_safe_public_profiles_by_ids(_ids uuid[])
RETURNS TABLE(
  id uuid, 
  full_name text, 
  avatar_url text, 
  title text, 
  bio text,
  is_shareholder boolean,
  created_at timestamp without time zone
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Return only basic public information, exclude sensitive contact/location data
  RETURN QUERY
  SELECT 
    u.id, u.full_name, u.avatar_url, u.title, u.bio, u.is_shareholder, u.created_at
  FROM public.users u
  WHERE u.id = ANY(_ids)
  -- Note: country, city, website, social media links excluded for privacy
  ORDER BY u.created_at DESC;
END;
$$;

-- Create a privacy-conscious search function
CREATE OR REPLACE FUNCTION public.search_users_public(search_term text)
RETURNS TABLE(
  id uuid, 
  full_name text, 
  avatar_url text, 
  title text,
  is_shareholder boolean
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Allow searching by name and title only, return minimal info
  RETURN QUERY
  SELECT 
    u.id, u.full_name, u.avatar_url, u.title, u.is_shareholder
  FROM public.users u
  WHERE 
    (u.full_name ILIKE '%' || search_term || '%' OR 
     u.title ILIKE '%' || search_term || '%')
  ORDER BY u.created_at DESC
  LIMIT 50;
END;
$$;