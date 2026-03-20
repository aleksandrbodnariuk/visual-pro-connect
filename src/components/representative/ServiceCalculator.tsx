import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Calculator, Camera, Video, Music, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Service {
  id: string;
  name: string;
  description: string | null;
  category_id: string;
}

interface Package {
  id: string;
  name: string;
  description: string | null;
  price: number;
  service_id: string;
}

interface Category {
  id: string;
  name: string;
  icon: string;
}

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  Camera,
  Video,
  Music,
};

export function ServiceCalculator() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [packages, setPackages] = useState<Package[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedService, setSelectedService] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const [catRes, svcRes, pkgRes] = await Promise.all([
          supabase.from('categories').select('id, name, icon').eq('is_visible', true).order('sort_order'),
          supabase.from('services').select('id, name, description, category_id').eq('is_active', true).order('sort_order'),
          supabase.from('service_packages').select('id, name, description, price, service_id').eq('is_active', true).order('sort_order'),
        ]);

        setCategories(catRes.data || []);
        setServices(svcRes.data || []);
        setPackages(pkgRes.data || []);
      } catch (err) {
        console.error('Error loading services:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const filteredServices = useMemo(
    () => (selectedCategory ? services.filter((s) => s.category_id === selectedCategory) : []),
    [services, selectedCategory]
  );

  const filteredPackages = useMemo(
    () => (selectedService ? packages.filter((p) => p.service_id === selectedService) : []),
    [packages, selectedService]
  );

  const totalPrice = useMemo(
    () => filteredPackages.reduce((sum, p) => sum + Number(p.price), 0),
    [filteredPackages]
  );

  if (loading) {
    return (
      <Card>
        <CardHeader><CardTitle className="text-base sm:text-lg">Калькулятор послуг</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base sm:text-lg flex items-center gap-2">
          <Calculator className="h-5 w-5 text-muted-foreground" />
          Калькулятор послуг
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Step 1: Categories — horizontal scroll */}
        <div>
          <p className="text-xs text-muted-foreground mb-2">Оберіть категорію</p>
          <div className="overflow-x-auto -mx-3 px-3 pb-1">
            <div className="flex gap-2 min-w-max">
              {categories.map((cat) => {
                const Icon = CATEGORY_ICONS[cat.icon] || Camera;
                const isActive = selectedCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    onClick={() => {
                      setSelectedCategory(isActive ? null : cat.id);
                      setSelectedService(null);
                    }}
                    className={cn(
                      'flex items-center gap-1.5 px-3 py-2 rounded-full text-sm border transition-colors whitespace-nowrap min-h-[44px]',
                      isActive
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-card hover:bg-muted border-border'
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {cat.name}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Step 2: Services */}
        {selectedCategory && filteredServices.length > 0 && (
          <div>
            <p className="text-xs text-muted-foreground mb-2">Оберіть послугу</p>
            <div className="space-y-1.5">
              {filteredServices.map((svc) => (
                <button
                  key={svc.id}
                  onClick={() => setSelectedService(selectedService === svc.id ? null : svc.id)}
                  className={cn(
                    'w-full flex items-center justify-between p-3 rounded-lg border text-left text-sm transition-colors min-h-[44px]',
                    selectedService === svc.id
                      ? 'bg-primary/10 border-primary/30'
                      : 'hover:bg-muted'
                  )}
                >
                  <span className="font-medium truncate mr-2">{svc.name}</span>
                  <ChevronRight className={cn('h-4 w-4 text-muted-foreground transition-transform shrink-0', selectedService === svc.id && 'rotate-90')} />
                </button>
              ))}
            </div>
          </div>
        )}

        {selectedCategory && filteredServices.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-3">Немає послуг у цій категорії</p>
        )}

        {/* Step 3: Packages & Price */}
        {selectedService && filteredPackages.length > 0 && (
          <div>
            <p className="text-xs text-muted-foreground mb-2">Пакети</p>
            <div className="space-y-2">
              {filteredPackages.map((pkg) => (
                <div key={pkg.id} className="flex items-center justify-between p-3 rounded-lg border bg-muted/30 gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{pkg.name}</p>
                    {pkg.description && (
                      <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5 break-words">{pkg.description}</p>
                    )}
                  </div>
                  <Badge variant="secondary" className="tabular-nums shrink-0">
                    ${Number(pkg.price).toFixed(2)}
                  </Badge>
                </div>
              ))}
            </div>

            {filteredPackages.length > 1 && (
              <div className="flex items-center justify-between pt-3 mt-3 border-t">
                <span className="text-sm font-medium">Разом:</span>
                <span className="text-lg font-bold tabular-nums">${totalPrice.toFixed(2)}</span>
              </div>
            )}
          </div>
        )}

        {selectedService && filteredPackages.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-3">Немає пакетів для цієї послуги</p>
        )}
      </CardContent>
    </Card>
  );
}
