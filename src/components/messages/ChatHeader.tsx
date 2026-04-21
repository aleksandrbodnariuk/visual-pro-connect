import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Users, Settings } from "lucide-react";
import { isUserOnline, formatLastSeenStatus } from "@/lib/onlineStatus";

interface ChatHeaderProps {
  user: {
    name: string;
    avatarUrl: string;
    lastSeen: string;
  };
  onBack?: () => void;
  isGroup?: boolean;
  memberCount?: number;
  onOpenGroupInfo?: () => void;
}

export function ChatHeader({ user, onBack, isGroup, memberCount, onOpenGroupInfo }: ChatHeaderProps) {
  const online = !isGroup && isUserOnline(user.lastSeen);
  const statusText = isGroup ? null : formatLastSeenStatus(user.lastSeen);

  return (
    <div className="border-b p-3">
      <div className="flex items-center gap-3">
        {onBack && (
          <Button 
            variant="ghost" 
            size="icon"
            onClick={onBack}
            className="md:hidden"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
        )}
        
        <div
          className={`relative flex-shrink-0 ${isGroup && onOpenGroupInfo ? 'cursor-pointer' : ''}`}
          onClick={isGroup && onOpenGroupInfo ? onOpenGroupInfo : undefined}
        >
          <Avatar className="h-10 w-10">
            <AvatarImage src={user.avatarUrl} alt={user.name} />
            <AvatarFallback>
              {isGroup ? (
                <Users className="h-5 w-5" />
              ) : (
                user.name
                  .split(" ")
                  .map((n: string) => n[0])
                  .join("")
              )}
            </AvatarFallback>
          </Avatar>
          {online && (
            <span className="absolute bottom-0 right-0 block h-3 w-3 rounded-full bg-green-500 ring-2 ring-background" />
          )}
        </div>
        
        <div
          className={`flex-1 min-w-0 ${isGroup && onOpenGroupInfo ? 'cursor-pointer' : ''}`}
          onClick={isGroup && onOpenGroupInfo ? onOpenGroupInfo : undefined}
        >
          <h3 className="font-semibold truncate">{user.name}</h3>
          {isGroup && memberCount ? (
            <p className="text-xs text-muted-foreground">{memberCount} учасників</p>
          ) : statusText && (
            <p className={`text-xs ${online ? 'text-green-500' : 'text-muted-foreground'}`}>
              {statusText}
            </p>
          )}
        </div>

        {isGroup && onOpenGroupInfo && (
          <Button variant="ghost" size="icon" onClick={onOpenGroupInfo} title="Інформація про групу">
            <Settings className="h-5 w-5" />
          </Button>
        )}
      </div>
    </div>
  );
}
