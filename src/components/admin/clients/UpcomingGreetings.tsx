import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { eventTypeEmoji, eventTypeLabel, UpcomingGreeting } from "./clientTypes";

interface Props {
  items: UpcomingGreeting[];
}

export function UpcomingGreetings({ items }: Props) {
  const active = items.filter((i) => i.greeting_enabled);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Найближчі привітання (90 днів)</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {active.length === 0 && (
          <p className="text-sm text-muted-foreground">Найближчим часом привітань немає.</p>
        )}
        {active.map((i) => {
          const soon = i.days_left <= i.prep_days;
          return (
            <div
              key={i.event_id}
              className={`flex flex-wrap items-center gap-3 rounded-md border p-3 ${soon ? "border-primary/60 bg-primary/5" : ""}`}
            >
              <Avatar className="h-9 w-9">
                <AvatarImage src={i.avatar_url || undefined} />
                <AvatarFallback>{(i.client_name || "К")[0]}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium">
                  {eventTypeEmoji(i.event_type)} {i.client_name}
                </div>
                <div className="truncate text-xs text-muted-foreground">
                  {i.title || eventTypeLabel(i.event_type)} · {new Date(i.next_date).toLocaleDateString("uk-UA")}
                  {i.years_count > 0 ? ` · ${i.years_count} р.` : ""}
                </div>
                {i.notes && <div className="truncate text-xs text-muted-foreground">📝 {i.notes}</div>}
              </div>
              <Badge variant={soon ? "default" : "secondary"}>
                {i.days_left === 0 ? "сьогодні" : `через ${i.days_left} дн.`}
              </Badge>
              {soon && <Badge variant="outline">🎵 час готувати</Badge>}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}