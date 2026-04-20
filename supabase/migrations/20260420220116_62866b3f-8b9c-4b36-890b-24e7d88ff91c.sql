-- Add category column to portfolio for grouping by event type
ALTER TABLE public.portfolio
ADD COLUMN IF NOT EXISTS category text;

-- Index for filtering/grouping by category
CREATE INDEX IF NOT EXISTS idx_portfolio_user_category
ON public.portfolio(user_id, category);

-- Validation trigger: only allow whitelisted categories (or NULL)
CREATE OR REPLACE FUNCTION public.validate_portfolio_category()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.category IS NOT NULL AND NEW.category NOT IN (
    'wedding', 'graduation', 'photoshoot', 'baptism', 'engagement', 'birthday'
  ) THEN
    RAISE EXCEPTION 'Invalid portfolio category: %', NEW.category;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_portfolio_category ON public.portfolio;
CREATE TRIGGER trg_validate_portfolio_category
BEFORE INSERT OR UPDATE ON public.portfolio
FOR EACH ROW
EXECUTE FUNCTION public.validate_portfolio_category();