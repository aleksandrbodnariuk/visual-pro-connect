import { useState } from 'react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { groupActions } from '@/hooks/groups/useGroups';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreated: (groupId: string) => void;
}

export function CreateGroupDialog({ open, onOpenChange, onCreated }: Props) {
  const { user } = useAuth();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [privacy, setPrivacy] = useState<'public' | 'private'>('public');
  const [postPolicy, setPostPolicy] = useState<'members' | 'admins'>('members');
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!user?.id) { toast.error('Увійдіть у систему'); return; }
    if (name.trim().length < 3) { toast.error('Назва має містити щонайменше 3 символи'); return; }
    setSaving(true);
    const g = await groupActions.create({
      name: name.trim(),
      description: description.trim(),
      privacy,
      post_policy: postPolicy,
      userId: user.id,
    });
    setSaving(false);
    if (g) {
      setName(''); setDescription('');
      onOpenChange(false);
      onCreated(g.id);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>Створити групу</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Назва групи</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={80}
              placeholder='Напр., Інтернет-газета "Захист плюс"' />
          </div>
          <div className="space-y-1.5">
            <Label>Опис</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} maxLength={2000}
              placeholder="Про що ця група" rows={3} />
          </div>
          <div className="space-y-1.5">
            <Label>Приватність</Label>
            <Select value={privacy} onValueChange={(v) => setPrivacy(v as any)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="public">Відкрита — дописи бачать усі</SelectItem>
                <SelectItem value="private">Закрита — дописи бачать лише учасники</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Хто може публікувати</Label>
            <Select value={postPolicy} onValueChange={(v) => setPostPolicy(v as any)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="members">Усі учасники</SelectItem>
                <SelectItem value="admins">Лише адміністрація групи</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Скасувати</Button>
          <Button onClick={submit} disabled={saving}>{saving ? 'Створення…' : 'Створити'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
