import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, X } from 'lucide-react';
import { CONDITION_LABELS, DEAL_TYPE_LABELS, type ListingFilters, type MarketplaceCondition, type MarketplaceDealType } from '@/hooks/marketplace/types';
import { useMarketplaceCategories } from '@/hooks/marketplace/useMarketplaceCategories';

interface Props {
  filters: ListingFilters;
  onChange: (next: ListingFilters) => void;
}

export function MarketplaceFilters({ filters, onChange }: Props) {
  const { data: categories = [] } = useMarketplaceCategories();

  const update = (patch: Partial<ListingFilters>) => onChange({ ...filters, ...patch });
  const reset = () => onChange({});
  const hasActive = Object.keys(filters).some((k) => (filters as any)[k] !== undefined && (filters as any)[k] !== '');

  return (
    <div className="space-y-3 p-4 rounded-lg border bg-card">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Пошук оголошень..."
          value={filters.search || ''}
          onChange={(e) => update({ search: e.target.value || undefined })}
          className="pl-9"
        />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-2">
        <Select value={filters.categoryId || 'all'} onValueChange={(v) => update({ categoryId: v === 'all' ? undefined : v })}>
          <SelectTrigger><SelectValue placeholder="Категорія" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Усі категорії</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filters.dealType || 'all'} onValueChange={(v) => update({ dealType: v === 'all' ? undefined : (v as MarketplaceDealType) })}>
          <SelectTrigger><SelectValue placeholder="Тип угоди" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Будь-який</SelectItem>
            {Object.entries(DEAL_TYPE_LABELS).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filters.condition || 'all'} onValueChange={(v) => update({ condition: v === 'all' ? undefined : (v as MarketplaceCondition) })}>
          <SelectTrigger><SelectValue placeholder="Стан" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Будь-який</SelectItem>
            {Object.entries(CONDITION_LABELS).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Input
          type="number"
          placeholder="Ціна від"
          value={filters.minPrice ?? ''}
          onChange={(e) => update({ minPrice: e.target.value ? Number(e.target.value) : undefined })}
        />
        <Input
          type="number"
          placeholder="Ціна до"
          value={filters.maxPrice ?? ''}
          onChange={(e) => update({ maxPrice: e.target.value ? Number(e.target.value) : undefined })}
        />
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <Input
          placeholder="Місто"
          value={filters.city || ''}
          onChange={(e) => update({ city: e.target.value || undefined })}
          className="max-w-[200px]"
        />
        <Select value={filters.sortBy || 'newest'} onValueChange={(v) => update({ sortBy: v as ListingFilters['sortBy'] })}>
          <SelectTrigger className="max-w-[200px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">Спочатку нові</SelectItem>
            <SelectItem value="price_asc">Дешевші</SelectItem>
            <SelectItem value="price_desc">Дорожчі</SelectItem>
            <SelectItem value="popular">Популярні</SelectItem>
          </SelectContent>
        </Select>
        {hasActive && (
          <Button variant="ghost" size="sm" onClick={reset}>
            <X className="h-4 w-4 mr-1" /> Скинути
          </Button>
        )}
      </div>
    </div>
  );
}