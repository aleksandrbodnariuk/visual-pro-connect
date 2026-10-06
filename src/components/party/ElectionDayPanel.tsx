import { useCallback, useEffect, useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertTriangle, CheckCircle2, DoorOpen, Users } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { ProtocolPhotos } from './ProtocolPhotos';
import type { Campaign, PartyHq, Precinct, ProtocolPhoto } from '@/hooks/orgs/useOrganizations';

const db = supabase as any;
const SLOTS = ['12', '16', '20'] as const;
type Kind = 'opened' | 'turnout' | 'incident';
interface Row { id: string; precinct_id: string; kind: Kind; slot: string | null; voted: number | null; quorum: boolean | null; notes: string | null; photos: ProtocolPhoto[]; created_at: string }

export function ElectionDayPanel({ orgId, campaign, hqs, precincts, canManageHq }: { orgId: string; campaign: Campaign; hqs: PartyHq[]; precincts: Precinct[]; canManageHq: (id: string) => boolean }) {
  const { user } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [mine, setMine] = useState<Set<string>>(new Set());
  const [onlyMine, setOnlyMine] = useState(true);
  const [dlg, setDlg] = useState<{ p: Precinct; kind: Kind; slot?: string } | null>(null);
  const [voted, setVoted] = useState(''); const [quorum, setQuorum] = useState(true); const [notes, setNotes] = useState(''); const [photos, setPhotos] = useState<ProtocolPhoto[]>([]);
  const hqName = useMemo(() => new Map(hqs.map((h) => [h.id, h.name])), [hqs]);

  const load = useCallback(async () => {
    const { data } = await db.from('election_day_reports').select('*').eq('campaign_id', campaign.id).order('created_at', { ascending: false }).limit(1000);
    setRows(data || []);
    if (user?.id) {
      const { data: m } = await db.from('precinct_members').select('precinct_id').eq('organization_id', orgId).eq('user_id', user.id);
      setMine(new Set((m || []).map((x: any) => x.precinct_id)));
    }
  }, [campaign.id, orgId, user?.id]);
  useEffect(() => { load(); }, [load]);

  const canWrite = (p: Precinct) => campaign.status !== 'finished' && (mine.has(p.id) || canManageHq(p.hq_id));
  const visible = precincts.filter((p) => !onlyMine || canWrite(p));
  const shown = onlyMine && visible.length === 0 ? precincts : visible;

  const open = (p: Precinct, kind: Kind, slot?: string) => {
    const ex = rows.find((r) => r.precinct_id === p.id && r.kind === kind && (kind !== 'turnout' || r.slot === slot));
    setVoted(ex?.voted != null ? String(ex.voted) : ''); setQuorum(ex?.quorum ?? true); setNotes(kind === 'incident' ? '' : ex?.notes || ''); setPhotos([]);
    setDlg({ p, kind, slot });
  };

  const save = async () => {
    if (!dlg) return;
    const { p, kind, slot } = dlg;
    if (kind === 'turnout') {
      const v = Number(voted);
      if (!voted || v < 0) { toast.error('Вкажіть кількість тих, хто проголосував'); return; }
      if (p.voters_count && v > p.voters_count) { toast.error(`Більше, ніж виборців у списку (${p.voters_count})`); return; }
    }
    if (kind === 'incident' && !notes.trim()) { toast.error('Опишіть порушення'); return; }
    const row = { organization_id: orgId, campaign_id: campaign.id, precinct_id: p.id, kind, slot: kind === 'turnout' ? slot : null,
      voted: kind === 'turnout' ? Number(voted) : null, quorum: kind === 'opened' ? quorum : null, notes: notes.trim() || null, photos };
    const ex = kind !== 'incident' && rows.find((r) => r.precinct_id === p.id && r.kind === kind && (kind !== 'turnout' || r.slot === slot));
    const { error } = ex ? await db.from('election_day_reports').update(row).eq('id', ex.id) : await db.from('election_day_reports').insert(row);
    if (error) { toast.error('Не вдалося надіслати'); return; }
    toast.success(kind === 'opened' ? `Дільниця № ${p.number}: відкриття підтверджено` : kind === 'turnout' ? `Явку на ${slot}:00 надіслано` : 'Порушення зафіксовано');
    setDlg(null); load();
  };

  const opened = new Set(rows.filter((r) => r.kind === 'opened').map((r) => r.precinct_id)).size;
  const incidents = rows.filter((r) => r.kind === 'incident');

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
        <Card className="p-3"><p className="text-xs text-muted-foreground">Відкрились</p><p className="text-lg font-bold">{opened} / {precincts.length}</p></Card>
        {SLOTS.map((s) => {
          const list = rows.filter((r) => r.kind === 'turnout' && r.slot === s);
          const v = list.reduce((a, r) => a + (r.voted || 0), 0);
          const tot = precincts.filter((p) => list.some((r) => r.precinct_id === p.id)).reduce((a, p) => a + (p.voters_count || 0), 0);
          return <Card key={s} className="p-3"><p className="text-xs text-muted-foreground">Явка {s}:00 ({list.length} діл.)</p><p className="text-lg font-bold">{tot ? `${((v / tot) * 100).toFixed(1)}%` : '—'}</p></Card>;
        })}
        <Card className="p-3"><p className="text-xs text-muted-foreground">Порушень</p><p className="text-lg font-bold">{incidents.length}</p></Card>
      </div>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={onlyMine} onChange={(e) => setOnlyMine(e.target.checked)} /> Лише мої дільниці</label>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {shown.map((p) => {
          const pr = rows.filter((r) => r.precinct_id === p.id);
          const op = pr.find((r) => r.kind === 'opened');
          const w = canWrite(p);
          return (
            <Card key={p.id} className="p-3 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0"><p className="font-medium">Дільниця № {p.number}</p><p className="text-xs text-muted-foreground truncate">{hqName.get(p.hq_id)}{p.address ? ` · ${p.address}` : ''}</p></div>
                {op ? <Badge className="shrink-0"><CheckCircle2 className="h-3 w-3 mr-1" />{op.quorum ? 'Відкрита' : 'Без кворуму'}</Badge> : <Badge variant="outline" className="shrink-0">Не на зв'язку</Badge>}
              </div>
              <div className="grid grid-cols-3 gap-1 text-center text-xs">
                {SLOTS.map((s) => { const t = pr.find((r) => r.kind === 'turnout' && r.slot === s); return (
                  <button key={s} disabled={!w} onClick={() => open(p, 'turnout', s)} className="rounded-md border min-h-[44px] px-1 disabled:opacity-70 hover:bg-muted">
                    <span className="block text-muted-foreground">{s}:00</span>
                    <span className="font-semibold">{t ? (p.voters_count ? `${((t.voted! / p.voters_count) * 100).toFixed(1)}%` : t.voted) : '—'}</span>
                  </button>); })}
              </div>
              {w && <div className="flex gap-2">
                <Button size="sm" variant={op ? 'outline' : 'default'} className="flex-1 min-h-[44px]" onClick={() => open(p, 'opened')}><DoorOpen className="h-4 w-4 mr-1" />Відкриття</Button>
                <Button size="sm" variant="outline" className="flex-1 min-h-[44px]" onClick={() => open(p, 'incident')}><AlertTriangle className="h-4 w-4 mr-1" />Порушення</Button>
              </div>}
              {pr.filter((r) => r.kind === 'incident').slice(0, 2).map((r) => (
                <p key={r.id} className="text-xs text-destructive line-clamp-2">{new Date(r.created_at).toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' })} — {r.notes}{r.photos?.length ? ` (фото: ${r.photos.length})` : ''}</p>
              ))}
            </Card>
          );
        })}
      </div>
      {shown.length === 0 && <p className="text-sm text-muted-foreground text-center py-6">Дільниць немає</p>}

      <Dialog open={!!dlg} onOpenChange={(o) => !o && setDlg(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>
            {dlg?.kind === 'opened' ? 'Відкриття дільниці' : dlg?.kind === 'turnout' ? `Явка на ${dlg.slot}:00` : 'Акт про порушення'} · № {dlg?.p.number}
          </DialogTitle></DialogHeader>
          {dlg?.kind === 'opened' && <label className="flex items-center gap-2 text-sm min-h-[44px]"><input type="checkbox" checked={quorum} onChange={(e) => setQuorum(e.target.checked)} /><Users className="h-4 w-4" /> Кворум комісії є</label>}
          {dlg?.kind === 'turnout' && <div><Label>Проголосувало виборців{dlg.p.voters_count ? ` (зі ${dlg.p.voters_count})` : ''}</Label><Input type="number" inputMode="numeric" min={0} autoFocus value={voted} onChange={(e) => setVoted(e.target.value)} /></div>}
          <div><Label>{dlg?.kind === 'incident' ? 'Що сталося' : 'Коментар'}</Label><Textarea maxLength={2000} value={notes} onChange={(e) => setNotes(e.target.value)} /></div>
          {dlg?.kind === 'incident' && <ProtocolPhotos photos={photos} onChange={setPhotos} readOnly={false} campaignId={campaign.id} precinctId={dlg.p.id} />}
          <DialogFooter><Button className="min-h-[44px] w-full sm:w-auto" onClick={save}>Надіслати в штаб</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
