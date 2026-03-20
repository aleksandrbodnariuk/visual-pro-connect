
-- Validate representative hierarchy: director has no parent, manager parent must be director, representative parent must be manager or director
CREATE OR REPLACE FUNCTION public.validate_representative_hierarchy()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  parent_role app_role;
BEGIN
  -- Director cannot have a parent
  IF NEW.role = 'director' AND NEW.parent_id IS NOT NULL THEN
    RAISE EXCEPTION 'Director cannot have a parent';
  END IF;

  -- If parent_id is set, validate hierarchy
  IF NEW.parent_id IS NOT NULL THEN
    SELECT role INTO parent_role FROM public.representatives WHERE id = NEW.parent_id;
    
    IF parent_role IS NULL THEN
      RAISE EXCEPTION 'Parent representative not found';
    END IF;

    -- Manager can only have director as parent
    IF NEW.role = 'manager' AND parent_role != 'director' THEN
      RAISE EXCEPTION 'Manager can only have a director as parent';
    END IF;

    -- Representative can have manager or director as parent
    IF NEW.role = 'representative' AND parent_role NOT IN ('manager', 'director') THEN
      RAISE EXCEPTION 'Representative can only have a manager or director as parent';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_representative_hierarchy
  BEFORE INSERT OR UPDATE ON public.representatives
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_representative_hierarchy();
