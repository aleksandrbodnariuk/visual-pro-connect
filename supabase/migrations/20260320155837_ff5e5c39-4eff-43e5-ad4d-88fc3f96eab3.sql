CREATE OR REPLACE FUNCTION validate_representative_hierarchy()
RETURNS TRIGGER AS $$
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

    -- Representative can have any role as parent (representative, manager, or director)
    -- This allows representatives to invite friends and build their team
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;