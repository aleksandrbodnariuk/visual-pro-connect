import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';
import type { ListingFilters, MarketplaceListing, MarketplaceListingWithImages } from './types';

export function useMarketplaceListings(filters: ListingFilters = {}) {
  return useQuery({
    queryKey: ['marketplace_listings', filters],
    queryFn: async (): Promise<MarketplaceListingWithImages[]> => {
      let query = (supabase as any)
        .from('marketplace_listings')
        .select('*, images:marketplace_listing_images(*)')
        .in('status', ['active', 'reserved']);

      if (filters.categoryId) query = query.eq('category_id', filters.categoryId);
      if (filters.dealType) query = query.eq('deal_type', filters.dealType);
      if (filters.condition) query = query.eq('condition', filters.condition);
      if (filters.city) query = query.ilike('city', `%${filters.city}%`);
      if (filters.minPrice !== undefined) query = query.gte('price', filters.minPrice);
      if (filters.maxPrice !== undefined) query = query.lte('price', filters.maxPrice);
      if (filters.search) {
        const s = filters.search.replace(/[%,]/g, '');
        query = query.or(`title.ilike.%${s}%,description.ilike.%${s}%`);
      }

      switch (filters.sortBy) {
        case 'price_asc': query = query.order('price', { ascending: true }); break;
        case 'price_desc': query = query.order('price', { ascending: false }); break;
        case 'popular': query = query.order('views_count', { ascending: false }); break;
        default: query = query.order('is_vip_boost', { ascending: false }).order('created_at', { ascending: false });
      }

      const { data, error } = await query.limit(60);
      if (error) throw error;
      return (data || []) as MarketplaceListingWithImages[];
    },
    staleTime: 60 * 1000,
  });
}

export function useMarketplaceListing(listingId: string | undefined) {
  return useQuery({
    queryKey: ['marketplace_listing', listingId],
    enabled: !!listingId,
    queryFn: async (): Promise<MarketplaceListingWithImages | null> => {
      const { data, error } = await (supabase as any)
        .from('marketplace_listings')
        .select('*, images:marketplace_listing_images(*), category:marketplace_categories(*)')
        .eq('id', listingId)
        .maybeSingle();
      if (error) throw error;
      // Increment view count (fire and forget)
      if (data) {
        (supabase as any).from('marketplace_listings').update({ views_count: (data.views_count || 0) + 1 }).eq('id', listingId).then(() => {});
      }
      return data as MarketplaceListingWithImages | null;
    },
  });
}

export function useMyListings() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['marketplace_my_listings', user?.id],
    enabled: !!user?.id,
    queryFn: async (): Promise<MarketplaceListingWithImages[]> => {
      const { data, error } = await (supabase as any)
        .from('marketplace_listings')
        .select('*, images:marketplace_listing_images(*)')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as MarketplaceListingWithImages[];
    },
  });
}

export function useCreateListing() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: {
      listing: Partial<MarketplaceListing>;
      imageUrls: string[];
    }) => {
      if (!user?.id) throw new Error('Не авторизовано');
      const { listing, imageUrls } = input;
      const insertPayload = {
        ...listing,
        user_id: user.id,
        cover_image_url: imageUrls[0] || null,
      };
      const { data: created, error } = await (supabase as any)
        .from('marketplace_listings')
        .insert(insertPayload)
        .select()
        .single();
      if (error) throw error;

      if (imageUrls.length > 0) {
        const imgRows = imageUrls.map((url, idx) => ({
          listing_id: created.id,
          image_url: url,
          sort_order: idx,
          is_cover: idx === 0,
        }));
        const { error: imgErr } = await (supabase as any).from('marketplace_listing_images').insert(imgRows);
        if (imgErr) throw imgErr;
      }
      return created;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['marketplace_listings'] });
      qc.invalidateQueries({ queryKey: ['marketplace_my_listings'] });
      toast.success('Оголошення опубліковано');
    },
    onError: (e: any) => toast.error(e.message || 'Помилка створення'),
  });
}

export function useUpdateListingStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await (supabase as any)
        .from('marketplace_listings')
        .update({ status })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['marketplace_listings'] });
      qc.invalidateQueries({ queryKey: ['marketplace_my_listings'] });
      qc.invalidateQueries({ queryKey: ['marketplace_listing'] });
      toast.success('Статус оновлено');
    },
    onError: (e: any) => toast.error(e.message || 'Помилка'),
  });
}

export function useDeleteListing() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from('marketplace_listings').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['marketplace_listings'] });
      qc.invalidateQueries({ queryKey: ['marketplace_my_listings'] });
      toast.success('Оголошення видалено');
    },
    onError: (e: any) => toast.error(e.message || 'Помилка видалення'),
  });
}