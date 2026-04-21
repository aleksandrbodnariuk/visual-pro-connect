-- 1. Add new system category for photobooks
INSERT INTO public.portfolio_categories (id, label, icon, sort_order, is_visible, is_system)
VALUES ('photobook', 'Фотокниги', 'BookOpen', 35, true, true)
ON CONFLICT (id) DO UPDATE
SET label = EXCLUDED.label,
    icon = EXCLUDED.icon,
    is_system = EXCLUDED.is_system,
    is_visible = EXCLUDED.is_visible;

-- 2. Reassign existing photobook samples (currently uncategorized) to the new category
UPDATE public.portfolio
SET category = 'photobook'
WHERE (category IS NULL OR category = '')
  AND media_type = 'photo'
  AND (
    title ILIKE '%фотокниг%'
    OR title ILIKE '%розворот%'
    OR title ILIKE '%обкладенк%'
    OR title ILIKE '%обкладинк%'
    OR title ILIKE '%планшет%'
  );