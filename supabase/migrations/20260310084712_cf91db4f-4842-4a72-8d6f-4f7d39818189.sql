
-- Clean up unnecessary trigger and function (total_price is already a generated column)
DROP TRIGGER IF EXISTS trg_calc_asset_item_total ON public.asset_items;
DROP FUNCTION IF EXISTS public.calc_asset_item_total();
