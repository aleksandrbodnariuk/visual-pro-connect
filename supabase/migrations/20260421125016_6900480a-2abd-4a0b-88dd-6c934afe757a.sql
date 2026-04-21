-- RPC для повнотекстового пошуку оголошень з ранжуванням
CREATE OR REPLACE FUNCTION public.search_marketplace_listings(
  p_search text DEFAULT NULL,
  p_category_id text DEFAULT NULL,
  p_deal_type text DEFAULT NULL,
  p_condition text DEFAULT NULL,
  p_city text DEFAULT NULL,
  p_min_price numeric DEFAULT NULL,
  p_max_price numeric DEFAULT NULL,
  p_sort_by text DEFAULT 'newest',
  p_limit int DEFAULT 60
)
RETURNS SETOF public.marketplace_listings
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_query tsquery;
BEGIN
  -- Підготовка tsquery з prefix-матчингом для часткових слів
  IF p_search IS NOT NULL AND length(trim(p_search)) > 0 THEN
    v_query := websearch_to_tsquery('simple', p_search);
  END IF;

  RETURN QUERY
  SELECT l.*
  FROM public.marketplace_listings l
  WHERE l.status IN ('active', 'reserved')
    AND (p_category_id IS NULL OR l.category_id = p_category_id)
    AND (p_deal_type IS NULL OR l.deal_type = p_deal_type)
    AND (p_condition IS NULL OR l.condition = p_condition)
    AND (p_city IS NULL OR l.city ILIKE '%' || p_city || '%')
    AND (p_min_price IS NULL OR l.price >= p_min_price)
    AND (p_max_price IS NULL OR l.price <= p_max_price)
    AND (
      v_query IS NULL
      OR to_tsvector('simple', coalesce(l.title, '') || ' ' || coalesce(l.description, '')) @@ v_query
    )
  ORDER BY
    -- VIP-бустинг завжди має пріоритет
    l.is_vip_boost DESC,
    -- Ранжування за релевантністю якщо є пошук
    CASE WHEN v_query IS NOT NULL
      THEN ts_rank(to_tsvector('simple', coalesce(l.title, '') || ' ' || coalesce(l.description, '')), v_query)
      ELSE 0
    END DESC,
    -- Сортування за вибором
    CASE WHEN p_sort_by = 'price_asc' THEN l.price END ASC NULLS LAST,
    CASE WHEN p_sort_by = 'price_desc' THEN l.price END DESC NULLS LAST,
    CASE WHEN p_sort_by = 'popular' THEN l.views_count END DESC NULLS LAST,
    l.created_at DESC
  LIMIT p_limit;
END;
$$;

-- Дозволити виклик усім (RLS на таблиці все одно фільтрує доступ при SELECT)
GRANT EXECUTE ON FUNCTION public.search_marketplace_listings TO anon, authenticated;