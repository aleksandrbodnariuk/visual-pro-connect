import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Check, X, Loader2 } from "lucide-react";
import { useFriendRequests } from "@/hooks/useFriendRequests";
import { useAuth } from '@/context/AuthContext';

export function FriendRequestsList() {
  const { friendRequests, respondToFriendRequest, isLoading } = useFriendRequests();
  const { user: authUser } = useAuth();
  const currentUserId = authUser?.id || null;
  
  // Filter requests that came to the current user
  const incomingRequests = friendRequests.filter(
    request => request.status === 'pending' && request.receiver_id === currentUserId
  );

  console.log("📋 FriendRequestsList - currentUserId:", currentUserId);
  console.log("📋 FriendRequestsList - all friendRequests:", friendRequests);
  console.log("📋 FriendRequestsList - incomingRequests:", incomingRequests);

  const getInitials = (name: string | null): string => {
    if (!name) return 'К';
    const nameParts = name.split(' ');
    if (nameParts.length >= 2) {
      return `${nameParts[0].charAt(0)}${nameParts[1].charAt(0)}`;
    }
    return name.charAt(0);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Запити у друзі</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (incomingRequests.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Запити у друзі</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Немає нових запитів у друзі</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Запити у друзі ({incomingRequests.length})</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {incomingRequests.map((request) => (
            <div key={request.id} className="flex items-center justify-between p-3 border rounded-md">
              <div className="flex items-center gap-3">
                <Avatar>
                  {request.sender?.avatar_url ? (
                    <AvatarImage src={request.sender.avatar_url} />
                  ) : (
                    <AvatarFallback>
                      {request.sender?.full_name ? getInitials(request.sender.full_name) : 
                       request.sender?.firstName ? getInitials(`${request.sender.firstName} ${request.sender.lastName || ''}`) : 'К'}
                    </AvatarFallback>
                  )}
                </Avatar>
                <div>
                  <p className="font-medium">
                    {request.sender?.full_name || 
                     (request.sender?.firstName && request.sender?.lastName ? 
                      `${request.sender.firstName} ${request.sender.lastName}` : 
                      'Новий запит у друзі')}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Хоче додати вас до друзів
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button 
                  size="sm" 
                  onClick={() => respondToFriendRequest(request.id, 'accept')}
                >
                  <Check className="w-4 h-4 mr-1" />
                  Прийняти
                </Button>
                <Button 
                  size="sm" 
                  variant="destructive"
                  onClick={() => respondToFriendRequest(request.id, 'reject')}
                >
                  <X className="w-4 h-4 mr-1" />
                  Відхилити
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
