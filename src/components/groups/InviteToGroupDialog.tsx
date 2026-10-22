import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  groupId: string;
  userId: string;
  memberIds: string[];
}

export function InviteToGroupDialog({ open, onOpenChange, groupId, userId, memberIds }: Props) {
  const [friends, setFriends] = useState<any[]>([]);
  const [invited, setInvited] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!open) return;
    setSelected(new Set()); setLoading(true);
    (async () => {
      const [{ data: reqs }, { data: inv }] = await Promise.all([
        supabase.from('friend_requests').select('sender_id, receiver_id')
          .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`).eq('status', 'accepted'),
        supabase.from('group_invites' as any).select('invitee_id').eq('group_id', groupId),
      ]);
      const ids = new Set<string>();
      (reqs || []).forEach((r: any) => {
        const o = r.sender_id === userId ? r.receiver_id : r.sender_id;
        if (!memberIds.includes(o)) ids.add(o);
      });
      setInvited(new Set(((inv as any[]) || []).map((i) => i.invitee_id)));
      if (ids.size) {
        const { data } = await supabase.rpc('get_safe_public_profiles_by_ids', { _ids: [...ids] });
        setFriends(data || []);
      } else setFriends([]);
      setLoading(false);
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, groupId, userId]);

  const send = async () => {
    setSending(true);
    const rows = [...selected].map((id) => ({ group_id: groupId, inviter_id: userId, invitee_id: id }));
    const { error } = await supabase.from('group_invites' as any).insert(rows as any);
    setSending(false);
    if (error) { toast.error('Не вдалося надіслати запрошення'); return; }
    toast.success(`Запрошення надіслано: ${rows.length}`);
    onOpenChange(false);
  };

  const list = friends.filter((f) => (f.full_name || '').toLowerCase().includes(q.toLowerCase()));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Запросити друзів</DialogTitle>
          <DialogDescription>Оберіть друзів, яким надіслати запрошення до групи</DialogDescription>
        </DialogHeader>
        <Input placeholder="Пошук друзів…" value={q} onChange={(e) => setQ(e.target.value)} />
        <ScrollArea className="h-[300px]">
          {loading ? (
            <p className="text-center text-sm text-muted-foreground py-8">Завантаження…</p>
          ) : list.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-8">Немає друзів, яких можна запросити</p>
          ) : (
            <div className="space-y-1">
              {list.map((f) => {
                const already = invited.has(f.id);
                return (
                  <label key={f.id} className={`flex items-center gap-3 p-2 rounded-md min-h-[44px] ${already ? 'opacity-60' : 'hover:bg-muted cursor-pointer'}`}>
                    <Checkbox
                      disabled={already}
                      checked={selected.has(f.id)}
                      onCheckedChange={() => setSelected((p) => { const n = new Set(p); n.has(f.id) ? n.delete(f.id) : n.add(f.id); return n; })}
                    />
                    <Avatar className="h-9 w-9">
                      <AvatarImage src={f.avatar_url || ''} />
                      <AvatarFallback>{f.full_name?.[0] || '?'}</AvatarFallback>
                    </Avatar>
                    <span className="flex-1 truncate">{f.full_name || 'Користувач'}</span>
                    {already && <span className="text-xs text-muted-foreground">Запрошено</span>}
                  </label>
                );
              })}
            </div>
          )}
        </ScrollArea>
        <Button disabled={sending || selected.size === 0} onClick={send}>
          Запросити ({selected.size})
        </Button>
      </DialogContent>
    </Dialog>
  );
}
