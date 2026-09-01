import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Navbar } from '@/components/layout/Navbar';
import { Sidebar } from '@/components/layout/Sidebar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Plus, Users } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useGroups, groupActions, type Group } from '@/hooks/groups/useGroups';
import { GroupCard } from '@/components/groups/GroupCard';
import { CreateGroupDialog } from '@/components/groups/CreateGroupDialog';
import { toast } from 'sonner';

export default function Groups() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { groups, memberships, loading, reload } = useGroups();
  const [query, setQuery] = useState('');
  const [createOpen, setCreateOpen] = useState(false);

  useEffect(() => { document.title = 'Групи — спільноти та сторінки'; }, []);

  const membershipMap = useMemo(
    () => new Map(memberships.map((m) => [m.group_id, m])),
    [memberships]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return groups.filter((g) => !q || g.name.toLowerCase().includes(q) || (g.description || '').toLowerCase().includes(q));
  }, [groups, query]);

  const myGroups = filtered.filter((g) => membershipMap.has(g.id));
  const discover = filtered.filter((g) => !membershipMap.has(g.id));

  const handleJoin = async (g: Group) => {
    if (!user?.id) { toast.error('Увійдіть у систему'); return; }
    const ok = await groupActions.join(g.id, user.id, g.privacy);
    if (ok) reload();
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-3 md:px-4 pt-20 pb-6 grid grid-cols-12 gap-4">
        <Sidebar className="hidden lg:block col-span-3 sticky top-20 self-start max-h-[calc(100vh-6rem)] overflow-y-auto" />
        <main className="col-span-12 lg:col-span-9 space-y-4">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <Users className="h-6 w-6 text-primary" />
              <h1 className="text-2xl font-bold">Групи</h1>
            </div>
            <Button size="sm" onClick={() => (user?.id ? setCreateOpen(true) : navigate('/auth'))}>
              <Plus className="h-4 w-4 mr-1" /> Створити групу
            </Button>
          </div>

          <Input placeholder="Пошук груп…" value={query} onChange={(e) => setQuery(e.target.value)} />

          <Tabs defaultValue="my">
            <TabsList>
              <TabsTrigger value="my">Мої групи ({myGroups.length})</TabsTrigger>
              <TabsTrigger value="discover">Пошук груп ({discover.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="my" className="mt-4">
              {loading ? (
                <div className="text-muted-foreground">Завантаження…</div>
              ) : myGroups.length === 0 ? (
                <div className="text-center py-14 border-2 border-dashed rounded-lg">
                  <Users className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                  <p className="text-muted-foreground mb-4">Ви ще не в жодній групі</p>
                  <Button onClick={() => (user?.id ? setCreateOpen(true) : navigate('/auth'))}>
                    <Plus className="h-4 w-4 mr-1" /> Створити групу
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                  {myGroups.map((g) => (
                    <GroupCard key={g.id} group={g} membership={membershipMap.get(g.id)} />
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="discover" className="mt-4">
              {discover.length === 0 ? (
                <div className="text-muted-foreground py-8 text-center">Немає нових груп</div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                  {discover.map((g) => <GroupCard key={g.id} group={g} onJoin={handleJoin} />)}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </main>
      </div>

      <CreateGroupDialog open={createOpen} onOpenChange={setCreateOpen} onCreated={(id) => navigate(`/groups/${id}`)} />
    </div>
  );
}
