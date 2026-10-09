import { useCallback, useEffect, useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ArrowLeft, Plus, Trash2, Vote, FileCheck2, RefreshCw, Star, FlaskConical } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';
import { CAMPAIGN_MODES, campaignPrecincts, type CampaignMode } from '@/lib/campaignMode';
import { ProtocolPhotos } from './ProtocolPhotos';
import { TentsPanel } from './TentsPanel';
import { ElectionDayPanel } from './ElectionDayPanel';
import { HqBoardPanel } from './HqBoardPanel';
import { IncidentsPanel } from './IncidentsPanel';
import { supabase } from '@/integrations/supabase/client';
import type { ProtocolPhoto } from '@/hooks/orgs/useOrganizations';
import {
  ELECTION_TYPES, HQ_LEVELS, LOCAL_KINDS, levelPlural, campaignLevelPlural, partyActions, partyExtra,
  type Campaign, type Candidate, type ElectionType, type HqLevel, type LocalKind, type PartyHq, type Precinct, type Protocol,
} from '@/hooks/orgs/useOrganizations';

const sel = 'w-full h-10 rounded-md border bg-background px-3 text-sm';
const typeLabel = (c: Campaign) => c.election_type === 'local'
  ? `Місцеві: ${LOCAL_KINDS.find((k) => k.value === c.local_kind)?.label || ''}`
  : ELECTION_TYPES.find((t) => t.value === c.election_type)?.label;

export function CampaignsPanel({ orgId, isAdmin }: { orgId: string; isAdmin: boolean }) {
  const [list, setList] = useState<Campaign[]>([]);
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState<Campaign | null>(null);
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => setList(await partyExtra.listCampaigns(orgId)), [orgId]);
  const hasTest = list.some((c) => c.is_test);
  useEffect(() => { load(); }, [load]);

  if (current) return <CampaignView orgId={orgId} campaign={current} isAdmin={isAdmin} onBack={() => setCurrent(null)} />;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h2 className="text-lg font-semibold flex items-center gap-2"><Vote className="h-5 w-5 text-primary" /> Виборчі кампанії</h2>
        {isAdmin && <Button size="sm" onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-1" /> Нова кампанія</Button>}
      </div>
      {isAdmin && hasTest && (
        <Card className="p-3 flex flex-wrap items-center justify-between gap-2 border-dashed">
          <div className="text-sm">
            <p className="font-medium">Тестові та навчальні кампанії</p>
            <p className="text-muted-foreground text-xs">Видаляються лише їхні протоколи й голоси. Справжні штаби, дільниці та люди залишаються.</p>
          </div>
          <Button size="sm" variant="destructive" disabled={busy} onClick={async () => {
            if (!confirm('Видалити всі тестові й навчальні кампанії з їхніми протоколами? Штаби й дільниці залишаться.')) return;
            setBusy(true); if (await partyExtra.removeTestData(orgId)) load(); setBusy(false);
          }}><Trash2 className="h-4 w-4 mr-1" /> Видалити тестові дані</Button>
        </Card>
      )}
      {list.length === 0 && <p className="text-sm text-muted-foreground py-6 text-center">Кампаній ще немає</p>}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
        {list.map((c) => (
          <Card key={c.id} className="p-4 cursor-pointer hover:border-primary transition-colors" onClick={() => setCurrent(c)}>
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="flex flex-wrap gap-1 mb-1">
                  <Badge variant="secondary">{typeLabel(c)}</Badge>
                  {c.mode && c.mode !== 'real' && <Badge variant="outline" className="border-primary text-primary"><FlaskConical className="h-3 w-3 mr-1" />{c.mode === 'test' ? 'Тест' : 'Навчання'}</Badge>}
                </div>
                <p className="font-semibold">{c.name}</p>
                <p className="text-xs text-muted-foreground">
                  {c.election_date ? new Date(c.election_date).toLocaleDateString('uk-UA') : 'Дата не вказана'}{c.round > 1 ? ` · ${c.round} тур` : ''}
                  {c.status === 'finished' ? ' · завершена' : ''}
                </p>
              </div>
              {isAdmin && (
                <Button size="icon" variant="ghost" onClick={async (e) => {
                  e.stopPropagation();
                  if (confirm(`Видалити кампанію «${c.name}» разом з протоколами?`) && await partyExtra.removeCampaign(c.id)) load();
                }}><Trash2 className="h-4 w-4 text-destructive" /></Button>
              )}
            </div>
          </Card>
        ))}
      </div>
      <CampaignDialog open={open} onOpenChange={setOpen} orgId={orgId} onSaved={load} />
    </div>
  );
}

