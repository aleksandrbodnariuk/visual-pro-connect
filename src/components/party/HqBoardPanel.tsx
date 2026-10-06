import { useCallback, useEffect, useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import type { Campaign, PartyHq, Precinct, Protocol } from '@/hooks/orgs/useOrganizations';
import { STATUS_META, STATUS_ORDER, precinctStatus, subtreeIds, type PrecinctStatus } from '@/lib/precinctStatus';

const db = supabase as any;

export function HqBoardPanel({ campaign, hqs, precincts, protocols, onRefresh }: { campaign: Campaign; hqs: PartyHq[]; precincts: Precinct[]; protocols: Protocol[]; onRefresh: () => void }) {
  const [reports, setReports] = useState<{ precinct_id: string; kind: string; slot: string | null }[]>([]);
  const [root, setRoot] = useState<string>('');

  const load = useCallback(async () => {
    const { data } = await db.from('election_day_reports').select('precinct_id,kind,slot').eq('campaign_id', campaign.id).limit(5000);
    setReports(data || []);
  }, [campaign.id]);
  useEffect(() => {
    load();
    if (campaign.status === 'finished') return;
    const t = setInterval(() => { if (!document.hidden) { load(); onRefresh(); } }, 60000);
    return () => clearInterval(t);
  }, [load, campaign.status]); // eslint-disable-line react-hooks/exhaustive-deps

  const status = useMemo(() => {
    const done = new Set(protocols.filter((p) => p.status === 'submitted' || p.status === 'accepted').map((p) => p.precinct_id));
    const m = new Map<string, PrecinctStatus>();
    for (const p of precincts) m.set(p.id, precinctStatus(reports.filter((r) => r.precinct_id === p.id), done.has(p.id)));
    return m;
  }, [precincts, reports, protocols]);

  const scope = root ? subtreeIds(hqs, root) : null;
  const list = precincts.filter((p) => !scope || scope.has(p.hq_id));
  const count = (ps: Precinct[]) => STATUS_ORDER.map((s) => ps.filter((p) => status.get(p.id) === s).length);
  const children = hqs.filter((h) => (root ? h.parent_id === root : !h.parent_id));

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <select className="h-10 rounded-md border bg-background px-3 text-sm flex-1 min-w-[200px]" value={root} onChange={(e) => setRoot(e.target.value)}>
          <option value="">Уся партія</option>
          {hqs.map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}
        </select>
        <Button size="sm" variant="outline" className="min-h-[44px]" onClick={() => { load(); onRefresh(); }}><RefreshCw className="h-4 w-4 mr-1" />Оновити</Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
        {STATUS_ORDER.map((s, i) => (
          <Card key={s} className={`p-3 ${STATUS_META[s].cls}`}><p className="text-xs">{STATUS_META[s].label}</p><p className="text-2xl font-bold">{count(list)[i]}</p></Card>
        ))}
      </div>

      {children.length > 0 && (
        <Card className="p-3 space-y-2">
          <p className="font-medium text-sm">Підрозділи</p>
          {children.map((h) => {
            const sub = subtreeIds(hqs, h.id); const ps = precincts.filter((p) => sub.has(p.hq_id)); const c = count(ps);
            return (
              <button key={h.id} onClick={() => setRoot(h.id)} className="w-full text-left rounded-md hover:bg-muted p-2 space-y-1">
                <div className="flex justify-between text-sm"><span className="truncate">{h.name}</span><span className="text-muted-foreground shrink-0">{c[4]}/{ps.length} протоколів</span></div>
                <div className="flex h-2 rounded overflow-hidden bg-muted">
                  {STATUS_ORDER.map((s, i) => ps.length ? <div key={s} className={STATUS_META[s].cls.split(' ')[0]} style={{ width: `${(c[i] / ps.length) * 100}%` }} /> : null)}
                </div>
              </button>
            );
          })}
        </Card>
      )}

      <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-8 xl:grid-cols-12 gap-1.5">
        {list.map((p) => { const s = status.get(p.id) || 'silent'; return (
          <div key={p.id} title={`№ ${p.number} — ${STATUS_META[s].label}`} className={`rounded-md p-2 text-center text-xs font-semibold ${STATUS_META[s].cls}`}>{p.number}</div>
        ); })}
      </div>
      {list.length === 0 && <p className="text-sm text-muted-foreground text-center py-6">Дільниць немає</p>}
    </div>
  );
}
