import { useCallback, useEffect, useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { IdCard, Mail, Pencil, Phone, Plus, Trash2, Download } from 'lucide-react';
import { downloadCsv } from '@/lib/csvExport';
import { PARTY_MEMBER_STATUS, partyMembersApi, type PartyMember, type PartyMemberStatus } from '@/hooks/orgs/useOrganizations';

const EMPTY: Partial<PartyMember> = { full_name: '', status: 'active' };

/** Реєстр членів партії з додаванням, пошуком і фільтром за осередком. */
export function PartyMembersRegistry({ orgId, canEdit }: { orgId: string; canEdit: boolean }) {
  const [list, setList] = useState<PartyMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [unit, setUnit] = useState('');
  const [status, setStatus] = useState('');
  const [form, setForm] = useState<Partial<PartyMember> | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => { setList(await partyMembersApi.list(orgId)); setLoading(false); }, [orgId]);
  useEffect(() => { load(); }, [load]);

  const units = useMemo(() => Array.from(new Set(list.map((m) => m.unit_name).filter(Boolean) as string[])).sort((a, b) => a.localeCompare(b, 'uk')), [list]);
  const ql = q.toLowerCase();
  const shown = list.filter((m) => (!unit || m.unit_name === unit) && (!status || m.status === status) &&
    (!q || `${m.full_name} ${m.phone || ''} ${m.card_number || ''} ${m.position || ''}`.toLowerCase().includes(ql)));

  const save = async () => {
    if (!form || !form.full_name?.trim() || form.full_name.trim().length < 2) return;
    setSaving(true);
    const ok = await partyMembersApi.save(orgId, form as PartyMember);
    setSaving(false);
    if (ok) { setForm(null); load(); }
  };
  const remove = async (m: PartyMember) => {
    if (!confirm(`Зняти з обліку ${m.full_name}?`)) return;
    if (await partyMembersApi.remove(m.id)) load();
  };
  const exportCsv = () => downloadCsv('Реєстр членів партії', [['ПІБ', 'Організація', 'Посада', 'Статус', 'Телефон', 'Email', 'Партквиток', 'Дата вступу', 'Примітки'],
    ...shown.map((m) => [m.full_name, m.unit_name, m.position, PARTY_MEMBER_STATUS[m.status], m.phone, m.email, m.card_number, m.joined_date, m.notes])]);
  const set = (k: keyof PartyMember, v: string) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary">Членів партії: {list.length}</Badge>
          <Badge variant="secondary">Осередків: {units.length}</Badge>
        </div>
        <div className="flex gap-2">{shown.length > 0 && <Button size="sm" variant="outline" className="min-h-[44px]" onClick={exportCsv}><Download className="h-4 w-4 mr-1" />Excel</Button>}
        {canEdit && <Button onClick={() => setForm({ ...EMPTY })} className="min-h-[44px]"><Plus className="h-4 w-4 mr-1" />Додати члена партії</Button>}</div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <Input placeholder="Пошук: ПІБ, телефон, квиток…" value={q} onChange={(e) => setQ(e.target.value)} />
        <select className="h-10 rounded-md border bg-background px-3 text-sm" value={unit} onChange={(e) => setUnit(e.target.value)}>
          <option value="">Усі організації</option>
          {units.map((u) => <option key={u} value={u}>{u}</option>)}
        </select>
        <select className="h-10 rounded-md border bg-background px-3 text-sm" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">Усі статуси</option>
          {Object.entries(PARTY_MEMBER_STATUS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>

      {loading ? <p className="text-sm text-muted-foreground py-6 text-center">Завантаження…</p> :
        shown.length === 0 ? <p className="text-sm text-muted-foreground py-6 text-center">{list.length ? 'Нікого не знайдено' : 'Реєстр порожній. Натисніть «Додати члена партії».'}</p> : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2">
            {shown.map((m) => (
              <Card key={m.id} className="p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-medium truncate">{m.full_name}</p>
                    {m.position && <p className="text-sm text-muted-foreground truncate">{m.position}</p>}
                    {m.unit_name && <p className="text-xs text-muted-foreground truncate">{m.unit_name}</p>}
                  </div>
                  <Badge variant={m.status === 'suspended' ? 'destructive' : 'outline'} className="shrink-0">{PARTY_MEMBER_STATUS[m.status]}</Badge>
                </div>
                <div className="mt-2 flex flex-wrap gap-x-3 text-sm">
                  {m.phone && <a href={`tel:${m.phone}`} className="inline-flex items-center gap-1 text-primary min-h-[32px]"><Phone className="h-3.5 w-3.5" />{m.phone}</a>}
                  {m.email && <span className="inline-flex items-center gap-1 text-muted-foreground min-h-[32px] truncate"><Mail className="h-3.5 w-3.5" />{m.email}</span>}
                  {m.card_number && <span className="inline-flex items-center gap-1 text-muted-foreground min-h-[32px]"><IdCard className="h-3.5 w-3.5" />№ {m.card_number}</span>}
                </div>
                {canEdit && (
                  <div className="flex justify-end">
                    <Button size="icon" variant="ghost" onClick={() => setForm(m)} aria-label="Редагувати"><Pencil className="h-4 w-4" /></Button>
                    <Button size="icon" variant="ghost" onClick={() => remove(m)} aria-label="Зняти з обліку"><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </div>
                )}
              </Card>
            ))}
          </div>
        )}

      <Dialog open={!!form} onOpenChange={(v) => !v && setForm(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{form?.id ? 'Редагувати члена партії' : 'Новий член партії'}</DialogTitle></DialogHeader>
          {form && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2"><Label>Прізвище, ім’я, по батькові *</Label><Input maxLength={200} value={form.full_name || ''} onChange={(e) => set('full_name', e.target.value)} /></div>
              <div className="sm:col-span-2"><Label>Організація (на обліку)</Label><Input list="party-units" placeholder="Напр. Хотинська міська організація" value={form.unit_name || ''} onChange={(e) => set('unit_name', e.target.value)} />
                <datalist id="party-units">{units.map((u) => <option key={u} value={u} />)}</datalist></div>
              <div><Label>Посада в організації</Label><Input placeholder="Голова, секретар, член партії…" value={form.position || ''} onChange={(e) => set('position', e.target.value)} /></div>
              <div><Label>Статус</Label>
                <select className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={form.status || 'active'} onChange={(e) => set('status', e.target.value as PartyMemberStatus)}>
                  {Object.entries(PARTY_MEMBER_STATUS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select></div>
              <div><Label>Телефон</Label><Input type="tel" value={form.phone || ''} onChange={(e) => set('phone', e.target.value)} /></div>
              <div><Label>Email</Label><Input type="email" value={form.email || ''} onChange={(e) => set('email', e.target.value)} /></div>
              <div><Label>№ партквитка</Label><Input value={form.card_number || ''} onChange={(e) => set('card_number', e.target.value)} /></div>
              <div><Label>Дата вступу</Label><Input type="date" value={form.joined_date || ''} onChange={(e) => set('joined_date', e.target.value)} /></div>
              <div className="sm:col-span-2"><Label>Примітки</Label><Textarea maxLength={2000} value={form.notes || ''} onChange={(e) => set('notes', e.target.value)} /></div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setForm(null)}>Скасувати</Button>
            <Button onClick={save} disabled={saving || (form?.full_name?.trim().length ?? 0) < 2}>Зберегти</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
