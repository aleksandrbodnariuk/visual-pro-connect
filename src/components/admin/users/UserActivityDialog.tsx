import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { supabase } from "@/integrations/supabase/client";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { buildDays, longestStreak, activityIndex, indexLabel, dayKey, DayBucket } from "@/lib/activityScore";
import { Loader2 } from "lucide-react";

type Period = "7" | "30" | "365" | "all";
interface Props { open: boolean; onOpenChange: (o: boolean) => void; user: { id: string; full_name?: string | null; created_at?: string | null } | null; }

const SERIES = [
  { key: "views", label: "Перегляди", color: "hsl(var(--primary))" },
  { key: "posts", label: "Дописи", color: "hsl(142 70% 45%)" },
  { key: "comments", label: "Коментарі", color: "hsl(38 92% 50%)" },
  { key: "likes", label: "Вподобайки", color: "hsl(340 80% 58%)" },
  { key: "messages", label: "Повідомлення", color: "hsl(200 80% 55%)" },
] as const;

async function fetchAll(table: string, col: string, timeCol: string, uid: string, from: string, to: string, select = timeCol) {
  const rows: any[] = [];
  for (let off = 0; off < 20000; off += 1000) {
    const { data, error } = await (supabase as any).from(table).select(select).eq(col, uid).gte(timeCol, from).lte(timeCol, to).range(off, off + 999);
    if (error || !data) break;
    rows.push(...data);
    if (data.length < 1000) break;
  }
  return rows;
}

async function load(uid: string, from: Date, to: Date): Promise<DayBucket[]> {
  const days = buildDays(from, to);
  const idx = new Map(days.map((d, i) => [d.date, i]));
  const f = from.toISOString(), t = to.toISOString();
  const [visits, views, posts, comments, likes, msgs] = await Promise.all([
    fetchAll("site_visits", "user_id", "visited_at", uid, f, t),
    fetchAll("analytics_events", "user_id", "occurred_at", uid, f, t, "occurred_at,event_type"),
    fetchAll("posts", "user_id", "created_at", uid, f, t),
    fetchAll("comments", "user_id", "created_at", uid, f, t),
    fetchAll("post_likes", "user_id", "created_at", uid, f, t),
    fetchAll("messages", "sender_id", "created_at", uid, f, t),
  ]);
  const bump = (ts: string | null, k: keyof DayBucket) => {
    if (!ts) return; const i = idx.get(dayKey(new Date(ts))); if (i === undefined) return;
    const d: any = days[i]; d[k] += 1; d.visited = true;
  };
  visits.forEach((r) => { const i = idx.get(dayKey(new Date(r.visited_at))); if (i !== undefined) days[i].visited = true; });
  views.forEach((r) => bump(r.occurred_at, "views"));
  posts.forEach((r) => bump(r.created_at, "posts"));
  comments.forEach((r) => bump(r.created_at, "comments"));
  likes.forEach((r) => bump(r.created_at, "likes"));
  msgs.forEach((r) => bump(r.created_at, "messages"));
  return days;
}

function group(days: DayBucket[], mode: "day" | "week" | "month") {
  if (mode === "day") return days.map((d) => ({ ...d, label: d.date.slice(5).split("-").reverse().join(".") }));
  const m = new Map<string, any>();
  days.forEach((d) => {
    const dt = new Date(d.date);
    let key: string;
    if (mode === "month") key = d.date.slice(0, 7);
    else { const s = new Date(dt); s.setUTCDate(dt.getUTCDate() - ((dt.getUTCDay() + 6) % 7)); key = dayKey(s); }
    const g = m.get(key) ?? { label: mode === "month" ? key.split("-").reverse().join(".") : key.slice(5).split("-").reverse().join("."), views: 0, posts: 0, comments: 0, likes: 0, messages: 0 };
    SERIES.forEach((s) => (g[s.key] += (d as any)[s.key]));
    m.set(key, g);
  });
  return [...m.values()];
}

