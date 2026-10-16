import { fetchPaged } from '@/lib/fetchPaged';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Bot, CheckCircle2, Circle, GraduationCap, Play, RotateCcw, Trash2, UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { SIM_STAGES, precinctIncident, precinctProtocol, precinctTurnout, type SimStage } from '@/lib/electionSim';
import { TRAINEE_ROLES, type TraineeRole } from '@/lib/campaignMode';
import type { Campaign, Candidate, Precinct } from '@/hooks/orgs/useOrganizations';

const db = supabase as any;
const sel = 'w-full h-11 rounded-md border bg-background px-3 text-sm';

export interface Trainee { id: string; user_id: string; full_name: string | null; role: TraineeRole; precinct_id: string | null }

const chunks = <T,>(a: T[], n = 200) => Array.from({ length: Math.ceil(a.length / n) }, (_, i) => a.slice(i * n, i * n + n));

/** Панель керівника: учасники навчання та подача даних системою замість ролей без людей. */
export function TrainingPanel({ orgId, campaign, precincts, candidates, trainees, onChanged }: {
  orgId: string; campaign: Campaign; precincts: Precinct[]; candidates: Candidate[]; trainees: Trainee[]; onChanged: () => void;
}) {
  const { user } = useAuth();
  const [people, setPeople] = useState<{ user_id: string; full_name: string }[]>([]);
  const [who, setWho] = useState(''); const [role, setRole] = useState<TraineeRole>('observer'); const [pq, setPq] = useState(''); const [pid, setPid] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [done, setDone] = useState<Set<SimStage>>(new Set());
  const isTraining = campaign.mode === 'training';
  const finished = campaign.status === 'finished';

  useEffect(() => {
    if (!isTraining) return;
    db.from('party_members').select('user_id, full_name').eq('organization_id', orgId).not('user_id', 'is', null).order('full_name')
      .then(({ data }: any) => setPeople(data || []));
  }, [orgId, isTraining]);

  const refreshDone = useCallback(async () => {
    const [{ data: r }, { count }] = await Promise.all([
      db.from('election_day_reports').select('kind, slot').eq('campaign_id', campaign.id).limit(1000),
      db.from('precinct_protocols').select('id', { count: 'exact', head: true }).eq('campaign_id', campaign.id),
    ]);
    const s = new Set<SimStage>();
    (r || []).forEach((x: any) => { if (x.kind === 'opened') s.add('opened'); if (x.kind === 'turnout') s.add(x.slot); if (x.kind === 'incident') s.add('incidents'); });
    if (count) s.add('protocols');
    setDone(s);
  }, [campaign.id]);
  useEffect(() => { refreshDone(); }, [refreshDone]);

  // Дільниці людей-спостерігачів система не чіпає — там працює учасник.
  const humanPrecincts = useMemo(() => new Set(trainees.filter((t) => t.role === 'observer' && t.precinct_id).map((t) => t.precinct_id!)), [trainees]);
  const botPrecincts = precincts.filter((p) => !humanPrecincts.has(p.id));
  const pOptions = precincts.filter((p) => !pq || `${p.number} ${p.address || ''}`.toLowerCase().includes(pq.toLowerCase())).slice(0, 50);

  const addTrainee = async () => {
    const uid = who === 'me' ? user?.id : who;
    if (!uid) { toast.error('Оберіть учасника'); return; }
    if (role === 'observer' && !pid) { toast.error('Оберіть дільницю для спостерігача'); return; }
    const name = who === 'me' ? 'Я' : people.find((p) => p.user_id === uid)?.full_name || null;
    const { error } = await db.from('campaign_trainees').insert({ organization_id: orgId, campaign_id: campaign.id, user_id: uid, full_name: name, role, precinct_id: role === 'observer' ? pid : null });
    if (error) { toast.error(error.code === '23505' ? 'Таке призначення вже є' : 'Не вдалося призначити: ' + error.message); return; }
    toast.success('Учасника призначено'); setPid(''); onChanged();
  };

  const simulate = async (stage: SimStage) => {
    if (!user) return;
    if (stage === 'protocols' && !candidates.length) { toast.error('Спершу додайте кандидатів у вкладці «Кандидати»'); return; }
    setBusy(stage);
    try {
      const base = { organization_id: orgId, campaign_id: campaign.id, created_by: user.id };
      if (stage === 'protocols') {
        const ex = await fetchPaged(() => db.from('precinct_protocols').select('precinct_id').eq('campaign_id', campaign.id).order('id'));
        const have = new Set((ex || []).map((x: any) => x.precinct_id));
        const todo = botPrecincts.filter((p) => !have.has(p.id));
        const ids = candidates.map((c) => c.id);
        for (const part of chunks(todo, 100)) {
          const gen = part.map((p) => ({ p, g: precinctProtocol(campaign.id + p.id, p.voters_count || 1000, ids) }));
          const { data, error } = await db.from('precinct_protocols').insert(gen.map(({ p, g }) => ({
            organization_id: orgId, campaign_id: campaign.id, precinct_id: p.id, voters_on_list: g.voters_on_list,
            ballots_issued: g.ballots_issued, invalid_ballots: g.invalid_ballots, status: 'submitted', submitted_by: user.id,
          }))).select('id, precinct_id');
          if (error) throw error;
          const votes = (data || []).flatMap((row: any) => {
            const g = gen.find((x) => x.p.id === row.precinct_id)!.g;
            return Object.entries(g.votes).map(([candidate_id, v]) => ({ protocol_id: row.id, candidate_id, votes: v }));
          });
          for (const vp of chunks(votes, 500)) { const r = await db.from('protocol_votes').insert(vp); if (r.error) throw r.error; }
        }
        toast.success(`Система подала ${todo.length} протоколів. Результати рахуються по-справжньому.`);
      } else {
        const kind = stage === 'opened' ? 'opened' : stage === 'incidents' ? 'incident' : 'turnout';
        const ex = await fetchPaged(() => db.from('election_day_reports').select('precinct_id, slot').eq('campaign_id', campaign.id).eq('kind', kind).order('id'));
        const have = new Set((ex || []).filter((x: any) => kind !== 'turnout' || x.slot === stage).map((x: any) => x.precinct_id));
        const rows = botPrecincts.filter((p) => !have.has(p.id)).flatMap((p) => {
          const seed = campaign.id + p.id;
          if (kind === 'opened') return [{ ...base, precinct_id: p.id, kind, quorum: true, notes: '[Система] Дільницю відкрито вчасно', photos: [] }];
          if (kind === 'turnout') return [{ ...base, precinct_id: p.id, kind, slot: stage, voted: precinctTurnout(seed, p.voters_count || 1000)[stage as '12'], photos: [] }];
          const txt = precinctIncident(seed);
          return txt ? [{ ...base, precinct_id: p.id, kind, notes: `[Система] ${txt}`, photos: [] }] : [];
        });
        for (const part of chunks(rows)) { const r = await db.from('election_day_reports').insert(part); if (r.error) throw r.error; }
        toast.success(`Система подала ${rows.length} повідомлень: ${SIM_STAGES.find((s) => s.value === stage)?.label}`);
      }
      await refreshDone(); onChanged();
    } catch (e: any) {
      toast.error('Не вдалося подати дані: ' + (e?.message || ''));
    } finally { setBusy(null); }
  };

  const reset = async () => {
    if (!confirm('Видалити всі звіти, порушення й протоколи цієї кампанії? Штаби, дільниці та люди залишаться.')) return;
    setBusy('reset');
    const a = await db.from('election_day_reports').delete().eq('campaign_id', campaign.id);
    const b = await db.from('precinct_protocols').delete().eq('campaign_id', campaign.id);
    setBusy(null);
    if (a.error || b.error) { toast.error('Не вдалося очистити дані'); return; }
    toast.success('Дані кампанії очищено — можна починати знову'); refreshDone(); onChanged();
  };

  return (
    <div className="space-y-3">
      {isTraining && (
        <Card className="p-3 space-y-3">
          <p className="font-medium flex items-center gap-2"><GraduationCap className="h-5 w-5 text-primary" /> Учасники навчання</p>
          <p className="text-xs text-muted-foreground">Призначте людей на ролі. Ролі без людей виконує система: подає відкриття, явку, порушення й протоколи на всіх інших дільницях.</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            <div><Label>Хто</Label>
              <select className={sel} value={who} onChange={(e) => setWho(e.target.value)}>
                <option value="">Оберіть людину</option>
                <option value="me">Я сам(а)</option>
                {people.map((p) => <option key={p.user_id} value={p.user_id}>{p.full_name}</option>)}
              </select>
            </div>
            <div><Label>Роль</Label>
              <select className={sel} value={role} onChange={(e) => setRole(e.target.value as TraineeRole)}>
                {TRAINEE_ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </div>
            {role === 'observer' && (
              <div><Label>Дільниця</Label>
                <Input className="h-11 mb-1" placeholder="Пошук за номером" value={pq} onChange={(e) => setPq(e.target.value)} />
                <select className={sel} value={pid} onChange={(e) => setPid(e.target.value)}>
                  <option value="">Оберіть дільницю</option>
                  {pOptions.map((p) => <option key={p.id} value={p.id}>№ {p.number}{p.address ? ` · ${p.address.slice(0, 40)}` : ''}</option>)}
                </select>
              </div>
            )}
          </div>
          <p className="text-xs text-muted-foreground">У списку — члени партії, прив'язані до акаунтів на сайті.</p>
          <Button className="min-h-11" onClick={addTrainee} disabled={finished}><UserPlus className="h-4 w-4 mr-1" /> Призначити</Button>
          {trainees.length > 0 && (
            <div className="divide-y rounded-md border">
              {trainees.map((t) => (
                <div key={t.id} className="flex items-center justify-between gap-2 p-2 text-sm">
                  <div className="min-w-0">
                    <p className="font-medium truncate">{t.full_name || 'Учасник'}</p>
                    <p className="text-xs text-muted-foreground">{TRAINEE_ROLES.find((r) => r.value === t.role)?.label}
                      {t.precinct_id ? ` · № ${precincts.find((p) => p.id === t.precinct_id)?.number || ''}` : ''}</p>
                  </div>
                  <Button size="icon" variant="ghost" className="h-11 w-11" aria-label="Зняти з ролі" onClick={async () => {
                    const { error } = await db.from('campaign_trainees').delete().eq('id', t.id);
                    if (error) toast.error('Не вдалося зняти'); else onChanged();
                  }}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}
      <Card className="p-3 space-y-3">
        <p className="font-medium flex items-center gap-2"><Bot className="h-5 w-5 text-primary" /> Система замість спостерігачів</p>
        <p className="text-xs text-muted-foreground">
          Подає дані на {botPrecincts.length} дільницях{humanPrecincts.size ? ` (крім ${humanPrecincts.size}, де працюють учасники)` : ''}. Табло, явка, перевірка бюлетенів і результати рахуються штатно — так само, як на справжніх виборах. Натискайте етапи по черзі, як іде день.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {SIM_STAGES.map((s) => (
            <Button key={s.value} variant={done.has(s.value) ? 'secondary' : 'outline'} className="min-h-11 justify-start" disabled={!!busy || finished} onClick={() => simulate(s.value)}>
              {done.has(s.value) ? <CheckCircle2 className="h-4 w-4 mr-2 text-primary" /> : <Play className="h-4 w-4 mr-2" />}
              <span className="truncate">{s.time} · {s.label}</span>
              {busy === s.value && <span className="ml-auto text-xs">…</span>}
            </Button>
          ))}
        </div>
        <Button variant="destructive" className="min-h-11" disabled={!!busy} onClick={reset}><RotateCcw className="h-4 w-4 mr-1" /> Почати день заново</Button>
      </Card>
    </div>
  );
}

/** Покрокові завдання учасника навчання. */
export function TraineeTasks({ campaignId, trainees, precincts }: { campaignId: string; trainees: Trainee[]; precincts: Precinct[] }) {
  const [rows, setRows] = useState<any[]>([]);
  const [protos, setProtos] = useState<Set<string>>(new Set());
  const obsIds = trainees.filter((t) => t.role === 'observer' && t.precinct_id).map((t) => t.precinct_id!);
  const key = obsIds.join(',');
  useEffect(() => {
    fetchPaged(() => db.from('election_day_reports').select('precinct_id, kind, slot, incident_status').eq('campaign_id', campaignId).order('id')).then(setRows);
    if (key) db.from('precinct_protocols').select('precinct_id').eq('campaign_id', campaignId).in('precinct_id', key.split(',')).then(({ data }: any) => setProtos(new Set((data || []).map((x: any) => x.precinct_id))));
  }, [campaignId, key]);
  const Step = ({ ok, children }: { ok: boolean; children: React.ReactNode }) => (
    <li className="flex items-start gap-2">{ok ? <CheckCircle2 className="h-4 w-4 mt-0.5 text-primary shrink-0" /> : <Circle className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />}<span className={ok ? 'line-through text-muted-foreground' : ''}>{children}</span></li>
  );
  const incidents = rows.filter((r) => r.kind === 'incident');
  return (
    <Card className="p-3 space-y-3 border-primary/40">
      <p className="font-medium flex items-center gap-2"><GraduationCap className="h-5 w-5 text-primary" /> Ваше навчання</p>
      {trainees.map((t) => {
        const label = TRAINEE_ROLES.find((r) => r.value === t.role)?.label;
        if (t.role === 'observer') {
          const p = precincts.find((x) => x.id === t.precinct_id);
          const my = rows.filter((r) => r.precinct_id === t.precinct_id);
          const has = (k: string, s?: string) => my.some((r) => r.kind === k && (!s || r.slot === s));
          return (
            <div key={t.id}><Badge variant="secondary" className="mb-1">{label} · № {p?.number}</Badge>
              <ol className="text-sm space-y-1">
                <Step ok={has('opened')}>07:00 — перевірте кворум комісії й підтвердьте відкриття («День виборів»)</Step>
                <Step ok={has('turnout', '12')}>12:00 — передайте явку</Step>
                <Step ok={has('turnout', '16')}>16:00 — передайте явку</Step>
                <Step ok={has('turnout', '20')}>20:00 — передайте явку</Step>
                <Step ok={has('incident')}>Зафіксуйте хоча б одне порушення з описом і фото</Step>
                <Step ok={protos.has(t.precinct_id!)}>Після підрахунку внесіть протокол і сфотографуйте аркуші — баланс бюлетенів має зійтися</Step>
              </ol>
            </div>
          );
        }
        if (t.role === 'lawyer') {
          const handled = incidents.filter((r) => r.incident_status !== 'new').length;
          const complaint = incidents.some((r) => r.incident_status === 'complaint');
          return (
            <div key={t.id}><Badge variant="secondary" className="mb-1">{label}</Badge>
              <ol className="text-sm space-y-1">
                <Step ok={incidents.length > 0}>Дочекайтеся повідомлень про порушення від спостерігачів (вкладка «Порушення»)</Step>
                <Step ok={handled > 0}>Візьміть порушення в роботу й додайте юридичну оцінку ({handled} з {incidents.length})</Step>
                <Step ok={complaint}>Підготуйте й позначте подану скаргу до ДВК або суду</Step>
              </ol>
            </div>
          );
        }
        if (t.role === 'agitation') return (
          <div key={t.id}><Badge variant="secondary" className="mb-1">{label}</Badge>
            <ol className="text-sm list-decimal pl-5 space-y-1 text-muted-foreground">
              <li>Вкладка «Намети»: розставте намети по точках і призначте агітаторів.</li>
              <li>Щодня приймайте звіти: скільки людей підійшло, скільки роздано матеріалів.</li>
              <li>Знайдіть намет без звіту за день і з'ясуйте причину.</li>
            </ol>
          </div>
        );
        return (
          <div key={t.id}><Badge variant="secondary" className="mb-1">{label}</Badge>
            <ol className="text-sm list-decimal pl-5 space-y-1 text-muted-foreground">
              <li>«Табло»: стежте, які дільниці не відкрились і не передали явку.</li>
              <li>«День виборів»: порівняйте явку 12/16/20 між штабами.</li>
              <li>«Результати»: після протоколів перевірте підсумок і відсоток опрацьованих дільниць.</li>
            </ol>
          </div>
        );
      })}
    </Card>
  );
}
