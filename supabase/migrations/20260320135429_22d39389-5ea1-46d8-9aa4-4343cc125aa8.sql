
-- Allow representatives to create bookings (insert into specialist_orders)
CREATE POLICY "Representatives can create bookings"
ON public.specialist_orders
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.representatives r
    WHERE r.id = specialist_orders.representative_id
      AND r.user_id = auth.uid()
  )
);

-- Allow representatives to view their own bookings
CREATE POLICY "Representatives can view own bookings"
ON public.specialist_orders
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.representatives r
    WHERE r.id = specialist_orders.representative_id
      AND r.user_id = auth.uid()
  )
);
