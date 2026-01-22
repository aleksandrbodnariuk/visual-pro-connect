import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

interface ChatHeaderProps {
  user: {
    name: string;
    avatarUrl: string;
    lastSeen: string;
  };
  onBack?: () => void;
}

export function ChatHeader({ user, onBack }: ChatHeaderProps) {
  return (
    <div className="border-b p-3">
      <div className="flex items-center gap-3">
        {/* Кнопка назад - тільки на мобільних */}
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
