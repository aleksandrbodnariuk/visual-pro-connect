import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { partyActions, partyExtra, type HqMember } from '@/hooks/orgs/useOrganizations';
import { UserPicker, useProfiles } from './UserPicker';

interface Props {
  open: boolean; onOpenChange: (v: boolean) => void; orgId: string; hqId: string;
  member: HqMember | null; positions: string[]; onSaved: () => void;
}

export function HqMemberEditDialog({ open, onOpenChange, orgId, hqId, member, positions, onSaved }: Props) {
  const profiles = useProfiles();
  const [fullName, setFullName] = useState('');
  const [position, setPosition] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [agit, setAgit] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !member) return;
    setFullName(member.full_name); setPosition(member.position || ''); setPhone(member.phone || '');
    setNotes(member.notes || ''); setAgit(member.is_agitator); setUserId(member.user_id);
  }, [open, member]);

  if (!member) return null;
  const linked = profiles.find((p) => p.id === userId);
  const opts = Array.from(new Set([...positions, 'Агітатор', ...(position ? [position] : [])]));

  const save = async () => {
    const ok = await partyActions.saveHqMember(orgId, hqId, { id: member.id, full_name: fullName.trim(), position, phone, notes, is_agitator: agit });
    if (ok && userId !== member.user_id) await partyExtra.linkMemberUser(member.id, userId);
    if (ok) { onOpenChange(false); onSaved(); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Редагувати людину</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Прізвище та ім’я</Label><Input value={fullName} onChange={(e) => setFullName(e.target.value)} /></div>
          <div>
            <Label>Посада</Label>
            <select className="w-full h-10 rounded-md border bg-background px-3 text-sm" value={position} onChange={(e) => setPosition(e.target.value)}>
              <option value="">— без посади —</option>
              {opts.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
            <Input className="mt-2" placeholder="або впишіть свою посаду" value={position} onChange={(e) => setPosition(e.target.value)} />
          </div>
          <div><Label>Телефон</Label><Input value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
          <div><Label>Примітки</Label><Input value={notes} onChange={(e) => setNotes(e.target.value)} /></div>
          <label className="flex items-center gap-2 text-sm"><Checkbox checked={agit} onCheckedChange={(v) => setAgit(v === true)} /> Агітатор</label>
          <div className="space-y-1">
            <Label>Профіль на сайті (для штабних чатів)</Label>
            {linked ? (
              <div className="flex items-center justify-between text-sm border rounded-md px-3 py-2">
                <span>{linked.full_name}</span>
                <Button size="sm" variant="ghost" onClick={() => setUserId(null)}>Відв’язати</Button>
              </div>
            ) : <UserPicker onPick={(p) => setUserId(p.id)} actionLabel="Прив’язати" />}
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Скасувати</Button>
          <Button onClick={save} disabled={!fullName.trim()}>Зберегти</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
