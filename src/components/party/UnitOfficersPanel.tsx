import { useCallback, useEffect, useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Pencil, Phone, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { partyActions } from '@/hooks/orgs/useOrganizations';

const db = supabase as any;

export const BODIES: { value: string; label: string }[] = [
  { value: 'head', label: 'Голова організації' },
  { value: 'deputy', label: 'Заступник голови' },
  { value: 'secretary', label: 'Секретар' },
  { value: 'council', label: 'Рада / Бюро' },
  { value: 'audit', label: 'Контрольно-ревізійна комісія' },
  { value: 'lawyer', label: 'Юрист штабу' },
  { value: 'agitation', label: 'Керівник агітаційного відділу' },
];

interface Officer { id?: string; unit_name: string; body: string; full_name: string; phone?: string | null; term_start?: string | null; term_end?: string | null; decision?: string | null; party_member_id?: string | null }
interface MemberOption { id: string; full_name: string; user_id: string | null }

/** Статутні керівні органи кожної організації (міжвиборчий період). */
export function UnitOfficersPanel({ orgId, canEdit }: { orgId: string; canEdit: boolean }) {
  const [list, setList] = useState<Officer[]>([]);
  const [units, setUnits] = useState<string[]>([]);
  const [members, setMembers] = useState<MemberOption[]>([]);
  const [unit, setUnit] = useState('');
  const [form, setForm] = useState<Officer | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const [{ data }, hqs, { data: mem }] = await Promise.all([
      db.from('party_unit_officers').select('*').eq('organization_id', orgId).order('unit_name').limit(2000),
      partyActions.listHqs(orgId),
      db.from('party_members').select('id,full_name,user_id').eq('organization_id', orgId).order('full_name').limit(5000),
    ]);
    setList(data || []);
    setUnits((hqs as any[]).map((h) => h.name));
    setMembers(mem || []);
  }, [orgId]);
  useEffect(() => { load(); }, [load]);

  const allUnits = useMemo(() => Array.from(new Set([...units, ...list.map((o) => o.unit_name)])), [units, list]);
  const shown = list.filter((o) => !unit || o.unit_name === unit);
  const grouped = useMemo(() => {
    const m = new Map<string, Officer[]>();
    for (const o of shown) m.set(o.unit_name, [...(m.get(o.unit_name) || []), o]);
    return [...m.entries()];
  }, [shown]);

  const save = async () => {
    if (!form || !form.unit_name.trim() || form.full_name.trim().length < 2) { toast.error('Вкажіть організацію та ПІБ'); return; }
    if (form.term_start && form.term_end && form.term_end < form.term_start) { toast.error('Кінець повноважень раніше за початок'); return; }
    setSaving(true);
    const payload = { organization_id: orgId, unit_name: form.unit_name.trim(), body: form.body, full_name: form.full_name.trim(),
      phone: form.phone || null, term_start: form.term_start || null, term_end: form.term_end || null, decision: form.decision || null };
    const { error } = form.id ? await db.from('party_unit_officers').update(payload).eq('id', form.id) : await db.from('party_unit_officers').insert(payload);
    setSaving(false);
    if (error) { toast.error('Не вдалося зберегти'); return; }
    toast.success('Збережено'); setForm(null); load();
  };
  const remove = async (o: Officer) => {
    if (!confirm(`Вилучити ${o.full_name} з керівних органів?`)) return;
    const { error } = await db.from('party_unit_officers').delete().eq('id', o.id);
    if (error) toast.error('Не вдалося вилучити'); else load();
  };
  const expired = (o: Officer) => !!o.term_end && o.term_end < new Date().toISOString().slice(0, 10);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <select className="h-10 rounded-md border bg-background px-3 text-sm flex-1 min-w-[200px]" value={unit} onChange={(e) => setUnit(e.target.value)}>
          <option value="">Усі організації</option>
          {allUnits.map((u) => <option key={u} value={u}>{u}</option>)}
        </select>
        {canEdit && <Button className="min-h-[44px]" onClick={() => setForm({ unit_name: unit, body: 'head', full_name: '' })}><Plus className="h-4 w-4 mr-1" />Додати</Button>}
      </div>
      {grouped.length === 0 && <p className="text-sm text-muted-foreground text-center py-6">Керівні органи ще не внесено</p>}
      {grouped.map(([u, os]) => (
        <Card key={u} className="p-3 space-y-2">
          <p className="font-semibold">{u}</p>
          {BODIES.map((b) => { const items = os.filter((o) => o.body === b.value); if (!items.length) return null; return (
            <div key={b.value}>
              <p className="text-xs text-muted-foreground">{b.label}</p>
              {items.map((o) => (
                <div key={o.id} className="flex flex-wrap items-center gap-2 py-1 text-sm">
                  <span className="font-medium">{o.full_name}</span>
                  {o.phone && <a href={`tel:${o.phone}`} className="text-primary inline-flex items-center"><Phone className="h-3 w-3 mr-1" />{o.phone}</a>}
                  {(o.term_start || o.term_end) && <span className={expired(o) ? 'text-destructive text-xs' : 'text-muted-foreground text-xs'}>{o.term_start || '…'} — {o.term_end || '…'}{expired(o) ? ' (термін минув)' : ''}</span>}
                  {o.decision && <span className="text-xs text-muted-foreground">· {o.decision}</span>}
                  {canEdit && <span className="ml-auto flex">
                    <Button size="icon" variant="ghost" aria-label="Редагувати" onClick={() => setForm(o)}><Pencil className="h-4 w-4" /></Button>
                    <Button size="icon" variant="ghost" aria-label="Вилучити" onClick={() => remove(o)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </span>}
                </div>
              ))}
            </div>
          ); })}
        </Card>
      ))}

      <Dialog open={!!form} onOpenChange={(v) => !v && setForm(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{form?.id ? 'Редагувати' : 'Додати до керівних органів'}</DialogTitle></DialogHeader>
          {form && <div className="space-y-3">
            <div><Label>Організація</Label><Input list="unit-names" value={form.unit_name} maxLength={200} onChange={(e) => setForm({ ...form, unit_name: e.target.value })} placeholder="Чернівецька обласна організація" />
              <datalist id="unit-names">{allUnits.map((u) => <option key={u} value={u} />)}</datalist></div>
            <div><Label>Орган / посада</Label>
              <select className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })}>
                {BODIES.map((b) => <option key={b.value} value={b.value}>{b.label}</option>)}
              </select></div>
            <div><Label>ПІБ</Label><Input value={form.full_name} maxLength={200} onChange={(e) => setForm({ ...form, full_name: e.target.value })} /></div>
            <div><Label>Телефон</Label><Input type="tel" value={form.phone || ''} maxLength={40} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label>Повноваження з</Label><Input type="date" value={form.term_start || ''} onChange={(e) => setForm({ ...form, term_start: e.target.value })} /></div>
              <div><Label>до</Label><Input type="date" value={form.term_end || ''} onChange={(e) => setForm({ ...form, term_end: e.target.value })} /></div>
            </div>
            <div><Label>Рішення (збори / конференція)</Label><Input value={form.decision || ''} maxLength={500} onChange={(e) => setForm({ ...form, decision: e.target.value })} placeholder="Рішення конференції від 12.03.2026 № 3" /></div>
          </div>}
          <DialogFooter><Button variant="ghost" onClick={() => setForm(null)}>Скасувати</Button><Button disabled={saving} onClick={save}>Зберегти</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
