import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';
import type { MarketplaceListingWithImages } from './types';

export function useFavoriteIds() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['marketplace_favorite_ids', user?.id],
    enabled: !!user?.id,
    queryFn: async (): Promise<Set<string>> => {
      const { data, error } = await (supabase as any)
        .from('marketplace_favorites')
        .select('listing_id')
        .eq('user_id', user!.id);
      if (error) throw error;
      return new Set((data || []).map((r: any) => r.listing_id));
    },
  });
}

export function useFavoriteListings() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['marketplace_favorites_full', user?.id],
    enabled: !!user?.id,
    queryFn: async (): Promise<MarketplaceListingWithImages[]> => {
      const { data, error } = await (supabase as any)
        .from('marketplace_favorites')
        .select('listing:marketplace_listings(*, images:marketplace_listing_images(*))')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return ((data || []).map((r: any) => r.listing).filter(Boolean)) as MarketplaceListingWithImages[];
    },
  });
}

export function useToggleFavorite() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({ listingId, isFav }: { listingId: string; isFav: boolean }) => {
      if (!user?.id) throw new Error('Увійдіть, щоб додавати в обране');
      if (isFav) {
        const { error } = await (supabase as any)
          .from('marketplace_favorites')
          .delete()
          .eq('user_id', user.id)
          .eq('listing_id', listingId);
        if (error) throw error;
      } else {
        const { error } = await (supabase as any)
          .from('marketplace_favorites')
          .insert({ user_id: user.id, listing_id: listingId });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['marketplace_favorite_ids'] });
      qc.invalidateQueries({ queryKey: ['marketplace_favorites_full'] });
    },
    onError: (e: any) => toast.error(e.message || 'Помилка'),
  });
}