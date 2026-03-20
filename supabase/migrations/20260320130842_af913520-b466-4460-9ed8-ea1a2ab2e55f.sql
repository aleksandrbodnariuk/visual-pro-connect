
-- Create representative_invites table
CREATE TABLE public.representative_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inviter_id uuid NOT NULL REFERENCES public.representatives(id) ON DELETE CASCADE,
  invited_user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted')),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (inviter_id, invited_user_id)
);

ALTER TABLE public.representative_invites ENABLE ROW LEVEL SECURITY;

-- Admins full access
CREATE POLICY "Admins can manage invites"
  ON public.representative_invites FOR ALL
  USING (is_user_admin(auth.uid()))
  WITH CHECK (is_user_admin(auth.uid()));

-- Representatives can create invites (their own)
CREATE POLICY "Representatives can create invites"
  ON public.representative_invites FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.representatives r WHERE r.id = inviter_id AND r.user_id = auth.uid())
  );

-- Users can view invites they sent or received
CREATE POLICY "Users can view own invites"
  ON public.representative_invites FOR SELECT
  USING (
    invited_user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.representatives r WHERE r.id = inviter_id AND r.user_id = auth.uid())
    OR is_user_admin(auth.uid())
  );

-- Function to accept an invite: creates representative record with parent_id
CREATE OR REPLACE FUNCTION public.accept_representative_invite(_invite_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _invite RECORD;
  _inviter RECORD;
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

  -- Check user is not already a representative
  IF EXISTS (SELECT 1 FROM public.representatives WHERE user_id = auth.uid()) THEN
    RAISE EXCEPTION 'User is already a representative';
  END IF;

  -- Get inviter info for hierarchy
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

  -- Update invite status
  UPDATE public.representative_invites SET status = 'accepted' WHERE id = _invite_id;
END;
$$;
