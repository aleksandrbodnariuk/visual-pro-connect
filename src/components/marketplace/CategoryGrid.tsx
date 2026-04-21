import { Link } from 'react-router-dom';
import { useMarketplaceCategories } from '@/hooks/marketplace/useMarketplaceCategories';
import { Briefcase, Download, Camera, Package, type LucideIcon } from 'lucide-react';
import { Card } from '@/components/ui/card';

const ICONS: Record<string, LucideIcon> = { Briefcase, Download, Camera, Package };

export function CategoryGrid() {
  const { data: categories = [] } = useMarketplaceCategories();

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {categories.map((c) => {
        const Icon = ICONS[c.icon] || Package;
        return (
          <Link key={c.id} to={`/market?category=${c.id}`}>
            <Card className="p-4 hover:shadow-md hover:border-primary/40 transition-all cursor-pointer flex flex-col items-center text-center gap-2">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Icon className="h-6 w-6 text-primary" />
              </div>
              <div className="font-medium text-sm">{c.label}</div>
            </Card>
          </Link>
        );
      })}
    </div>
  );
}