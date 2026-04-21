import { useEffect, useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { UserPlus, LogOut, Pencil } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { MessagesService, ChatItem } from "./MessagesService";
import { GroupAvatarUpload } from "./group/GroupAvatarUpload";
import { GroupRulesEditor } from "./group/GroupRulesEditor";
import { GroupMemberRow } from "./group/GroupMemberRow";
import { AddMembersInline } from "./group/AddMembersInline";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  chat: ChatItem;
  onChanged: () => void;
  onLeft: () => void;
}

export function GroupMembersDialog({ open, onOpenChange, chat, onChanged, onLeft }: Props) {
  const { user } = useAuth();
  const [memberProfiles, setMemberProfiles] = useState<any[]>([]);
  const [memberRoles, setMemberRoles] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState(chat.title || "");

  const isOwner = chat.myRole === 'owner';
  const isAdmin = isOwner || chat.myRole === 'admin';

  const loadMembers = async () => {
    if (!chat.conversationId) return;
    setLoading(true);
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
  };

  useEffect(() => {
    if (!open) return;
    loadMembers();
    setTitleDraft(chat.title || "");
    setEditingTitle(false);
  }, [open, chat.conversationId, chat.title]);

  const handleRemove = async (userId: string) => {
    if (!confirm('Видалити учасника з групи?')) return;
    const ok = await MessagesService.removeMemberFromGroup(chat.conversationId!, userId);
    if (ok) { await loadMembers(); onChanged(); }
  };

  const handlePromote = async (userId: string) => {
    const ok = await MessagesService.updateMemberRole(chat.conversationId!, userId, 'admin');
    if (ok) { await loadMembers(); onChanged(); }
  };

  const handleDemote = async (userId: string) => {
    const ok = await MessagesService.updateMemberRole(chat.conversationId!, userId, 'member');
    if (ok) { await loadMembers(); onChanged(); }
  };

  const handleLeave = async () => {
    if (!confirm('Вийти з групи?')) return;
    const ok = await MessagesService.leaveConversation(chat.conversationId!);
    if (ok) { onOpenChange(false); onLeft(); }
  };

  const handleSaveTitle = async () => {
    if (!titleDraft.trim()) return;
    const ok = await MessagesService.renameGroup(chat.conversationId!, titleDraft.trim());
    if (ok) { setEditingTitle(false); onChanged(); }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Налаштування групи</DialogTitle>
            <DialogDescription>
              {chat.memberCount || memberProfiles.length} учасників
            </DialogDescription>
          </DialogHeader>

          {/* Avatar + title */}
          <div className="flex flex-col items-center gap-3 py-2">
            <GroupAvatarUpload
              conversationId={chat.conversationId!}
              avatarUrl={chat.avatarUrl}
              title={chat.title}
              canEdit={isAdmin}
              onChanged={() => onChanged()}
            />
            <div className="flex items-center gap-2 w-full justify-center flex-wrap">
              {editingTitle ? (
                <>
                  <Input
                    value={titleDraft}
                    onChange={(e) => setTitleDraft(e.target.value.slice(0, 100))}
                    className="max-w-xs"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveTitle();
                      if (e.key === 'Escape') { setEditingTitle(false); setTitleDraft(chat.title || ''); }
                    }}
                  />
                  <Button size="sm" onClick={handleSaveTitle}>Зберегти</Button>
                  <Button size="sm" variant="ghost" onClick={() => { setEditingTitle(false); setTitleDraft(chat.title || ''); }}>Скасувати</Button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => isAdmin && setEditingTitle(true)}
                    className={`font-semibold text-lg ${isAdmin ? 'hover:underline cursor-pointer' : 'cursor-default'}`}
                    title={isAdmin ? 'Редагувати назву' : undefined}
                  >
                    {chat.title || 'Без назви'}
                  </button>
                  {isAdmin && (
                    <Button size="sm" variant="outline" onClick={() => setEditingTitle(true)}>
                      <Pencil className="h-3.5 w-3.5 mr-1" />
                      Перейменувати
                    </Button>
                  )}
                </>
              )}
            </div>
          </div>

          <Tabs defaultValue="members" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="members">Учасники</TabsTrigger>
              <TabsTrigger value="rules">Правила</TabsTrigger>
            </TabsList>

            <TabsContent value="members" className="space-y-3 mt-3">
              {isAdmin && (
                <Button variant="outline" className="w-full" onClick={() => setShowAddDialog(true)}>
                  <UserPlus className="mr-2 h-4 w-4" />
                  Додати учасників
                </Button>
              )}
              <ScrollArea className="h-[280px]">
                {loading ? (
                  <div className="text-center text-sm text-muted-foreground py-8">Завантаження...</div>
                ) : (
                  <div className="space-y-1">
                    {memberProfiles.map((p) => (
                      <GroupMemberRow
                        key={p.id}
                        profile={p}
                        role={memberRoles.get(p.id)}
                        isMe={p.id === user?.id}
                        isOwnerViewer={isOwner}
                        isAdminViewer={isAdmin}
                        onRemove={handleRemove}
                        onPromote={handlePromote}
                        onDemote={handleDemote}
                      />
                    ))}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>

            <TabsContent value="rules" className="mt-3">
              <GroupRulesEditor
                conversationId={chat.conversationId!}
                description={chat.description}
                canEdit={isAdmin}
                onChanged={() => onChanged()}
              />
            </TabsContent>
          </Tabs>

          <Button variant="destructive" onClick={handleLeave} className="mt-2">
            <LogOut className="mr-2 h-4 w-4" />
            Вийти з групи
          </Button>
        </DialogContent>
      </Dialog>

      {showAddDialog && (
        <AddMembersInline
          conversationId={chat.conversationId!}
          excludeIds={memberProfiles.map((p) => p.id)}
          onClose={() => setShowAddDialog(false)}
          onAdded={async () => { setShowAddDialog(false); await loadMembers(); onChanged(); }}
        />
      )}
    </>
  );
}