import { useEffect, useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Users, UserPlus, Building2, Award, AlertTriangle } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { HQ_LEVELS, levelPlural, partyActions, partyExtra, partyMembersApi, type PartyHq, type PartyMember } from '@/hooks/orgs/useOrganizations';
import { unmatchedMembers, membersByChild, membersInScope, statusCounts, subtreeIds } from '@/lib/partyStats';

const COLORS = ['hsl(var(--primary))', 'hsl(38 92% 55%)', 'hsl(152 60% 45%)', 'hsl(var(--muted-foreground))'];
type View = 'status' | 'regions' | 'levels';

/** Аналітика партії з автоматичним фокусом на штаб керівника. */
export function PartyDashboard({ orgId, isAdmin }: { orgId: string; isAdmin: boolean }) {
  const { user } = useAuth();
  const [hqs, setHqs] = useState<PartyHq[]>([]);
  const [members, setMembers] = useState<PartyMember[]>([]);
  const [myHqs, setMyHqs] = useState<string[]>([]);
  const [focus, setFocus] = useState<string>('');
  const [view, setView] = useState<View>('status');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([partyActions.listHqs(orgId, 'party'), partyMembersApi.list(orgId), partyExtra.listManagers(orgId)]).then(([h, m, mg]) => {
      setHqs(h); setMembers(m);
      const mine = mg.filter((x) => x.user_id === user?.id).map((x) => x.hq_id);
      setMyHqs(mine);
      if (!isAdmin && mine.length) setFocus(mine[0]);
      setLoading(false);
    });
  }, [orgId, user?.id, isAdmin]);

  const options = useMemo(() => {
    if (isAdmin) return hqs.filter((h) => h.level === 'central' || h.level === 'oblast');
    return hqs.filter((h) => myHqs.includes(h.id));
  }, [hqs, myHqs, isAdmin]);

  const scope = focus ? subtreeIds(hqs, focus) : null;
  const scopedMembers = membersInScope(members, hqs, scope);
  const scopedHqs = scope ? hqs.filter((h) => scope.has(h.id)) : hqs;
  const s = statusCounts(scopedMembers);
  const focusHq = hqs.find((h) => h.id === focus);
  const unmatched = isAdmin && !focus ? unmatchedMembers(members, hqs).length : 0;


  const statusData = [
    { name: 'Дійсні члени', value: s.active }, { name: 'Кандидати', value: s.candidate },
    { name: 'Почесні', value: s.honorary }, { name: 'Призупинені', value: s.suspended },
  ].filter((d) => d.value > 0);
  const regionData = membersByChild(members, hqs, focus || null).slice(0, 15);
  const levelData = HQ_LEVELS.map((l) => ({ name: levelPlural(l.value), value: scopedHqs.filter((h) => h.level === l.value).length })).filter((d) => d.value > 0);

  if (loading) return <p className="text-sm text-muted-foreground py-6 text-center">Завантаження аналітики…</p>;
  if (!isAdmin && !myHqs.length) return <p className="text-sm text-muted-foreground py-6 text-center">Аналітика доступна керівникам організацій.</p>;

  const cabinet = !focusHq || focusHq.level === 'central' ? 'Кабінет Голови партії'
    : focusHq.level === 'oblast' ? 'Кабінет голови обласної організації'
    : focusHq.level === 'village' ? 'Кабінет голови первинного осередку'
    : 'Кабінет голови районної (міської) організації';
  const isLocal = !!focusHq && !['central', 'oblast'].includes(focusHq.level);
  const kpi = [
    { label: 'Кандидатів у члени', value: s.candidate, icon: UserPlus },
    { label: 'Членів партії', value: s.active + s.honorary, icon: Users },
    { label: 'Осередків', value: scopedHqs.length, icon: Building2 },
    { label: 'Усього на обліку', value: scopedMembers.length, icon: Award },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-xs uppercase tracking-wide text-primary">{cabinet}</p>
          <h2 className="text-lg font-semibold">{focusHq ? focusHq.name : 'Вся партія'}</h2>
        </div>
        {options.length > 0 && (
          <select className="h-11 rounded-md border bg-background px-3 text-sm max-w-full" value={focus} onChange={(e) => setFocus(e.target.value)}>
            {isAdmin && <option value="">Вся партія</option>}
            {options.map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}
          </select>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
        {kpi.map((k) => (
          <Card key={k.label} className="p-4">
            <k.icon className="h-5 w-5 text-primary mb-2" />
            <p className="text-2xl font-bold">{k.value}</p>
            <p className="text-xs text-muted-foreground">{k.label}</p>
          </Card>
        ))}
      </div>

      {isLocal && (
        <Card className="p-4">
          <h3 className="font-semibold mb-2">Члени та кандидати організації ({scopedMembers.length})</h3>
          {scopedMembers.length === 0 ? <p className="text-sm text-muted-foreground">На обліку ще нікого немає.</p> : (
            <div className="divide-y">
              {scopedMembers.map((m) => (
                <div key={m.id} className="py-2 flex flex-wrap items-center justify-between gap-2 text-sm">
                  <span className="font-medium">{m.full_name}{m.position ? <span className="text-muted-foreground font-normal"> · {m.position}</span> : null}</span>
                  <span className="flex items-center gap-3">
                    {m.phone && <a className="text-primary min-h-[44px] inline-flex items-center" href={`tel:${m.phone}`}>{m.phone}</a>}
                    <span className="text-xs text-muted-foreground">{m.status === 'candidate' ? 'Кандидат' : m.status === 'active' ? 'Дійсний член' : m.status === 'honorary' ? 'Почесний' : 'Призупинений'}</span>
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {unmatched > 0 && (
        <Card className="p-3 flex items-start gap-2 border-destructive/40">
          <AlertTriangle className="h-5 w-5 text-destructive shrink-0" />
          <p className="text-sm">{unmatched} член(ів) не враховано в діаграмах осередків: поле «Організація» в реєстрі не збігається з назвою жодної організації. Виправте його в реєстрі членів.</p>
        </Card>
      )}

      <Card className="p-4">
        <div className="flex flex-wrap gap-2 mb-3">
          {([['status', 'Склад'], ['regions', 'Підлеглі організації'], ['levels', 'Рівні структури']] as [View, string][]).map(([v, l]) => (
            <Button key={v} size="sm" variant={view === v ? 'default' : 'outline'} className="min-h-[44px]" onClick={() => setView(v)}>{l}</Button>
          ))}
        </div>
        <div className="h-80">
          {view === 'status' && (statusData.length ? (
            <ResponsiveContainer><PieChart>
              <Pie data={statusData} dataKey="value" nameKey="name" innerRadius="50%" outerRadius="80%" label>
                {statusData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie><Tooltip /><Legend />
            </PieChart></ResponsiveContainer>
          ) : <Empty />)}
          {view === 'regions' && (regionData.length ? (
            <ResponsiveContainer><BarChart data={regionData} layout="vertical" margin={{ left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis type="number" allowDecimals={false} stroke="hsl(var(--muted-foreground))" />
              <YAxis type="category" dataKey="name" width={120} stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 12 }} />
              <Tooltip /><Legend />
              <Bar dataKey="members" name="Члени" stackId="a" fill={COLORS[0]} />
              <Bar dataKey="candidates" name="Кандидати" stackId="a" fill={COLORS[1]} />
            </BarChart></ResponsiveContainer>
          ) : <Empty text="Немає підлеглих організацій" />)}
          {view === 'levels' && (levelData.length ? (
            <ResponsiveContainer><BarChart data={levelData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 11 }} />
              <YAxis allowDecimals={false} stroke="hsl(var(--muted-foreground))" />
              <Tooltip /><Bar dataKey="value" name="Осередків" fill={COLORS[2]} />
            </BarChart></ResponsiveContainer>
          ) : <Empty />)}
        </div>
        <p className="text-xs text-muted-foreground mt-2">Члени зараховуються до осередку, якщо поле «Організація» в реєстрі збігається з назвою організації.</p>
      </Card>
    </div>
  );
}

const Empty = ({ text = 'Немає даних' }: { text?: string }) => <div className="h-full flex items-center justify-center text-sm text-muted-foreground">{text}</div>;
