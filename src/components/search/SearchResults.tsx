
import { useEffect, useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { MessageCircle, UserPlus } from "lucide-react";
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { useFriendRequests } from '@/hooks/useFriendRequests';

export function SearchResults({ category }: { category: string }) {
  const [professionals, setProfessionals] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();
  const { sendFriendRequest } = useFriendRequests();

  useEffect(() => {
    const fetchProfessionals = async () => {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .contains('categories', [category]);

      if (error) {
        console.error('Error fetching professionals:', error);
        return;
      }

      setProfessionals(data || []);
      setIsLoading(false);
    };

    if (category) {
      fetchProfessionals();
    }
  }, [category]);

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
                <h3 className="font-semibold">{professional.full_name}</h3>
                <p className="text-sm text-muted-foreground">
                  {professional.categories?.join(', ')}
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
                  
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => sendFriendRequest(professional.id)}
                  >
                    <UserPlus className="w-4 h-4 mr-2" />
                    Додати
                  </Button>
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
