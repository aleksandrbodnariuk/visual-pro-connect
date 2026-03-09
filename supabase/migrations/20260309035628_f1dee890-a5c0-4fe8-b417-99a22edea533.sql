
-- Table for storing read-only calculation snapshots
CREATE TABLE public.calculation_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  period_type text NOT NULL, -- all, month, year, last30, custom
  period_label text NOT NULL,
  custom_from date,
  custom_to date,
  confirmed_orders_count integer NOT NULL,
  total_amount numeric NOT NULL DEFAULT 0,
  total_expenses numeric NOT NULL DEFAULT 0,
  total_net_profit numeric NOT NULL DEFAULT 0,
  specialists_pool_50 numeric NOT NULL DEFAULT 0,
  shareholders_pool_20 numeric NOT NULL DEFAULT 0,
  title_bonus_pool_17_5 numeric NOT NULL DEFAULT 0,
  admin_fund_12_5 numeric NOT NULL DEFAULT 0,
  share_price_usd_snapshot numeric,
  total_shares_snapshot integer,
  notes text,
  snapshot_payload jsonb NOT NULL DEFAULT '{}'::jsonb
);

-- Enable RLS
ALTER TABLE public.calculation_snapshots ENABLE ROW LEVEL SECURITY;

-- Only admins can read snapshots
CREATE POLICY "Admins can read calculation snapshots"
ON public.calculation_snapshots FOR SELECT
USING (public.is_user_admin(auth.uid()));

-- Only admins can create snapshots
CREATE POLICY "Admins can insert calculation snapshots"
ON public.calculation_snapshots FOR INSERT
WITH CHECK (public.is_user_admin(auth.uid()));

-- Only admins can delete snapshots
CREATE POLICY "Admins can delete calculation snapshots"
ON public.calculation_snapshots FOR DELETE
USING (public.is_user_admin(auth.uid()));

-- Index for common queries
CREATE INDEX idx_calculation_snapshots_created_at ON public.calculation_snapshots(created_at DESC);
