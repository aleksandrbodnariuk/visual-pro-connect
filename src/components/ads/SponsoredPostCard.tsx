import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Megaphone, ExternalLink } from 'lucide-react';
import type { FeedAd } from '@/lib/feedAds';
import { recordAdEvent } from '@/hooks/ads/useFeedAds';

export function SponsoredPostCard({ ad, preview = false }: { ad: Pick<FeedAd, 'id' | 'advertiser_name' | 'title' | 'description' | 'media_url' | 'cta_text' | 'cta_url'>; preview?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (preview || !ref.current) return;
    const el = ref.current;
    const obs = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting && e.intersectionRatio >= 0.5)) {
        recordAdEvent(ad.id, 'view');
        obs.disconnect();
      }
    }, { threshold: 0.5 });
    obs.observe(el);
    return () => obs.disconnect();
  }, [ad.id, preview]);

  const internal = ad.cta_url.startsWith('/');
  const onClick = () => { if (!preview) recordAdEvent(ad.id, 'click'); };
  const cta = (
    <Button className="min-h-11" size="sm">
      {ad.cta_text}
      {!internal && <ExternalLink className="ml-1 h-4 w-4" />}
    </Button>
  );

  return (
    <Card ref={ref} className="overflow-hidden">
      <CardContent className="p-0">
        <div className="flex items-center gap-3 p-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
            <Megaphone className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="truncate font-semibold">{ad.advertiser_name}</p>
            <p className="text-xs text-muted-foreground">Реклама</p>
          </div>
        </div>
        {ad.description && <p className="whitespace-pre-line break-words px-4 pb-3 text-sm">{ad.description}</p>}
        {ad.media_url && <img src={ad.media_url} alt={ad.title} loading="lazy" className="max-h-[520px] w-full object-cover" />}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t bg-muted/40 p-4">
          <p className="min-w-0 flex-1 break-words font-medium">{ad.title}</p>
          {internal ? (
            <Link to={ad.cta_url} onClick={onClick}>{cta}</Link>
          ) : (
            <a href={ad.cta_url} target="_blank" rel="noopener noreferrer sponsored" onClick={onClick}>{cta}</a>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
