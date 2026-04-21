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
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, Users, MessageSquare, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { MessagesService } from "./MessagesService";
import { toast } from "sonner";

interface FriendOption {
  id: string;
  full_name: string;
  avatar_url: string | null;
}

interface NewChatDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChatCreated: (conversationId: string) => void;
}

type Step = 'choose' | 'direct' | 'group';

export function NewChatDialog({ open, onOpenChange, onChatCreated }: NewChatDialogProps) {
  const { user } = useAuth();
  const [step, setStep] = useState<Step>('choose');
  const [friends, setFriends] = useState<FriendOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [groupTitle, setGroupTitle] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Reset state when dialog opens/closes
  useEffect(() => {
    if (!open) {
      setStep('choose');
      setSearch("");
      setSelected(new Set());
      setGroupTitle("");
    }
  }, [open]);

  // Load friends when needed
  useEffect(() => {
    if (!open || step === 'choose' || !user?.id) return;
    setLoading(true);
    (async () => {
      const { data: requests } = await supabase
        .from('friend_requests')
        .select('sender_id, receiver_id, status')
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .eq('status', 'accepted');

      const friendIds = new Set<string>();
      (requests || []).forEach((r: any) => {
        const other = r.sender_id === user.id ? r.receiver_id : r.sender_id;
        friendIds.add(other);
      });

      if (friendIds.size === 0) {
        setFriends([]);
        setLoading(false);
        return;
      }

      const { data: profs } = await supabase
        .rpc('get_safe_public_profiles_by_ids', { _ids: Array.from(friendIds) });

      setFriends((profs || []) as FriendOption[]);
      setLoading(false);
    })();
  }, [open, step, user?.id]);

  const filtered = friends.filter(f =>
    f.full_name?.toLowerCase().includes(search.toLowerCase())
  );

  const toggle = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleStartDirect = async (friendId: string) => {
    setSubmitting(true);
    try {
      const { data, error } = await supabase
        .rpc('get_or_create_direct_conversation', { _other_user_id: friendId });
      if (error || !data) {
        toast.error(error?.message || 'Не вдалося створити чат');
        return;
      }
      onChatCreated(data as unknown as string);
      onOpenChange(false);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateGroup = async () => {
    if (!groupTitle.trim()) {
      toast.error('Вкажіть назву групи');
      return;
    }
    if (selected.size < 1) {
      toast.error('Оберіть хоча б одного учасника');
      return;
    }
    setSubmitting(true);
    try {
      const convId = await MessagesService.createGroup(groupTitle.trim(), Array.from(selected));
      if (convId) {
        onChatCreated(convId);
        onOpenChange(false);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        {step === 'choose' && (
          <>
            <DialogHeader>
              <DialogTitle>Новий чат</DialogTitle>
              <DialogDescription>Оберіть тип чату</DialogDescription>
            </DialogHeader>
            <div className="space-y-2">
              <Button
                variant="outline"
                className="w-full justify-start h-auto py-4"
                onClick={() => setStep('direct')}
              >
                <MessageSquare className="mr-3 h-5 w-5" />
                <div className="text-left">
                  <div className="font-semibold">Особисте повідомлення</div>
                  <div className="text-xs text-muted-foreground">Чат з одним користувачем</div>
                </div>
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start h-auto py-4"
                onClick={() => setStep('group')}
              >
                <Users className="mr-3 h-5 w-5" />
                <div className="text-left">
                  <div className="font-semibold">Створити групу</div>
                  <div className="text-xs text-muted-foreground">До 50 учасників</div>
                </div>
              </Button>
            </div>
          </>
        )}

        {(step === 'direct' || step === 'group') && (
          <>
            <DialogHeader>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setStep('choose')}>
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <DialogTitle>
                  {step === 'direct' ? 'Оберіть друга' : 'Нова група'}
                </DialogTitle>
              </div>
              <DialogDescription>
                {step === 'direct'
                  ? 'Виберіть користувача зі списку друзів'
                  : `Назвіть групу та оберіть учасників (${selected.size} обрано)`}
              </DialogDescription>
            </DialogHeader>

            {step === 'group' && (
              <Input
                placeholder="Назва групи"
                value={groupTitle}
                onChange={(e) => setGroupTitle(e.target.value.slice(0, 100))}
                maxLength={100}
              />
            )}

            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Пошук друга"
                className="pl-8"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <ScrollArea className="h-[300px] -mx-2 px-2">
              {loading ? (
                <div className="text-center text-sm text-muted-foreground py-8">Завантаження...</div>
              ) : filtered.length === 0 ? (
                <div className="text-center text-sm text-muted-foreground py-8">
                  {friends.length === 0 ? 'У вас ще немає друзів' : 'Нічого не знайдено'}
                </div>
              ) : (
                <div className="space-y-1">
                  {filtered.map(f => (
                    <div
                      key={f.id}
                      className="flex items-center gap-3 p-2 rounded-md hover:bg-muted cursor-pointer"
                      onClick={() => step === 'direct' ? handleStartDirect(f.id) : toggle(f.id)}
                    >
                      {step === 'group' && (
                        <Checkbox checked={selected.has(f.id)} onCheckedChange={() => toggle(f.id)} />
                      )}
                      <Avatar className="h-9 w-9">
                        <AvatarImage src={f.avatar_url || ''} />
                        <AvatarFallback>{f.full_name?.[0] || '?'}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0 truncate">{f.full_name || 'Користувач'}</div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>

            {step === 'group' && (
              <Button
                className="w-full"
                disabled={submitting || !groupTitle.trim() || selected.size === 0}
                onClick={handleCreateGroup}
              >
                Створити групу{selected.size > 0 ? ` (${selected.size + 1})` : ''}
              </Button>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}