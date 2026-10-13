import { useState } from 'react';
import { Bar, BarChart, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { BarChart3, PieChart as PieIcon, Grid3x3 } from 'lucide-react';
import type { CoverageStatus } from '@/lib/precinctCoverage';

type View = 'bar' | 'pie' | 'grid';
interface Props {
  total: number; observers: number; commission: number; media: number;
  cells: { id: string; number: string; status: CoverageStatus; hint: string }[];
  onCellClick?: (id: string) => void;
}

const STATUS_COLOR: Record<CoverageStatus, string> = {
  full: 'hsl(142 70% 42%)', partial: 'hsl(38 92% 50%)', empty: 'hsl(var(--muted-foreground) / 0.35)',
};

export function CoverageChart({ total, observers, commission, media, cells, onCellClick }: Props) {
  const [view, setView] = useState<View>('bar');
  const bars = [
    { name: 'Дільниць', value: total, fill: 'hsl(var(--primary))' },
    { name: 'Спостерігачі', value: observers, fill: 'hsl(199 89% 48%)' },
    { name: 'Члени комісії', value: commission, fill: 'hsl(142 70% 42%)' },
    { name: 'ЗМІ', value: media, fill: 'hsl(280 65% 60%)' },
  ];
  const counts = { full: 0, partial: 0, empty: 0 } as Record<CoverageStatus, number>;
  cells.forEach((c) => counts[c.status]++);
  const pie = [
    { name: 'Укомплектовані', value: counts.full, key: 'full' as const },
    { name: 'Частково', value: counts.partial, key: 'partial' as const },
    { name: 'Порожні', value: counts.empty, key: 'empty' as const },
  ];

  return (
    <Card className="p-3 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium">Укомплектованість дільниць</p>
        <div className="flex gap-1">
          {([['bar', BarChart3, 'Стовпчики'], ['pie', PieIcon, 'Кругова'], ['grid', Grid3x3, 'Квадратна']] as const).map(([v, Icon, label]) => (
            <Button key={v} size="sm" variant={view === v ? 'default' : 'outline'} onClick={() => setView(v)} aria-label={label}>
              <Icon className="h-4 w-4 sm:mr-1" /><span className="hidden sm:inline">{label}</span>
            </Button>
          ))}
        </div>
      </div>

      {view === 'bar' && (
        <div className="h-56">
          <ResponsiveContainer>
            <BarChart data={bars}>
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
              <Tooltip contentStyle={{ background: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))' }} />
              <Bar dataKey="value" name="Кількість" radius={[4, 4, 0, 0]}>{bars.map((b) => <Cell key={b.name} fill={b.fill} />)}</Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {view === 'pie' && (
        <div className="h-56">
          <ResponsiveContainer>
            <PieChart>
              <Pie data={pie} dataKey="value" nameKey="name" innerRadius="50%" outerRadius="80%" label={({ value }) => value || ''}>
                {pie.map((p) => <Cell key={p.key} fill={STATUS_COLOR[p.key]} />)}
              </Pie>
              <Tooltip contentStyle={{ background: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}

      {view === 'grid' && (
        <div className="flex flex-wrap gap-1 max-h-64 overflow-y-auto">
          {cells.map((c) => (
            <button key={c.id} title={`№${c.number}: ${c.hint}`} onClick={() => onCellClick?.(c.id)}
              className="h-11 min-w-11 px-1 rounded text-[10px] font-medium text-foreground border"
              style={{ background: STATUS_COLOR[c.status] }}>{c.number.slice(-4)}</button>
          ))}
          {!cells.length && <p className="text-xs text-muted-foreground">Немає дільниць</p>}
        </div>
      )}

      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
        {pie.map((p) => <span key={p.key} className="flex items-center gap-1"><span className="h-3 w-3 rounded-sm" style={{ background: STATUS_COLOR[p.key] }} />{p.name}: {p.value}</span>)}
      </div>
    </Card>
  );
}
