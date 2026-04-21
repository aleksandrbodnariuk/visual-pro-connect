import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { UserPlus, UserMinus, LogOut, Pencil, Crown, Shield } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { MessagesService, ChatItem } from "./MessagesService";
import { toast } from "sonner";

interface GroupMembersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  chat: ChatItem;
  onChanged: () => void;
  onLeft: () => void;
}

export function GroupMembersDialog({ open, onOpenChange, chat, onChanged, onLeft }: GroupMembersDialogProps) {
  const { user } = useAuth();
  const [memberProfiles, setMemberProfiles] = useState<any[]>([]);
  const [memberRoles, setMemberRoles] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState(chat.title || "");

  const isAdmin = chat.myRole === 'owner' || chat.myRole === 'admin';

  useEffect(() => {
    if (!open || !chat.conversationId) return;
    setLoading(true);
    (async () => {
      const { data: members } = await supabase
        .from('conversation_members')
        .select('user_id, role')
        .eq('conversation_id', chat.conversationId);
      const ids = (members || []).map((m: any) => m.user_id);
      const roles = new Map<string, string>();
      (members || []).forEach((m: any) => roles.set(m.user_id, m.role));
      setMemberRoles(roles);

      if (ids.length > 0) {
        const { data: profs } = await supabase
          .rpc('get_safe_public_profiles_by_ids', { _ids: ids });
        setMemberProfiles(profs || []);
      } else {
        setMemberProfiles([]);
      }
      setLoading(false);
    })();
    setTitleDraft(chat.title || "");
  }, [open, chat.conversationId, chat.title]);

  const handleRemove = async (userId: string) => {
    if (!confirm('Видалити учасника з групи?')) return;
    const ok = await MessagesService.removeMemberFromGroup(chat.conversationId!, userId);
    if (ok) {
      setMemberProfiles(prev => prev.filter(p => p.id !== userId));
      onChanged();
    }
  };

  const handleLeave = async () => {
    if (!confirm('Вийти з групи?')) return;
    const ok = await MessagesService.leaveConversation(chat.conversationId!);
    if (ok) {
      onOpenChange(false);
      onLeft();
    }
  };

  const handleSaveTitle = async () => {
    if (!titleDraft.trim()) return;
    const ok = await MessagesService.renameGroup(chat.conversationId!, titleDraft.trim());
    if (ok) {
      setEditingTitle(false);
      onChanged();
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Учасники групи</DialogTitle>
            <DialogDescription>
              {chat.memberCount || memberProfiles.length} учасників
            </DialogDescription>
          </DialogHeader>

          {/* Group title editor */}
          <div className="flex items-center gap-2">
            {editingTitle ? (
              <>
                <Input
                  value={titleDraft}
                  onChange={(e) => setTitleDraft(e.target.value.slice(0, 100))}
                  className="flex-1"
                />
                <Button size="sm" onClick={handleSaveTitle}>Зберегти</Button>
                <Button size="sm" variant="ghost" onClick={() => { setEditingTitle(false); setTitleDraft(chat.title || ''); }}>
                  Скасувати
                </Button>
              </>
            ) : (
              <>
                <div className="flex-1 font-semibold">{chat.title}</div>
                {isAdmin && (
                  <Button size="icon" variant="ghost" onClick={() => setEditingTitle(true)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                )}
              </>
            )}
          </div>

          {isAdmin && (
            <Button variant="outline" onClick={() => setShowAddDialog(true)}>
              <UserPlus className="mr-2 h-4 w-4" />
              Додати учасників
            </Button>
          )}

          <ScrollArea className="h-[280px]">
            {loading ? (
              <div className="text-center text-sm text-muted-foreground py-8">Завантаження...</div>
            ) : (
              <div className="space-y-1">
                {memberProfiles.map(p => {
                  const role = memberRoles.get(p.id);
                  const isMe = p.id === user?.id;
                  return (
                    <div key={p.id} className="flex items-center gap-3 p-2 rounded-md hover:bg-muted">
                      <Avatar className="h-9 w-9">
                        <AvatarImage src={p.avatar_url || ''} />
                        <AvatarFallback>{p.full_name?.[0] || '?'}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate flex items-center gap-1">
                          {p.full_name || 'Користувач'}{isMe && ' (Ви)'}
                          {role === 'owner' && <Crown className="h-3 w-3 text-primary" />}
                          {role === 'admin' && <Shield className="h-3 w-3 text-primary" />}
                        </div>
                        <div className="text-xs text-muted-foreground capitalize">
                          {role === 'owner' ? 'Власник' : role === 'admin' ? 'Адмін' : 'Учасник'}
                        </div>
                      </div>
                      {isAdmin && !isMe && role !== 'owner' && (
                        <Button size="icon" variant="ghost" onClick={() => handleRemove(p.id)}>
                          <UserMinus className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>

          <Button variant="destructive" onClick={handleLeave}>
            <LogOut className="mr-2 h-4 w-4" />
            Вийти з групи
          </Button>
        </DialogContent>
      </Dialog>

      {showAddDialog && (
        <AddMembersInline
          chat={chat}
          excludeIds={memberProfiles.map(p => p.id)}
          onClose={() => setShowAddDialog(false)}
          onAdded={() => { setShowAddDialog(false); onChanged(); }}
        />
      )}
    </>
  );
}

/**
 * Inline mini-dialog for adding members (uses friends list).
 */
function AddMembersInline({ chat, excludeIds, onClose, onAdded }: {
  chat: ChatItem;
  excludeIds: string[];
  onClose: () => void;
  onAdded: () => void;
}) {
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
    const ok = await MessagesService.addMembersToGroup(chat.conversationId!, Array.from(selected));
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