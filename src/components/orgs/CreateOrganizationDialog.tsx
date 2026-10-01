import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { ORG_TYPES, orgActions, type OrgType } from '@/hooks/orgs/useOrganizations';
import { toast } from 'sonner';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreated: (id: string) => void;
}

export function CreateOrganizationDialog({ open, onOpenChange, onCreated }: Props) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [website, setWebsite] = useState('');
  const [type, setType] = useState<OrgType>('party');
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!name.trim()) { toast.error('Вкажіть назву організації'); return; }
    setSaving(true);
    const org = await orgActions.create({ name: name.trim(), description, type, website });
    setSaving(false);
    if (org) {
      setName(''); setDescription(''); setWebsite('');
      onOpenChange(false);
      onCreated(org.id);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Нова організація</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Назва</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Наприклад: Партія «Приклад»" />
          </div>
          <div>
            <Label>Тип</Label>
            <select
              className="w-full h-10 rounded-md border bg-background px-3 text-sm"
              value={type}
              onChange={(e) => setType(e.target.value as OrgType)}
            >
              {ORG_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div>
            <Label>Опис</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
          </div>
          <div>
            <Label>Сайт</Label>
            <Input value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Скасувати</Button>
          <Button onClick={submit} disabled={saving}>Створити</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
