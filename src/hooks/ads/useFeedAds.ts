import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import type { FeedAd } from '@/lib/feedAds';

/** Лише схвалені й чинні оголошення (фільтр гарантує політика доступу). */
export function useActiveFeedAds() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['feed-ads-active', user?.id],
    enabled: !!user,
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const now = new Date().toISOString();
      const { data, error } = await (supabase as any)
        .from('feed_ads')
        .select('*')
        .eq('status', 'active')
        .lte('start_date', now)
        .gt('end_date', now)
        .limit(20);
      if (error) throw error;
      return ((data || []) as FeedAd[]).filter((a) => a.target_views == null || a.views_count < a.target_views);
    },
  });
}

export function useIsAdManager() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['is-ad-manager', user?.id],
    enabled: !!user,
    staleTime: 10 * 60_000,
    queryFn: async () => {
      const { data } = await supabase.rpc('is_ad_manager' as any, { _user_id: user!.id });
      return data === true;
    },
  });
}

const seen = new Set<string>();
export function recordAdEvent(adId: string, kind: 'view' | 'click') {
  if (kind === 'view') {
    if (seen.has(adId)) return;
    seen.add(adId);
  }
  supabase.rpc('record_feed_ad_event' as any, { _ad_id: adId, _kind: kind }).then(() => {});
}
