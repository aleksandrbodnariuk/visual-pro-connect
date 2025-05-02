
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface ChatHeaderProps {
  user: {
    name: string;
    avatarUrl: string;
    lastSeen: string;
  };
}

export function ChatHeader({ user }: ChatHeaderProps) {
  return (
    <div className="border-b p-3">
      <div className="flex items-center gap-3">
        <Avatar className="h-10 w-10">
          <AvatarImage src={user.avatarUrl} alt={user.name} />
          <AvatarFallback>
            {user.name
              .split(" ")
              .map((n: string) => n[0])
              .join("")}
          </AvatarFallback>
        </Avatar>
        
        <div>
          <h3 className="font-semibold">{user.name}</h3>
          <p className="text-xs text-muted-foreground">{user.lastSeen}</p>
        </div>
      </div>
    </div>
  );
}
