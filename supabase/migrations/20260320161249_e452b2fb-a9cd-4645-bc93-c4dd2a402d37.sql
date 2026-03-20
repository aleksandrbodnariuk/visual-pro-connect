
CREATE OR REPLACE FUNCTION validate_representative_hierarchy()
RETURNS TRIGGER AS $$
DECLARE
  parent_role app_role;
BEGIN
  IF NEW.parent_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT role INTO parent_role
  FROM representatives
  WHERE id = NEW.parent_id;

  IF parent_role IS NULL THEN
    RAISE EXCEPTION 'Parent representative not found';
  END IF;

  -- Representatives and managers can have any role as parent
  IF NEW.role IN ('representative', 'manager') THEN
    RETURN NEW;
  END IF;

  -- Directors cannot have a parent
  IF NEW.role = 'director' THEN
    RAISE EXCEPTION 'Director cannot have a parent';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
