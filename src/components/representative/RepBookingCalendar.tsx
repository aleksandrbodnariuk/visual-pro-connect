import { useState, useMemo } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { uk } from "date-fns/locale";

interface Booking {
  id: string;
  title: string;
  order_date: string;
  status: string;
  description: string | null;
}

interface Props {
  bookings: Booking[];
  selectedDate: Date | undefined;
  onSelectDate: (date: Date | undefined) => void;
}

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-amber-500",
  confirmed: "bg-emerald-500",
  archived: "bg-muted-foreground",
};

const STATUS_LABELS: Record<string, string> = {
  pending: "Очікує",
  confirmed: "Підтверджено",
  archived: "Архів",
};

export function RepBookingCalendar({ bookings, selectedDate, onSelectDate }: Props) {
  const [month, setMonth] = useState(new Date());

  const bookingsByDate = useMemo(() => {
    const map = new Map<string, Booking[]>();
    bookings.forEach((b) => {
      if (!map.has(b.order_date)) map.set(b.order_date, []);
      map.get(b.order_date)!.push(b);
    });
    return map;
  }, [bookings]);

  const busyDates = useMemo(() => {
    const set = new Set<string>();
    bookings.forEach((b) => {
      if (b.status === "confirmed") set.add(b.order_date);
    });
    return set;
  }, [bookings]);

  const selectedKey = selectedDate ? format(selectedDate, "yyyy-MM-dd") : null;
  const selectedBookings = selectedKey ? bookingsByDate.get(selectedKey) || [] : [];

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
        components={{
          DayContent: ({ date }) => {
            const key = format(date, "yyyy-MM-dd");
            const dayBookings = bookingsByDate.get(key);
            const isBusy = busyDates.has(key);
            return (
              <div className="relative flex flex-col items-center">
                <span>{date.getDate()}</span>
                {dayBookings && dayBookings.length > 0 && (
                  <div className="flex gap-0.5 mt-0.5">
                    {dayBookings.slice(0, 3).map((b, i) => (
                      <div
                        key={i}
                        className={cn(
                          "w-1.5 h-1.5 rounded-full",
                          STATUS_COLORS[b.status] || "bg-muted-foreground"
                        )}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          },
        }}
      />

      {/* Legend */}
      <div className="flex gap-3 mt-3 pt-3 border-t text-xs text-muted-foreground">
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-emerald-500" />
          Зайнято
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-amber-500" />
          Очікує
        </div>
      </div>

      {/* Selected date details */}
      {selectedDate && (
        <div className="mt-3 pt-3 border-t">
          <p className="text-sm font-medium">
            {format(selectedDate, "d MMMM yyyy", { locale: uk })}
          </p>
          {selectedBookings.length === 0 ? (
            <p className="text-sm text-emerald-600 dark:text-emerald-400 mt-1">
              Вільна дата
            </p>
          ) : (
            <div className="space-y-2 mt-2">
              {selectedBookings.map((b) => (
                <div key={b.id} className="flex items-center justify-between text-sm">
                  <span className="truncate flex-1">{b.title}</span>
                  <Badge
                    variant="secondary"
                    className={cn(
                      "ml-2 text-xs",
                      b.status === "pending" && "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
                      b.status === "confirmed" && "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300"
                    )}
                  >
                    {STATUS_LABELS[b.status] || b.status}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
