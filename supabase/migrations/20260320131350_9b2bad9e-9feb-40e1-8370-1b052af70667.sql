
-- Auto-promote representatives based on team structure
-- representative → manager: when they have at least 1 accepted invite
-- manager → director: when they have a manager in their team

CREATE OR REPLACE FUNCTION public.auto_promote_representative()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _inviter_rep RECORD;
  _inviter_has_manager boolean;
BEGIN
  -- Only trigger on accepted invites
  IF NEW.status != 'accepted' OR OLD.status = 'accepted' THEN
    RETURN NEW;
  END IF;

  -- Get the inviter's representative record
  SELECT * INTO _inviter_rep FROM public.representatives WHERE id = NEW.inviter_id;
  IF _inviter_rep IS NULL THEN
    RETURN NEW;
  END IF;

  -- Rule 1: representative with 1+ accepted invite → manager
  IF _inviter_rep.role = 'representative' THEN
    UPDATE public.representatives SET role = 'manager' WHERE id = _inviter_rep.id;
    
    -- Update user_roles: remove representative, add manager
    DELETE FROM public.user_roles WHERE user_id = _inviter_rep.user_id AND role = 'representative';
    INSERT INTO public.user_roles (user_id, role) VALUES (_inviter_rep.user_id, 'manager'::app_role)
      ON CONFLICT (user_id, role) DO NOTHING;
  END IF;

  -- Rule 2: check if inviter's parent should become director
  -- (parent has a manager in their team now)
  IF _inviter_rep.parent_id IS NOT NULL THEN
    DECLARE
      _parent_rep RECORD;
    BEGIN
      SELECT * INTO _parent_rep FROM public.representatives WHERE id = _inviter_rep.parent_id;
      
      IF _parent_rep IS NOT NULL AND _parent_rep.role = 'manager' THEN
        -- Check if parent has at least one manager in their direct team
        SELECT EXISTS (
          SELECT 1 FROM public.representatives
          WHERE parent_id = _parent_rep.id AND role = 'manager'
        ) INTO _inviter_has_manager;
        
        IF _inviter_has_manager THEN
          UPDATE public.representatives SET role = 'director' WHERE id = _parent_rep.id;
          
          DELETE FROM public.user_roles WHERE user_id = _parent_rep.user_id AND role = 'manager';
          INSERT INTO public.user_roles (user_id, role) VALUES (_parent_rep.user_id, 'director'::app_role)
            ON CONFLICT (user_id, role) DO NOTHING;
        END IF;
      END IF;
    END;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_auto_promote_representative
  AFTER UPDATE ON public.representative_invites
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_promote_representative();
