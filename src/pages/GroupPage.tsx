import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Navbar } from '@/components/layout/Navbar';
import { Sidebar } from '@/components/layout/Sidebar';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Globe, Lock, Users, ArrowLeft, LogOut, Trash2, Settings } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useGroup, groupActions } from '@/hooks/groups/useGroups';
import { GroupComposer } from '@/components/groups/GroupComposer';
import { GroupFeed } from '@/components/groups/GroupFeed';
import { GroupMembersPanel } from '@/components/groups/GroupMembersPanel';
import { GroupSettingsDialog } from '@/components/groups/GroupSettingsDialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export default function GroupPage() {
  const { groupId } = useParams();
  const navigate = useNavigate();
  const { user, appUser } = useAuth();
  const { group, members, myMembership, loading, reload } = useGroup(groupId);
  const [refreshKey, setRefreshKey] = useState(0);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  useEffect(() => {
    if (group) document.title = `${group.name} — група`;
  }, [group]);

  // Log one view per group visit (authenticated users only)
  useEffect(() => {
    if (!groupId || !user?.id) return;
    const key = `group-view-${groupId}`;
    const last = Number(sessionStorage.getItem(key) || 0);
    if (Date.now() - last < 30 * 60 * 1000) return;
    sessionStorage.setItem(key, String(Date.now()));
    supabase.from('group_views').insert({ group_id: groupId, user_id: user.id }).then(() => {});
  }, [groupId, user?.id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container pt-24 text-muted-foreground">Завантаження…</div>
      </div>
    );
  }

  if (!group) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container pt-24 space-y-4">
          <p className="text-muted-foreground">Групу не знайдено або вона недоступна.</p>
          <Button asChild variant="outline"><Link to="/groups">До списку груп</Link></Button>
        </div>
      </div>
    );
  }

  const isApproved = myMembership?.status === 'approved';
  const isSiteAdmin = !!appUser?.isAdmin;
  const isGroupAdmin = (isApproved && (myMembership?.role === 'owner' || myMembership?.role === 'admin')) || isSiteAdmin;
  const canPost = isGroupAdmin || (isApproved && group.post_policy === 'members');
  const canSeeContent = group.privacy === 'public' || isApproved || isSiteAdmin;

  const join = async () => {
    if (!user?.id) { toast.error('Увійдіть у систему'); return; }
    if (await groupActions.join(group.id, user.id, group.privacy)) reload();
  };
  const leave = async () => {
    if (!user?.id) return;
    if (await groupActions.leave(group.id, user.id)) reload();
  };
  const removeGroup = async () => {
    if (await groupActions.remove(group.id)) navigate('/groups');
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-3 md:px-4 pt-20 pb-6 grid grid-cols-12 gap-4">
        <Sidebar className="hidden lg:block col-span-3 sticky top-20 self-start max-h-[calc(100vh-6rem)] overflow-y-auto" />

        <main className="col-span-12 lg:col-span-9 space-y-4">
          <Button variant="ghost" size="sm" onClick={() => navigate('/groups')} className="px-2">
            <ArrowLeft className="h-4 w-4 mr-1" /> Усі групи
          </Button>

          {/* Header */}
          <div className="creative-card p-4 flex flex-col sm:flex-row sm:items-center gap-4">
            <Avatar className="h-16 w-16 border">
              <AvatarImage src={group.avatar_url || undefined} alt={group.name} />
              <AvatarFallback><Users className="h-6 w-6" /></AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-bold truncate">{group.name}</h1>
              <div className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5">
                {group.privacy === 'private' ? <Lock className="h-3 w-3" /> : <Globe className="h-3 w-3" />}
                {group.privacy === 'private' ? 'Закрита група' : 'Відкрита група'}
                <span>•</span>
                <span>{members.filter((m) => m.status === 'approved').length} учасників</span>
              </div>
              {group.description && <p className="text-sm text-muted-foreground mt-2">{group.description}</p>}
            </div>
            <div className="flex items-center gap-2">
              {myMembership?.status === 'pending' && <Badge variant="outline">Заявка на розгляді</Badge>}
              {!myMembership && (
                <Button size="sm" onClick={join}>
                  {group.privacy === 'private' ? 'Подати заявку' : 'Приєднатися'}
                </Button>
              )}
              {myMembership && myMembership.role !== 'owner' && (
                <Button size="sm" variant="outline" onClick={leave}>
                  <LogOut className="h-4 w-4 mr-1" /> Вийти
                </Button>
              )}
              {(myMembership?.role === 'owner' || isSiteAdmin) && (
                <Button size="sm" variant="ghost" className="text-destructive" onClick={() => setDeleteOpen(true)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>

          <Tabs defaultValue="feed">
            <TabsList>
              <TabsTrigger value="feed">Дописи</TabsTrigger>
              <TabsTrigger value="members">Учасники</TabsTrigger>
            </TabsList>

            <TabsContent value="feed" className="mt-4 space-y-4">
              {canPost && user?.id && (
                <GroupComposer
                  group={group}
                  currentUser={{ id: user.id, full_name: appUser?.firstName, avatar_url: appUser?.avatarUrl }}
                  canPostAsGroup={isGroupAdmin}
                  onPosted={() => setRefreshKey((k) => k + 1)}
                />
              )}
              {canSeeContent ? (
                <GroupFeed group={group} currentUser={appUser} refreshKey={refreshKey} />
              ) : (
                <div className="text-center py-12 border-2 border-dashed rounded-lg text-muted-foreground">
                  Це закрита група. Приєднайтеся, щоб бачити дописи.
                </div>
              )}
            </TabsContent>

            <TabsContent value="members" className="mt-4">
              <GroupMembersPanel
                members={members}
                isAdmin={isGroupAdmin}
                currentUserId={user?.id}
                onChanged={reload}
              />
            </TabsContent>
          </Tabs>
        </main>
      </div>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Видалити групу?</AlertDialogTitle>
            <AlertDialogDescription>
              Усі дописи цієї групи буде видалено назавжди. Цю дію не можна скасувати.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Скасувати</AlertDialogCancel>
            <AlertDialogAction onClick={removeGroup}>Видалити</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
