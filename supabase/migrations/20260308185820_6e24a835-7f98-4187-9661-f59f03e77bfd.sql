
-- Create company_settings table for centralized share/stock configuration
CREATE TABLE public.company_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  total_shares integer NOT NULL DEFAULT 1000,
  share_price_usd numeric NOT NULL DEFAULT 10,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Enable RLS
ALTER TABLE public.company_settings ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can read
CREATE POLICY "Authenticated users can read company settings"
  ON public.company_settings FOR SELECT
  TO authenticated
  USING (true);

-- Only admins can insert/update/delete
CREATE POLICY "Only admins can modify company settings"
  ON public.company_settings FOR ALL
  USING (public.is_user_admin(auth.uid()))
  WITH CHECK (public.is_user_admin(auth.uid()));

-- Insert default row
INSERT INTO public.company_settings (total_shares, share_price_usd) VALUES (1000, 10);
