
ALTER TABLE public.asset_categories
  ADD COLUMN included_in_valuation boolean NOT NULL DEFAULT true;

ALTER TABLE public.asset_items
  ADD COLUMN included_in_valuation boolean NOT NULL DEFAULT true;
