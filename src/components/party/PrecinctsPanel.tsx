import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { CoverageChart } from './CoverageChart';
import { coverageStatus, matchesFilter, comparePrecinctNumber, type CoverageFilter, type Quotas, type CoverageCounts } from '@/lib/precinctCoverage';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Plus, Trash2 } from 'lucide-react';
import { partyActions, type Precinct, type PrecinctMember, type PrecinctRole } from '@/hooks/orgs/useOrganizations';
import { toast } from 'sonner';
import { okrugNumber } from '@/lib/hqSort';

interface Props { orgId: string; hqId: string; canEdit: boolean }

function PrecinctPeople({ orgId, precinct, canEdit, onChanged }: { orgId: string; precinct: Precinct; canEdit: boolean; onChanged?: () => void }) {
  const [people, setPeople] = useState<PrecinctMember[]>([]);
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<PrecinctRole>('commission');
  const [position, setPosition] = useState('');
  const [phone, setPhone] = useState('');

  const load = useCallback(async () => {
    setPeople(await partyActions.listPrecinctMembers(precinct.id));
  }, [precinct.id]);
  const reload = () => { load(); onChanged?.(); };
  useEffect(() => { load(); }, [load]);

  const add = async () => {
    if (!fullName.trim()) { toast.error('Вкажіть прізвище та ім’я'); return; }
    if (await partyActions.savePrecinctMember(orgId, precinct.id, { full_name: fullName.trim(), role, position, phone })) {
      setFullName(''); setPosition(''); setPhone(''); reload();
    }
  };

  const commission = people.filter((p) => p.role === 'commission');
  const observers = people.filter((p) => p.role === 'observer');
  const media = people.filter((p) => p.role === 'media');

  return (
    <div className="space-y-3">
      {canEdit && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2">
          <Input placeholder="Прізвище та ім’я" value={fullName} onChange={(e) => setFullName(e.target.value)} />
          <select className="h-10 rounded-md border bg-background px-3 text-sm" value={role} onChange={(e) => setRole(e.target.value as PrecinctRole)}>
            <option value="commission">Член комісії</option>
            <option value="observer">Спостерігач</option>
            <option value="media">Представник ЗМІ</option>
          </select>
          <Input placeholder="Посада / видання" value={position} onChange={(e) => setPosition(e.target.value)} />
          <Input placeholder="Телефон" value={phone} onChange={(e) => setPhone(e.target.value)} />
          <Button size="sm" onClick={add}><Plus className="h-4 w-4 mr-1" />Додати</Button>
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {[{ title: `Члени комісії (${commission.length})`, list: commission }, { title: `Спостерігачі (${observers.length})`, list: observers }, { title: `ЗМІ (${media.length})`, list: media }].map((b) => (
          <div key={b.title}>
            <p className="text-sm font-medium mb-1">{b.title}</p>
            {b.list.length === 0 && <p className="text-xs text-muted-foreground">Немає записів</p>}
            {b.list.map((p) => (
              <div key={p.id} className="flex items-center justify-between gap-2 text-sm border-b last:border-0 py-1.5">
                <div className="min-w-0">
                  <p className="truncate">{p.full_name}</p>
                  <p className="text-xs text-muted-foreground truncate">{[p.position, p.phone].filter(Boolean).join(' · ')}</p>
                </div>
                {canEdit && (
                  <Button size="icon" variant="ghost" onClick={async () => { if (await partyActions.removePrecinctMember(p.id)) reload(); }}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

const FILTERS: { value: CoverageFilter; label: string }[] = [
  { value: 'all', label: 'Усі дільниці' },
  { value: 'needs', label: 'Потребують людей' },
  { value: 'full', label: 'Повністю укомплектовані' },
  { value: 'no_observer', label: 'Не заповнено спостерігачами' },
  { value: 'no_commission', label: 'Не заповнено членами комісії' },
  { value: 'no_media', label: 'Не заповнено ЗМІ' },
  { value: 'has_observer', label: 'Заповнено спостерігачами' },
  { value: 'has_commission', label: 'Заповнено членами комісії' },
  { value: 'has_media', label: 'Заповнено ЗМІ' },
];
const PAGE = 30;
const EMPTY: CoverageCounts = { observer: 0, commission: 0, media: 0 };

export function PrecinctsPanel({ orgId, hqId, canEdit }: Props) {
  const [precincts, setPrecincts] = useState<Precinct[]>([]);
  const [counts, setCounts] = useState<Map<string, CoverageCounts>>(new Map());
  const [quotas, setQuotas] = useState<Quotas>({ observer: 1, commission: 1, media: 0 });
  const [number, setNumber] = useState('');
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [voters, setVoters] = useState('');
  const [bulkFrom, setBulkFrom] = useState('');
  const [bulkTo, setBulkTo] = useState('');
  const [filter, setFilter] = useState<CoverageFilter>('all');
  const [search, setSearch] = useState('');
  const [limit, setLimit] = useState(PAGE);
  const [open, setOpen] = useState('');
  const [okrug, setOkrug] = useState<number | null>(null);
  const [importing, setImporting] = useState(false);

  const loadCounts = useCallback(async (ids: string[]) => {
    const m = new Map<string, CoverageCounts>();
    for (let i = 0; i < ids.length; i += 150) {
      const { data } = await supabase.from('precinct_members').select('precinct_id,role').in('precinct_id', ids.slice(i, i + 150));
      (data || []).forEach((r: any) => {
        const c = m.get(r.precinct_id) || { ...EMPTY };
        if (r.role in c) c[r.role as keyof CoverageCounts]++;
        m.set(r.precinct_id, c);
      });
    }
    setCounts(m);
  }, []);

  const load = useCallback(async () => {
    const list = (await partyActions.listPrecincts(hqId)).sort((a, b) => comparePrecinctNumber(a.number, b.number));
    setPrecincts(list);
    loadCounts(list.map((p) => p.id));
    const { data: hq } = await (supabase as any).from('party_hqs').select('name,region,quota_observers,quota_commission,quota_media').eq('id', hqId).maybeSingle();
    if (hq) setOkrug(okrugNumber(hq));
    if (hq) setQuotas({ observer: hq.quota_observers ?? 1, commission: hq.quota_commission ?? 1, media: hq.quota_media ?? 0 });
  }, [hqId, loadCounts]);
  useEffect(() => { load(); }, [load]);

  const saveQuotas = async () => {
    const { error } = await (supabase as any).from('party_hqs').update({ quota_observers: quotas.observer, quota_commission: quotas.commission, quota_media: quotas.media }).eq('id', hqId);
    if (error) toast.error('Не вдалося зберегти нормативи'); else toast.success('Нормативи збережено');
  };

  const add = async () => {
    if (!number.trim()) { toast.error('Вкажіть номер дільниці'); return; }
    if (await partyActions.savePrecinct(orgId, hqId, { number: number.trim(), name, address, voters_count: Number(voters) || 0 })) {
      setNumber(''); setName(''); setAddress(''); setVoters(''); load();
    }
  };

  const bulkAdd = async () => {
    const a = Number(bulkFrom), b = Number(bulkTo);
    if (!a || !b || b < a) { toast.error('Вкажіть коректний діапазон номерів'); return; }
    if (b - a >= 500) { toast.error('Не більше 500 дільниць за раз'); return; }
    const existing = new Set(precincts.map((p) => p.number));
    const rows = [];
    for (let n = a; n <= b; n++) if (!existing.has(String(n))) rows.push({ organization_id: orgId, hq_id: hqId, number: String(n), voters_count: 0 });
    if (!rows.length) { toast.info('Усі дільниці з цього діапазону вже існують'); return; }
    const { error } = await supabase.from('precincts').insert(rows);
    if (error) { toast.error('Не вдалося створити дільниці: ' + error.message); return; }
    toast.success(`Створено дільниць: ${rows.length}`); setBulkFrom(''); setBulkTo(''); load();
  };

  const importDrv = async () => {
    if (!okrug) return;
    setImporting(true);
    try {
      const data = (await import('@/data/chernivtsiPrecincts.json')).default as Record<string, { n: string; a: string; d: string; v: number }[]>;
      const list = data[String(okrug)] || [];
      const existing = new Set(precincts.map((p) => p.number));
      const rows = list.filter((x) => !existing.has(x.n)).map((x) => ({ organization_id: orgId, hq_id: hqId, number: x.n, address: x.a, notes: x.d, voters_count: x.v }));
      if (!rows.length) { toast.info('Усі дільниці округу вже створено'); return; }
      for (let i = 0; i < rows.length; i += 100) {
        const { error } = await supabase.from('precincts').insert(rows.slice(i, i + 100));
        if (error) { toast.error('Не вдалося імпортувати дільниці: ' + error.message); return; }
      }
      toast.success(`Імпортовано з ДРВ дільниць: ${rows.length}`); load();
    } finally { setImporting(false); }
  };

  const cnt = (id: string) => counts.get(id) || EMPTY;
  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    return precincts.filter((p) => matchesFilter(cnt(p.id), quotas, filter)
      && (!s || p.number.includes(s) || (p.name || '').toLowerCase().includes(s) || (p.address || '').toLowerCase().includes(s)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [precincts, counts, quotas, filter, search]);

  const stat = (r: keyof CoverageCounts) => precincts.filter((p) => cnt(p.id)[r] > 0 && cnt(p.id)[r] >= quotas[r]).length;
  const cells = precincts.map((p) => {
    const c = cnt(p.id);
    return { id: p.id, number: p.number, status: coverageStatus(c, quotas), hint: `спостерігачі ${c.observer}/${quotas.observer}, комісія ${c.commission}/${quotas.commission}, ЗМІ ${c.media}/${quotas.media}` };
  });
  const totalVoters = precincts.reduce((s, p) => s + (p.voters_count || 0), 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 text-sm">
        <Badge variant="secondary">Дільниць: {precincts.length}</Badge>
        <Badge variant="secondary">Виборців: {totalVoters.toLocaleString('uk-UA')}</Badge>
      </div>

      <CoverageChart total={precincts.length} observers={stat('observer')} commission={stat('commission')} media={stat('media')}
        cells={cells} onCellClick={(id) => { setFilter('all'); setSearch(precincts.find((p) => p.id === id)?.number || ''); setOpen(id); }} />

      <Card className="p-3">
        <p className="text-sm font-medium mb-2">Норматив на одну дільницю</p>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 items-end">
          {([['observer', 'Спостерігачів'], ['commission', 'Членів комісії'], ['media', 'Представників ЗМІ']] as const).map(([k, l]) => (
            <label key={k} className="text-xs text-muted-foreground space-y-1">{l}
              <Input type="number" min={0} max={20} value={quotas[k]} disabled={!canEdit}
                onChange={(e) => setQuotas({ ...quotas, [k]: Math.max(0, Number(e.target.value) || 0) })} />
            </label>
          ))}
          {canEdit && <Button size="sm" onClick={saveQuotas}>Зберегти нормативи</Button>}
        </div>
      </Card>

      {canEdit && (
        <Card className="p-3 space-y-3">
          {okrug && okrug >= 201 && okrug <= 204 && (
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 justify-between rounded-md border p-3">
              <p className="text-sm">Офіційні дільниці округу №{okrug} з Державного реєстру виборців (адреси, межі, кількість виборців)</p>
              <Button size="sm" onClick={importDrv} disabled={importing}>{importing ? 'Імпорт…' : 'Імпортувати з ДРВ'}</Button>
            </div>
          )}
          <div>
            <p className="text-sm font-medium mb-2">Додати дільницю</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2">
              <Input placeholder="№" value={number} onChange={(e) => setNumber(e.target.value)} />
              <Input placeholder="Назва" value={name} onChange={(e) => setName(e.target.value)} />
              <Input placeholder="Адреса" value={address} onChange={(e) => setAddress(e.target.value)} />
              <Input placeholder="Виборців" inputMode="numeric" value={voters} onChange={(e) => setVoters(e.target.value)} />
              <Button size="sm" onClick={add}><Plus className="h-4 w-4 mr-1" />Додати</Button>
            </div>
          </div>
          <div>
            <p className="text-sm font-medium mb-2">Створити дільниці діапазоном номерів</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <Input placeholder="Від № (напр. 730001)" inputMode="numeric" value={bulkFrom} onChange={(e) => setBulkFrom(e.target.value)} />
              <Input placeholder="До № (напр. 730108)" inputMode="numeric" value={bulkTo} onChange={(e) => setBulkTo(e.target.value)} />
              <Button size="sm" variant="secondary" onClick={bulkAdd}><Plus className="h-4 w-4 mr-1" />Створити</Button>
            </div>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <select className="h-11 rounded-md border bg-background px-3 text-sm" value={filter} onChange={(e) => { setFilter(e.target.value as CoverageFilter); setLimit(PAGE); }}>
          {FILTERS.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
        </select>
        <Input placeholder="Пошук за номером або адресою" value={search} onChange={(e) => { setSearch(e.target.value); setLimit(PAGE); }} />
      </div>
      <p className="text-xs text-muted-foreground">Знайдено: {filtered.length} з {precincts.length}</p>

      {filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground">{precincts.length ? 'Немає дільниць за цим фільтром' : 'Дільниць ще немає'}</p>
      ) : (
        <Accordion type="single" collapsible className="w-full" value={open} onValueChange={setOpen}>
          {filtered.slice(0, limit).map((p) => {
            const c = cnt(p.id); const st = coverageStatus(c, quotas);
            return (
              <AccordionItem key={p.id} value={p.id}>
                <AccordionTrigger>
                  <div className="flex flex-wrap items-center gap-2 text-left">
                    <span className="font-medium">Дільниця №{p.number}</span>
                    {p.name && <span className="text-sm text-muted-foreground">{p.name}</span>}
                    <Badge variant={st === 'full' ? 'default' : 'outline'}>
                      С {c.observer}/{quotas.observer} · К {c.commission}/{quotas.commission} · ЗМІ {c.media}/{quotas.media}
                    </Badge>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-3">
                    {p.address && <p className="text-sm text-muted-foreground">{p.address}</p>}
                    {open === p.id && <PrecinctPeople orgId={orgId} precinct={p} canEdit={canEdit} onChanged={() => loadCounts(precincts.map((x) => x.id))} />}
                    {canEdit && (
                      <Button variant="ghost" size="sm" onClick={async () => { if (await partyActions.removePrecinct(p.id)) load(); }}>
                        <Trash2 className="h-4 w-4 mr-1 text-destructive" /> Видалити дільницю
                      </Button>
                    )}
                  </div>
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      )}
      {filtered.length > limit && <Button variant="outline" className="w-full" onClick={() => setLimit(limit + PAGE)}>Показати ще ({filtered.length - limit})</Button>}
    </div>
  );
}
