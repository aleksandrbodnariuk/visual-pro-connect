
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface ProfileAvatarProps {
  avatarUrl?: string;
  name: string;
  className?: string;
}

export function ProfileAvatar({ avatarUrl, name, className = "h-32 w-32 border-4 border-background" }: ProfileAvatarProps) {
  return (
    <Avatar className={className}>
      <AvatarImage src={avatarUrl} alt={name} />
      <AvatarFallback className="text-4xl">
        {name && name !== "undefined undefined"
          ? name
              .split(" ")
              .map((n) => n[0])
              .join("")
          : "U"}
      </AvatarFallback>
    </Avatar>
  );
}
