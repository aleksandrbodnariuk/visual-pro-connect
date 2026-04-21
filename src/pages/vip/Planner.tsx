import { useMemo, useState } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { Sidebar } from "@/components/layout/Sidebar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Loader2, Plus, CalendarRange, Crown, MapPin, ArrowLeft, CheckCircle2, RotateCcw } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useUserVip } from "@/hooks/vip/useUserVip";
import { useVipEvents, type VipEvent } from "@/hooks/vip/useVipEvents";
import { EventEditorDialog, EVENT_TYPES } from "@/components/vip/planner/EventEditorDialog";
import { format, isSameDay, parseISO } from "date-fns";
import { uk } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const COLOR_DOT: Record<string, string> = {
  amber: "bg-amber-500",
  blue: "bg-blue-500",
  rose: "bg-rose-500",
  emerald: "bg-emerald-500",
  violet: "bg-violet-500",
  slate: "bg-slate-500",
};

function typeLabel(t: string) {
  return EVENT_TYPES.find((x) => x.value === t)?.label ?? "Подія";
}

export default function VipPlanner() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { vip, loading: vipLoading } = useUserVip(user?.id);
  const { events, loading, createEvent, updateEvent, deleteEvent } = useVipEvents(user?.id);

  const [month, setMonth] = useState<Date>(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<VipEvent | null>(null);

  const eventsByDay = useMemo(() => {
    const map = new Map<string, VipEvent[]>();
    events.forEach((e) => {
      const key = format(parseISO(e.starts_at), "yyyy-MM-dd");
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(e);
    });
    return map;
  }, [events]);

  const dayEvents = useMemo(() => {
    if (!selectedDate) return [];
    return events
      .filter((e) => isSameDay(parseISO(e.starts_at), selectedDate))
      .sort((a, b) => a.starts_at.localeCompare(b.starts_at));
  }, [events, selectedDate]);

  const upcoming = useMemo(() => {
    const now = Date.now();
    return events
      .filter((e) => new Date(e.starts_at).getTime() >= now && e.status === "planned")
      .slice(0, 5);
  }, [events]);

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="container mx-auto px-4 py-12 text-center">
          <p className="mb-4">Увійдіть, щоб користуватись планувальником</p>
          <Button onClick={() => navigate("/auth")}>Увійти</Button>
        </main>
      </div>
    );
  }

  if (vipLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (!vip) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="container mx-auto px-4 py-12 max-w-md">
          <Card className="p-6 border-amber-500/30 bg-gradient-to-br from-amber-500/5 to-yellow-500/5 text-center space-y-4">
            <Crown className="h-12 w-12 text-amber-500 mx-auto" />
            <h1 className="text-xl font-bold">Планувальник доступний лише VIP</h1>
            <p className="text-sm text-muted-foreground">
              Оформіть VIP-членство, щоб користуватися календарем подій.
            </p>
            <div className="flex gap-2 justify-center">
              <Button variant="outline" onClick={() => navigate("/vip/tools")}>
                <ArrowLeft className="h-4 w-4 mr-1" /> Інструменти
              </Button>
              <Button onClick={() => navigate("/vip")}>Тарифи VIP</Button>
            </div>
          </Card>
        </main>
      </div>
    );
  }

  const openCreate = () => {
    setEditing(null);
    setEditorOpen(true);
  };

  const openEdit = (e: VipEvent) => {
    setEditing(e);
    setEditorOpen(true);
  };

  const toggleStatus = async (e: VipEvent) => {
    const next = e.status === "done" ? "planned" : "done";
    const { error } = await updateEvent(e.id, { status: next });
    if (error) {
      toast.error("Не вдалося оновити статус");
    } else {
      toast.success(next === "done" ? "Позначено виконаним" : "Повернуто в активні");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-6 grid grid-cols-12 gap-4">
        <aside className="hidden lg:block col-span-3">
          <Sidebar className="sticky top-20" />
        </aside>

        <section className="col-span-12 lg:col-span-9 space-y-5 pb-24 md:pb-8">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <Button variant="ghost" size="sm" onClick={() => navigate("/vip/tools")} className="shrink-0">
                <ArrowLeft className="h-4 w-4" />
                <span className="hidden sm:inline ml-1">Інструменти</span>
              </Button>
              <h1 className="text-xl md:text-2xl font-bold flex items-center gap-2 truncate">
                <CalendarRange className="h-6 w-6 text-amber-500 shrink-0" />
                <span className="truncate">Планувальник подій</span>
              </h1>
            </div>
            <Button onClick={openCreate} size="sm">
              <Plus className="h-4 w-4 mr-1" /> Нова подія
            </Button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Card className="p-3 lg:col-span-2">
              {loading ? (
                <div className="flex justify-center py-10">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  month={month}
                  onMonthChange={setMonth}
                  locale={uk}
                  className="p-0 pointer-events-auto w-full"
                  modifiers={{
                    hasEvents: (date) => eventsByDay.has(format(date, "yyyy-MM-dd")),
                  }}
                  modifiersClassNames={{ hasEvents: "font-bold" }}
                  components={{
                    DayContent: ({ date }) => {
                      const key = format(date, "yyyy-MM-dd");
                      const dayList = eventsByDay.get(key);
                      return (
                        <div className="relative flex flex-col items-center justify-center">
                          <span>{date.getDate()}</span>
                          {dayList && dayList.length > 0 && (
                            <div className="flex gap-0.5 mt-0.5">
                              {dayList.slice(0, 3).map((e, i) => (
                                <div
                                  key={i}
                                  className={cn(
                                    "w-1.5 h-1.5 rounded-full",
                                    COLOR_DOT[e.color] ?? "bg-muted-foreground"
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
              )}
            </Card>

            <Card className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-bold">
                  {selectedDate
                    ? format(selectedDate, "d MMMM yyyy", { locale: uk })
                    : "Оберіть день"}
                </h3>
                {selectedDate && (
                  <Button size="sm" variant="ghost" onClick={openCreate}>
                    <Plus className="h-4 w-4" />
                  </Button>
                )}
              </div>
              {dayEvents.length === 0 ? (
                <p className="text-sm text-muted-foreground">Подій немає</p>
              ) : (
                <div className="space-y-2">
                  {dayEvents.map((e) => (
                    <button
                      key={e.id}
                      onClick={() => openEdit(e)}
                      className="w-full text-left p-2 rounded-lg border hover:bg-accent transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <div className={cn("w-2 h-2 rounded-full shrink-0", COLOR_DOT[e.color] ?? "bg-muted-foreground")} />
                        <span className={cn("font-medium text-sm truncate flex-1", e.status === "done" && "line-through text-muted-foreground")}>
                          {e.title}
                        </span>
                        <span className="text-xs text-muted-foreground shrink-0">
                          {format(parseISO(e.starts_at), "HH:mm")}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-1 ml-4">
                        <Badge variant="outline" className="text-[10px] py-0 h-4">{typeLabel(e.event_type)}</Badge>
                        {e.location && (
                          <span className="text-xs text-muted-foreground flex items-center gap-1 truncate">
                            <MapPin className="h-3 w-3" /> {e.location}
                          </span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </Card>
          </div>

          <Card className="p-4">
            <h3 className="font-bold mb-3">Найближчі події</h3>
            {upcoming.length === 0 ? (
              <p className="text-sm text-muted-foreground">Заплановані події з'являться тут.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {upcoming.map((e) => (
                  <div key={e.id} className="flex items-start gap-3 p-3 rounded-lg border">
                    <div className={cn("w-2 h-2 rounded-full mt-2 shrink-0", COLOR_DOT[e.color] ?? "bg-muted-foreground")} />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{e.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(parseISO(e.starts_at), "d MMM, HH:mm", { locale: uk })}
                        {" · "}
                        {typeLabel(e.event_type)}
                      </p>
                    </div>
                    <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0" onClick={() => toggleStatus(e)} title="Виконано">
                      {e.status === "done" ? <RotateCcw className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </section>
      </main>

      <EventEditorDialog
        open={editorOpen}
        onOpenChange={setEditorOpen}
        initialDate={selectedDate}
        event={editing}
        onSave={async (data) => {
          if (editing) return updateEvent(editing.id, data as any);
          return createEvent(data);
        }}
        onDelete={editing ? deleteEvent : undefined}
      />
    </div>
  );
}