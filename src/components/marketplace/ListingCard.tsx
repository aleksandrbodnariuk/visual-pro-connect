import { Link } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Heart, MapPin, Eye, Crown } from 'lucide-react';
import { CONDITION_LABELS, CURRENCY_SYMBOLS, STATUS_LABELS, type MarketplaceListingWithImages } from '@/hooks/marketplace/types';
import { useFavoriteIds, useToggleFavorite } from '@/hooks/marketplace/useMarketplaceFavorites';
import { cn } from '@/lib/utils';

interface Props {
  listing: MarketplaceListingWithImages;
}

export function ListingCard({ listing }: Props) {
  const { data: favIds } = useFavoriteIds();
  const toggleFav = useToggleFavorite();
  const isFav = favIds?.has(listing.id) ?? false;

  const cover = listing.cover_image_url || listing.images?.[0]?.image_url;
  const isReserved = listing.status === 'reserved';
  const isVip = listing.is_vip_boost;

  return (
    <Card
      className={cn(
        'overflow-hidden hover:shadow-md transition-all group relative flex flex-col',
        isVip && 'ring-2 ring-amber-500/40 shadow-amber-500/10 shadow-lg hover:shadow-amber-500/20'
      )}
    >
      <Link to={`/market/${listing.id}`} className="block">
        <div className="aspect-square bg-muted relative overflow-hidden">
          {cover ? (
            <img
              src={cover}
              alt={listing.title}
              loading="lazy"
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted-foreground text-sm">
              Без фото
            </div>
          )}
          {isVip && (
            <Badge className="absolute top-2 left-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-500 hover:to-amber-600 text-white border-0 shadow-md gap-1">
              <Crown className="h-3 w-3" /> VIP
            </Badge>
          )}
          {isReserved && (
            <Badge variant="secondary" className="absolute bottom-2 left-2">{STATUS_LABELS.reserved}</Badge>
          )}
        </div>
      </Link>

      <button
        type="button"
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleFav.mutate({ listingId: listing.id, isFav }); }}
        className="absolute top-2 right-2 h-8 w-8 rounded-full bg-background/80 backdrop-blur flex items-center justify-center hover:bg-background transition-colors"
        aria-label={isFav ? 'Прибрати з обраного' : 'Додати в обране'}
      >
        <Heart className={cn('h-4 w-4', isFav ? 'fill-destructive text-destructive' : 'text-muted-foreground')} />
      </button>

      <div className="p-3 flex-1 flex flex-col gap-1">
        <Link to={`/market/${listing.id}`} className="font-medium line-clamp-2 hover:text-primary transition-colors">
          {listing.title}
        </Link>
        <div className="text-lg font-semibold text-primary">
          {listing.price > 0 ? `${listing.price.toLocaleString('uk-UA')} ${CURRENCY_SYMBOLS[listing.currency]}` : 'Договірна'}
          {listing.is_negotiable && listing.price > 0 && (
            <span className="text-xs text-muted-foreground ml-1">торг</span>
          )}
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-auto pt-1">
          {listing.city && (
            <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{listing.city}</span>
          )}
          <span className="flex items-center gap-1"><Eye className="h-3 w-3" />{listing.views_count}</span>
          <Badge variant="outline" className="ml-auto text-xs">{CONDITION_LABELS[listing.condition]}</Badge>
        </div>
      </div>
    </Card>
  );
}