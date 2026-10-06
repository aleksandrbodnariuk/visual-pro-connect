import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { AD_STATUS_LABELS, effectiveAdStatus, type FeedAd } from '@/lib/feedAds';
import type { ReactNode } from 'react';

const LABELS: Record<string, string> = { ...AD_STATUS_LABELS, scheduled: 'Запланована' };

export function AdStatusBadge({ ad }: { ad: FeedAd }) {
  const s = effectiveAdStatus(ad);
  const variant = s === 'active' ? 'default' : s === 'rejected' ? 'destructive' : s === 'pending_approval' ? 'secondary' : 'outline';
  return <Badge variant={variant as any}>{LABELS[s] || s}</Badge>;
}

export function AdsList({ ads, actions, empty }: { ads: FeedAd[]; actions: (ad: FeedAd) => ReactNode; empty: string }) {
  if (!ads.length) return <p className="py-8 text-center text-sm text-muted-foreground">{empty}</p>;
  return (
    <div className="space-y-3">
      {ads.map((ad) => {
        const ctr = ad.views_count ? ((ad.clicks_count / ad.views_count) * 100).toFixed(1) : '0.0';
        return (
          <Card key={ad.id}>
            <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
              {ad.media_url && <img src={ad.media_url} alt="" className="h-20 w-full rounded object-cover sm:w-28" loading="lazy" />}
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="truncate font-semibold">{ad.title}</p>
                  <AdStatusBadge ad={ad} />
                </div>
                <p className="text-xs text-muted-foreground">
                  {ad.advertiser_name} · {new Date(ad.start_date).toLocaleDateString('uk-UA')} – {new Date(ad.end_date).toLocaleDateString('uk-UA')}
                </p>
                <p className="text-sm">
                  Покази: <b>{ad.views_count}</b>{ad.target_views ? ` / ${ad.target_views}` : ''} · Переходи: <b>{ad.clicks_count}</b> · CTR: <b>{ctr}%</b>
                </p>
                {ad.status === 'rejected' && ad.rejection_reason && <p className="text-sm text-destructive">Причина: {ad.rejection_reason}</p>}
              </div>
              <div className="flex flex-wrap gap-2">{actions(ad)}</div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
