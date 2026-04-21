import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Crown, Shield, MoreVertical, UserMinus, ShieldOff, ShieldCheck } from "lucide-react";

export interface GroupMemberRowProps {
  profile: { id: string; full_name?: string; avatar_url?: string };
  role?: string;
  isMe: boolean;
  isOwnerViewer: boolean; // current user is owner
  isAdminViewer: boolean; // current user is owner or admin
  onRemove: (userId: string) => void;
  onPromote: (userId: string) => void;
  onDemote: (userId: string) => void;
}

export function GroupMemberRow({
  profile, role, isMe, isOwnerViewer, isAdminViewer,
  onRemove, onPromote, onDemote,
}: GroupMemberRowProps) {
  const isOwnerTarget = role === 'owner';
  const isAdminTarget = role === 'admin';

  // Owner can promote/demote; admins can only remove regular members
  const canPromote = isOwnerViewer && !isMe && !isOwnerTarget && !isAdminTarget;
  const canDemote = isOwnerViewer && !isMe && isAdminTarget;
  const canRemove = isAdminViewer && !isMe && !isOwnerTarget;
  const showMenu = canPromote || canDemote || canRemove;

  return (
    <div className="flex items-center gap-3 p-2 rounded-md hover:bg-muted">
      <Avatar className="h-9 w-9">
        <AvatarImage src={profile.avatar_url || ''} />
        <AvatarFallback>{profile.full_name?.[0] || '?'}</AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <div className="font-medium truncate flex items-center gap-1">
          {profile.full_name || 'Користувач'}{isMe && ' (Ви)'}
          {isOwnerTarget && <Crown className="h-3 w-3 text-primary" />}
          {isAdminTarget && <Shield className="h-3 w-3 text-primary" />}
        </div>
        <div className="text-xs text-muted-foreground">
          {isOwnerTarget ? 'Власник' : isAdminTarget ? 'Співвласник / Модератор' : 'Учасник'}
        </div>
      </div>

      {showMenu && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="icon" variant="ghost">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-popover">
            {canPromote && (
              <DropdownMenuItem onClick={() => onPromote(profile.id)}>
                <ShieldCheck className="h-4 w-4 mr-2" />
                Призначити співвласником
              </DropdownMenuItem>
            )}
            {canDemote && (
              <DropdownMenuItem onClick={() => onDemote(profile.id)}>
                <ShieldOff className="h-4 w-4 mr-2" />
                Зняти з посади
              </DropdownMenuItem>
            )}
            {(canPromote || canDemote) && canRemove && <DropdownMenuSeparator />}
            {canRemove && (
              <DropdownMenuItem onClick={() => onRemove(profile.id)} className="text-destructive">
                <UserMinus className="h-4 w-4 mr-2" />
                Видалити з групи
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}