
-- Drop the recursive SELECT policy on specialist_order_participants
DROP POLICY IF EXISTS "Specialists can view order participants" ON public.specialist_order_participants;

-- Create a security definer function to check if user is participant of an order
CREATE OR REPLACE FUNCTION public.is_order_participant(_order_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.specialist_order_participants
    WHERE order_id = _order_id
      AND specialist_id = _user_id
  )
$$;

-- Create a security definer function to check if user created the order
CREATE OR REPLACE FUNCTION public.is_order_creator(_order_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.specialist_orders
    WHERE id = _order_id
      AND created_by = _user_id
  )
$$;

-- Drop the recursive SELECT policy on specialist_orders too
DROP POLICY IF EXISTS "Specialists can view relevant orders" ON public.specialist_orders;

-- Recreate specialist_orders SELECT without referencing specialist_order_participants directly
CREATE POLICY "Specialists can view relevant orders"
ON public.specialist_orders
FOR SELECT
USING (
  has_role(auth.uid(), 'specialist'::app_role)
  AND (
    created_by = auth.uid()
    OR public.is_order_participant(id, auth.uid())
  )
);

-- Recreate specialist_order_participants SELECT without referencing specialist_orders directly
CREATE POLICY "Specialists can view order participants"
ON public.specialist_order_participants
FOR SELECT
USING (
  has_role(auth.uid(), 'specialist'::app_role)
  AND (
    public.is_order_creator(order_id, auth.uid())
    OR specialist_id = auth.uid()
  )
);
