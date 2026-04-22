import { useEffect, useMemo, useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { Navbar } from '@/components/layout/Navbar';
import { Sidebar } from '@/components/layout/Sidebar';
import { Button } from '@/components/ui/button';
import { Plus, Heart, Package2, Store } from 'lucide-react';
import { useMarketplaceListings } from '@/hooks/marketplace/useMarketplaceListings';
import { ListingCard } from '@/components/marketplace/ListingCard';
import { MarketplaceFilters } from '@/components/marketplace/MarketplaceFilters';
import { CategoryGrid } from '@/components/marketplace/CategoryGrid';
import { useAuth } from '@/context/AuthContext';
import type { ListingFilters } from '@/hooks/marketplace/types';

export default function Marketplace() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const createListingPath = isAuthenticated ? '/market/new' : '/auth';

  const [filters, setFilters] = useState<ListingFilters>(() => ({
    categoryId: searchParams.get('category') || undefined,
  }));

  useEffect(() => {
    document.title = 'Маркетплейс — товари, послуги, оренда';
  }, []);

  const { data: listings = [], isLoading } = useMarketplaceListings(filters);

  const showCategoriesHero = useMemo(() => !filters.categoryId && !filters.search, [filters]);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-3 md:px-4 py-4 grid grid-cols-12 gap-4">
        <Sidebar className="hidden lg:block col-span-3 sticky top-20 self-start max-h-[calc(100vh-6rem)] overflow-y-auto" />

        <main className="col-span-12 lg:col-span-9 space-y-4">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <Store className="h-6 w-6 text-primary" />
              <h1 className="text-2xl font-bold">Маркетплейс</h1>
            </div>
            <div className="flex gap-2">
              {isAuthenticated && (
                <>
                  <Button variant="outline" size="sm" asChild>
                    <Link to="/market/favorites"><Heart className="h-4 w-4 mr-1" /> Обране</Link>
                  </Button>
                  <Button variant="outline" size="sm" asChild>
                    <Link to="/market/moi"><Package2 className="h-4 w-4 mr-1" /> Мої оголошення</Link>
                  </Button>
                </>
              )}
              <Button size="sm" onClick={() => navigate(createListingPath)}>
                <Plus className="h-4 w-4 mr-1" /> Подати оголошення
              </Button>
            </div>
          </div>

          {showCategoriesHero && <CategoryGrid />}

          <MarketplaceFilters filters={filters} onChange={setFilters} />

          {isLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="aspect-square rounded-lg bg-muted animate-pulse" />
              ))}
            </div>
          ) : listings.length === 0 ? (
            <div className="text-center py-16 border-2 border-dashed rounded-lg">
              <Store className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
              <h3 className="text-lg font-semibold mb-1">Немає оголошень</h3>
              <p className="text-muted-foreground mb-4">Будьте першими, хто розмістить тут оголошення</p>
              <Button onClick={() => navigate(createListingPath)}>
                <Plus className="h-4 w-4 mr-1" /> Подати оголошення
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {listings.map((l) => <ListingCard key={l.id} listing={l} />)}
            </div>
          )}

          <div className="sticky bottom-4 z-20 flex justify-end sm:hidden pointer-events-none">
            <Button
              size="sm"
              className="pointer-events-auto shadow-lg"
              onClick={() => navigate(createListingPath)}
            >
              <Plus className="h-4 w-4 mr-1" /> Подати оголошення
            </Button>
          </div>
        </main>
      </div>
    </div>
  );
}