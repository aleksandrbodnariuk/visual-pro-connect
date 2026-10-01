import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { HQ_LEVELS, partyActions, type HqLevel, type PartyHq } from '@/hooks/orgs/useOrganizations';
import { toast } from 'sonner';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  orgId: string;
  level: HqLevel;
  parents: PartyHq[];
  editing?: PartyHq | null;
  onSaved: () => void;
}

export function HqDialog({ open, onOpenChange, orgId, level, parents, editing, onSaved }: Props) {
  const [name, setName] = useState('');
  const [region, setRegion] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [parentId, setParentId] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(editing?.name || '');
    setRegion(editing?.region || '');
    setAddress(editing?.address || '');
    setPhone(editing?.phone || '');
    setNotes(editing?.notes || '');
    setParentId(editing?.parent_id || '');
  }, [open, editing]);

  const submit = async () => {
    if (!name.trim()) { toast.error('Вкажіть назву штабу'); return; }
    setSaving(true);
    const ok = await partyActions.saveHq(orgId, {
      id: editing?.id,
      level,
      name: name.trim(),
      region,
      address,
      phone,
      notes,
      parent_id: parentId || null,
    });
    setSaving(false);
    if (ok) { onOpenChange(false); onSaved(); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editing ? 'Редагувати' : 'Додати'}: {HQ_LEVELS.find((l) => l.value === level)?.label}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div><Label>Назва</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
          <div><Label>Регіон / округ</Label><Input value={region} onChange={(e) => setRegion(e.target.value)} /></div>
          {parents.length > 0 && (
            <div>
              <Label>Підпорядкований штаб</Label>
              <select className="w-full h-10 rounded-md border bg-background px-3 text-sm" value={parentId} onChange={(e) => setParentId(e.target.value)}>
                <option value="">— не вказано —</option>
                {parents.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
          )}
          <div><Label>Адреса</Label><Input value={address} onChange={(e) => setAddress(e.target.value)} /></div>
          <div><Label>Телефон</Label><Input value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
          <div><Label>Примітки</Label><Textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} /></div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Скасувати</Button>
          <Button onClick={submit} disabled={saving}>Зберегти</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
