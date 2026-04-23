import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';
import type { ListingFilters, MarketplaceListing, MarketplaceListingWithImages } from './types';

export function useMarketplaceListings(filters: ListingFilters = {}) {
  return useQuery({
    queryKey: ['marketplace_listings', filters],
    queryFn: async (): Promise<MarketplaceListingWithImages[]> => {
      // Використовуємо FTS RPC для повнотекстового пошуку з ранжуванням
      const { data: rpcData, error: rpcErr } = await (supabase as any).rpc('search_marketplace_listings', {
        p_search: filters.search || null,
        p_category_id: filters.categoryId || null,
        p_deal_type: filters.dealType || null,
        p_condition: filters.condition || null,
        p_city: filters.city || null,
        p_min_price: filters.minPrice ?? null,
        p_max_price: filters.maxPrice ?? null,
        p_sort_by: filters.sortBy || 'newest',
        p_limit: 60,
      });
      if (rpcErr) throw rpcErr;
      const listings = (rpcData || []) as MarketplaceListing[];
      if (listings.length === 0) return [];

      // Підвантажуємо зображення окремим запитом (RLS дозволяє доступ до зображень видимих оголошень)
      const ids = listings.map((l) => l.id);
      const { data: imgs } = await (supabase as any)
        .from('marketplace_listing_images')
        .select('*')
        .in('listing_id', ids);
      const imagesByListing = new Map<string, any[]>();
      (imgs || []).forEach((img: any) => {
        const arr = imagesByListing.get(img.listing_id) || [];
        arr.push(img);
        imagesByListing.set(img.listing_id, arr);
      });
      return listings.map((l) => ({
        ...l,
        images: (imagesByListing.get(l.id) || []).sort((a, b) => a.sort_order - b.sort_order),
      })) as MarketplaceListingWithImages[];
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
      const { data: vipMembership } = await (supabase as any)
        .from('user_vip_memberships')
        .select('expires_at, is_lifetime')
        .eq('user_id', user.id)
        .maybeSingle();

      const hasActiveVip = Boolean(
        vipMembership && (vipMembership.is_lifetime || (vipMembership.expires_at && new Date(vipMembership.expires_at) > new Date()))
      );

      const insertPayload = {
        ...listing,
        user_id: user.id,
        is_vip_boost: hasActiveVip,
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