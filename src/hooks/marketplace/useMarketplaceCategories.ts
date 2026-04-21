import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { MarketplaceCategory } from './types';

export function useMarketplaceCategories() {
  return useQuery({
    queryKey: ['marketplace_categories'],
    queryFn: async (): Promise<MarketplaceCategory[]> => {
      const { data, error } = await (supabase as any)
        .from('marketplace_categories')
        .select('*')
        .eq('is_visible', true)
        .order('sort_order', { ascending: true });
      if (error) throw error;
      return (data || []) as MarketplaceCategory[];
    },
    staleTime: 10 * 60 * 1000,
  });
}