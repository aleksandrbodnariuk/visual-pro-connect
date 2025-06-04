
import { Button } from "@/components/ui/button";
import { UserPlus, UserCheck, Clock } from "lucide-react";
import { useFriendRequests } from "@/hooks/useFriendRequests";

interface AddFriendButtonProps {
  userId: string;
  userName?: string;
}

export function AddFriendButton({ userId, userName }: AddFriendButtonProps) {
  const { checkFriendshipStatus, sendFriendRequest } = useFriendRequests();
  
  const friendshipStatus = checkFriendshipStatus(userId);
  
  const handleAddFriend = async () => {
    await sendFriendRequest(userId);
  };

  if (friendshipStatus.status === 'friends') {
    return (
      <Button variant="outline" disabled>
        <UserCheck className="w-4 h-4 mr-2" />
        Друзі
      </Button>
    );
  }

  if (friendshipStatus.status === 'pending-sent') {
    return (
      <Button variant="outline" disabled>
        <Clock className="w-4 h-4 mr-2" />
        Запит відправлено
      </Button>
    );
  }

  if (friendshipStatus.status === 'pending-received') {
    return (
      <Button variant="outline" disabled>
        <Clock className="w-4 h-4 mr-2" />
        Очікує відповіді
      </Button>
    );
  }

  return (
    <Button onClick={handleAddFriend}>
      <UserPlus className="w-4 h-4 mr-2" />
      Додати в друзі
    </Button>
  );
}
