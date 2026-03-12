
-- Table for yearly asset valuation snapshots (immutable historical records)
CREATE TABLE public.asset_valuation_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label text NOT NULL DEFAULT '',
  total_asset_value numeric NOT NULL DEFAULT 0,
  total_shares integer NOT NULL DEFAULT 0,
  calculated_share_price numeric NOT NULL DEFAULT 0,
  notes text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.asset_valuation_snapshots ENABLE ROW LEVEL SECURITY;

-- Only admins can read
CREATE POLICY "Admins can read valuation snapshots"
  ON public.asset_valuation_snapshots FOR SELECT
  USING (public.is_user_admin(auth.uid()));

-- Only admins can insert
CREATE POLICY "Admins can insert valuation snapshots"
  ON public.asset_valuation_snapshots FOR INSERT
  WITH CHECK (public.is_user_admin(auth.uid()));

-- Only admins can delete
CREATE POLICY "Admins can delete valuation snapshots"
  ON public.asset_valuation_snapshots FOR DELETE
  USING (public.is_user_admin(auth.uid()));
