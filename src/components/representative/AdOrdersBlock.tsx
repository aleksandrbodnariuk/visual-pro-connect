import { useEffect, useState, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { Megaphone } from 'lucide-react';

interface AdOrder {
  id: string;
  advertiser_name: string;
  advertiser_contact: string | null;
  ad_price: number;
  ad_date: string;
  status: string;
  processed: boolean;
  notes: string | null;
  finder_user_id: string;
  created_at: string;
}

interface Props {
  userId: string;
  refreshKey?: number;
}

const STATUS_LABEL: Record<string, string> = {
  pending: 'Очікує обробки',
  confirmed: 'Оброблено',
  archived: 'Архів',
};

export function AdOrdersBlock({ userId, refreshKey }: Props) {
  const [orders, setOrders] = useState<AdOrder[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('ad_orders')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setOrders((data || []) as AdOrder[]);
    } catch (err) {
      console.error('Failed to load ad orders', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load, refreshKey]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base sm:text-lg flex items-center gap-2">
          <Megaphone className="h-5 w-5" /> Рекламні замовлення
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-center text-sm text-muted-foreground py-6">Завантаження...</p>
        ) : orders.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-6">Немає рекламних замовлень. Натисніть «Нова реклама» щоб додати.</p>
        ) : (
          <div className="space-y-2">
            {orders.map(o => {
              const isOwn = o.finder_user_id === userId;
              return (
                <div key={o.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-3 rounded-lg border">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium truncate">{o.advertiser_name}</p>
                      {!isOwn && <Badge variant="outline" className="text-xs">від підлеглого</Badge>}
                    </div>
                    {o.advertiser_contact && (
                      <p className="text-xs text-muted-foreground truncate">{o.advertiser_contact}</p>
                    )}
                    <p className="text-sm text-muted-foreground">
                      {new Date(o.ad_date).toLocaleDateString('uk-UA')} · {Number(o.ad_price).toLocaleString('uk-UA')} грн
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant={o.processed ? 'default' : 'secondary'}>
                      {STATUS_LABEL[o.status] || o.status}
                    </Badge>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
