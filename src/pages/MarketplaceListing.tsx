import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Navbar } from '@/components/layout/Navbar';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Heart, MapPin, Eye, MessageSquare, Phone, ArrowLeft, User as UserIcon, Trash2, Clock, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useMarketplaceListing, useUpdateListingStatus, useDeleteListing } from '@/hooks/marketplace/useMarketplaceListings';
import { useFavoriteIds, useToggleFavorite } from '@/hooks/marketplace/useMarketplaceFavorites';
import { useMyReservationForListing, useUpdateReservation, RESERVATION_STATUS_LABELS } from '@/hooks/marketplace/useMarketplaceReservations';
import { ReserveDialog } from '@/components/marketplace/ReserveDialog';
import { VipBoostToggle } from '@/components/marketplace/VipBoostToggle';
import { useToggleVipBoost } from '@/hooks/marketplace/useVipBoost';
import { CONDITION_LABELS, CURRENCY_SYMBOLS, DEAL_TYPE_LABELS, STATUS_LABELS } from '@/hooks/marketplace/types';
import { extractVideoEmbed } from '@/lib/videoEmbed';
import { cn } from '@/lib/utils';

export default function MarketplaceListing() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const { data: listing, isLoading } = useMarketplaceListing(id);
  const { data: favIds } = useFavoriteIds();
  const toggleFav = useToggleFavorite();
  const updateStatus = useUpdateListingStatus();
  const deleteListing = useDeleteListing();
  const [activeImg, setActiveImg] = useState(0);
  const [seller, setSeller] = useState<any>(null);
  const [reserveOpen, setReserveOpen] = useState(false);
  const { data: myReservation } = useMyReservationForListing(id);
  const updateReservation = useUpdateReservation();
  const toggleBoost = useToggleVipBoost();

  const isOwner = user?.id === listing?.user_id;
  const isFav = listing ? favIds?.has(listing.id) ?? false : false;

  useEffect(() => {
    if (listing) document.title = `${listing.title} — Маркетплейс`;
  }, [listing]);

  useEffect(() => {
    if (!listing?.user_id) return;
    supabase.from('users').select('id, full_name, avatar_url').eq('id', listing.user_id).maybeSingle()
      .then(({ data }) => setSeller(data));
  }, [listing?.user_id]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-3 md:px-4 py-6">
          <div className="h-96 rounded-lg bg-muted animate-pulse" />
        </div>
      </div>
    );
  }

  if (!listing) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-3 md:px-4 py-12 text-center">
          <h1 className="text-2xl font-bold mb-2">Оголошення не знайдено</h1>
          <Button asChild variant="outline"><Link to="/market"><ArrowLeft className="h-4 w-4 mr-1" /> До маркетплейсу</Link></Button>
        </div>
      </div>
    );
  }

  const images = listing.images?.length ? [...listing.images].sort((a, b) => a.sort_order - b.sort_order) : [];
  const cover = images[activeImg]?.image_url || listing.cover_image_url;

  const handleContactSeller = async () => {
    if (!isAuthenticated) { navigate('/auth'); return; }
    if (isOwner) return;
    // Open conversation in messages
    navigate(`/messages?to=${listing.user_id}&topic=${encodeURIComponent('Цікавить ваше оголошення: ' + listing.title)}`);
  };

  const handleReserveClick = () => {
    if (!isAuthenticated || !user?.id) { navigate('/auth'); return; }
    setReserveOpen(true);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-3 md:px-4 py-4 max-w-5xl">
        <Button
          variant="ghost"
          size="sm"
          className="mb-3"
          onClick={() => {
            if (window.history.length > 1) {
              navigate(-1);
            } else {
              navigate('/market');
            }
          }}
        >
          <ArrowLeft className="h-4 w-4 mr-1" /> Назад до пошуку
        </Button>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="aspect-square bg-black rounded-lg overflow-hidden flex items-center justify-center">
              {cover ? (
                <img src={cover} alt={listing.title} className="max-w-full max-h-full w-auto h-auto object-contain" />
              ) : (
                <div className="text-muted-foreground">Без фото</div>
              )}
            </div>
            {images.length > 1 && (
              <div className="grid grid-cols-5 gap-2">
                {images.map((img, i) => (
                  <button
                    key={img.id}
                    onClick={() => setActiveImg(i)}
                    className={cn(
                      'aspect-square rounded overflow-hidden border-2 bg-black flex items-center justify-center',
                      activeImg === i ? 'border-primary' : 'border-transparent'
                    )}
                  >
                    <img src={img.image_url} alt="" className="max-w-full max-h-full object-contain" />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div>
              <div className="flex items-start justify-between gap-2">
                <h1 className="text-2xl font-bold flex-1">{listing.title}</h1>
                <button
                  onClick={() => toggleFav.mutate({ listingId: listing.id, isFav })}
                  className="h-10 w-10 rounded-full bg-muted hover:bg-muted/70 flex items-center justify-center"
                >
                  <Heart className={cn('h-5 w-5', isFav ? 'fill-destructive text-destructive' : 'text-muted-foreground')} />
                </button>
              </div>
              <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                {listing.city && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{listing.city}</span>}
                <span className="flex items-center gap-1"><Eye className="h-3 w-3" />{listing.views_count} переглядів</span>
              </div>
            </div>

            <div className="text-3xl font-bold text-primary">
              {listing.price > 0 ? `${listing.price.toLocaleString('uk-UA')} ${CURRENCY_SYMBOLS[listing.currency]}` : 'Договірна'}
              {listing.is_negotiable && listing.price > 0 && (
                <span className="text-sm text-muted-foreground ml-2 font-normal">торг можливий</span>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary">{DEAL_TYPE_LABELS[listing.deal_type]}</Badge>
              <Badge variant="outline">{CONDITION_LABELS[listing.condition]}</Badge>
              {listing.status !== 'active' && <Badge>{STATUS_LABELS[listing.status]}</Badge>}
              {listing.is_vip_boost && <Badge className="bg-amber-500 hover:bg-amber-500 text-white">VIP</Badge>}
            </div>

            {listing.description && (
              <Card className="p-4">
                <h3 className="font-medium mb-2">Опис</h3>
                <p className="text-sm whitespace-pre-wrap">{listing.description}</p>
              </Card>
            )}

            {listing.video_url && (() => {
              const embed = extractVideoEmbed(listing.video_url);
              if (!embed) return null;
              if (embed.platform === 'link' || !embed.embedUrl) {
                return (
                  <Card className="p-4">
                    <h3 className="font-medium mb-2">Відео</h3>
                    <a
                      href={embed.originalUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-primary hover:underline break-all"
                    >
                      {embed.originalUrl}
                    </a>
                  </Card>
                );
              }
              return (
                <Card className="p-2 overflow-hidden">
                  <div className={cn(
                    'relative w-full overflow-hidden rounded-md bg-black',
                    embed.isVertical ? 'aspect-[9/16] max-w-sm mx-auto' : 'aspect-video'
                  )}>
                    <iframe
                      src={embed.embedUrl}
                      title="Відео оголошення"
                      className="absolute inset-0 w-full h-full"
                      frameBorder="0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  </div>
                </Card>
              );
            })()}

            {seller && (
              <Card className="p-4">
                <Link to={`/profile/${seller.id}`} className="flex items-center gap-3 hover:opacity-80">
                  <div className="h-10 w-10 rounded-full bg-muted overflow-hidden flex items-center justify-center">
                    {seller.avatar_url ? <img src={seller.avatar_url} alt="" className="w-full h-full object-cover" /> : <UserIcon className="h-5 w-5" />}
                  </div>
                  <div>
                    <div className="font-medium">{seller.full_name}</div>
                    <div className="text-xs text-muted-foreground">Продавець</div>
                  </div>
                </Link>
              </Card>
            )}

            {!isOwner && (listing.status === 'active' || listing.status === 'reserved') && (
              <div className="space-y-2">
                <Button className="w-full" size="lg" onClick={handleContactSeller}>
                  <MessageSquare className="h-4 w-4 mr-1" /> Написати продавцю
                </Button>

                {myReservation ? (
                  <Card className="p-3 space-y-2 bg-muted/30">
                    <div className="flex items-center gap-2 text-sm">
                      {myReservation.status === 'accepted'
                        ? <CheckCircle2 className="h-4 w-4 text-primary" />
                        : <Clock className="h-4 w-4 text-muted-foreground" />}
                      <span>Ваш запит: <strong>{RESERVATION_STATUS_LABELS[myReservation.status]}</strong></span>
                    </div>
                    {(myReservation.status === 'pending' || myReservation.status === 'accepted') && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full"
                        onClick={() => updateReservation.mutate({ id: myReservation.id, status: 'cancelled', listing_id: listing.id })}
                      >
                        Скасувати резервування
                      </Button>
                    )}
                  </Card>
                ) : listing.status === 'active' ? (
                  <Button variant="outline" className="w-full" onClick={handleReserveClick}>
                    Зарезервувати
                  </Button>
                ) : null}

                {listing.contact_phone && (listing.contact_method === 'phone' || listing.contact_method === 'both') && (
                  <Button variant="ghost" className="w-full" asChild>
                    <a href={`tel:${listing.contact_phone}`}><Phone className="h-4 w-4 mr-1" />{listing.contact_phone}</a>
                  </Button>
                )}
              </div>
            )}

            {isOwner && (
              <Card className="p-4 space-y-2">
                <h3 className="font-medium">Керування оголошенням</h3>
                {(listing.status === 'active' || listing.status === 'reserved') && (
                  <VipBoostToggle
                    value={listing.is_vip_boost}
                    onChange={(v) => toggleBoost.mutate({ id: listing.id, boost: v })}
                  />
                )}
                <div className="grid grid-cols-2 gap-2">
                  {listing.status === 'active' && (
                    <Button variant="outline" size="sm" onClick={() => updateStatus.mutate({ id: listing.id, status: 'sold' })}>
                      Позначити як продано
                    </Button>
                  )}
                  {listing.status === 'sold' && (
                    <Button variant="outline" size="sm" onClick={() => updateStatus.mutate({ id: listing.id, status: 'active' })}>
                      Активувати знову
                    </Button>
                  )}
                  <Button variant="outline" size="sm" onClick={() => updateStatus.mutate({ id: listing.id, status: 'archived' })}>
                    В архів
                  </Button>
                  <Button variant="destructive" size="sm" onClick={() => {
                    if (confirm('Видалити оголошення безповоротно?')) {
                      deleteListing.mutate(listing.id, { onSuccess: () => navigate('/market/moi') });
                    }
                  }}>
                    <Trash2 className="h-4 w-4 mr-1" /> Видалити
                  </Button>
                </div>
              </Card>
            )}
          </div>
        </div>
      </div>

      {!isOwner && (
        <ReserveDialog
          open={reserveOpen}
          onOpenChange={setReserveOpen}
          listingId={listing.id}
          sellerId={listing.user_id}
          listingTitle={listing.title}
        />
      )}
    </div>
  );
}