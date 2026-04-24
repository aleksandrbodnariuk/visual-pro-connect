import { useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Navbar } from '@/components/layout/Navbar';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Heart } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useFavoriteListings } from '@/hooks/marketplace/useMarketplaceFavorites';
import { ListingCard } from '@/components/marketplace/ListingCard';

export default function MarketplaceFavorites() {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const { data: listings = [], isLoading } = useFavoriteListings();

  useEffect(() => { document.title = 'Обране — Маркетплейс'; }, []);
  useEffect(() => { if (!isAuthenticated) navigate('/auth'); }, [isAuthenticated, navigate]);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-3 md:px-4 pt-20 pb-4 max-w-5xl">
        <Button variant="ghost" size="sm" asChild className="mb-3">
          <Link to="/market"><ArrowLeft className="h-4 w-4 mr-1" /> Назад до пошуку</Link>
        </Button>

        <h1 className="text-2xl font-bold mb-4 flex items-center gap-2">
          <Heart className="h-6 w-6 text-destructive" /> Обране
        </h1>

        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">Завантаження...</div>
        ) : listings.length === 0 ? (
          <div className="text-center py-12 border-2 border-dashed rounded-lg">
            <Heart className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground mb-3">Поки що нічого не додано в обране</p>
            <Button asChild><Link to="/market">Перейти до маркетплейсу</Link></Button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {listings.map((l) => <ListingCard key={l.id} listing={l} />)}
          </div>
        )}
      </div>
    </div>
  );
}