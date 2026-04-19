ALTER TABLE public.portfolio
  ADD COLUMN IF NOT EXISTS media_preview_url text,
  ADD COLUMN IF NOT EXISTS media_display_url text;

CREATE INDEX IF NOT EXISTS idx_portfolio_user_created
  ON public.portfolio (user_id, created_at DESC);