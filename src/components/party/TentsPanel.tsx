import { useCallback, useEffect, useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ClipboardList, MapPin, Pencil, Phone, Plus, Tent, Trash2, Download } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { downloadCsv } from '@/lib/csvExport';
import type { Campaign, PartyHq } from '@/hooks/orgs/useOrganizations';

const db = supabase as any;
const sel = 'w-full h-10 rounded-md border bg-background px-3 text-sm';

interface TentRow { id: string; hq_id: string; address: string; responsible_name: string | null; phone: string | null; schedule: string | null; notes: string | null }
interface Report { id: string; tent_id: string; report_date: string; newspapers: number; booklets: number; other_materials: number; contacts: number; notes: string | null }

const today = () => new Date().toISOString().slice(0, 10);
const err = (e: any) => toast.error(e?.message?.includes('завершена') ? e.message : 'Не вдалося зберегти');

export function TentsPanel({ orgId, campaign, hqs, canManageHq }: { orgId: string; campaign: Campaign; hqs: PartyHq[]; canManageHq: (id: string) => boolean }) {
  const [tents, setTents] = useState<TentRow[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [edit, setEdit] = useState<Partial<TentRow> | null>(null);
  const [rep, setRep] = useState<{ tent: TentRow; r: Partial<Report> } | null>(null);
  const active = campaign.status !== 'finished';
  const hqName = useMemo(() => new Map(hqs.map((h) => [h.id, h.name])), [hqs]);
  const editableHqs = hqs.filter((h) => canManageHq(h.id));

  const load = useCallback(async () => {
    const { data: t } = await db.from('campaign_tents').select('*').eq('campaign_id', campaign.id).order('created_at');
    setTents(t || []);
    const ids = (t || []).map((x: TentRow) => x.id);
    if (ids.length) {
      const { data: r } = await db.from('tent_reports').select('*').in('tent_id', ids).order('report_date', { ascending: false }).limit(500);
      setReports(r || []);
    } else setReports([]);
  }, [campaign.id]);
  useEffect(() => { load(); }, [load]);

  const saveTent = async () => {
    if (!edit?.address?.trim() || !edit.hq_id) { toast.error('Вкажіть адресу і штаб'); return; }
    const row = { organization_id: orgId, campaign_id: campaign.id, hq_id: edit.hq_id, address: edit.address.trim(), responsible_name: edit.responsible_name || null, phone: edit.phone || null, schedule: edit.schedule || null, notes: edit.notes || null };
    const { error } = edit.id ? await db.from('campaign_tents').update(row).eq('id', edit.id) : await db.from('campaign_tents').insert(row);
    if (error) return err(error);
    toast.success('Намет збережено'); setEdit(null); load();
  };
  const removeTent = async (id: string) => {
    if (!confirm('Видалити намет разом зі звітами?')) return;
    const { error } = await db.from('campaign_tents').delete().eq('id', id);
    if (error) return err(error); load();
  };
  const saveReport = async () => {
    if (!rep) return;
    const n = (v: any) => Math.max(0, Number(v) || 0);
    const row = { tent_id: rep.tent.id, report_date: rep.r.report_date || today(), newspapers: n(rep.r.newspapers), booklets: n(rep.r.booklets), other_materials: n(rep.r.other_materials), contacts: n(rep.r.contacts), notes: rep.r.notes || null };
    const { error } = await db.from('tent_reports').upsert(row, { onConflict: 'tent_id,report_date' });
    if (error) return err(error);
    toast.success('Звіт за день збережено'); setRep(null); load();
  };

  const totals = reports.reduce((a, r) => ({ m: a.m + r.newspapers + r.booklets + r.other_materials, c: a.c + r.contacts }), { m: 0, c: 0 });

  const exportCsv = () => {
    const hqName = (id: string) => hqs.find((h) => h.id === id)?.name || '';
    const rows: (string | number | null)[][] = [['Штаб', 'Адреса', 'Відповідальний', 'Телефон', 'Днів звітів', 'Газети', 'Буклети', 'Інше', 'Розмови']];
    for (const t of tents) { const rs = reports.filter((r) => r.tent_id === t.id); const s = (k: 'newspapers' | 'booklets' | 'other_materials' | 'contacts') => rs.reduce((a, r) => a + r[k], 0);
      rows.push([hqName(t.hq_id), t.address, t.responsible_name, t.phone, rs.length, s('newspapers'), s('booklets'), s('other_materials'), s('contacts')]); }
    downloadCsv(`Намети — ${campaign.name}`, rows);
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">Наметів: {tents.length} · роздано матеріалів: {totals.m} · розмов: {totals.c}</p>
        <div className="flex gap-2">{tents.length > 0 && <Button size="sm" variant="outline" className="min-h-[44px]" onClick={exportCsv}><Download className="h-4 w-4 mr-1" />Excel</Button>}
        {active && editableHqs.length > 0 && <Button size="sm" className="min-h-[44px]" onClick={() => setEdit({ hq_id: editableHqs[0].id })}><Plus className="h-4 w-4 mr-1" />Додати намет</Button>}</div>
      </div>
      {!active && <Card className="p-3 text-sm text-muted-foreground">Кампанія завершена — намети доступні лише для перегляду.</Card>}
      {tents.length === 0 ? <p className="text-sm text-muted-foreground text-center py-6">Наметів поки немає</p> : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {tents.map((t) => {
            const rs = reports.filter((r) => r.tent_id === t.id);
            const can = active && canManageHq(t.hq_id);
            return (
              <Card key={t.id} className="p-3 space-y-2">
                <div className="flex items-start gap-2">
                  <Tent className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{t.address}</p>
                    <p className="text-xs text-muted-foreground">{hqName.get(t.hq_id) || 'Штаб'}{t.schedule ? ` · ${t.schedule}` : ''}</p>
                    {t.responsible_name && <p className="text-sm">{t.responsible_name}{t.phone && <a href={`tel:${t.phone}`} className="ml-2 text-primary inline-flex items-center gap-1"><Phone className="h-3.5 w-3.5" />{t.phone}</a>}</p>}
                  </div>
                  {can && <>
                    <Button size="icon" variant="ghost" aria-label="Редагувати" onClick={() => setEdit(t)}><Pencil className="h-4 w-4" /></Button>
                    <Button size="icon" variant="ghost" aria-label="Видалити" onClick={() => removeTent(t.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </>}
                </div>
                {rs.length > 0 && (
                  <div className="text-xs space-y-1 border-t pt-2">
                    {rs.slice(0, 3).map((r) => (
                      <p key={r.id} className="text-muted-foreground">{new Date(r.report_date).toLocaleDateString('uk-UA')}: газети {r.newspapers}, буклети {r.booklets}, інше {r.other_materials}, розмов {r.contacts}</p>
                    ))}
                  </div>
                )}
                {can && <Button size="sm" variant="outline" className="min-h-[44px] w-full" onClick={() => setRep({ tent: t, r: rs.find((r) => r.report_date === today()) || { report_date: today() } })}><ClipboardList className="h-4 w-4 mr-1" />Звіт за день</Button>}
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={!!edit} onOpenChange={(o) => !o && setEdit(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{edit?.id ? 'Редагувати намет' : 'Новий намет'}</DialogTitle></DialogHeader>
          {edit && <div className="space-y-2">
            <div><Label>Штаб</Label><select className={sel} value={edit.hq_id} onChange={(e) => setEdit({ ...edit, hq_id: e.target.value })}>{editableHqs.map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}</select></div>
            <div><Label>Адреса / місце</Label><Input value={edit.address || ''} onChange={(e) => setEdit({ ...edit, address: e.target.value })} placeholder="вул. Хрещатик, 1, біля метро" /></div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label>Відповідальний</Label><Input value={edit.responsible_name || ''} onChange={(e) => setEdit({ ...edit, responsible_name: e.target.value })} /></div>
              <div><Label>Телефон</Label><Input type="tel" value={edit.phone || ''} onChange={(e) => setEdit({ ...edit, phone: e.target.value })} /></div>
            </div>
            <div><Label>Графік роботи</Label><Input value={edit.schedule || ''} onChange={(e) => setEdit({ ...edit, schedule: e.target.value })} placeholder="Пн–Сб, 10:00–18:00" /></div>
            <div><Label>Нотатки</Label><Textarea maxLength={2000} value={edit.notes || ''} onChange={(e) => setEdit({ ...edit, notes: e.target.value })} /></div>
          </div>}
          <DialogFooter><Button className="min-h-[44px]" onClick={saveTent}>Зберегти</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!rep} onOpenChange={(o) => !o && setRep(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Звіт намету</DialogTitle></DialogHeader>
          {rep && <div className="space-y-2">
            <p className="text-sm text-muted-foreground">{rep.tent.address}</p>
            <div><Label>Дата</Label><Input type="date" value={rep.r.report_date || today()} onChange={(e) => setRep({ ...rep, r: { ...rep.r, report_date: e.target.value } })} /></div>
            <div className="grid grid-cols-2 gap-2">
              {([['newspapers', 'Газети'], ['booklets', 'Буклети'], ['other_materials', 'Інші матеріали'], ['contacts', 'Розмов з виборцями']] as const).map(([k, l]) => (
                <div key={k}><Label>{l}</Label><Input type="number" inputMode="numeric" min={0} value={rep.r[k] ?? ''} onChange={(e) => setRep({ ...rep, r: { ...rep.r, [k]: e.target.value } })} /></div>
              ))}
            </div>
            <div><Label>Нотатки</Label><Textarea maxLength={2000} value={rep.r.notes || ''} onChange={(e) => setRep({ ...rep, r: { ...rep.r, notes: e.target.value } })} /></div>
          </div>}
          <DialogFooter><Button className="min-h-[44px]" onClick={saveReport}>Зберегти звіт</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
