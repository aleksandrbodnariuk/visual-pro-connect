import { useEffect, useState, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Megaphone, PlayCircle, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';

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

interface FinderProfile { id: string; first_name: string | null; last_name: string | null; }

export function AdOrdersTab() {
  const [orders, setOrders] = useState<AdOrder[]>([]);
  const [finders, setFinders] = useState<Record<string, FinderProfile>>({});
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await (supabase as any)
        .from('ad_orders')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      const list = (data || []) as AdOrder[];
      setOrders(list);

      const ids = Array.from(new Set(list.map(o => o.finder_user_id)));
      if (ids.length) {
        const { data: profiles } = await (supabase as any)
          .from('profiles')
          .select('id, first_name, last_name')
          .in('id', ids);
        const map: Record<string, FinderProfile> = {};
        (profiles || []).forEach((p: any) => { map[p.id] = p; });
        setFinders(map);
      }
    } catch (err: any) {
      console.error(err);
      toast.error('Не вдалося завантажити рекламні замовлення');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleProcess = async () => {
    if (!confirmId) return;
    const id = confirmId;
    setConfirmId(null);
    setProcessingId(id);
    try {
      const { error } = await supabase.rpc('process_ad_order' as any, { p_ad_order_id: id });
      if (error) throw error;
      toast.success('Рекламне замовлення оброблено, виплати створено');
      await load();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Помилка обробки');
    } finally {
      setProcessingId(null);
    }
  };

  const finderName = (id: string) => {
    const p = finders[id];
    if (!p) return '—';
    return `${p.first_name || ''} ${p.last_name || ''}`.trim() || '—';
  };

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
          <p className="text-center text-sm text-muted-foreground py-6">Немає рекламних замовлень.</p>
        ) : (
          <div className="space-y-2">
            {orders.map(o => (
              <div key={o.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 rounded-lg border">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium truncate">{o.advertiser_name}</p>
                    <Badge variant={o.processed ? 'default' : 'secondary'}>
                      {o.processed ? 'Оброблено' : 'Очікує обробки'}
                    </Badge>
                  </div>
                  {o.advertiser_contact && (
                    <p className="text-xs text-muted-foreground truncate">{o.advertiser_contact}</p>
                  )}
                  <p className="text-sm text-muted-foreground">
                    {new Date(o.ad_date).toLocaleDateString('uk-UA')} · {Number(o.ad_price).toLocaleString('uk-UA')} грн
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Знайшов: <span className="font-medium">{finderName(o.finder_user_id)}</span>
                  </p>
                  {o.notes && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{o.notes}</p>}
                </div>
                <div className="shrink-0">
                  {!o.processed && (
                    <Button
                      size="sm"
                      onClick={() => setConfirmId(o.id)}
                      disabled={processingId === o.id}
                    >
                      {processingId === o.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <><PlayCircle className="h-4 w-4 mr-1" /> Обробити</>
                      )}
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <AlertDialog open={!!confirmId} onOpenChange={(o) => !o && setConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Обробити рекламне замовлення?</AlertDialogTitle>
            <AlertDialogDescription>
              Буде розраховано розподіл 50/30/10/10: 50% — мережі, 30% — представнику, який знайшов рекламодавця, по 10% — двом верхнім рівням. Якщо вищих рівнів немає — їх частка піде в мережу. Виплати з'являться у списку «pending».
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Скасувати</AlertDialogCancel>
            <AlertDialogAction onClick={handleProcess}>Обробити</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}