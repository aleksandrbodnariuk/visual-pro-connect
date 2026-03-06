
import { SpecialistOrder, ORDER_TYPE_LABELS, ORDER_TYPE_COLORS, ORDER_TYPE_TEXT_COLORS, STATUS_LABELS } from './types';
import { format, parseISO, isSameDay } from 'date-fns';
import { uk } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';

interface Props {
  orders: SpecialistOrder[];
  selectedDate: Date | undefined;
  onSelectOrder: (order: SpecialistOrder) => void;
  selectedOrderId?: string;
}

export function OrderList({ orders, selectedDate, onSelectOrder, selectedOrderId }: Props) {
  const filtered = selectedDate
    ? orders.filter(o => isSameDay(parseISO(o.order_date), selectedDate))
    : orders;

  if (filtered.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        {selectedDate ? 'Немає замовлень на цю дату' : 'Немає замовлень'}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {filtered.map(order => (
        <Card
          key={order.id}
          className={cn(
            'p-3 cursor-pointer transition-colors hover:bg-accent/50',
            selectedOrderId === order.id && 'ring-2 ring-primary'
          )}
          onClick={() => onSelectOrder(order)}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <div className={cn('w-2.5 h-2.5 rounded-full flex-shrink-0', ORDER_TYPE_COLORS[order.order_type as keyof typeof ORDER_TYPE_COLORS])} />
                <h4 className="font-medium text-sm truncate">{order.title}</h4>
              </div>
              {order.description && (
                <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{order.description}</p>
              )}
              <div className="flex items-center gap-2 mt-1.5">
                <span className="text-xs text-muted-foreground">
                  {format(parseISO(order.order_date), 'd MMM yyyy', { locale: uk })}
                </span>
                <Badge variant="outline" className={cn('text-xs', ORDER_TYPE_TEXT_COLORS[order.order_type as keyof typeof ORDER_TYPE_TEXT_COLORS])}>
                  {ORDER_TYPE_LABELS[order.order_type as keyof typeof ORDER_TYPE_LABELS] || order.order_type}
                </Badge>
              </div>
            </div>
            {order.price != null && (
              <span className="text-sm font-semibold text-primary whitespace-nowrap">
                {order.price} ₴
              </span>
            )}
          </div>
        </Card>
      ))}
    </div>
  );
}
