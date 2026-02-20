import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useFriendRequests } from "@/hooks/useFriendRequests";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Trash2, Ban } from "lucide-react";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { isUserOnline } from "@/lib/onlineStatus";

export function FriendsList({ userId }: { userId?: string }) {
  const { friends, refreshFriendRequests, removeFriend, blockUser } = useFriendRequests();
  const [isLoading, setIsLoading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [blockTarget, setBlockTarget] = useState<{ id: string; name: string } | null>(null);
  const [lastSeenMap, setLastSeenMap] = useState<Map<string, string | null>>(new Map());

  useEffect(() => {
    const loadFriendData = async () => {
      setIsLoading(true);
      const timeout = setTimeout(() => setIsLoading(false), 15000);
      try {
        await refreshFriendRequests();
      } catch (error) {
        console.error("Error loading friends:", error);
      } finally {
        clearTimeout(timeout);
        setIsLoading(false);
      }
    };
    loadFriendData();
  }, [userId, refreshFriendRequests]);

  // Fetch last_seen for all friends via RPC (bypasses RLS)
  useEffect(() => {
    const validFriends = friends.filter(f => f !== null);
    if (validFriends.length === 0) return;

    const fetchLastSeen = async () => {
      const ids = validFriends.map(f => f!.id);
      const { data } = await supabase.rpc('get_users_last_seen', { _ids: ids });
      if (data) {
        const map = new Map<string, string | null>();
        (data as { id: string; last_seen: string | null }[]).forEach((row) => {
          map.set(row.id, row.last_seen);
        });
        setLastSeenMap(map);
      }
    };

    fetchLastSeen();
    const interval = setInterval(fetchLastSeen, 30000);
    return () => clearInterval(interval);
  }, [friends]);

  const friendsList = friends.filter(friend => friend !== null);

  const getInitials = (name: string | null): string => {
    if (!name) return 'К';
    const nameParts = name.split(' ');
    if (nameParts.length >= 2) {
      return `${nameParts[0].charAt(0)}${nameParts[1].charAt(0)}`;
    }
    return name.charAt(0);
  };

  const displayedFriends = friendsList.slice(0, 9);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const success = await removeFriend(deleteTarget.id);
    if (success) await refreshFriendRequests();
    setDeleteTarget(null);
  };

  const handleBlock = async () => {
    if (!blockTarget) return;
    const success = await blockUser(blockTarget.id);
    if (success) await refreshFriendRequests();
    setBlockTarget(null);
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-4">
          <div className="flex justify-center items-center h-20">
            <p className="text-muted-foreground">Завантаження списку друзів...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold text-lg">Друзі</h3>
              <p className="text-sm text-muted-foreground">{friendsList.length} друзів</p>
            </div>
            {friendsList.length > 9 && (
              <Button variant="link" asChild className="text-primary">
                <Link to="/friends">Переглянути всіх друзів</Link>
              </Button>
            )}
          </div>

          {friendsList.length > 0 ? (
            <div className="grid grid-cols-2 xs:grid-cols-3 md:grid-cols-3 gap-2 sm:gap-3">
              {displayedFriends.map((friend) => {
                const online = isUserOnline(lastSeenMap.get(friend!.id) ?? null);
                return (
                  <ContextMenu key={friend?.id}>
                    <ContextMenuTrigger asChild>
                      <Link
                        to={`/profile/${friend?.id}`}
                        className="group"
                      >
                        <div className="relative aspect-square overflow-hidden rounded-lg bg-muted">
                          {friend?.avatar_url ? (
                            <img
                              src={friend.avatar_url}
                              alt={friend.full_name || 'Друг'}
                              className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-200"
                            />
                          ) : (
                            <div className="h-full w-full flex items-center justify-center text-xl sm:text-2xl md:text-3xl font-medium text-muted-foreground">
                              {getInitials(friend?.full_name)}
                            </div>
                          )}
                          {online && (
                            <span className="absolute bottom-2 right-2 block h-4 w-4 rounded-full bg-green-500 ring-2 ring-background" />
                          )}
                        </div>
                        <p className="mt-1.5 sm:mt-2 text-xs sm:text-sm font-medium truncate text-center">
                          {friend?.full_name || 'Користувач'}
                        </p>
                      </Link>
                    </ContextMenuTrigger>
                    <ContextMenuContent>
                      <ContextMenuItem
                        className="text-destructive focus:text-destructive"
                        onClick={(e) => {
                          e.preventDefault();
                          setDeleteTarget({ id: friend!.id, name: friend?.full_name || 'Користувач' });
                        }}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Видалити з друзів
                      </ContextMenuItem>
                      <ContextMenuItem
                        className="text-destructive focus:text-destructive"
                        onClick={(e) => {
                          e.preventDefault();
                          setBlockTarget({ id: friend!.id, name: friend?.full_name || 'Користувач' });
                        }}
                      >
                        <Ban className="mr-2 h-4 w-4" />
                        Заблокувати
                      </ContextMenuItem>
                    </ContextMenuContent>
                  </ContextMenu>
                );
              })}
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-6 sm:py-8">Поки що немає друзів</p>
          )}
        </CardContent>
      </Card>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Видалити з друзів?</AlertDialogTitle>
            <AlertDialogDescription>
              Ви впевнені, що хочете видалити <strong>{deleteTarget?.name}</strong> зі списку друзів?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Скасувати</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Видалити
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Block confirmation */}
      <AlertDialog open={!!blockTarget} onOpenChange={(open) => !open && setBlockTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Заблокувати користувача?</AlertDialogTitle>
            <AlertDialogDescription>
              Ви впевнені, що хочете заблокувати <strong>{blockTarget?.name}</strong>? Цей користувач більше не зможе надсилати вам запити на дружбу.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Скасувати</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBlock}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Заблокувати
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
