
import { Button } from "@/components/ui/button";
import { MessageCircle, UserPlus } from "lucide-react";
import { AddFriendButton } from "@/components/profile/AddFriendButton";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

interface ProfileActionsProps {
  userId: string;
  isOwnProfile: boolean;
  userName?: string;
}

export function ProfileActions({ userId, isOwnProfile, userName }: ProfileActionsProps) {
  const navigate = useNavigate();

  const handleSendMessage = () => {
    if (!userId) {
      toast.error("Не вдалося відкрити чат. ID користувача не знайдено.");
      return;
    }
    
    // Зберігаємо ID отримувача для відкриття чату
    localStorage.setItem("currentChatReceiverId", userId);
    
    // Переходимо на сторінку повідомлень
    navigate("/messages");
  };

  if (isOwnProfile) {
    return null;
  }

  return (
    <div className="flex gap-2">
      <Button 
        onClick={handleSendMessage}
        variant="outline"
        className="flex-1"
      >
        <MessageCircle className="w-4 h-4 mr-2" />
        Написати
      </Button>
      
      <AddFriendButton userId={userId} userName={userName} />
    </div>
  );
}
