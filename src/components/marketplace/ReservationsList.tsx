import { Link } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, X, MessageSquare, Package, ShoppingBag } from 'lucide-react';
import {
  useIncomingReservations,
  useOutgoingReservations,
  useUpdateReservation,
  RESERVATION_STATUS_LABELS,
  type ReservationWithListing,
} from '@/hooks/marketplace/useMarketplaceReservations';
import { CURRENCY_SYMBOLS, type MarketplaceCurrency } from '@/hooks/marketplace/types';
import { useNavigate } from 'react-router-dom';

const statusColor: Record<string, string> = {
  pending: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30',
  accepted: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30',
  rejected: 'bg-destructive/10 text-destructive border-destructive/30',
  completed: 'bg-primary/10 text-primary border-primary/30',
  cancelled: 'bg-muted text-muted-foreground border-border',
};

function ReservationCard({ r, mode }: { r: ReservationWithListing; mode: 'incoming' | 'outgoing' }) {
  const update = useUpdateReservation();
  const navigate = useNavigate();
  const counterpart = mode === 'incoming' ? r.buyer : r.seller;
  const counterpartLabel = mode === 'incoming' ? 'Покупець' : 'Продавець';
  const currency = (r.listing?.currency as MarketplaceCurrency) || 'UAH';

  return (
    <Card className="p-3 flex gap-3">
      <Link to={`/market/${r.listing_id}`} className="shrink-0">
        <div className="h-20 w-20 rounded-md bg-muted overflow-hidden">
          {r.listing?.cover_image_url ? (
            <img src={r.listing.cover_image_url} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center"><Package className="h-6 w-6 text-muted-foreground" /></div>
          )}
        </div>
      </Link>

      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-start justify-between gap-2">
          <Link to={`/market/${r.listing_id}`} className="font-medium truncate hover:text-primary">
            {r.listing?.title || 'Оголошення'}
          </Link>
          <Badge variant="outline" className={statusColor[r.status]}>
            {RESERVATION_STATUS_LABELS[r.status as keyof typeof RESERVATION_STATUS_LABELS]}
          </Badge>
        </div>
        <div className="text-sm text-muted-foreground">
          {r.listing && r.listing.price > 0 && (
            <span className="font-semibold text-foreground mr-2">
              {r.listing.price.toLocaleString('uk-UA')} {CURRENCY_SYMBOLS[currency]}
            </span>
          )}
          <span>{counterpartLabel}: <Link to={`/profile/${counterpart?.id}`} className="hover:text-primary">{counterpart?.full_name || '—'}</Link></span>
        </div>
        {r.buyer_note && <p className="text-xs text-muted-foreground line-clamp-2">«{r.buyer_note}»</p>}
        {r.seller_note && <p className="text-xs text-muted-foreground line-clamp-2 italic">Відповідь: {r.seller_note}</p>}

        <div className="flex flex-wrap gap-1.5 pt-1">
          {mode === 'incoming' && r.status === 'pending' && (
            <>
              <Button
                size="sm"
                variant="default"
                onClick={() => update.mutate({ id: r.id, status: 'accepted', listing_id: r.listing_id })}
              >
                <Check className="h-3.5 w-3.5 mr-1" /> Підтвердити
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => update.mutate({ id: r.id, status: 'rejected', listing_id: r.listing_id })}
              >
                <X className="h-3.5 w-3.5 mr-1" /> Відхилити
              </Button>
            </>
          )}
          {mode === 'incoming' && r.status === 'accepted' && (
            <Button
              size="sm"
              variant="default"
              onClick={() => update.mutate({ id: r.id, status: 'completed', listing_id: r.listing_id })}
            >
              <Check className="h-3.5 w-3.5 mr-1" /> Угоду завершено
            </Button>
          )}
          {mode === 'outgoing' && (r.status === 'pending' || r.status === 'accepted') && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => update.mutate({ id: r.id, status: 'cancelled', listing_id: r.listing_id })}
            >
              Скасувати
            </Button>
          )}
          <Button
            size="sm"
            variant="ghost"
            onClick={() =>
              navigate(`/messages?to=${counterpart?.id}&topic=${encodeURIComponent('Резервування: ' + (r.listing?.title || ''))}`)
            }
          >
            <MessageSquare className="h-3.5 w-3.5 mr-1" /> Чат
          </Button>
        </div>
      </div>
    </Card>
  );
}

export function IncomingReservationsList() {
  const { data = [], isLoading } = useIncomingReservations();
  if (isLoading) return <div className="text-center py-6 text-muted-foreground text-sm">Завантаження...</div>;
  if (data.length === 0) {
    return (
      <div className="text-center py-10 border-2 border-dashed rounded-lg text-muted-foreground text-sm">
        <ShoppingBag className="h-8 w-8 mx-auto mb-2 opacity-50" />
        Поки немає запитів на резервування ваших оголошень
      </div>
    );
  }
  return (
    <div className="space-y-2">
      {data.map((r) => <ReservationCard key={r.id} r={r} mode="incoming" />)}
    </div>
  );
}

export function OutgoingReservationsList() {
  const { data = [], isLoading } = useOutgoingReservations();
  if (isLoading) return <div className="text-center py-6 text-muted-foreground text-sm">Завантаження...</div>;
  if (data.length === 0) {
    return (
      <div className="text-center py-10 border-2 border-dashed rounded-lg text-muted-foreground text-sm">
        <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
        Ви ще не резервували жодного оголошення
      </div>
    );
  }
  return (
    <div className="space-y-2">
      {data.map((r) => <ReservationCard key={r.id} r={r} mode="outgoing" />)}
    </div>
  );
}
