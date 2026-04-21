import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';
import type { MarketplaceReservation, MarketplaceReservationStatus } from './types';

export interface ReservationWithListing extends MarketplaceReservation {
  listing?: { id: string; title: string; price: number; currency: string; cover_image_url: string | null; status: string };
  buyer?: { id: string; full_name: string; avatar_url: string | null };
  seller?: { id: string; full_name: string; avatar_url: string | null };
}

async function enrich(rows: MarketplaceReservation[]): Promise<ReservationWithListing[]> {
  if (rows.length === 0) return [];
  const listingIds = [...new Set(rows.map((r) => r.listing_id))];
  const userIds = [...new Set(rows.flatMap((r) => [r.buyer_id, r.seller_id]))];

  const [listingsRes, usersRes] = await Promise.all([
    (supabase as any).from('marketplace_listings').select('id, title, price, currency, cover_image_url, status').in('id', listingIds),
    (supabase as any).from('users').select('id, full_name, avatar_url').in('id', userIds),
  ]);

  const lMap = new Map((listingsRes.data || []).map((l: any) => [l.id, l]));
  const uMap = new Map((usersRes.data || []).map((u: any) => [u.id, u]));

  return rows.map((r) => ({
    ...r,
    listing: lMap.get(r.listing_id) as any,
    buyer: uMap.get(r.buyer_id) as any,
    seller: uMap.get(r.seller_id) as any,
  }));
}

// Резервації, де користувач — продавець (вхідні запити)
export function useIncomingReservations() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['marketplace_reservations_incoming', user?.id],
    enabled: !!user?.id,
    queryFn: async (): Promise<ReservationWithListing[]> => {
      const { data, error } = await (supabase as any)
        .from('marketplace_reservations')
        .select('*')
        .eq('seller_id', user!.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return enrich((data || []) as MarketplaceReservation[]);
    },
  });
}

// Резервації, де користувач — покупець (мої запити)
export function useOutgoingReservations() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['marketplace_reservations_outgoing', user?.id],
    enabled: !!user?.id,
    queryFn: async (): Promise<ReservationWithListing[]> => {
      const { data, error } = await (supabase as any)
        .from('marketplace_reservations')
        .select('*')
        .eq('buyer_id', user!.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return enrich((data || []) as MarketplaceReservation[]);
    },
  });
}

// Чи є вже активний запит покупця на це оголошення
export function useMyReservationForListing(listingId: string | undefined) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['marketplace_reservation_my', listingId, user?.id],
    enabled: !!user?.id && !!listingId,
    queryFn: async (): Promise<MarketplaceReservation | null> => {
      const { data, error } = await (supabase as any)
        .from('marketplace_reservations')
        .select('*')
        .eq('listing_id', listingId)
        .eq('buyer_id', user!.id)
        .in('status', ['pending', 'accepted'])
        .maybeSingle();
      if (error) throw error;
      return data as MarketplaceReservation | null;
    },
  });
}

export function useCreateReservation() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({ listing_id, seller_id, buyer_note }: { listing_id: string; seller_id: string; buyer_note?: string }) => {
      if (!user?.id) throw new Error('Не авторизовано');
      if (user.id === seller_id) throw new Error('Не можна резервувати власне оголошення');
      const { data, error } = await (supabase as any)
        .from('marketplace_reservations')
        .insert({ listing_id, seller_id, buyer_id: user.id, status: 'pending', buyer_note: buyer_note || null })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['marketplace_reservation_my'] });
      qc.invalidateQueries({ queryKey: ['marketplace_reservations_outgoing'] });
      toast.success('Запит на резервування надіслано');
    },
    onError: (e: any) => toast.error(e.message || 'Помилка'),
  });
}

export function useUpdateReservation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      status,
      seller_note,
      listing_id,
    }: {
      id: string;
      status: MarketplaceReservationStatus;
      seller_note?: string;
      listing_id?: string;
    }) => {
      const { error } = await (supabase as any)
        .from('marketplace_reservations')
        .update({ status, seller_note: seller_note ?? undefined })
        .eq('id', id);
      if (error) throw error;

      // Авто-перемикання статусу оголошення
      if (listing_id) {
        if (status === 'accepted') {
          await (supabase as any).from('marketplace_listings').update({ status: 'reserved' }).eq('id', listing_id);
        } else if (status === 'completed') {
          await (supabase as any).from('marketplace_listings').update({ status: 'sold' }).eq('id', listing_id);
        } else if (status === 'rejected' || status === 'cancelled') {
          // Повернути в active, якщо немає інших accepted резервацій
          const { data: others } = await (supabase as any)
            .from('marketplace_reservations')
            .select('id')
            .eq('listing_id', listing_id)
            .eq('status', 'accepted');
          if (!others || others.length === 0) {
            await (supabase as any).from('marketplace_listings').update({ status: 'active' }).eq('id', listing_id);
          }
        }
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['marketplace_reservations_incoming'] });
      qc.invalidateQueries({ queryKey: ['marketplace_reservations_outgoing'] });
      qc.invalidateQueries({ queryKey: ['marketplace_reservation_my'] });
      qc.invalidateQueries({ queryKey: ['marketplace_listings'] });
      qc.invalidateQueries({ queryKey: ['marketplace_listing'] });
      qc.invalidateQueries({ queryKey: ['marketplace_my_listings'] });
      toast.success('Статус резервування оновлено');
    },
    onError: (e: any) => toast.error(e.message || 'Помилка'),
  });
}

export const RESERVATION_STATUS_LABELS: Record<MarketplaceReservationStatus, string> = {
  pending: 'Очікує',
  accepted: 'Підтверджено',
  rejected: 'Відхилено',
  completed: 'Завершено',
  cancelled: 'Скасовано',
};
