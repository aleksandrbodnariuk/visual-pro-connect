
-- Add last_seen timestamp to users table
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS last_seen timestamp with time zone;

-- Create site_visits table for tracking daily visits
CREATE TABLE IF NOT EXISTS public.site_visits (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  visited_at timestamp with time zone NOT NULL DEFAULT now(),
  visit_date date NOT NULL DEFAULT CURRENT_DATE
);

-- Index for fast date-range queries
CREATE INDEX IF NOT EXISTS idx_site_visits_visit_date ON public.site_visits (visit_date);
CREATE INDEX IF NOT EXISTS idx_site_visits_user_id ON public.site_visits (user_id);

-- Enable RLS
ALTER TABLE public.site_visits ENABLE ROW LEVEL SECURITY;

-- Only admins can read visit stats
CREATE POLICY "Admins can view all visits"
  ON public.site_visits FOR SELECT
  USING (public.check_admin_access());

-- Authenticated users can insert their own visit
CREATE POLICY "Users can insert own visit"
  ON public.site_visits FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- RPC to get visit counts for admin dashboard
CREATE OR REPLACE FUNCTION public.get_visit_stats()
RETURNS TABLE(
  visits_today bigint,
  visits_month bigint,
  visits_year bigint
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.is_user_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  RETURN QUERY
  SELECT
    COUNT(*) FILTER (WHERE visit_date = CURRENT_DATE) as visits_today,
    COUNT(*) FILTER (WHERE visit_date >= date_trunc('month', CURRENT_DATE)::date) as visits_month,
    COUNT(*) FILTER (WHERE visit_date >= date_trunc('year', CURRENT_DATE)::date) as visits_year
  FROM public.site_visits;
END;
$$;

-- Update get_users_for_admin to include last_seen
DROP FUNCTION IF EXISTS public.get_users_for_admin();
CREATE OR REPLACE FUNCTION public.get_users_for_admin()
RETURNS TABLE(
  id uuid, email text, full_name text, phone_number text,
  avatar_url text, banner_url text, title text, bio text,
  country text, city text, website text, instagram text,
  facebook text, viber text, categories text[],
  created_at timestamp without time zone,
  is_admin boolean, founder_admin boolean, is_shareholder boolean,
  has_password boolean, is_blocked boolean, last_seen timestamp with time zone
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  current_user_id uuid;
  is_admin_check boolean;
BEGIN
  current_user_id := auth.uid();
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  
  is_admin_check := public.is_user_admin(current_user_id);
  IF NOT is_admin_check THEN
    RAISE EXCEPTION 'Access denied';
  END IF;
  
  RETURN QUERY
  SELECT
    u.id,
    au.email::text,
    u.full_name::text,
    CASE 
      WHEN u.phone_number IS NOT NULL AND u.phone_number NOT LIKE '%@%' AND u.phone_number != ''
      THEN u.phone_number::text
      WHEN au.raw_user_meta_data->>'phone' IS NOT NULL AND au.raw_user_meta_data->>'phone' != ''
      THEN au.raw_user_meta_data->>'phone'
      ELSE NULL 
    END as phone_number,
    u.avatar_url::text,
    u.banner_url::text,
    u.title::text,
    u.bio::text,
    u.country::text,
    u.city::text,
    u.website::text,
    u.instagram::text,
    u.facebook::text,
    u.viber::text,
    u.categories::text[],
    u.created_at,
    EXISTS(SELECT 1 FROM public.user_roles WHERE user_id = u.id AND role IN ('admin', 'founder')) as is_admin,
    EXISTS(SELECT 1 FROM public.user_roles WHERE user_id = u.id AND role = 'founder') as founder_admin,
    EXISTS(SELECT 1 FROM public.user_roles WHERE user_id = u.id AND role = 'shareholder') as is_shareholder,
    true as has_password,
    COALESCE(u.is_blocked, false) as is_blocked,
    u.last_seen
  FROM public.users u
  LEFT JOIN auth.users au ON u.id = au.id
  ORDER BY u.created_at DESC;
END;
$$;

-- RPC to record a visit + update last_seen in one call
CREATE OR REPLACE FUNCTION public.record_visit()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  uid uuid;
BEGIN
  uid := auth.uid();
  IF uid IS NULL THEN RETURN; END IF;

  -- Update last_seen
  UPDATE public.users SET last_seen = now() WHERE id = uid;

  -- Insert visit if not already recorded in last 30 minutes (avoid spam)
  IF NOT EXISTS (
    SELECT 1 FROM public.site_visits
    WHERE user_id = uid AND visited_at > now() - interval '30 minutes'
  ) THEN
    INSERT INTO public.site_visits (user_id, visit_date) VALUES (uid, CURRENT_DATE);
  END IF;
END;
$$;
