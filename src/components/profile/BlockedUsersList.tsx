import { Card, CardContent } from "@/components/ui/card";
import { useFriendRequests } from "@/hooks/useFriendRequests";
import { useState } from "react";
import { Link } from "react-router-dom";
import { ShieldOff } from "lucide-react";
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

export function BlockedUsersList() {
  const { blockedUsers, unblockUser, refreshFriendRequests } = useFriendRequests();
  const [unblockTarget, setUnblockTarget] = useState<{ id: string; name: string } | null>(null);

  const getInitials = (name: string | null | undefined): string => {
    if (!name) return 'К';
    const nameParts = name.split(' ');
    if (nameParts.length >= 2) {
      return `${nameParts[0].charAt(0)}${nameParts[1].charAt(0)}`;
    }
    return name.charAt(0);
  };

  const handleUnblock = async () => {
    if (!unblockTarget) return;
    const success = await unblockUser(unblockTarget.id);
    if (success) await refreshFriendRequests();
    setUnblockTarget(null);
  };

  const hasBlocked = blockedUsers && blockedUsers.length > 0;

  return (
    <>
      <Card>
        <CardContent className="p-4">
          <div className="mb-4">
            <h3 className="font-semibold text-lg">Заблоковані</h3>
            <p className="text-sm text-muted-foreground">
              {hasBlocked ? `${blockedUsers.length} заблокованих` : 'Немає заблокованих користувачів'}
            </p>
          </div>

          {hasBlocked ? (
            <div className="grid grid-cols-2 xs:grid-cols-3 md:grid-cols-3 gap-2 sm:gap-3">
              {blockedUsers.map((user) => (
                <ContextMenu key={user?.id}>
                  <ContextMenuTrigger asChild>
                    <Link
                      to={`/profile/${user?.id}`}
                      className="group"
                    >
                      <div className="aspect-square overflow-hidden rounded-lg bg-muted opacity-60">
                        {user?.avatar_url ? (
                          <img
                            src={user.avatar_url}
                            alt={user.full_name || 'Користувач'}
                            className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-200"
                          />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center text-xl sm:text-2xl md:text-3xl font-medium text-muted-foreground">
                            {getInitials(user?.full_name)}
                          </div>
                        )}
                      </div>
                      <p className="mt-1.5 sm:mt-2 text-xs sm:text-sm font-medium truncate text-center text-muted-foreground">
                        {user?.full_name || 'Користувач'}
                      </p>
                    </Link>
                  </ContextMenuTrigger>
                  <ContextMenuContent>
                    <ContextMenuItem
                      onClick={(e) => {
                        e.preventDefault();
                        setUnblockTarget({ id: user!.id!, name: user?.full_name || 'Користувач' });
                      }}
                    >
                      <ShieldOff className="mr-2 h-4 w-4" />
                      Розблокувати
                    </ContextMenuItem>
                  </ContextMenuContent>
                </ContextMenu>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-4">Немає заблокованих користувачів</p>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={!!unblockTarget} onOpenChange={(open) => !open && setUnblockTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Розблокувати користувача?</AlertDialogTitle>
            <AlertDialogDescription>
              Ви впевнені, що хочете розблокувати <strong>{unblockTarget?.name}</strong>? Цей користувач знову зможе надсилати вам запити.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Скасувати</AlertDialogCancel>
            <AlertDialogAction onClick={handleUnblock}>
              Розблокувати
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
