
import { useState } from 'react';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { SpecialistOrder, ORDER_TYPE_COLORS } from './types';
import { format, isSameDay, parseISO } from 'date-fns';
import { uk } from 'date-fns/locale';

interface Props {
  orders: SpecialistOrder[];
  selectedDate: Date | undefined;
  onSelectDate: (date: Date | undefined) => void;
}

export function SpecialistCalendar({ orders, selectedDate, onSelectDate }: Props) {
  const [month, setMonth] = useState(new Date());

  // Get order dates for highlighting
  const ordersByDate = new Map<string, SpecialistOrder[]>();
  orders.forEach(order => {
    const key = order.order_date;
    if (!ordersByDate.has(key)) ordersByDate.set(key, []);
    ordersByDate.get(key)!.push(order);
  });

  return (
    <div className="border rounded-lg p-4 bg-card">
      <Calendar
        mode="single"
        selected={selectedDate}
        onSelect={onSelectDate}
        month={month}
        onMonthChange={setMonth}
        locale={uk}
        className="p-0 pointer-events-auto"
        modifiers={{
          hasOrders: (date) => {
            const key = format(date, 'yyyy-MM-dd');
            return ordersByDate.has(key);
          },
        }}
        modifiersClassNames={{
          hasOrders: 'font-bold',
        }}
        components={{
          DayContent: ({ date }) => {
            const key = format(date, 'yyyy-MM-dd');
            const dayOrders = ordersByDate.get(key);
            return (
              <div className="relative flex flex-col items-center">
                <span>{date.getDate()}</span>
                {dayOrders && dayOrders.length > 0 && (
                  <div className="flex gap-0.5 mt-0.5">
                    {dayOrders.slice(0, 3).map((o, i) => (
                      <div
                        key={i}
                        className={cn('w-1.5 h-1.5 rounded-full', ORDER_TYPE_COLORS[o.order_type as keyof typeof ORDER_TYPE_COLORS] || 'bg-muted-foreground')}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          },
        }}
      />

      {selectedDate && (
        <div className="mt-3 pt-3 border-t">
          <p className="text-sm font-medium text-muted-foreground">
            {format(selectedDate, 'd MMMM yyyy', { locale: uk })}
          </p>
          {(() => {
            const key = format(selectedDate, 'yyyy-MM-dd');
            const dayOrders = ordersByDate.get(key);
            if (!dayOrders || dayOrders.length === 0) {
              return <p className="text-sm text-muted-foreground mt-1">Немає замовлень</p>;
            }
            return (
              <p className="text-sm mt-1">
                {dayOrders.length} {dayOrders.length === 1 ? 'замовлення' : 'замовлень'}
              </p>
            );
          })()}
        </div>
      )}
    </div>
  );
}
