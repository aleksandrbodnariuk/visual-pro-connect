
-- Add representative_id to specialist_orders
ALTER TABLE public.specialist_orders
  ADD COLUMN representative_id uuid REFERENCES public.representatives(id) ON DELETE SET NULL;
