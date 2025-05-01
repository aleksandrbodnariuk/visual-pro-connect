
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Check, X, UserPlus, MessageCircle, User } from "lucide-react";
import { useFriendRequests } from "@/hooks/useFriendRequests";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

// userId –– можна не подавати, якщо треба відобразити друзів авторизованого користувача
export function FriendsList({ userId }: { userId?: string }) {
  const { friendRequests, friends, respondToFriendRequest, refreshFriendRequests } = useFriendRequests();
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  
  useEffect(() => {
    const loadFriendData = async () => {
      setIsLoading(true);
      await refreshFriendRequests();
      setIsLoading(false);
    };
    
    loadFriendData();
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

  // Функція для відкриття чату з користувачем
  const openChat = async (friendId: string | undefined) => {
    if (!friendId) {
      toast.error("Не вдалося відкрити чат. ID користувача не знайдено.");
      return;
    }
    
    try {
      // Зберігаємо ID отримувача повідомлення для відкриття чату
      localStorage.setItem("currentChatReceiverId", friendId);
      
      // Перевіряємо наявність користувача в Supabase
      const { data: userInSupabase, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', friendId)
        .maybeSingle();
      
      if (error) {
        console.error("Помилка перевірки користувача в Supabase:", error);
      }
      
      // Якщо користувача немає в Supabase, спробуємо його створити
      if (!userInSupabase) {
        const storedUsers = JSON.parse(localStorage.getItem("users") || "[]");
        const userToAdd = storedUsers.find((user: any) => user.id === friendId);
        
        if (userToAdd) {
          const { error: insertError } = await supabase
            .from('users')
            .insert({
              id: userToAdd.id,
              full_name: userToAdd.firstName && userToAdd.lastName ? 
                `${userToAdd.firstName} ${userToAdd.lastName}` : userToAdd.full_name || '',
              phone_number: userToAdd.phoneNumber || '',
              is_admin: userToAdd.isAdmin || false,
              is_shareholder: userToAdd.isShareHolder || false,
              avatar_url: userToAdd.avatarUrl || ''
            });
          
          if (insertError && insertError.code !== '23505') { // Ігноруємо помилки унікальності
            console.error("Помилка додавання користувача в Supabase:", insertError);
          }
        }
      }
      
      // Переходимо на сторінку повідомлень
      navigate("/messages");
    } catch (error) {
      console.error("Помилка при відкритті чату:", error);
      toast.error("Сталася помилка при відкритті чату");
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-4">
          <div className="flex justify-center items-center h-20">
            <p>Завантаження списку друзів...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-4">
        <div className="space-y-4">
          {pendingRequests.length > 0 && (
            <div>
              <h3 className="font-semibold mb-2">Запити у друзі</h3>
              <div className="space-y-2">
                {pendingRequests.map((request) => (
                  <div key={request.id} className="flex items-center justify-between p-3 border rounded-md">
                    <div className="flex items-center gap-2">
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
                      <span>{request.sender?.full_name || 
                           request.sender?.firstName && request.sender?.lastName ? 
                           `${request.sender.firstName} ${request.sender.lastName}` : 
                           'Новий запит у друзі'}</span>
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
                <div key={friend?.id} className="flex items-center justify-between p-3 border rounded-md">
                  <div className="flex items-center gap-2">
                    <Avatar>
                      {friend?.avatar_url ? (
                        <AvatarImage src={friend.avatar_url} />
                      ) : (
                        <AvatarFallback>
                          {friend?.full_name ? getInitials(friend.full_name) : 
                           friend?.firstName ? getInitials(`${friend.firstName} ${friend.lastName || ''}`) : 'К'}
                        </AvatarFallback>
                      )}
                    </Avatar>
                    <span>
                      {friend?.full_name || 
                       friend?.firstName && friend?.lastName ? 
                       `${friend.firstName} ${friend.lastName}` : 'Користувач'}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      size="sm"
                      variant="outline"
                      onClick={() => openChat(friend?.id)}
                    >
                      <MessageCircle className="w-4 h-4 mr-1" />
                      Написати
                    </Button>
                    <Button 
                      size="sm" 
                      variant="ghost"
                      asChild
                    >
                      <Link to={`/profile/${friend?.id}`}>
                        <User className="w-4 h-4 mr-1" />
                        Профіль
                      </Link>
                    </Button>
                  </div>
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
