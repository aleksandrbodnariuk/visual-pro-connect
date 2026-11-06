CREATE SEQUENCE IF NOT EXISTS public.specialist_orders_number_seq;
ALTER TABLE public.specialist_orders ADD COLUMN IF NOT EXISTS order_number bigint;
WITH n AS (SELECT id, row_number() OVER (ORDER BY created_at, id) rn FROM public.specialist_orders WHERE order_number IS NULL)
UPDATE public.specialist_orders o SET order_number = n.rn FROM n WHERE o.id = n.id;
SELECT setval('public.specialist_orders_number_seq', GREATEST(COALESCE((SELECT max(order_number) FROM public.specialist_orders),0),1), (SELECT count(*)>0 FROM public.specialist_orders));
ALTER TABLE public.specialist_orders ALTER COLUMN order_number SET DEFAULT nextval('public.specialist_orders_number_seq');
ALTER TABLE public.specialist_orders ALTER COLUMN order_number SET NOT NULL;
ALTER SEQUENCE public.specialist_orders_number_seq OWNED BY public.specialist_orders.order_number;
GRANT USAGE ON SEQUENCE public.specialist_orders_number_seq TO authenticated, service_role;
CREATE UNIQUE INDEX IF NOT EXISTS specialist_orders_order_number_key ON public.specialist_orders(order_number);
CREATE OR REPLACE FUNCTION public.specialist_orders_keep_number() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.order_number := OLD.order_number; RETURN NEW; END; $$;
DROP TRIGGER IF EXISTS specialist_orders_keep_number ON public.specialist_orders;
CREATE TRIGGER specialist_orders_keep_number BEFORE UPDATE OF order_number ON public.specialist_orders FOR EACH ROW EXECUTE FUNCTION public.specialist_orders_keep_number();