
import { useEffect, useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { MessageCircle, UserPlus } from "lucide-react";
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { useFriendRequests } from '@/hooks/useFriendRequests';
import { toast } from 'sonner';

export function SearchResults({ category }: { category: string }) {
  const [professionals, setProfessionals] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();
  const { sendFriendRequest, friends } = useFriendRequests();

  useEffect(() => {
    const fetchProfessionals = async () => {
      try {
        setIsLoading(true);
        
        // Спроба отримати дані з Supabase
        const { data, error } = await supabase
          .from('users')
          .select('*');
        
        if (error) throw error;
        
        if (data && data.length > 0) {
          // Фільтруємо користувачів за категорією
          let filteredData = data;
          if (category && category !== 'all') {
            filteredData = data.filter(user => 
              user.categories && 
              Array.isArray(user.categories) && 
              user.categories.includes(category)
            );
          }
          
          setProfessionals(filteredData);
        } else {
          // Демо дані, якщо немає даних в Supabase
          const demoUsers = [
            {
              id: "demo1",
              full_name: "Анна Коваленко",
              categories: ["photographer"],
              avatar_url: "https://i.pravatar.cc/150?img=1"
            },
            {
              id: "demo2",
              full_name: "Максим Шевченко",
              categories: ["videographer"],
              avatar_url: "https://i.pravatar.cc/150?img=3"
            }
          ];
          
          // Фільтруємо демо дані за категорією
          let filteredDemoData = demoUsers;
          if (category && category !== 'all') {
            filteredDemoData = demoUsers.filter(user => 
              user.categories && 
              user.categories.includes(category)
            );
          }
          
          setProfessionals(filteredDemoData);
        }
      } catch (error) {
        console.error('Error fetching professionals:', error);
        toast.error('Помилка при завантаженні даних');
        
        // Якщо помилка, використовуємо демо дані
        const demoUsers = [
          {
            id: "demo1",
            full_name: "Анна Коваленко",
            categories: ["photographer"],
            avatar_url: "https://i.pravatar.cc/150?img=1"
          },
          {
            id: "demo2",
            full_name: "Максим Шевченко",
            categories: ["videographer"],
            avatar_url: "https://i.pravatar.cc/150?img=3"
          }
        ];
        
        // Фільтруємо демо дані за категорією
        let filteredDemoData = demoUsers;
        if (category && category !== 'all') {
          filteredDemoData = demoUsers.filter(user => 
            user.categories && 
            user.categories.includes(category)
          );
        }
        
        setProfessionals(filteredDemoData);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfessionals();
  }, [category]);

  const handleSendFriendRequest = (userId: string) => {
    sendFriendRequest(userId);
    toast.success("Запит у друзі надіслано");
  };

  const isFriend = (userId: string) => {
    return friends.some(friend => friend?.id === userId);
  };

  if (isLoading) {
    return <div>Завантаження...</div>;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {professionals.map((professional) => (
        <Card key={professional.id}>
          <CardContent className="p-4">
            <div className="flex items-start gap-4">
              <Avatar className="h-16 w-16">
                <AvatarImage src={professional.avatar_url} />
                <AvatarFallback>
                  {professional.full_name?.[0] || 'К'}
                </AvatarFallback>
              </Avatar>
              
              <div className="flex-1">
                <h3 className="font-semibold">{professional.full_name || "Користувач"}</h3>
                <p className="text-sm text-muted-foreground">
                  {professional.categories?.join(', ') || "Без категорії"}
                </p>
                
                <div className="mt-4 flex gap-2">
                  <Button 
                    variant="secondary" 
                    size="sm"
                    onClick={() => navigate(`/profile/${professional.id}`)}
                  >
                    Профіль
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => navigate(`/messages?userId=${professional.id}`)}
                  >
                    <MessageCircle className="w-4 h-4 mr-2" />
                    Написати
                  </Button>
                  
                  {!isFriend(professional.id) && (
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleSendFriendRequest(professional.id)}
                    >
                      <UserPlus className="w-4 h-4 mr-2" />
                      Додати
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
      
      {professionals.length === 0 && (
        <div className="col-span-full text-center py-8 text-muted-foreground">
          Не знайдено професіоналів у цій категорії
        </div>
      )}
    </div>
  );
}
