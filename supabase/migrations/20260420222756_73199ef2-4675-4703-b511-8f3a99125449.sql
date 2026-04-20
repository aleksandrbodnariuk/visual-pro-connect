CREATE OR REPLACE FUNCTION public.validate_portfolio_category()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.category IS NOT NULL AND NEW.category <> '' AND NOT EXISTS (
    SELECT 1 FROM public.portfolio_categories WHERE id = NEW.category
  ) THEN
    RAISE EXCEPTION 'Invalid portfolio category: %', NEW.category;
  END IF;
  RETURN NEW;
END;
$function$;