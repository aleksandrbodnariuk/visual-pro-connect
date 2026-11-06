/**
 * PayoutOrderFilter — пошук і вибір виплат за номером/назвою замовлення.
 * Повертає набір id замовлень, що відповідають фільтру (null = без фільтра).
 */
import { useEffect, useMemo, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, X } from 'lucide-react';
import { fetchOrders, type OrderRef } from './OrderRefList';
import { matchOrderRef } from '@/lib/orderNumber';

interface Props {
  orderIds: string[];
  onChange: (ids: Set<string> | null) => void;
}

export function PayoutOrderFilter({ orderIds, onChange }: Props) {
  const [orders, setOrders] = useState<OrderRef[]>([]);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState('all');
  const key = [...new Set(orderIds)].sort().join(',');

  useEffect(() => {
    const ids = key ? key.split(',') : [];
    fetchOrders(ids).then(rows =>
      setOrders([...rows].sort((a, b) => (b.order_number ?? 0) - (a.order_number ?? 0))),
    ).catch(() => setOrders([]));
  }, [key]);

  const result = useMemo(() => {
    if (selected !== 'all') return new Set([selected]);
    if (!query.trim()) return null;
    return new Set(orders.filter(o => matchOrderRef(o, query)).map(o => o.id));
  }, [selected, query, orders]);

  useEffect(() => { onChange(result); }, [result, onChange]);

  const active = selected !== 'all' || query.trim() !== '';

  return (
    <div className="flex flex-col sm:flex-row gap-2">
      <div className="relative flex-1 min-w-0">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={query}
          onChange={e => { setQuery(e.target.value); setSelected('all'); }}
          placeholder="Пошук: № замовлення або назва"
          className="pl-8"
        />
      </div>
      <Select value={selected} onValueChange={v => { setSelected(v); setQuery(''); }}>
        <SelectTrigger className="sm:w-80"><SelectValue placeholder="Усі замовлення" /></SelectTrigger>
        <SelectContent className="max-h-80">
          <SelectItem value="all">Усі замовлення</SelectItem>
          {orders.map(o => (
            <SelectItem key={o.id} value={o.id}>
              № {o.order_number ?? '—'} — {o.title} ({new Date(o.order_date).toLocaleDateString('uk-UA')})
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {active && (
        <Button variant="ghost" size="sm" className="h-10" onClick={() => { setQuery(''); setSelected('all'); }}>
          <X className="h-4 w-4 mr-1" /> Скинути
        </Button>
      )}
    </div>
  );
}
