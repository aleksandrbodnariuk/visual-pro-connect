import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useFriendRequests } from "@/hooks/useFriendRequests";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

export function FriendsList({ userId }: { userId?: string }) {
  const { friends, refreshFriendRequests } = useFriendRequests();
  const [isLoading, setIsLoading] = useState(false);
  
  useEffect(() => {
    const loadFriendData = async () => {
      setIsLoading(true);
      
      // Timeout 15 секунд для запиту друзів
      const timeout = setTimeout(() => {
        setIsLoading(false);
      }, 15000);
      
      try {
        await refreshFriendRequests();
      } catch (error) {
        console.error("Error loading friends:", error);
      } finally {
        clearTimeout(timeout);
        setIsLoading(false);
      }
    };
    
    loadFriendData();
  }, [userId, refreshFriendRequests]);
  
  const friendsList = friends.filter(friend => friend !== null);
  
  const getInitials = (name: string | null): string => {
    if (!name) return 'К';
    const nameParts = name.split(' ');
    if (nameParts.length >= 2) {
      return `${nameParts[0].charAt(0)}${nameParts[1].charAt(0)}`;
    }
    return name.charAt(0);
  };

  // Показуємо максимум 9 друзів у сітці
  const displayedFriends = friendsList.slice(0, 9);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-4">
          <div className="flex justify-center items-center h-20">
            <p className="text-muted-foreground">Завантаження списку друзів...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-4">
        {/* Заголовок з кількістю друзів */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-semibold text-lg">Друзі</h3>
            <p className="text-sm text-muted-foreground">{friendsList.length} друзів</p>
          </div>
          {friendsList.length > 9 && (
            <Button variant="link" asChild className="text-primary">
              <Link to="/friends">Переглянути всіх друзів</Link>
            </Button>
          )}
        </div>

        {friendsList.length > 0 ? (
          <div className="grid grid-cols-2 xs:grid-cols-3 md:grid-cols-3 gap-2 sm:gap-3">
            {displayedFriends.map((friend) => (
              <Link 
                key={friend?.id}
                to={`/profile/${friend?.id}`}
                className="group"
              >
                <div className="aspect-square overflow-hidden rounded-lg bg-muted">
                  {friend?.avatar_url ? (
                    <img 
                      src={friend.avatar_url} 
                      alt={friend.full_name || 'Друг'}
                      className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-200"
                    />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center text-xl sm:text-2xl md:text-3xl font-medium text-muted-foreground">
                      {getInitials(friend?.full_name)}
                    </div>
                  )}
                </div>
                <p className="mt-1.5 sm:mt-2 text-xs sm:text-sm font-medium truncate text-center">
                  {friend?.full_name || 'Користувач'}
                </p>
              </Link>
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground text-center py-6 sm:py-8">Поки що немає друзів</p>
        )}
      </CardContent>
    </Card>
  );
}
