import { useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, ChevronUp, Minus, Plus, RotateCcw, Shrink, Expand, Maximize2, Network, List, Phone, Trash2, Users } from 'lucide-react';
import { bonusPercent, groupPv, type PlanNode } from '@/lib/amwayPlan';

type Row = PlanNode & { full_name: string; phone?: string | null };
const fmt = (n: number) => Number(n).toLocaleString('uk-UA', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

interface Props { rows: Row[]; canEdit: boolean; onSetPv: (id: string, pv: number) => void; onDelete: (id: string) => void }

export function TeamStructure({ rows, canEdit, onSetPv, onDelete }: Props) {
  const [view, setView] = useState<'tree' | 'list'>(() => (localStorage.getItem('team_view') as any) || 'tree');
  useEffect(() => { localStorage.setItem('team_view', view); }, [view]);

  const kids = useMemo(() => {
    const m = new Map<string, Row[]>();
    rows.forEach((r) => { if (r.sponsor_id) m.set(r.sponsor_id, [...(m.get(r.sponsor_id) || []), r]); });
    return m;
  }, [rows]);
  const stats = useMemo(() => {
    const s = new Map<string, { g: number; down: number; depth: number }>();
    const walk = (id: string, d: number): number => {
      const c = kids.get(id) || [];
      const down = c.reduce((a, x) => a + 1 + walk(x.id, d + 1), 0);
      s.set(id, { g: groupPv(rows, id), down, depth: d });
      return down;
    };
    rows.filter((r) => !r.sponsor_id || !rows.some((x) => x.id === r.sponsor_id)).forEach((r) => walk(r.id, 0));
    return s;
  }, [rows, kids]);
  const roots = rows.filter((r) => !r.sponsor_id || !rows.some((x) => x.id === r.sponsor_id));

  if (rows.length === 0) return <p className="text-sm text-muted-foreground py-6 text-center">Партнерів поки немає</p>;

  return (
    <div className="space-y-2">
      <div className="flex gap-1">
        <Button size="sm" variant={view === 'tree' ? 'default' : 'outline'} onClick={() => setView('tree')}><Network className="h-4 w-4 mr-1" />Структура</Button>
        <Button size="sm" variant={view === 'list' ? 'default' : 'outline'} onClick={() => setView('list')}><List className="h-4 w-4 mr-1" />Список</Button>
      </div>
      {view === 'tree'
        ? <TreeView roots={roots} kids={kids} stats={stats} />
        : <ListView rows={rows} stats={stats} canEdit={canEdit} onSetPv={onSetPv} onDelete={onDelete} />}
    </div>
  );
}

function NodeCard({ r, st }: { r: Row; st?: { g: number; down: number } }) {
  const active = Number(r.personal_pv) >= 100;
  return (
    <div className="w-44 rounded-md border border-border bg-card text-card-foreground shadow-sm text-left">
      <div className="p-2 space-y-0.5 text-[11px] leading-tight">
        <div className="flex items-center gap-1">
          <span className={`h-2 w-2 rounded-full shrink-0 ${active ? 'bg-primary' : 'bg-muted-foreground'}`} />
          <p className="font-semibold uppercase truncate" title={r.full_name}>{r.full_name}</p>
        </div>
        <p className="font-bold">{bonusPercent(st?.g || 0)}%</p>
        <p><span className="text-muted-foreground">PPV</span> <b>{fmt(r.personal_pv)}</b></p>
        <p><span className="text-muted-foreground">GPV</span> <b>{fmt(st?.g || 0)}</b></p>
        <p className="flex items-center gap-1"><Users className="h-3 w-3 text-muted-foreground" /><b>{st?.down || 0}</b>
          {r.phone && <a href={`tel:${r.phone}`} className="ml-auto text-primary" aria-label="Подзвонити"><Phone className="h-3 w-3" /></a>}</p>
      </div>
    </div>
  );
}

function TreeView({ roots, kids, stats }: { roots: Row[]; kids: Map<string, Row[]>; stats: Map<string, any> }) {
  const [open, setOpen] = useState<Set<string>>(() => new Set([...stats.entries()].filter(([, s]) => s.depth < 2).map(([id]) => id)));
  const [z, setZ] = useState(1);
  const [off, setOff] = useState({ x: 0, y: 0 });
  const box = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x: number; y: number } | null>(null);
  const zr = useRef({ z, off }); zr.current = { z, off };

  useEffect(() => {
    const el = box.current; if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const { z, off } = zr.current;
      const dy = e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 100 : 1);
      const next = Math.min(2, Math.max(0.2, z * Math.exp(-dy * 0.0015)));
      const rect = el.getBoundingClientRect(); const px = e.clientX - rect.left, py = e.clientY - rect.top; const k = next / z;
      setOff({ x: px - (px - off.x) * k, y: py - (py - off.y) * k }); setZ(next);
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);
  const zoomBy = (f: number) => {
    const el = box.current!; const px = el.clientWidth / 2, py = el.clientHeight / 2;
    const next = Math.min(2, Math.max(0.2, z * f)); const k = next / z;
    setOff({ x: px - (px - off.x) * k, y: py - (py - off.y) * k }); setZ(next);
  };
  const toggle = (id: string) => setOpen((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const render = (r: Row): JSX.Element => {
    const c = kids.get(r.id) || []; const isOpen = open.has(r.id);
    return (
      <li key={r.id} className="org-li">
        <div className="inline-flex flex-col items-center">
          <NodeCard r={r} st={stats.get(r.id)} />
          {c.length > 0 && (
            <button onPointerDown={(e) => e.stopPropagation()} onClick={() => toggle(r.id)} className="mt-1 inline-flex items-center gap-0.5 rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold hover:bg-accent">
              {c.length}{isOpen ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            </button>
          )}
        </div>
        {c.length > 0 && isOpen && <ul>{c.map(render)}</ul>}
      </li>
    );
  };

  return (
    <div className="relative rounded-md border border-border bg-muted/40 overflow-hidden">
      <style>{`
        .org-tree ul{display:flex;justify-content:center;padding-top:16px;position:relative}
        .org-tree li{list-style:none;text-align:center;position:relative;padding:16px 6px 0}
        .org-tree li::before,.org-tree li::after{content:'';position:absolute;top:0;right:50%;width:50%;height:16px;border-top:1px solid hsl(var(--border))}
        .org-tree li::after{right:auto;left:50%;border-left:1px solid hsl(var(--border))}
        .org-tree li:only-child::before,.org-tree li:only-child::after{display:none}
        .org-tree li:only-child{padding-top:0}
        .org-tree li:first-child::before,.org-tree li:last-child::after{border:0 none}
        .org-tree li:last-child::before{border-right:1px solid hsl(var(--border))}
        .org-tree ul ul::before{content:'';position:absolute;top:0;left:50%;height:16px;border-left:1px solid hsl(var(--border))}
        .org-tree>ul{padding-top:0}
      `}</style>
      <div ref={box} className="h-[60vh] min-h-[360px] cursor-grab active:cursor-grabbing touch-none select-none"
        onPointerDown={(e) => { drag.current = { x: e.clientX - off.x, y: e.clientY - off.y }; (e.target as HTMLElement).setPointerCapture?.(e.pointerId); }}
        onPointerMove={(e) => { if (drag.current) setOff({ x: e.clientX - drag.current.x, y: e.clientY - drag.current.y }); }}
        onPointerUp={() => { drag.current = null; }}>
        <div className="org-tree inline-block p-6" style={{ transform: `translate(${off.x}px, ${off.y}px) scale(${z})`, transformOrigin: '0 0' }}>
          <ul>{roots.map(render)}</ul>
        </div>
      </div>
      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex flex-wrap items-center justify-center gap-1 rounded-md border border-border bg-card px-2 py-1 shadow text-xs">
        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => zoomBy(1 / 1.2)} aria-label="Зменшити"><Minus className="h-4 w-4" /></Button>
        <span className="w-10 text-center">{Math.round(z * 100)}%</span>
        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => zoomBy(1.2)} aria-label="Збільшити"><Plus className="h-4 w-4" /></Button>
        <Button size="sm" variant="ghost" className="h-8" onClick={() => { setZ(1); setOff({ x: 0, y: 0 }); }}><RotateCcw className="h-3.5 w-3.5 mr-1" />Скинути</Button>
        <Button size="sm" variant="ghost" className="h-8" onClick={() => setOpen(new Set())}><Shrink className="h-3.5 w-3.5 mr-1" />Згорнути все</Button>
        <Button size="sm" variant="ghost" className="h-8" onClick={() => setOpen(new Set(stats.keys()))}><Expand className="h-3.5 w-3.5 mr-1" />Розгорнути все</Button>
        <Button size="sm" variant="ghost" className="h-8" onClick={() => box.current?.parentElement?.requestFullscreen?.()}><Maximize2 className="h-3.5 w-3.5 mr-1" />Повний екран</Button>
      </div>
    </div>
  );
}

function ListView({ rows, stats, canEdit, onSetPv, onDelete }: { rows: Row[]; stats: Map<string, any> } & Omit<Props, 'rows'>) {
  const [q, setQ] = useState('');
  const [sort, setSort] = useState<'gpv' | 'ppv' | 'name'>('gpv');
  const byId = new Map(rows.map((r) => [r.id, r]));
  const list = rows
    .filter((r) => r.full_name.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => sort === 'name' ? a.full_name.localeCompare(b.full_name, 'uk')
      : sort === 'ppv' ? Number(b.personal_pv) - Number(a.personal_pv)
      : (stats.get(b.id)?.g || 0) - (stats.get(a.id)?.g || 0));
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <Input className="max-w-xs" placeholder="Пошук за прізвищем" value={q} onChange={(e) => setQ(e.target.value)} />
        <select className="h-10 rounded-md border border-input bg-background px-2 text-sm" value={sort} onChange={(e) => setSort(e.target.value as any)}>
          <option value="gpv">За груповими балами</option><option value="ppv">За особистими балами</option><option value="name">За іменем</option>
        </select>
      </div>
      <div className="divide-y divide-border rounded-md border border-border">
        {list.map((r) => {
          const st = stats.get(r.id);
          return (
            <div key={r.id} className="flex flex-wrap items-center gap-2 p-2 text-sm">
              <div className="min-w-0 flex-1">
                <p className="font-medium truncate">{r.full_name}</p>
                <p className="text-xs text-muted-foreground">Рівень {st?.depth ?? 0} · Спонсор: {r.sponsor_id ? byId.get(r.sponsor_id)?.full_name || '—' : '—'} · у глибині {st?.down || 0}</p>
              </div>
              <Badge variant="secondary">{bonusPercent(st?.g || 0)}%</Badge>
              <span className="text-xs">PPV <b>{fmt(r.personal_pv)}</b></span>
              <span className="text-xs">GPV <b>{fmt(st?.g || 0)}</b></span>
              {canEdit && <Input className="h-9 w-24" type="number" defaultValue={r.personal_pv} aria-label="Особисті бали"
                onBlur={(e) => Number(e.target.value) !== Number(r.personal_pv) && onSetPv(r.id, Math.max(0, Number(e.target.value)))} />}
              {r.phone && <a href={`tel:${r.phone}`} className="inline-flex h-9 w-9 items-center justify-center rounded-md hover:bg-muted" aria-label="Подзвонити"><Phone className="h-4 w-4" /></a>}
              {canEdit && <Button size="icon" variant="ghost" className="h-9 w-9" onClick={() => onDelete(r.id)} aria-label="Видалити"><Trash2 className="h-4 w-4 text-destructive" /></Button>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
