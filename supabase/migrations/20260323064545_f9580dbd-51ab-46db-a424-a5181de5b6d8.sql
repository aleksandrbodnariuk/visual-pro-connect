
-- Insert the missing director earning for order 7c9cdedc
-- Net profit = 500 - 20 = 480, director at 2% = 9.60
INSERT INTO public.representative_earnings (order_id, representative_id, amount, percent, role_snapshot)
VALUES (
  '7c9cdedc-e63e-4d7e-ac5e-9ce1dee2fb23',
  'c0080a3e-67f9-4042-bdf3-6b9fd84e1fec',
  9.60,
  2.00000000000000000000,
  'director'
);

-- Update the audit log to reflect the corrected representatives_total
UPDATE public.financial_audit_log 
SET representatives_total = representatives_total + 9.60
WHERE order_id = '7c9cdedc-e63e-4d7e-ac5e-9ce1dee2fb23';
