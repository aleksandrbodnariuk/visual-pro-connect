import { Link, useLocation } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Crown, Eye, Sparkles, Pencil } from 'lucide-react';
import { CONDITION_LABELS, CURRENCY_SYMBOLS, STATUS_LABELS, type MarketplaceListingWithImages } from '@/hooks/marketplace/types';
import { useToggleVipBoost } from '@/hooks/marketplace/useVipBoost';
import { useUserVip } from '@/hooks/vip/useUserVip';
import { useAuth } from '@/context/AuthContext';
import { cn } from '@/lib/utils';

interface Props {
  listing: MarketplaceListingWithImages;
}

/**
 * Розширена картка для сторінки «Мої оголошення».
 * Показує всі дані звичайної ListingCard + швидкий перемикач VIP-бустингу для VIP-користувачів.
 */
export function MyListingCard({ listing }: Props) {
  const { user } = useAuth();
  const { vip } = useUserVip(user?.id);
  const toggleBoost = useToggleVipBoost();
  const isVip = listing.is_vip_boost;
  const cover = listing.cover_image_url || listing.images?.[0]?.image_url;
  const location = useLocation();
  const linkState = { from: location.pathname };

  return (
    <Card
      className={cn(
        'overflow-hidden flex flex-col',
        isVip && 'ring-2 ring-amber-500/40'
      )}
    >
      <Link to={`/market/${listing.id}`} state={linkState} className="block">
        <div className="aspect-square bg-muted relative overflow-hidden">
          {cover ? (
            <img src={cover} alt={listing.title} loading="lazy" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted-foreground text-sm">Без фото</div>
          )}
          {isVip && (
            <Badge className="absolute top-2 left-2 bg-gradient-to-r from-amber-500 to-amber-600 text-white border-0 shadow-md gap-1">
              <Crown className="h-3 w-3" /> VIP
            </Badge>
          )}
          <Badge variant="secondary" className="absolute top-2 right-2">{STATUS_LABELS[listing.status]}</Badge>
        </div>
      </Link>

      <div className="p-3 flex-1 flex flex-col gap-1.5">
        <Link to={`/market/${listing.id}`} state={linkState} className="font-medium line-clamp-2 hover:text-primary text-sm">
          {listing.title}
        </Link>
        <div className="text-base font-semibold text-primary">
          {listing.price > 0 ? `${listing.price.toLocaleString('uk-UA')} ${CURRENCY_SYMBOLS[listing.currency]}` : 'Договірна'}
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="flex items-center gap-1"><Eye className="h-3 w-3" />{listing.views_count}</span>
          <Badge variant="outline" className="ml-auto text-[10px] px-1.5 py-0">{CONDITION_LABELS[listing.condition]}</Badge>
        </div>

        {vip && (listing.status === 'active' || listing.status === 'reserved') && (
          <div className="flex items-center justify-between gap-2 pt-2 mt-1 border-t">
            <div className="flex items-center gap-1.5 text-xs">
              <Sparkles className="h-3.5 w-3.5 text-amber-500" />
              <span className="font-medium">VIP-буст</span>
            </div>
            <Switch
              checked={isVip}
              disabled={toggleBoost.isPending}
              onCheckedChange={(v) => toggleBoost.mutate({ id: listing.id, boost: v })}
            />
          </div>
        )}

        <Button asChild variant="outline" size="sm" className="w-full mt-2">
          <Link to={`/market/${listing.id}/edit`}>
            <Pencil className="h-3.5 w-3.5 mr-1" /> Редагувати
          </Link>
        </Button>
      </div>
    </Card>
  );
}
