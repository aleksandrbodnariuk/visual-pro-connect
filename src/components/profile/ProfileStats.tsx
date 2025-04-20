
import { Button } from "@/components/ui/button";
import { Heart, MessageCircle } from "lucide-react";

interface ProfileStatsProps {
  likes: number;
  comments: number;
  onLike?: () => void;
}

export function ProfileStats({ likes, comments, onLike }: ProfileStatsProps) {
  return (
    <div className="flex items-center gap-4 mt-2">
      <Button 
        variant="ghost" 
        size="sm" 
        className="flex items-center gap-1"
        onClick={onLike}
      >
        <Heart className="h-4 w-4" />
        <span>{likes}</span>
      </Button>
      <Button 
        variant="ghost" 
        size="sm" 
        className="flex items-center gap-1"
      >
        <MessageCircle className="h-4 w-4" />
        <span>{comments}</span>
      </Button>
    </div>
  );
}
