/**
 * OrderRefList — показує реквізити замовлень (дата, назва, короткий опис, сума, тестове).
 * Використовується у всіх списках виплат, щоб адмін/фахівець/акціонер/представник
 * відразу бачив, за яке саме замовлення нарахована виплата.
 */

import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { ChevronDown, ChevronRight, FlaskConical } from 'lucide-react';

interface OrderRef {
  id: string;
  title: string;
  order_date: string;
  description: string | null;
  order_amount: number | null;
  is_test: boolean;
}

// Global small cache so multiple lists on the same page don't refetch
const cache = new Map<string, OrderRef>();

async function fetchOrders(ids: string[]): Promise<OrderRef[]> {
  const missing = ids.filter(id => !cache.has(id));
  if (missing.length > 0) {
    const { data } = await (supabase as any)
      .from('specialist_orders')
      .select('id, title, order_date, description, order_amount, is_test')
      .in('id', missing);
    if (data) {
      for (const o of data as OrderRef[]) cache.set(o.id, o);
    }
  }
  return ids.map(id => cache.get(id)).filter(Boolean) as OrderRef[];
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('uk-UA');
}

interface Props {
  orderIds: string[];
  /** How many orders to show before "ще N…" collapse (default 2) */
  previewCount?: number;
  className?: string;
}

export function OrderRefList({ orderIds, previewCount = 2, className }: Props) {
  const [orders, setOrders] = useState<OrderRef[]>([]);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (orderIds.length === 0) return;
    fetchOrders(orderIds).then(rows => {
      if (!cancelled) setOrders(rows);
    });
    return () => { cancelled = true; };
  }, [orderIds.join(',')]);

  if (orderIds.length === 0) return null;

  const visible = expanded ? orders : orders.slice(0, previewCount);
  const hiddenCount = orders.length - visible.length;
  const hasTest = orders.some(o => o.is_test);

  return (
    <div className={className}>
      <div className="flex items-center gap-2 mb-1">
        <span className="text-xs font-medium text-muted-foreground">
          Замовлення ({orderIds.length}):
        </span>
        {hasTest && (
          <Badge variant="destructive" className="text-[10px] px-1.5 py-0 h-4 gap-1">
            <FlaskConical className="h-2.5 w-2.5" /> ТЕСТ
          </Badge>
        )}
      </div>
      <ul className="space-y-1">
        {visible.map(o => (
          <li
            key={o.id}
            className="text-xs rounded border border-border/60 bg-muted/30 px-2 py-1.5"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="font-medium truncate">{o.title}</span>
                  {o.is_test && (
                    <Badge variant="destructive" className="text-[9px] px-1 py-0 h-3.5">ТЕСТ</Badge>
                  )}
                </div>
                <div className="text-muted-foreground">
                  {fmtDate(o.order_date)}
                  {o.order_amount != null && (
                    <span> · {Number(o.order_amount).toFixed(2)} $</span>
                  )}
                </div>
                {o.description && (
                  <p className="text-muted-foreground mt-0.5 line-clamp-2 italic">
                    {o.description.slice(0, 140)}
                    {o.description.length > 140 ? '…' : ''}
                  </p>
                )}
              </div>
            </div>
          </li>
        ))}
      </ul>
      {orders.length > previewCount && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); setExpanded(v => !v); }}
          className="text-xs text-primary hover:underline mt-1 flex items-center gap-0.5"
        >
          {expanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
          {expanded ? 'Згорнути' : `Показати ще ${hiddenCount}`}
        </button>
      )}
      {orders.length === 0 && (
        <p className="text-xs text-muted-foreground italic">Завантаження…</p>
      )}
    </div>
  );
}