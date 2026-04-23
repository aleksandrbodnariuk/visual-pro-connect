import { useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Navbar } from '@/components/layout/Navbar';
import { Button } from '@/components/ui/button';
import { Plus, ArrowLeft, Package2, Bell, Send } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useMyListings } from '@/hooks/marketplace/useMarketplaceListings';
import { MyListingCard } from '@/components/marketplace/MyListingCard';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { IncomingReservationsList, OutgoingReservationsList } from '@/components/marketplace/ReservationsList';
import { useIncomingReservations, useOutgoingReservations } from '@/hooks/marketplace/useMarketplaceReservations';

export default function MarketplaceMine() {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const { data: listings = [], isLoading } = useMyListings();
  const { data: incoming = [] } = useIncomingReservations();
  const { data: outgoing = [] } = useOutgoingReservations();
  const hasAnyListings = listings.length > 0;

  useEffect(() => { document.title = 'Мої оголошення — Маркетплейс'; }, []);
  useEffect(() => { if (!isAuthenticated) navigate('/auth'); }, [isAuthenticated, navigate]);

  const active = listings.filter((l) => l.status === 'active' || l.status === 'reserved');
  const sold = listings.filter((l) => l.status === 'sold');
  const archived = listings.filter((l) => l.status === 'archived' || l.status === 'draft');

  const pendingIncoming = incoming.filter((r) => r.status === 'pending').length;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-3 md:px-4 pt-20 pb-4 max-w-5xl">
        <div className="flex items-center justify-between gap-2 mb-4 flex-wrap">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/market"><ArrowLeft className="h-4 w-4 mr-1" /> Маркетплейс</Link>
          </Button>
          <Button size="sm" onClick={() => navigate('/market/new')}>
            <Plus className="h-4 w-4 mr-1" /> Нове оголошення
          </Button>
        </div>

        <h1 className="text-2xl font-bold mb-4 flex items-center gap-2">
          <Package2 className="h-6 w-6" /> Мої оголошення
        </h1>

        <Tabs defaultValue="active">
          <TabsList className="flex-wrap h-auto">
            <TabsTrigger value="active">Активні ({active.length})</TabsTrigger>
            <TabsTrigger value="sold">Продані ({sold.length})</TabsTrigger>
            <TabsTrigger value="archived">Архів ({archived.length})</TabsTrigger>
            <TabsTrigger value="incoming" className="gap-1">
              <Bell className="h-3.5 w-3.5" />
              Запити на резервування ({incoming.length})
              {pendingIncoming > 0 && (
                <span className="ml-1 px-1.5 py-0.5 text-[10px] rounded-full bg-destructive text-destructive-foreground">
                  {pendingIncoming}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="outgoing" className="gap-1">
              <Send className="h-3.5 w-3.5" />
              Мої резервування ({outgoing.length})
            </TabsTrigger>
          </TabsList>

          {[
            { value: 'active', items: active },
            { value: 'sold', items: sold },
            { value: 'archived', items: archived },
          ].map(({ value, items }) => (
            <TabsContent key={value} value={value} className="mt-4">
              {isLoading ? (
                <div className="text-center py-8 text-muted-foreground">Завантаження...</div>
              ) : items.length === 0 ? (
                <div className="text-center py-12 border-2 border-dashed rounded-lg text-muted-foreground space-y-4">
                  <div>Порожньо</div>
                  {!hasAnyListings && (
                    <div className="flex justify-center">
                      <Button size="sm" onClick={() => navigate('/market/new')}>
                        <Plus className="h-4 w-4 mr-1" /> Створити оголошення
                      </Button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                  {items.map((l) => <MyListingCard key={l.id} listing={l} />)}
                </div>
              )}
            </TabsContent>
          ))}

          <TabsContent value="incoming" className="mt-4">
            <IncomingReservationsList />
          </TabsContent>
          <TabsContent value="outgoing" className="mt-4">
            <OutgoingReservationsList />
          </TabsContent>
        </Tabs>

        <div className="sticky bottom-4 z-20 flex justify-end sm:hidden pointer-events-none mt-4">
          <Button
            size="sm"
            className="pointer-events-auto shadow-lg"
            onClick={() => navigate('/market/new')}
          >
            <Plus className="h-4 w-4 mr-1" /> Нове оголошення
          </Button>
        </div>
      </div>
    </div>
  );
}