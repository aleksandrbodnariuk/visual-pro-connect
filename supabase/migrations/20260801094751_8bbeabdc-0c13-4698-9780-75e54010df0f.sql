CREATE OR REPLACE FUNCTION public.prevent_processed_order_financial_changes()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF (NEW.order_amount IS DISTINCT FROM OLD.order_amount
      OR NEW.order_expenses IS DISTINCT FROM OLD.order_expenses)
     AND (
       EXISTS (SELECT 1 FROM public.financial_audit_log WHERE order_id = OLD.id)
       OR EXISTS (SELECT 1 FROM public.shareholder_payouts WHERE order_ids && ARRAY[OLD.id])
       OR EXISTS (SELECT 1 FROM public.representative_earnings WHERE order_id = OLD.id)
       OR EXISTS (SELECT 1 FROM public.representative_payouts WHERE order_ids && ARRAY[OLD.id])
       OR EXISTS (SELECT 1 FROM public.specialist_payouts WHERE order_id = OLD.id)
     ) THEN
    RAISE EXCEPTION 'Фінанси цього замовлення вже розподілені. Спочатку видаліть пов’язані виплати/розрахунок, потім змініть суму та виконайте розподіл повторно.';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_processed_order_financial_changes_trigger ON public.specialist_orders;
CREATE TRIGGER prevent_processed_order_financial_changes_trigger
BEFORE UPDATE OF order_amount, order_expenses ON public.specialist_orders
FOR EACH ROW EXECUTE FUNCTION public.prevent_processed_order_financial_changes();