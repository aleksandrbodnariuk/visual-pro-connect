import { useEffect, useState } from 'react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';

interface Stats { views_total: number; views_7d: number; views_30d: number; unique_viewers: number; members_count: number; posts_count: number }
interface Day { day: string; views: number; unique_viewers: number; member_views: number; guest_views: number }

const PERIODS = [7, 30, 90] as const;

export function GroupStatsPanel({ groupId }: { groupId: string }) {
  const [stats, setStats] = useState<Stats | null>(null);
  const [days, setDays] = useState<Day[]>([]);
  const [period, setPeriod] = useState<number>(30);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase.rpc('get_group_stats', { _group_id: groupId }).then(({ data, error }) => {
      if (error) { setError('Статистика доступна лише адміністрації групи'); return; }
      const row = Array.isArray(data) ? data[0] : data;
      if (row) setStats(row as unknown as Stats);
    });
  }, [groupId]);

  useEffect(() => {
    (supabase.rpc as any)('get_group_daily_stats', { _group_id: groupId, _days: period }).then(({ data, error }: any) => {
      if (!error) setDays(((data || []) as Day[]).map(d => ({ ...d, views: Number(d.views), unique_viewers: Number(d.unique_viewers), member_views: Number(d.member_views), guest_views: Number(d.guest_views) })));
    });
  }, [groupId, period]);

  if (error) return <p className="text-sm text-muted-foreground">{error}</p>;
  if (!stats) return <p className="text-sm text-muted-foreground">Завантаження статистики…</p>;

  const sum = (k: keyof Day) => days.reduce((a, d) => a + (d[k] as number), 0);
  const items = [
    { label: 'Переглядів усього', value: stats.views_total },
    { label: 'За 7 днів', value: stats.views_7d },
    { label: 'За 30 днів', value: stats.views_30d },
    { label: 'Унікальних відвідувачів', value: stats.unique_viewers },
    { label: 'Учасників', value: stats.members_count },
    { label: 'Дописів', value: stats.posts_count },
  ];
  const fmt = (s: string) => new Date(s).toLocaleDateString('uk-UA', { day: '2-digit', month: '2-digit' });

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {items.map(s => (
          <div key={s.label} className="rounded-lg border p-3">
            <div className="text-2xl font-bold">{s.value}</div>
            <div className="text-xs text-muted-foreground">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        {PERIODS.map(p => (
          <Button key={p} size="sm" className="min-h-11" variant={p === period ? 'default' : 'outline'} onClick={() => setPeriod(p)}>{p} днів</Button>
        ))}
      </div>

      <div className="h-56 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={days} margin={{ left: -20, right: 8, top: 8 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis dataKey="day" tickFormatter={fmt} tick={{ fontSize: 11 }} minTickGap={16} />
            <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
            <Tooltip labelFormatter={(l) => fmt(String(l))} contentStyle={{ background: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', color: 'hsl(var(--popover-foreground))' }} />
            <Area type="monotone" dataKey="member_views" name="Учасники" stackId="1" stroke="hsl(var(--primary))" fill="hsl(var(--primary) / 0.35)" />
            <Area type="monotone" dataKey="guest_views" name="Гості" stackId="1" stroke="hsl(var(--accent-foreground))" fill="hsl(var(--accent) / 0.5)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-3 gap-3 text-center">
        <div className="rounded-lg border p-2"><div className="text-lg font-semibold">{sum('views')}</div><div className="text-xs text-muted-foreground">Переглядів за період</div></div>
        <div className="rounded-lg border p-2"><div className="text-lg font-semibold">{sum('member_views')}</div><div className="text-xs text-muted-foreground">Від учасників</div></div>
        <div className="rounded-lg border p-2"><div className="text-lg font-semibold">{sum('guest_views')}</div><div className="text-xs text-muted-foreground">Від гостей</div></div>
      </div>
      <p className="text-xs text-muted-foreground">Повторне відкриття групи тією самою людиною протягом 30 хвилин не рахується.</p>
    </div>
  );
}
