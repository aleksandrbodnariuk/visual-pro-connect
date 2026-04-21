import { useEffect, useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { MessagesService } from "../MessagesService";

interface Props {
  conversationId: string;
  excludeIds: string[];
  onClose: () => void;
  onAdded: () => void;
}

export function AddMembersInline({ conversationId, excludeIds, onClose, onAdded }: Props) {
  const { user } = useAuth();
  const [friends, setFriends] = useState<any[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    (async () => {
      const { data: requests } = await supabase
        .from('friend_requests')
        .select('sender_id, receiver_id, status')
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .eq('status', 'accepted');

      const friendIds = new Set<string>();
      (requests || []).forEach((r: any) => {
        const other = r.sender_id === user.id ? r.receiver_id : r.sender_id;
        if (!excludeIds.includes(other)) friendIds.add(other);
      });

      if (friendIds.size === 0) { setFriends([]); setLoading(false); return; }
      const { data: profs } = await supabase
        .rpc('get_safe_public_profiles_by_ids', { _ids: Array.from(friendIds) });
      setFriends(profs || []);
      setLoading(false);
    })();
  }, [user?.id, excludeIds]);

  const handleAdd = async () => {
    if (selected.size === 0) return;
    setSubmitting(true);
    const ok = await MessagesService.addMembersToGroup(conversationId, Array.from(selected));
    setSubmitting(false);
    if (ok) onAdded();
  };

  return (
    <Dialog open={true} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Додати учасників</DialogTitle>
          <DialogDescription>Оберіть друзів для додавання у групу</DialogDescription>
        </DialogHeader>
        <ScrollArea className="h-[300px]">
          {loading ? (
            <div className="text-center text-sm text-muted-foreground py-8">Завантаження...</div>
          ) : friends.length === 0 ? (
            <div className="text-center text-sm text-muted-foreground py-8">
              Усі ваші друзі вже в групі
            </div>
          ) : (
            <div className="space-y-1">
              {friends.map(f => (
                <div
                  key={f.id}
                  className="flex items-center gap-3 p-2 rounded-md hover:bg-muted cursor-pointer"
                  onClick={() => setSelected(prev => {
                    const n = new Set(prev);
                    if (n.has(f.id)) n.delete(f.id); else n.add(f.id);
                    return n;
                  })}
                >
                  <Checkbox checked={selected.has(f.id)} />
                  <Avatar className="h-9 w-9">
                    <AvatarImage src={f.avatar_url || ''} />
                    <AvatarFallback>{f.full_name?.[0] || '?'}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 truncate">{f.full_name || 'Користувач'}</div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
        <Button disabled={submitting || selected.size === 0} onClick={handleAdd}>
          Додати ({selected.size})
        </Button>
      </DialogContent>
    </Dialog>
  );
}