function CampaignDialog({ open, onOpenChange, orgId, onSaved }: { open: boolean; onOpenChange: (v: boolean) => void; orgId: string; onSaved: () => void }) {
  const [name, setName] = useState('');
  const [type, setType] = useState<ElectionType>('presidential');
  const [kind, setKind] = useState<LocalKind>('mayor');
  const [date, setDate] = useState('');
  const [round, setRound] = useState(1);
  const [mode, setMode] = useState<CampaignMode>('real');
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [hqs, setHqs] = useState<PartyHq[]>([]);
  const [precincts, setPrecincts] = useState<Precinct[]>([]);
  useEffect(() => {
    if (!open) return;
    setName(''); setDate(''); setRound(1); setMode('real'); setPicked(new Set());
    Promise.all([partyActions.listHqs(orgId), partyExtra.listOrgPrecincts(orgId)]).then(([h, p]) => { setHqs(h); setPrecincts(p); });
  }, [open, orgId]);
  const toggle = (ids: string[], on: boolean) => setPicked((prev) => { const n = new Set(prev); ids.forEach((i) => (on ? n.add(i) : n.delete(i))); return n; });
  const save = async () => {
    if (!name.trim()) return;
    if (await partyExtra.saveCampaign(orgId, { name: name.trim(), election_type: type, local_kind: kind, election_date: date || null, round, mode, precinct_ids: [...picked] })) { onOpenChange(false); onSaved(); }
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Нова виборча кампанія</DialogTitle></DialogHeader>
        <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-1">
          <div><Label>Режим</Label>
            <select className={sel} value={mode} onChange={(e) => setMode(e.target.value as CampaignMode)}>
              {CAMPAIGN_MODES.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
            <p className="text-xs text-muted-foreground mt-1">{CAMPAIGN_MODES.find((m) => m.value === mode)?.hint}</p>
          </div>
          {mode !== 'real' && (
            <div className="rounded-md border p-2 space-y-2">
              <p className="text-sm font-medium">Учасники: {picked.size ? `${picked.size} дільниць` : 'уся структура'}</p>
              <p className="text-xs text-muted-foreground">Позначте штаби або окремі дільниці. Якщо нічого не вибрати — бере участь уся структура.</p>
              {precincts.length === 0 && <p className="text-xs text-muted-foreground">Дільниць ще немає — додайте їх у штабах.</p>}
              {hqs.filter((h) => precincts.some((p) => p.hq_id === h.id)).map((h) => {
                const ps = precincts.filter((p) => p.hq_id === h.id);
                const all = ps.every((p) => picked.has(p.id));
                return (
                  <div key={h.id} className="space-y-1">
                    <label className="flex items-center gap-2 text-sm font-medium min-h-[36px]"><Checkbox checked={all} onCheckedChange={(v) => toggle(ps.map((p) => p.id), v === true)} />{h.name}</label>
                    <div className="pl-6 grid grid-cols-2 sm:grid-cols-3 gap-1">
                      {ps.map((p) => (
                        <label key={p.id} className="flex items-center gap-2 text-xs min-h-[32px]"><Checkbox checked={picked.has(p.id)} onCheckedChange={(v) => toggle([p.id], v === true)} />№ {p.number}</label>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          <div><Label>Тип виборів</Label>
            <select className={sel} value={type} onChange={(e) => setType(e.target.value as ElectionType)}>
              {ELECTION_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          {type === 'local' && (
            <div><Label>Що обираємо</Label>
              <select className={sel} value={kind} onChange={(e) => setKind(e.target.value as LocalKind)}>
                {LOCAL_KINDS.map((k) => <option key={k.value} value={k.value}>{k.label}</option>)}
              </select>
            </div>
          )}
          <div><Label>Назва</Label><Input placeholder="напр. Вибори Чернівецького міського голови 2026" value={name} onChange={(e) => setName(e.target.value)} /></div>
          <div className="grid grid-cols-2 gap-2">
            <div><Label>Дата виборів</Label><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div>
            <div><Label>Тур</Label><Input type="number" min={1} max={2} value={round} onChange={(e) => setRound(Number(e.target.value) || 1)} /></div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Скасувати</Button>
          <Button onClick={save} disabled={!name.trim()}>Створити</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CampaignView({ orgId, campaign, isAdmin, onBack }: { orgId: string; campaign: Campaign; isAdmin: boolean; onBack: () => void }) {
  const { user } = useAuth();
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [hqs, setHqs] = useState<PartyHq[]>([]);
  const [precincts, setPrecincts] = useState<Precinct[]>([]);
  const [protocols, setProtocols] = useState<Protocol[]>([]);
  const [managed, setManaged] = useState<Set<string>>(new Set());
  const [mine, setMine] = useState<Set<string>>(new Set());
  const [proto, setProto] = useState<Precinct | null>(null);
  const [results, setResults] = useState<Awaited<ReturnType<typeof partyExtra.results>>>({ votes: [], progress: [] });
  const candLabel = ELECTION_TYPES.find((t) => t.value === campaign.election_type)?.candidateLabel || 'Кандидат';

  const load = useCallback(async () => {
    const [c, h, p, pr, m, r] = await Promise.all([
      partyExtra.listCandidates(campaign.id), partyActions.listHqs(orgId), partyExtra.listOrgPrecincts(orgId),
      partyExtra.listProtocols(campaign.id), partyExtra.listManagers(orgId), partyExtra.results(campaign.id),
    ]);
    setCandidates(c); setHqs(h); setPrecincts(campaignPrecincts(p, campaign.mode, campaign.precinct_ids)); setProtocols(pr); setResults(r);
    setManaged(new Set(m.filter((x) => x.user_id === user?.id).map((x) => x.hq_id)));
    if (user?.id) {
      const { data: pm } = await (supabase as any).from('precinct_members').select('precinct_id').eq('organization_id', orgId).eq('user_id', user.id);
      setMine(new Set((pm || []).map((x: any) => x.precinct_id)));
    }
  }, [campaign.id, orgId, user?.id]);
  useEffect(() => { load(); }, [load]);

  const byId = useMemo(() => new Map(hqs.map((h) => [h.id, h])), [hqs]);
  const canManageHq = (hqId: string) => {
    if (isAdmin) return true;
    let cur = byId.get(hqId); let g = 0;
    while (cur && g++ < 10) { if (managed.has(cur.id)) return true; cur = cur.parent_id ? byId.get(cur.parent_id) : undefined; }
    return false;
  };
  const canEditPrecinct = (p: Precinct) => campaign.status !== 'finished' && (canManageHq(p.hq_id) || mine.has(p.id));
  const isObserver = mine.size > 0 && !isAdmin && managed.size === 0;

  return (
    <div className="space-y-4">
      <Button variant="ghost" size="sm" onClick={onBack}><ArrowLeft className="h-4 w-4 mr-1" /> До кампаній</Button>
      <Card className="p-4">
        <Badge variant="secondary" className="mb-1">{typeLabel(campaign)}</Badge>
        <h2 className="text-xl font-bold">{campaign.name}</h2>
        <p className="text-sm text-muted-foreground">{campaign.election_date ? new Date(campaign.election_date).toLocaleDateString('uk-UA') : ''}{campaign.round > 1 ? ` · ${campaign.round} тур` : ''}</p>
        {campaign.mode && campaign.mode !== 'real' && (
          <p className="text-xs mt-2 text-primary flex items-center gap-1"><FlaskConical className="h-3.5 w-3.5" />
            {campaign.mode === 'test' ? 'Тестова' : 'Навчальна'} кампанія · {precincts.length} дільниць · дані можна видалити без шкоди для штабів</p>
        )}
      </Card>
      {campaign.mode === 'training' && (
        <Card className="p-3 text-sm space-y-1 border-primary/40">
          <p className="font-medium">Як працювати на дільниці</p>
          <ol className="list-decimal pl-5 text-muted-foreground space-y-0.5">
            <li>Відкрийте вкладку «Протоколи» та знайдіть свою дільницю.</li>
            <li>Натисніть «Внести» і перепишіть кількість виборців і виданих бюлетенів.</li>
            <li>Внесіть недійсні бюлетені та голоси за кожного кандидата.</li>
            <li>Перевірте, що сума голосів і недійсних дорівнює виданим бюлетеням, і збережіть.</li>
            <li>Штаб одразу бачить результат у вкладці «Результати».</li>
          </ol>
        </Card>
      )}
      {isObserver && (
        <Card className="p-3 text-sm border-primary/40">
          <p className="font-medium">Кабінет спостерігача</p>
          <p className="text-muted-foreground text-xs">Тут ваші дільниці: підтвердьте відкриття, передайте явку о 12, 16 і 20 годині, повідомляйте про порушення, а після підрахунку натисніть «Протокол» — внесіть результати й сфотографуйте аркуші.</p>
        </Card>
      )}
      <Tabs defaultValue={isObserver ? 'day' : 'results'} key={isObserver ? 'obs' : 'hq'}>
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="results">Результати</TabsTrigger>
          <TabsTrigger value="board">Табло</TabsTrigger>
          <TabsTrigger value="day">{isObserver ? 'Моя дільниця' : 'День виборів'}</TabsTrigger>
          <TabsTrigger value="incidents">Порушення (юристи)</TabsTrigger>
          <TabsTrigger value="protocols">Протоколи</TabsTrigger>
          <TabsTrigger value="candidates">{campaign.election_type === 'parliamentary' ? 'Партії / кандидати' : 'Кандидати'} ({candidates.length})</TabsTrigger>
          <TabsTrigger value="tents">Намети</TabsTrigger>
        </TabsList>
        <TabsContent value="results"><ResultsView hqs={hqs} candidates={candidates} results={results} onRefresh={load} /></TabsContent>
        <TabsContent value="board"><HqBoardPanel campaign={campaign} hqs={hqs} precincts={precincts} protocols={protocols} onRefresh={load} onOpen={candidates.length ? setProto : undefined} /></TabsContent>
        <TabsContent value="day"><ElectionDayPanel orgId={orgId} campaign={campaign} hqs={hqs} precincts={precincts} canManageHq={canManageHq} onProtocol={candidates.length ? setProto : undefined} protocolIds={new Set(protocols.map((x) => x.precinct_id))} /></TabsContent>
        <TabsContent value="incidents"><IncidentsPanel campaign={campaign} hqs={hqs} precincts={precincts} canManageHq={canManageHq} /></TabsContent>
        <TabsContent value="protocols">
          <ProtocolsView orgId={orgId} campaign={campaign} hqs={hqs} precincts={precincts} protocols={protocols} candidates={candidates} canEditPrecinct={canEditPrecinct} onSaved={load} />
        </TabsContent>
        <TabsContent value="candidates">
          <CandidatesView orgId={orgId} campaignId={campaign.id} candidates={candidates} label={candLabel} isAdmin={isAdmin} onSaved={load} />
        </TabsContent>
        <TabsContent value="tents"><TentsPanel orgId={orgId} campaign={campaign} hqs={hqs} canManageHq={canManageHq} /></TabsContent>
      </Tabs>
      {proto && (
        <ProtocolDialog orgId={orgId} campaign={campaign} precinct={proto} protocol={protocols.find((x) => x.precinct_id === proto.id) || null}
          candidates={candidates} readOnly={!canEditPrecinct(proto)} onClose={() => setProto(null)} onSaved={() => { setProto(null); load(); }} />
      )}
    </div>
  );
}

function CandidatesView({ orgId, campaignId, candidates, label, isAdmin, onSaved }: { orgId: string; campaignId: string; candidates: Candidate[]; label: string; isAdmin: boolean; onSaved: () => void }) {
  const [name, setName] = useState(''); const [party, setParty] = useState(''); const [num, setNum] = useState(''); const [ours, setOurs] = useState(false);
  const add = async () => {
    if (!name.trim()) return;
    if (await partyExtra.saveCandidate(orgId, campaignId, { name: name.trim(), party, ballot_number: num ? Number(num) : null, is_ours: ours })) {
      setName(''); setParty(''); setNum(''); setOurs(false); onSaved();
    }
  };
  return (
    <div className="space-y-3">
      {isAdmin && (
        <Card className="p-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2 items-center">
          <Input placeholder={label} value={name} onChange={(e) => setName(e.target.value)} />
          <Input placeholder="Партія / висування" value={party} onChange={(e) => setParty(e.target.value)} />
          <Input placeholder="№ у бюлетені" type="number" value={num} onChange={(e) => setNum(e.target.value)} />
          <label className="flex items-center gap-2 text-sm"><Checkbox checked={ours} onCheckedChange={(v) => setOurs(v === true)} /> Наш кандидат</label>
          <Button onClick={add}><Plus className="h-4 w-4 mr-1" /> Додати</Button>
        </Card>
      )}
      <Card className="p-3">
        {candidates.length === 0 && <p className="text-sm text-muted-foreground">Додайте учасників виборів</p>}
        {candidates.map((c) => (
          <div key={c.id} className="flex items-center justify-between gap-2 py-2 border-b last:border-0 text-sm">
            <div className="min-w-0">
              <p className="truncate flex items-center gap-1">{c.ballot_number ? `${c.ballot_number}. ` : ''}{c.name}{c.is_ours && <Star className="h-3.5 w-3.5 text-primary fill-current" />}</p>
              {c.party && <p className="text-xs text-muted-foreground truncate">{c.party}</p>}
            </div>
            {isAdmin && <Button size="icon" variant="ghost" onClick={async () => { if (confirm('Видалити разом з голосами?') && await partyExtra.removeCandidate(c.id)) onSaved(); }}><Trash2 className="h-4 w-4 text-destructive" /></Button>}
          </div>
        ))}
      </Card>
    </div>
  );
}

function ProtocolsView({ orgId, campaign, hqs, precincts, protocols, candidates, canEditPrecinct, onSaved }: {
  orgId: string; campaign: Campaign; hqs: PartyHq[]; precincts: Precinct[]; protocols: Protocol[]; candidates: Candidate[];
  canEditPrecinct: (p: Precinct) => boolean; onSaved: () => void;
}) {
  const [hqId, setHqId] = useState('');
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<'all' | 'missing' | 'done'>('all');
  const [editing, setEditing] = useState<Precinct | null>(null);
  const protoBy = useMemo(() => new Map(protocols.map((p) => [p.precinct_id, p])), [protocols]);
  const hqName = useMemo(() => new Map(hqs.map((h) => [h.id, h.name])), [hqs]);
  const hqsWithPrecincts = hqs.filter((h) => precincts.some((p) => p.hq_id === h.id));
  const rows = precincts.filter((p) =>
    (!hqId || p.hq_id === hqId) &&
    (!q || `${p.number} ${p.address || ''}`.toLowerCase().includes(q.toLowerCase())) &&
    (filter === 'all' || (filter === 'done') === protoBy.has(p.id)));
  const done = precincts.filter((p) => protoBy.has(p.id)).length;

  return (
    <div className="space-y-3">
      <Card className="p-3 space-y-2">
        <div className="flex justify-between text-sm"><span>Внесено протоколів</span><span className="font-medium">{done} з {precincts.length}</span></div>
        <Progress value={precincts.length ? (done / precincts.length) * 100 : 0} />
      </Card>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <select className={sel} value={hqId} onChange={(e) => setHqId(e.target.value)}>
          <option value="">Усі штаби</option>
          {hqsWithPrecincts.map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}
        </select>
        <select className={sel} value={filter} onChange={(e) => setFilter(e.target.value as any)}>
          <option value="all">Усі дільниці</option><option value="missing">Без протоколу</option><option value="done">З протоколом</option>
        </select>
        <Input placeholder="№ дільниці або адреса" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      {candidates.length === 0 && <p className="text-sm text-destructive">Спершу додайте кандидатів у вкладці «Кандидати».</p>}
      {precincts.length === 0 && <p className="text-sm text-muted-foreground">Дільниць ще немає — додайте їх у штабах (вкладка «Дільниці»).</p>}
      <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-2">
        {rows.slice(0, 300).map((p) => {
          const pr = protoBy.get(p.id); const can = canEditPrecinct(p);
          return (
            <Card key={p.id} className="p-3 flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="font-medium">Дільниця № {p.number}</p>
                <p className="text-xs text-muted-foreground truncate">{hqName.get(p.hq_id)}{p.address ? ` · ${p.address}` : ''}</p>
                {pr ? <Badge className="mt-1"><FileCheck2 className="h-3 w-3 mr-1" />протокол внесено</Badge> : <Badge variant="outline" className="mt-1">немає протоколу</Badge>}
              </div>
              {(can || pr) && <Button size="sm" variant={pr ? 'outline' : 'default'} disabled={!candidates.length} onClick={() => setEditing(p)}>{can ? (pr ? 'Змінити' : 'Внести') : 'Переглянути'}</Button>}
            </Card>
          );
        })}
      </div>
      {rows.length > 300 && <p className="text-xs text-muted-foreground">Показано 300 з {rows.length}. Уточніть пошук.</p>}
      {editing && (
        <ProtocolDialog orgId={orgId} campaign={campaign} precinct={editing} protocol={protoBy.get(editing.id) || null}
          candidates={candidates} readOnly={!canEditPrecinct(editing)} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); onSaved(); }} />
      )}
    </div>
  );
}

function ProtocolDialog({ orgId, campaign, precinct, protocol, candidates, readOnly, onClose, onSaved }: {
  orgId: string; campaign: Campaign; precinct: Precinct; protocol: Protocol | null; candidates: Candidate[]; readOnly: boolean; onClose: () => void; onSaved: () => void;
}) {
  const [voters, setVoters] = useState(protocol?.voters_on_list ?? precinct.voters_count ?? 0);
  const [ballots, setBallots] = useState(protocol?.ballots_issued ?? 0);
  const [invalid, setInvalid] = useState(protocol?.invalid_ballots ?? 0);
  const [votes, setVotes] = useState<Record<string, number>>({});
  const [photos, setPhotos] = useState<ProtocolPhoto[]>(Array.isArray(protocol?.photos) ? protocol!.photos! : []);
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (!protocol) return;
    partyExtra.loadProtocolVotes(protocol.id).then((v) => setVotes(Object.fromEntries(v.map((x) => [x.candidate_id, x.votes]))));
  }, [protocol]);
  const sum = candidates.reduce((s, c) => s + (votes[c.id] || 0), 0);
  const mismatch = ballots > 0 && sum + invalid !== ballots;
  const save = async () => {
    setSaving(true);
    const all = Object.fromEntries(candidates.map((c) => [c.id, votes[c.id] || 0]));
    const ok = await partyExtra.saveProtocol(orgId, campaign.id, precinct.id, { voters_on_list: voters, ballots_issued: ballots, invalid_ballots: invalid, status: 'submitted', photos }, all);
    setSaving(false);
    if (ok) {
      toast.success(`Протокол дільниці № ${precinct.number} збережено`, {
        description: `Голосів: ${sum}${photos.length ? ` · фото: ${photos.length}` : ''}`, duration: 5000,
      });
      onSaved();
    }
  };
  const num = (v: number, set: (n: number) => void) => (
    <Input type="number" min={0} inputMode="numeric" disabled={readOnly} value={v || ''} onChange={(e) => set(Math.max(0, Number(e.target.value) || 0))} />
  );
  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Протокол · Дільниця № {precinct.number}</DialogTitle></DialogHeader>
        <div className="grid grid-cols-3 gap-2">
          <div><Label className="text-xs">Виборців у списку</Label>{num(voters, setVoters)}</div>
          <div><Label className="text-xs">Отримали бюлетені</Label>{num(ballots, setBallots)}</div>
          <div><Label className="text-xs">Недійсні</Label>{num(invalid, setInvalid)}</div>
        </div>
        <div className="space-y-2">
          {candidates.map((c) => (
            <div key={c.id} className="flex items-center gap-2">
              <span className="flex-1 text-sm truncate">{c.ballot_number ? `${c.ballot_number}. ` : ''}{c.name}</span>
              <div className="w-28">{num(votes[c.id] || 0, (n) => setVotes((v) => ({ ...v, [c.id]: n })))}</div>
            </div>
          ))}
        </div>
        <div className="text-sm space-y-1 border-t pt-2">
          <p>Сума голосів: <b>{sum}</b>{voters > 0 && ballots > 0 && <> · Явка: <b>{((ballots / voters) * 100).toFixed(1)}%</b></>}</p>
          {mismatch && <p className="text-destructive text-xs">Увага: голоси ({sum}) + недійсні ({invalid}) не дорівнюють кількості бюлетенів ({ballots}).</p>}
        </div>
        <ProtocolPhotos photos={photos} onChange={setPhotos} readOnly={readOnly} campaignId={campaign.id} precinctId={precinct.id} />
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Закрити</Button>
          {!readOnly && <Button onClick={save} disabled={saving}>Зберегти протокол</Button>}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ResultsView({ hqs, candidates, results, onRefresh }: {
  hqs: PartyHq[]; candidates: Candidate[]; results: Awaited<ReturnType<typeof partyExtra.results>>; onRefresh: () => void;
}) {
  const [scope, setScope] = useState<'total' | HqLevel>('total');
  const votesFor = (hqId: string | null) => {
    const m = new Map<string, number>();
    results.votes.filter((v) => v.hq_id === hqId).forEach((v) => m.set(v.candidate_id, Number(v.votes)));
    return m;
  };
  const progFor = (hqId: string | null) => results.progress.find((p) => p.hq_id === hqId);

  const Block = ({ title, hqId }: { title: string; hqId: string | null }) => {
    const v = votesFor(hqId); const pr = progFor(hqId);
    const total = Array.from(v.values()).reduce((a, b) => a + b, 0);
    const sorted = [...candidates].sort((a, b) => (v.get(b.id) || 0) - (v.get(a.id) || 0));
    return (
      <Card className="p-4 space-y-3">
        <div className="flex flex-wrap justify-between gap-2">
          <p className="font-semibold">{title}</p>
          {pr && <p className="text-xs text-muted-foreground">
            Оброблено {pr.protocols} з {pr.precincts} дільниць ({pr.precincts ? Math.round((Number(pr.protocols) / Number(pr.precincts)) * 100) : 0}%)
            {Number(pr.voters) > 0 && Number(pr.ballots) > 0 && ` · явка ${((Number(pr.ballots) / Number(pr.voters)) * 100).toFixed(1)}%`}
          </p>}
        </div>
        {total === 0 ? <p className="text-sm text-muted-foreground">Ще немає даних</p> : sorted.map((c, i) => {
          const n = v.get(c.id) || 0; const pct = total ? (n / total) * 100 : 0;
          return (
            <div key={c.id} className="space-y-1">
              <div className="flex justify-between gap-2 text-sm">
                <span className={`truncate ${c.is_ours ? 'font-semibold text-primary' : ''}`}>{i + 1}. {c.name}{c.party ? ` (${c.party})` : ''}</span>
                <span className="shrink-0 tabular-nums">{n.toLocaleString('uk-UA')} · {pct.toFixed(2)}%</span>
              </div>
              <Progress value={pct} className="h-2" />
            </div>
          );
        })}
      </Card>
    );
  };

  const levels = HQ_LEVELS.filter((l) => hqs.some((h) => h.level === l.value));
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2 items-center">
        <select className={`${sel} sm:w-72`} value={scope} onChange={(e) => setScope(e.target.value as any)}>
          <option value="total">Загалом</option>
          {levels.map((l) => <option key={l.value} value={l.value}>По рівню: {campaignLevelPlural(l.value)}</option>)}
        </select>
        <Button variant="outline" size="sm" onClick={onRefresh}><RefreshCw className="h-4 w-4 mr-1" /> Оновити</Button>
      </div>
      {scope === 'total' ? <Block title="Загальні результати" hqId={null} /> : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
          {hqs.filter((h) => h.level === scope).map((h) => <Block key={h.id} title={h.name} hqId={h.id} />)}
        </div>
      )}
    </div>
  );
}
