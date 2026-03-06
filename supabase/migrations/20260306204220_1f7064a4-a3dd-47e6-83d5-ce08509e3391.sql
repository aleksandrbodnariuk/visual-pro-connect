
-- Table: specialist_orders
CREATE TABLE public.specialist_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  order_type text NOT NULL DEFAULT 'other',
  order_date date NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  price numeric,
  notes text,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Table: specialist_order_participants
CREATE TABLE public.specialist_order_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.specialist_orders(id) ON DELETE CASCADE,
  specialist_id uuid NOT NULL,
  role text NOT NULL DEFAULT 'other',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(order_id, specialist_id)
);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION public.update_specialist_order_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER specialist_orders_updated_at
  BEFORE UPDATE ON public.specialist_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.update_specialist_order_updated_at();

-- Enable RLS
ALTER TABLE public.specialist_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.specialist_order_participants ENABLE ROW LEVEL SECURITY;

-- Realtime
ALTER TABLE public.specialist_orders REPLICA IDENTITY FULL;
ALTER TABLE public.specialist_order_participants REPLICA IDENTITY FULL;

-- RLS: specialist_orders
-- Admins full access
CREATE POLICY "Admins full access specialist_orders"
ON public.specialist_orders FOR ALL
TO authenticated
USING (public.is_user_admin(auth.uid()))
WITH CHECK (public.is_user_admin(auth.uid()));

-- Specialists can view orders they created or participate in
CREATE POLICY "Specialists can view relevant orders"
ON public.specialist_orders FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'specialist') AND (
    created_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.specialist_order_participants
      WHERE order_id = specialist_orders.id AND specialist_id = auth.uid()
    )
  )
);

-- Specialists can create bookings
CREATE POLICY "Specialists can create bookings"
ON public.specialist_orders FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'specialist') AND created_by = auth.uid()
);

-- RLS: specialist_order_participants
-- Admins full access
CREATE POLICY "Admins full access order_participants"
ON public.specialist_order_participants FOR ALL
TO authenticated
USING (public.is_user_admin(auth.uid()))
WITH CHECK (public.is_user_admin(auth.uid()));

-- Specialists can view participants of orders they're involved in
CREATE POLICY "Specialists can view order participants"
ON public.specialist_order_participants FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'specialist') AND
  EXISTS (
    SELECT 1 FROM public.specialist_orders o
    WHERE o.id = specialist_order_participants.order_id
    AND (
      o.created_by = auth.uid() OR
      EXISTS (
        SELECT 1 FROM public.specialist_order_participants p2
        WHERE p2.order_id = o.id AND p2.specialist_id = auth.uid()
      )
    )
  )
);

-- Specialists can add themselves as participants to their own orders
CREATE POLICY "Specialists can add self as participant"
ON public.specialist_order_participants FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'specialist') AND specialist_id = auth.uid()
);
