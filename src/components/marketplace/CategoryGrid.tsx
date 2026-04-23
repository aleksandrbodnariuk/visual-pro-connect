import { useMarketplaceCategories } from '@/hooks/marketplace/useMarketplaceCategories';
import { Briefcase, Download, Camera, Package, type LucideIcon } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

const ICONS: Record<string, LucideIcon> = { Briefcase, Download, Camera, Package };

interface CategoryGridProps {
  activeCategoryId?: string;
  onSelect: (categoryId: string) => void;
}

export function CategoryGrid({ activeCategoryId, onSelect }: CategoryGridProps) {
  const { data: categories = [] } = useMarketplaceCategories();

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {categories.map((c) => {
        const Icon = ICONS[c.icon] || Package;
        const isActive = activeCategoryId === c.id;

        return (
          <button key={c.id} type="button" onClick={() => onSelect(c.id)} className="text-left">
            <Card
              className={cn(
                'p-4 hover:shadow-md hover:border-primary/40 transition-all cursor-pointer flex flex-col items-center text-center gap-2',
                isActive && 'border-primary bg-accent/40 shadow-md'
              )}
            >
              <div className={cn('h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center', isActive && 'bg-primary/20')}>
                <Icon className="h-6 w-6 text-primary" />
              </div>
              <div className="font-medium text-sm">{c.label}</div>
            </Card>
          </button>
        );
      })}
    </div>
  );
}