export function UserActivityDialog({ open, onOpenChange, user }: Props) {
  const [period, setPeriod] = useState<Period>("30");
  const [days, setDays] = useState<DayBucket[]>([]);
  const [prev, setPrev] = useState<DayBucket[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !user) return;
    const to = new Date();
    const reg = user.created_at ? new Date(user.created_at) : new Date(to.getTime() - 365 * 864e5);
    const from = period === "all" ? reg : new Date(to.getTime() - (Number(period) - 1) * 864e5);
    const span = to.getTime() - from.getTime();
    setLoading(true);
    Promise.all([load(user.id, from, to), period === "all" ? Promise.resolve([]) : load(user.id, new Date(from.getTime() - span - 864e5), new Date(from.getTime() - 864e5))])
      .then(([a, b]) => { setDays(a); setPrev(b); })
      .finally(() => setLoading(false));
  }, [open, user, period]);

  const stats = useMemo(() => {
    const index = activityIndex(days);
    const prevIdx = prev.length ? activityIndex(prev) : null;
    return {
      active: days.filter((d) => d.visited).length, total: days.length, index,
      streak: longestStreak(days),
      change: prevIdx === null ? null : prevIdx === 0 ? (index > 0 ? 100 : 0) : Math.round(((index - prevIdx) / prevIdx) * 100),
    };
  }, [days, prev]);

  const mode = days.length <= 31 ? "day" : days.length <= 400 ? "week" : "month";
  const chart = useMemo(() => group(days, mode), [days, mode]);
  const weekday = useMemo(() => {
    const names = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Нд"]; const c = Array(7).fill(0);
    days.forEach((d) => { if (d.visited) c[(new Date(d.date).getUTCDay() + 6) % 7]++; });
    return names.map((n, i) => ({ label: n, days: c[i] }));
  }, [days]);
  const heat = period === "365" || period === "all" ? days.slice(-371) : [];
  const maxHeat = Math.max(1, ...heat.map((d) => d.views + d.posts + d.comments + d.likes + d.messages));
  const lvl = (d: DayBucket) => { const v = d.views + d.posts + d.comments + d.likes + d.messages; if (!d.visited && !v) return 0; return Math.min(4, 1 + Math.floor((v / maxHeat) * 3.99)); };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Активність учасника</DialogTitle>
          <DialogDescription>{user?.full_name || "Користувач"}</DialogDescription>
        </DialogHeader>
        <ToggleGroup type="single" value={period} onValueChange={(v) => v && setPeriod(v as Period)} className="flex-wrap justify-start">
          <ToggleGroupItem value="7">7 днів</ToggleGroupItem>
          <ToggleGroupItem value="30">30 днів</ToggleGroupItem>
          <ToggleGroupItem value="365">Рік</ToggleGroupItem>
          <ToggleGroupItem value="all">Від реєстрації</ToggleGroupItem>
        </ToggleGroup>
        {loading ? <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div> : (
          <div className="space-y-5">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Stat title="Активних днів" value={`${stats.active} з ${stats.total}`} />
              <Stat title="Індекс активності" value={`${stats.index}`} sub={indexLabel(stats.index)} />
              <Stat title="Найдовша серія" value={`${stats.streak} дн.`} />
              <Stat title="До попереднього періоду" value={stats.change === null ? "—" : `${stats.change > 0 ? "+" : ""}${stats.change} %`} />
            </div>
            <div className="h-72 rounded-lg border bg-card p-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chart}>
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} width={32} />
                  <Tooltip contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", color: "hsl(var(--popover-foreground))" }} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  {SERIES.map((s) => <Bar key={s.key} dataKey={s.key} name={s.label} stackId="a" fill={s.color} />)}
                </BarChart>
              </ResponsiveContainer>
            </div>
            {heat.length > 0 && (
              <div className="rounded-lg border bg-card p-3 overflow-x-auto">
                <div className="text-sm font-medium mb-2">Календар активності</div>
                <div className="grid grid-flow-col grid-rows-7 gap-[3px] w-max">
                  {heat.map((d) => <div key={d.date} title={d.date} className="h-3 w-3 rounded-sm bg-primary" style={{ opacity: [0.08, 0.3, 0.5, 0.75, 1][lvl(d)] }} />)}
                </div>
              </div>
            )}
            <div className="h-48 rounded-lg border bg-card p-2">
              <div className="text-sm font-medium px-2">Звички: дні тижня</div>
              <ResponsiveContainer width="100%" height="85%">
                <BarChart data={weekday}>
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                  <YAxis allowDecimals={false} width={28} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                  <Tooltip contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))" }} />
                  <Bar dataKey="days" name="Днів із візитом" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Stat({ title, value, sub }: { title: string; value: string; sub?: string }) {
  return (
    <div className="rounded-lg border bg-card p-3 shadow-sm">
      <div className="text-xs text-muted-foreground">{title}</div>
      <div className="text-xl font-semibold">{value}</div>
      {sub && <div className="text-xs text-primary">{sub}</div>}
    </div>
  );
}
