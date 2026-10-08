import { useCallback, useEffect, useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Phone, RefreshCw, Scale } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import type { Campaign, PartyHq, Precinct, ProtocolPhoto } from '@/hooks/orgs/useOrganizations';

const db = supabase as any;
const sel = 'h-10 rounded-md border bg-background px-3 text-sm';
export const INCIDENT_STATUSES = [
  { value: 'new', label: 'Нове' },
  { value: 'in_work', label: 'В роботі' },
  { value: 'act', label: 'Складено акт' },
  { value: 'complaint', label: 'Подано скаргу' },
  { value: 'closed', label: 'Закрито' },
] as const;

interface Row { id: string; precinct_id: string; notes: string | null; photos: ProtocolPhoto[]; created_at: string; created_by: string | null; incident_status: string; legal_notes: string | null }

export function IncidentsPanel({ campaign, hqs, precincts, canManageHq }: { campaign: Campaign; hqs: PartyHq[]; precincts: Precinct[]; canManageHq: (id: string) => boolean }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [phones, setPhones] = useState<Map<string, { name: string; phone: string | null }>>(new Map());
  const [status, setStatus] = useState('open');
  const [draft, setDraft] = useState<Record<string, string>>({});
  const pById = useMemo(() => new Map(precincts.map((p) => [p.id, p])), [precincts]);
  const hqName = useMemo(() => new Map(hqs.map((h) => [h.id, h.name])), [hqs]);

  const load = useCallback(async () => {
    const { data } = await db.from('election_day_reports').select('id,precinct_id,notes,photos,created_at,created_by,incident_status,legal_notes')
      .eq('campaign_id', campaign.id).eq('kind', 'incident').order('created_at', { ascending: false }).limit(500);
    const list: Row[] = data || [];
    setRows(list);
    const ids = [...new Set(list.map((r) => r.precinct_id))];
    if (ids.length) {
      const { data: m } = await db.from('precinct_members').select('precinct_id,user_id,full_name,phone').in('precinct_id', ids);
      setPhones(new Map((m || []).filter((x: any) => x.user_id).map((x: any) => [`${x.precinct_id}:${x.user_id}`, { name: x.full_name, phone: x.phone }])));
    }
  }, [campaign.id]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    if (campaign.status === 'finished') return;
    const t = setInterval(() => { if (!document.hidden) load(); }, 60000);
    return () => clearInterval(t);
  }, [load, campaign.status]);

  const update = async (r: Row, patch: Partial<Row>) => {
    const { error } = await db.from('election_day_reports').update(patch).eq('id', r.id);
    if (error) { toast.error('Не вдалося зберегти'); return; }
    toast.success('Збережено'); load();
  };

  const shown = rows.filter((r) => status === 'all' || (status === 'open' ? !['complaint', 'closed'].includes(r.incident_status) : r.incident_status === status));
  const count = (s: string) => rows.filter((r) => r.incident_status === s).length;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Scale className="h-5 w-5 text-primary" />
        <p className="text-sm flex-1 min-w-[200px]">Нових: <b>{count('new')}</b> · в роботі: <b>{count('in_work')}</b> · скарг: <b>{count('complaint')}</b></p>
        <select className={sel} value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="open">Потребують уваги</option>
          <option value="all">Усі</option>
          {INCIDENT_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
        <Button variant="outline" size="sm" className="min-h-[40px]" onClick={load}><RefreshCw className="h-4 w-4 mr-1" />Оновити</Button>
      </div>
      {shown.length === 0 && <p className="text-sm text-muted-foreground text-center py-6">Порушень немає</p>}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {shown.map((r) => {
          const p = pById.get(r.precinct_id);
          const who = r.created_by ? phones.get(`${r.precinct_id}:${r.created_by}`) : undefined;
          const can = !!p && canManageHq(p.hq_id);
          return (
            <Card key={r.id} className="p-3 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-medium">Дільниця № {p?.number ?? '—'}</p>
                  <p className="text-xs text-muted-foreground truncate">{p ? hqName.get(p.hq_id) : ''} · {new Date(r.created_at).toLocaleString('uk-UA', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</p>
                </div>
                <Badge variant={r.incident_status === 'new' ? 'destructive' : 'secondary'} className="shrink-0">{INCIDENT_STATUSES.find((s) => s.value === r.incident_status)?.label}</Badge>
              </div>
              <p className="text-sm whitespace-pre-wrap break-words">{r.notes}</p>
              {r.photos?.length > 0 && (
                <div className="flex gap-2 overflow-x-auto">
                  {r.photos.map((ph, i) => <a key={i} href={ph.url} target="_blank" rel="noreferrer"><img src={ph.url} alt={ph.label || 'Фото'} loading="lazy" className="h-20 w-20 object-cover rounded-md border" /></a>)}
                </div>
              )}
              {who && <p className="text-xs">Повідомив(ла): {who.name}{who.phone && <> · <a className="text-primary underline inline-flex items-center gap-1" href={`tel:${who.phone}`}><Phone className="h-3 w-3" />{who.phone}</a></>}</p>}
              {can ? (
                <div className="space-y-2 border-t pt-2">
                  <select className={`${sel} w-full`} value={r.incident_status} onChange={(e) => update(r, { incident_status: e.target.value })}>
                    {INCIDENT_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                  <Textarea maxLength={2000} placeholder="Примітки юриста: № скарги, куди подано…" value={draft[r.id] ?? r.legal_notes ?? ''} onChange={(e) => setDraft((d) => ({ ...d, [r.id]: e.target.value }))} />
                  {draft[r.id] !== undefined && draft[r.id] !== (r.legal_notes ?? '') && <Button size="sm" onClick={() => update(r, { legal_notes: draft[r.id].trim() || null })}>Зберегти примітку</Button>}
                </div>
              ) : r.legal_notes && <p className="text-xs text-muted-foreground border-t pt-2">Юрист: {r.legal_notes}</p>}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
