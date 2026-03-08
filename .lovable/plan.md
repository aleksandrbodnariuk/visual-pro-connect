

## Problem

The RLS policy on `specialist_order_participants` for SELECT is too restrictive:

```sql
has_role(auth.uid(), 'specialist') AND (is_order_creator(order_id, auth.uid()) OR (specialist_id = auth.uid()))
```

This means a specialist who is a participant (but not the creator) can only see **their own row**, not the full team. The admin sees everyone because of the separate "Admins full access" policy.

## Solution

Update the RLS SELECT policy to allow any participant of an order to see **all** participants of that order:

```sql
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
```

The key change: replace `specialist_id = auth.uid()` (only see own row) with `is_order_participant(order_id, auth.uid())` (see all rows for orders where you're a participant).

This is a single migration file change with no frontend code modifications needed.

