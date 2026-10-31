import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useFriendRequests } from "@/hooks/useFriendRequests";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Trash2, Ban, LayoutGrid, List } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
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
import { useFriendLists } from "@/hooks/friends/useFriendLists";
import { filterFriendsByList } from "@/lib/friendLists";
import { FriendListsManager, FriendListPicker } from "@/components/profile/FriendListsControls";
import { Settings2 } from "lucide-react";

export function FriendsList({ userId, isCurrentUser = true, showAll = false }: { userId?: string; isCurrentUser?: boolean; showAll?: boolean }) {
  const { friends: myFriends, refreshFriendRequests, removeFriend, blockUser } = useFriendRequests();
  const [otherUserFriends, setOtherUserFriends] = useState<Array<{ id: string; full_name: string | null; avatar_url: string | null }>>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [blockTarget, setBlockTarget] = useState<{ id: string; name: string } | null>(null);
  const [lastSeenMap, setLastSeenMap] = useState<Map<string, string | null>>(new Map());
  const [viewMode, setViewMode] = useState<"grid" | "list">(() => (localStorage.getItem("friends_view") === "list" ? "list" : "grid"));
  const [tileSize, setTileSize] = useState<number>(() => Number(localStorage.getItem("friends_tile")) || 120);
  const fl = useFriendLists();
  const [activeList, setActiveList] = useState<string | "all">("all");
  const [manageOpen, setManageOpen] = useState(false);
  useEffect(() => {
    if (activeList !== "all" && !fl.lists.some((l) => l.id === activeList)) setActiveList("all");
  }, [fl.lists, activeList]);
  useEffect(() => { localStorage.setItem("friends_view", viewMode); }, [viewMode]);
  useEffect(() => { localStorage.setItem("friends_tile", String(tileSize)); }, [tileSize]);

  useEffect(() => {
    const loadFriendData = async () => {
      setIsLoading(true);
      const timeout = setTimeout(() => setIsLoading(false), 15000);
      try {
        if (isCurrentUser) {
          await refreshFriendRequests();
        } else if (userId) {
          const { data, error } = await supabase.rpc('get_user_friends', { _user_id: userId });
          if (data && !error) {
            setOtherUserFriends(data as Array<{ id: string; full_name: string | null; avatar_url: string | null }>);
          }
        }
      } catch (error) {
        console.error("Error loading friends:", error);
      } finally {
        clearTimeout(timeout);
        setIsLoading(false);
      }
    };
    loadFriendData();
  }, [userId, isCurrentUser, refreshFriendRequests]);

  const friendsList = isCurrentUser
    ? myFriends.filter(f => f !== null)
    : otherUserFriends;

  useEffect(() => {
    if (friendsList.length === 0) return;

    const fetchLastSeen = async () => {
      const ids = friendsList.map(f => f!.id);
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
  }, [friendsList]);

  const getInitials = (name: string | null): string => {
    if (!name) return 'К';
    const nameParts = name.split(' ');
    if (nameParts.length >= 2) {
      return `${nameParts[0].charAt(0)}${nameParts[1].charAt(0)}`;
    }
    return name.charAt(0);
  };

  const listsEnabled = isCurrentUser && showAll;
  const filteredFriends = listsEnabled ? filterFriendsByList(friendsList as any[], fl.memberships, activeList) : friendsList;
  const displayedFriends = showAll ? filteredFriends : filteredFriends.slice(0, 9);
  const listCounts: Record<string, number> = {};
  const friendIdSet = new Set(friendsList.map((f: any) => f?.id));
  fl.memberships.forEach((m) => { if (friendIdSet.has(m.friend_id)) listCounts[m.list_id] = (listCounts[m.list_id] ?? 0) + 1; });

  const renderPicker = (friend: any, className?: string) =>
    listsEnabled ? (
      <FriendListPicker
        friendName={friend?.full_name || "Користувач"}
        lists={fl.lists}
        selected={fl.listsOf(friend.id)}
        onToggle={(listId) => fl.toggleMember(listId, friend.id)}
        onManage={() => setManageOpen(true)}
        className={className}
      />
    ) : null;

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

  const renderFriendCard = (friend: any) => {
    const online = isUserOnline(lastSeenMap.get(friend!.id) ?? null);
    
    const cardContent = (
      <Link
        to={`/profile/${friend?.id}`}
        className="group"
      >
        <div className="relative aspect-square overflow-hidden rounded-lg bg-muted">
          {friend?.avatar_url ? (
            <img
              src={friend.avatar_url}
              alt={friend.full_name || 'Друг'}
              loading="lazy"
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
    );

    if (!isCurrentUser) {
      return <div key={friend?.id}>{cardContent}</div>;
    }

    return (
      <ContextMenu key={friend?.id}>
        <ContextMenuTrigger asChild>
          {cardContent}
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
  };

  return (
    <>
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold text-lg">Друзі</h3>
              <p className="text-sm text-muted-foreground">{friendsList.length} друзів</p>
            </div>
            {!showAll && friendsList.length > 9 && (
              <Button variant="link" asChild className="text-primary">
                {isCurrentUser ? (
                  <Link to="/friends">Переглянути всіх друзів</Link>
                ) : (
                  <Link to={`/profile/${userId}`}>Переглянути всіх друзів</Link>
                )}
              </Button>
            )}
          </div>

          {friendsList.length > 0 && (
            <div className="flex flex-wrap items-center gap-3 mb-4">
              <ToggleGroup type="single" value={viewMode} onValueChange={(v) => v && setViewMode(v as "grid" | "list")}>
                <ToggleGroupItem value="grid" aria-label="Плитка з фото" className="h-11 w-11"><LayoutGrid className="h-4 w-4" /></ToggleGroupItem>
                <ToggleGroupItem value="list" aria-label="Список без фото" className="h-11 w-11"><List className="h-4 w-4" /></ToggleGroupItem>
              </ToggleGroup>
              {viewMode === "grid" && (
                <div className="flex items-center gap-2 flex-1 min-w-[160px] max-w-xs">
                  <span className="text-xs text-muted-foreground">Розмір</span>
                  <Slider min={64} max={220} step={4} value={[tileSize]} onValueChange={(v) => setTileSize(v[0])} aria-label="Розмір аватарів" />
                </div>
              )}
            </div>
          )}

          {friendsList.length > 0 ? (
            viewMode === "grid" ? (
              <div className="grid gap-2 sm:gap-3" style={{ gridTemplateColumns: `repeat(auto-fill, minmax(${tileSize}px, 1fr))` }}>
                {displayedFriends.map(renderFriendCard)}
              </div>
            ) : (
              <div className="divide-y divide-border">
                {displayedFriends.map((f: any) => {
                  const online = isUserOnline(lastSeenMap.get(f.id) ?? null);
                  return (
                    <Link key={f.id} to={`/profile/${f.id}`} className="flex items-center gap-3 min-h-11 py-2 px-1 hover:bg-muted/50 rounded">
                      <span className={`h-2.5 w-2.5 rounded-full shrink-0 ${online ? "bg-green-500" : "bg-muted-foreground/30"}`} />
                      <span className="text-sm font-medium truncate">{f.full_name || "Користувач"}</span>
                    </Link>
                  );
                })}
              </div>
            )
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
