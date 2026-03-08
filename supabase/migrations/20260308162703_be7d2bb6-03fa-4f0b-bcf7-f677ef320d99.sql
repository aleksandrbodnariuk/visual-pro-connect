DROP POLICY "Specialists can view order participants" ON public.specialist_order_participants;

CREATE POLICY "Specialists can view order participants"
ON public.specialist_order_participants
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'specialist'::app_role)
  AND (
    is_order_creator(order_id, auth.uid())
    OR is_order_participant(order_id, auth.uid())
  )
);