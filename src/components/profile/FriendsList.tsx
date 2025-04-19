
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Check, X, UserPlus } from "lucide-react";
import { useFriendRequests } from "@/hooks/useFriendRequests";

export function FriendsList({ userId }: { userId: string }) {
  const { friendRequests, sendFriendRequest, respondToFriendRequest } = useFriendRequests();
  
  const pendingRequests = friendRequests.filter(
    request => request.receiver_id === userId && request.status === 'pending'
  );

  const friends = friendRequests.filter(
    request => 
      request.status === 'accepted' && 
      (request.sender_id === userId || request.receiver_id === userId)
  );

  return (
    <Card>
      <CardContent className="p-4">
        <div className="space-y-4">
          {pendingRequests.length > 0 && (
            <div>
              <h3 className="font-semibold mb-2">Запити у друзі</h3>
              <div className="space-y-2">
                {pendingRequests.map((request) => (
                  <div key={request.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Avatar>
                        <AvatarFallback>К</AvatarFallback>
                      </Avatar>
                      <span>Новий запит у друзі</span>
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        onClick={() => respondToFriendRequest(request.id, 'accepted')}
                      >
                        <Check className="w-4 h-4 mr-1" />
                        Прийняти
                      </Button>
                      <Button 
                        size="sm" 
                        variant="destructive"
                        onClick={() => respondToFriendRequest(request.id, 'rejected')}
                      >
                        <X className="w-4 h-4 mr-1" />
                        Відхилити
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <h3 className="font-semibold">Друзі</h3>
          {friends.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {friends.map((friend) => (
                <div key={friend.id} className="flex items-center gap-2">
                  <Avatar>
                    <AvatarImage src={friend.avatar_url} />
                    <AvatarFallback>К</AvatarFallback>
                  </Avatar>
                  <span>{friend.full_name || 'Користувач'}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground">Поки що немає друзів</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
