
-- 1. Ensure company_settings has exactly one row (prevent deletion of last row, prevent multiple rows)
CREATE OR REPLACE FUNCTION public.prevent_company_settings_delete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RAISE EXCEPTION 'Cannot delete company_settings record. At least one record must exist.';
  RETURN NULL;
END;
$$;

CREATE TRIGGER trg_prevent_company_settings_delete
  BEFORE DELETE ON public.company_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_company_settings_delete();

-- Prevent inserting more than one row
CREATE OR REPLACE FUNCTION public.prevent_company_settings_duplicate()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (SELECT COUNT(*) FROM public.company_settings) >= 1 THEN
    RAISE EXCEPTION 'Only one company_settings record is allowed.';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_prevent_company_settings_duplicate
  BEFORE INSERT ON public.company_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_company_settings_duplicate();

-- 2. Add unique constraint on shares.user_id (one record per user)
-- First clean up any duplicates if they exist
DELETE FROM public.shares a USING public.shares b
WHERE a.id > b.id AND a.user_id = b.user_id;

ALTER TABLE public.shares ADD CONSTRAINT shares_user_id_unique UNIQUE (user_id);

-- 3. Add check constraint for non-negative quantity using a validation trigger
CREATE OR REPLACE FUNCTION public.validate_shares_quantity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_total integer;
  max_total integer;
  other_shares integer;
BEGIN
  -- Check non-negative
  IF NEW.quantity < 0 THEN
    RAISE EXCEPTION 'Кількість акцій не може бути від''ємною' USING ERRCODE = 'check_violation';
  END IF;

  -- Get total_shares limit from company_settings
  SELECT total_shares INTO max_total FROM public.company_settings LIMIT 1;
  
  IF max_total IS NULL THEN
    RAISE EXCEPTION 'company_settings not found' USING ERRCODE = 'data_exception';
  END IF;

  -- Calculate sum of all shares EXCLUDING current user's record
  SELECT COALESCE(SUM(quantity), 0) INTO other_shares
  FROM public.shares
  WHERE user_id != NEW.user_id;

  current_total := other_shares + NEW.quantity;

  IF current_total > max_total THEN
    RAISE EXCEPTION 'Неможливо видати більше акцій, ніж визначено в компанії. Ліміт: %, вже видано: %, запитано: %', max_total, other_shares, NEW.quantity
    USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_shares_quantity
  BEFORE INSERT OR UPDATE ON public.shares
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_shares_quantity();

-- 4. Also validate when total_shares in company_settings is decreased
CREATE OR REPLACE FUNCTION public.validate_total_shares_decrease()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  issued_shares integer;
BEGIN
  -- Only check if total_shares is being decreased
  IF NEW.total_shares < OLD.total_shares THEN
    SELECT COALESCE(SUM(quantity), 0) INTO issued_shares FROM public.shares;
    
    IF NEW.total_shares < issued_shares THEN
      RAISE EXCEPTION 'Не можна зменшити загальну кількість акцій нижче вже виданих (%). Поточна сума виданих акцій: %', NEW.total_shares, issued_shares
      USING ERRCODE = 'check_violation';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_total_shares_decrease
  BEFORE UPDATE ON public.company_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_total_shares_decrease();
