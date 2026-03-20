
-- 1. Update accept_representative_invite to auto-promote parent chain
CREATE OR REPLACE FUNCTION accept_representative_invite(_invite_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _invite RECORD;
  _inviter RECORD;
  _grandparent RECORD;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT * INTO _invite FROM public.representative_invites WHERE id = _invite_id FOR UPDATE;
  
  IF _invite IS NULL THEN
    RAISE EXCEPTION 'Invite not found';
  END IF;
  
  IF _invite.invited_user_id != auth.uid() THEN
    RAISE EXCEPTION 'Access denied';
  END IF;
  
  IF _invite.status != 'pending' THEN
    RAISE EXCEPTION 'Invite already processed';
  END IF;

  IF EXISTS (SELECT 1 FROM public.representatives WHERE user_id = auth.uid()) THEN
    RAISE EXCEPTION 'User is already a representative';
  END IF;

  SELECT * INTO _inviter FROM public.representatives WHERE id = _invite.inviter_id;
  IF _inviter IS NULL THEN
    RAISE EXCEPTION 'Inviter not found';
  END IF;

  -- Create representative with role=representative, parent=inviter
  INSERT INTO public.representatives (user_id, role, parent_id)
  VALUES (auth.uid(), 'representative', _invite.inviter_id);

  -- Add role to user_roles
  INSERT INTO public.user_roles (user_id, role)
  VALUES (auth.uid(), 'representative'::app_role)
  ON CONFLICT (user_id, role) DO NOTHING;

  -- AUTO-PROMOTE: inviter representative → manager
  IF _inviter.role = 'representative' THEN
    UPDATE public.representatives SET role = 'manager' WHERE id = _inviter.id;
    DELETE FROM public.user_roles WHERE user_id = _inviter.user_id AND role = 'representative'::app_role;
    INSERT INTO public.user_roles (user_id, role)
    VALUES (_inviter.user_id, 'manager'::app_role)
    ON CONFLICT (user_id, role) DO NOTHING;
    
    -- AUTO-PROMOTE: grandparent manager → director
    IF _inviter.parent_id IS NOT NULL THEN
      SELECT * INTO _grandparent FROM public.representatives WHERE id = _inviter.parent_id;
      IF _grandparent IS NOT NULL AND _grandparent.role = 'manager' THEN
        UPDATE public.representatives SET role = 'director' WHERE id = _grandparent.id;
        DELETE FROM public.user_roles WHERE user_id = _grandparent.user_id AND role = 'manager'::app_role;
        INSERT INTO public.user_roles (user_id, role)
        VALUES (_grandparent.user_id, 'director'::app_role)
        ON CONFLICT (user_id, role) DO NOTHING;
      END IF;
    END IF;
  END IF;

  -- Update invite status
  UPDATE public.representative_invites SET status = 'accepted' WHERE id = _invite_id;
END;
$$;

-- 2. Fix existing data: promote reps who have children to manager, managers who have manager-children to director
DO $$
DECLARE
  r RECORD;
BEGIN
  -- Promote representatives who have at least one child -> manager
  FOR r IN
    SELECT DISTINCT p.id, p.user_id
    FROM representatives p
    JOIN representatives c ON c.parent_id = p.id
    WHERE p.role = 'representative'
  LOOP
    UPDATE representatives SET role = 'manager' WHERE id = r.id;
    DELETE FROM user_roles WHERE user_id = r.user_id AND role = 'representative'::app_role;
    INSERT INTO user_roles (user_id, role) VALUES (r.user_id, 'manager'::app_role) ON CONFLICT (user_id, role) DO NOTHING;
  END LOOP;

  -- Promote managers who have at least one manager-child -> director
  FOR r IN
    SELECT DISTINCT p.id, p.user_id
    FROM representatives p
    JOIN representatives c ON c.parent_id = p.id
    WHERE p.role = 'manager' AND c.role = 'manager'
  LOOP
    UPDATE representatives SET role = 'director' WHERE id = r.id;
    DELETE FROM user_roles WHERE user_id = r.user_id AND role = 'manager'::app_role;
    INSERT INTO user_roles (user_id, role) VALUES (r.user_id, 'director'::app_role) ON CONFLICT (user_id, role) DO NOTHING;
  END LOOP;
END;
$$;

-- 3. RPC to get 2-level team tree (children + grandchildren)
CREATE OR REPLACE FUNCTION get_team_tree(_representative_id uuid)
RETURNS TABLE(
  id uuid,
  user_id uuid,
  role text,
  parent_id uuid,
  full_name text,
  avatar_url text,
  level int
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  -- Level 1: direct children
  SELECT
    r.id, r.user_id, r.role::text, r.parent_id,
    COALESCE(u.full_name, 'Невідомий')::text,
    COALESCE(u.avatar_url, '')::text,
    1 AS level
  FROM representatives r
  LEFT JOIN users u ON u.id = r.user_id
  WHERE r.parent_id = _representative_id

  UNION ALL

  -- Level 2: grandchildren
  SELECT
    r2.id, r2.user_id, r2.role::text, r2.parent_id,
    COALESCE(u2.full_name, 'Невідомий')::text,
    COALESCE(u2.avatar_url, '')::text,
    2 AS level
  FROM representatives r2
  LEFT JOIN users u2 ON u2.id = r2.user_id
  WHERE r2.parent_id IN (
    SELECT r1.id FROM representatives r1 WHERE r1.parent_id = _representative_id
  )

  ORDER BY level, full_name;
END;
$$;
