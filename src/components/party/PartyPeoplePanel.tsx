import { useEffect, useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Crown, Megaphone, Phone, Users } from 'lucide-react';
import { levelLabel, partyActions, partyExtra, type HqMember, type PartyHq } from '@/hooks/orgs/useOrganizations';

const LEAD_RE = /голов|керівник|лідер|заступ|секретар|президі/i;

/** Керівництво (центральний штаб + керівники обласних) або повний реєстр членів партії. */
export function PartyPeoplePanel({ orgId, mode }: { orgId: string; mode: 'leaders' | 'members' }) {
  const [members, setMembers] = useState<HqMember[]>([]);
  const [hqs, setHqs] = useState<PartyHq[]>([]);
  const [q, setQ] = useState('');
  const [hqFilter, setHqFilter] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    Promise.all([partyExtra.listOrgMembers(orgId), partyActions.listHqs(orgId)]).then(([m, h]) => {
      if (!alive) return; setMembers(m); setHqs(h); setLoading(false);
    });
    return () => { alive = false; };
  }, [orgId]);

  const hqBy = useMemo(() => new Map(hqs.map((h) => [h.id, h])), [hqs]);

  if (loading) return <p className="text-sm text-muted-foreground py-6 text-center">Завантаження…</p>;

  if (mode === 'leaders') {
    const central = members.filter((m) => hqBy.get(m.hq_id)?.level === 'central' && !m.is_agitator);
    const regional = members.filter((m) => hqBy.get(m.hq_id)?.level === 'oblast' && !m.is_agitator && LEAD_RE.test(m.position || ''));
    return (
      <div className="space-y-4">
        <Section title="Центральне керівництво" icon={Crown} list={central} hqBy={hqBy} empty="Додайте людей у команду центрального штабу" />
        <Section title="Керівники обласних штабів" icon={Users} list={regional} hqBy={hqBy} empty="Посади з назвою «Голова», «Керівник» чи «Заступник» в обласних штабах з’являться тут" showHq />
      </div>
    );
  }

  const ql = q.toLowerCase();
  const list = members.filter((m) => (!hqFilter || m.hq_id === hqFilter) &&
    (!q || `${m.full_name} ${m.position || ''} ${m.phone || ''} ${hqBy.get(m.hq_id)?.name || ''}`.toLowerCase().includes(ql)));
  const agit = members.filter((m) => m.is_agitator).length;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <Badge variant="secondary">Усього: {members.length}</Badge>
        <Badge variant="secondary">Команди штабів: {members.length - agit}</Badge>
        <Badge variant="secondary">Агітатори: {agit}</Badge>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <Input placeholder="Пошук за ім’ям, посадою, телефоном…" value={q} onChange={(e) => setQ(e.target.value)} />
        <select className="h-10 rounded-md border bg-background px-3 text-sm" value={hqFilter} onChange={(e) => setHqFilter(e.target.value)}>
          <option value="">Усі штаби</option>
          {hqs.map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}
        </select>
      </div>
      {list.length === 0 ? <p className="text-sm text-muted-foreground py-6 text-center">Нікого не знайдено. Люди додаються у вкладці «Команда» кожного штабу.</p> : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2">
          {list.map((m) => <PersonCard key={m.id} m={m} hq={hqBy.get(m.hq_id)} showHq />)}
        </div>
      )}
    </div>
  );
}

function Section({ title, icon: Icon, list, hqBy, empty, showHq }: { title: string; icon: typeof Crown; list: HqMember[]; hqBy: Map<string, PartyHq>; empty: string; showHq?: boolean }) {
  return (
    <div>
      <h3 className="font-semibold mb-2 flex items-center gap-2"><Icon className="h-5 w-5 text-primary" />{title} ({list.length})</h3>
      {list.length === 0 ? <p className="text-sm text-muted-foreground">{empty}</p> : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2">
          {list.map((m) => <PersonCard key={m.id} m={m} hq={hqBy.get(m.hq_id)} showHq={showHq} />)}
        </div>
      )}
    </div>
  );
}

function PersonCard({ m, hq, showHq }: { m: HqMember; hq?: PartyHq; showHq?: boolean }) {
  return (
    <Card className="p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-medium truncate">{m.full_name}</p>
          {m.position && <p className="text-sm text-muted-foreground truncate">{m.position}</p>}
          {showHq && hq && <p className="text-xs text-muted-foreground truncate">{levelLabel(hq.level)}: {hq.name}</p>}
        </div>
        {m.is_agitator && <Badge variant="outline" className="shrink-0"><Megaphone className="h-3 w-3 mr-1" />Агітатор</Badge>}
      </div>
      {m.phone && <a href={`tel:${m.phone}`} className="mt-2 inline-flex items-center gap-1 text-sm text-primary min-h-[32px]"><Phone className="h-3.5 w-3.5" />{m.phone}</a>}
    </Card>
  );
}
