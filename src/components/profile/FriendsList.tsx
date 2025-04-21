
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Check, X, UserPlus } from "lucide-react";
import { useFriendRequests } from "@/hooks/useFriendRequests";
import { useEffect } from "react";

// userId –– можна не подавати, якщо треба відобразити друзів авторизованого користувача
export function FriendsList({ userId }: { userId?: string }) {
  const { friendRequests, friends, respondToFriendRequest, refreshFriendRequests } = useFriendRequests();
  
  useEffect(() => {
    refreshFriendRequests();
  }, [userId, refreshFriendRequests]);
  
  // Запити на додавання, які чекають підтвердження
  const pendingRequests = friendRequests.filter(
    request => request.status === 'pending'
      && (!userId || request.receiver_id === userId)
  );
  // Друзі (тільки accepted)
  const friendsList = friends.filter(friend => friend !== null);

  // Функція для отримання ініціалів
  const getInitials = (name: string | null): string => {
    if (!name) return 'К';
    const nameParts = name.split(' ');
    if (nameParts.length >= 2) {
      return `${nameParts[0].charAt(0)}${nameParts[1].charAt(0)}`;
    }
    return name.charAt(0);
  };

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
                        {request.sender?.avatar_url ? (
                          <AvatarImage src={request.sender.avatar_url} />
                        ) : (
                          <AvatarFallback>
                            {request.sender?.full_name ? getInitials(request.sender.full_name) : 'К'}
                          </AvatarFallback>
                        )}
                      </Avatar>
                      <span>{request.sender?.full_name || 'Новий запит у друзі'}</span>
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
          {friendsList && friendsList.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {friendsList.map((friend) => (
                <div key={friend?.id} className="flex items-center gap-2">
                  <Avatar>
                    {friend?.avatar_url ? (
                      <AvatarImage src={friend.avatar_url} />
                    ) : (
                      <AvatarFallback>
                        {friend?.full_name ? getInitials(friend.full_name) : 'К'}
                      </AvatarFallback>
                    )}
                  </Avatar>
                  <span>{friend?.full_name || 'Користувач'}</span>
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
