
import { Button } from "@/components/ui/button";
import { Edit, UserPlus } from "lucide-react";

interface ProfileActionsProps {
  isCurrentUser: boolean;
  onEditProfile?: () => void;
  onAddFriend?: () => void;
  isFriend?: boolean;
  isSendingRequest?: boolean;
}

export function ProfileActions({ 
  isCurrentUser, 
  onEditProfile, 
  onAddFriend,
  isFriend = false,
  isSendingRequest = false
}: ProfileActionsProps) {
  return (
    <div className="flex items-center gap-2">
      {isCurrentUser ? (
        <Button 
          variant="outline" 
          className="gap-2"
          onClick={onEditProfile}
        >
          <Edit className="h-4 w-4" />
          <span>Редагувати профіль</span>
        </Button>
      ) : (
        <div className="flex gap-2">
          <Button className="bg-gradient-purple">Підписатися</Button>
          {!isFriend && (
            <Button 
              variant="secondary" 
              onClick={onAddFriend}
              disabled={isSendingRequest}
            >
              <UserPlus className="w-4 h-4 mr-2" />
              Додати в друзі
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
