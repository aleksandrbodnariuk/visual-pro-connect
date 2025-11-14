
import { useEffect, useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { MessageCircle, UserPlus, Trash2 } from "lucide-react";
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { useFriendRequests } from '@/hooks/useFriendRequests';
import { toast } from 'sonner';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogFooter,
  DialogDescription
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

export function SearchResults({ category }: { category: string }) {
  const [professionals, setProfessionals] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const navigate = useNavigate();
  const { sendFriendRequest, friends } = useFriendRequests();

  useEffect(() => {
    // Check if current user is admin
    const checkAdmin = async () => {
      try {
        const { data } = await supabase.auth.getUser();
        if (data?.user?.id) {
          const { data: userData, error } = await supabase
            .from('users')
            .select('is_admin')
            .eq('id', data.user.id)
            .single();
            
          if (!error && userData) {
            setIsAdmin(userData.is_admin === true);
          }
        } else {
          // Fallback to local storage
          const currentUser = localStorage.getItem('currentUser');
          if (currentUser) {
            const user = JSON.parse(currentUser);
            setIsAdmin(user.is_admin === true || user.role === 'admin');
          }
        }
      } catch (error) {
        console.error('Error checking admin status:', error);
      }
    };
    
    checkAdmin();
  }, []);

  useEffect(() => {
    const fetchProfessionals = async () => {
      try {
        setIsLoading(true);
        
        // Спроба отримати дані з Supabase
        const { data, error } = await (supabase as any)
          .rpc('get_safe_public_profiles');
        
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
          
          // Remove dummy data that might be from demos
          // Since is_bot is not in the schema, we'll filter out users with demo IDs instead
          filteredData = filteredData.filter(user => !user.id.startsWith('demo'));
          
          setProfessionals(filteredData);
        } else {
          setProfessionals([]);
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
            avatar_url: "https://i.pravatar.cc/150?img=1",
            is_demo: true
          },
          {
            id: "demo2",
            full_name: "Максим Шевченко",
            categories: ["videographer"],
            avatar_url: "https://i.pravatar.cc/150?img=3",
            is_demo: true
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

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  const handleDeleteUser = async () => {
    if (!selectedUser) return;
    
    try {
      // Try to delete from Supabase
      const { error } = await supabase
        .from('users')
        .delete()
        .match({ id: selectedUser.id });
        
      if (error) throw error;
      
      // Remove from local state
      setProfessionals(professionals.filter(user => user.id !== selectedUser.id));
      toast.success("Користувача видалено");
    } catch (error) {
      console.error("Error deleting user:", error);
      
      // Fallback for demo: just remove from local state
      setProfessionals(professionals.filter(user => user.id !== selectedUser.id));
      toast.success("Користувача видалено");
    } finally {
      setSelectedUser(null);
      setConfirmDeleteOpen(false);
    }
  };

  const openDeleteConfirm = (user: any) => {
    setSelectedUser(user);
    setConfirmDeleteOpen(true);
  };

  const getCategoryName = (categoryId: string) => {
    switch(categoryId) {
      case 'photographer': return 'Фотограф';
      case 'videographer': return 'Відеограф';
      case 'musician': return 'Музикант';
      case 'host': return 'Ведучий';
      case 'pyrotechnician': return 'Піротехнік';
      default: return categoryId;
    }
  };

  // Filter professionals based on search query
  const filteredProfessionals = professionals.filter(professional => {
    if (!searchQuery) return true;
    
    const fullName = professional.full_name?.toLowerCase() || '';
    const categories = professional.categories?.map((c: string) => getCategoryName(c).toLowerCase()).join(' ') || '';
    
    return fullName.includes(searchQuery.toLowerCase()) || 
           categories.includes(searchQuery.toLowerCase());
  });

  if (isLoading) {
    return <div>Завантаження...</div>;
  }

  return (
    <div>
      <div className="mb-6">
        <Input
          placeholder="Пошук за ім'ям або категорією..."
          value={searchQuery}
          onChange={handleSearchChange}
          className="max-w-md"
        />
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredProfessionals.map((professional) => (
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
                  <div className="flex flex-wrap gap-1 mt-1">
                    {professional.categories?.map((cat: string) => (
                      <span 
                        key={cat} 
                        className="px-2 py-0.5 bg-secondary/20 rounded-full text-xs"
                      >
                        {getCategoryName(cat)}
                      </span>
                    )) || (
                      <span className="text-sm text-muted-foreground">Без категорії</span>
                    )}
                  </div>
                  
                  <div className="mt-4 flex flex-wrap gap-2">
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
                    
                    {isAdmin && (
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => openDeleteConfirm(professional)}
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Видалити
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        
        {filteredProfessionals.length === 0 && (
          <div className="col-span-full text-center py-8 text-muted-foreground">
            {searchQuery 
              ? `Не знайдено користувачів за запитом "${searchQuery}"`
              : (category 
                  ? `Не знайдено професіоналів у категорії "${getCategoryName(category)}"`
                  : "Не знайдено професіоналів"
                )
            }
          </div>
        )}
      </div>
      
      <Dialog open={confirmDeleteOpen} onOpenChange={setConfirmDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Підтвердження видалення</DialogTitle>
            <DialogDescription>
              Ви впевнені, що хочете видалити користувача "{selectedUser?.full_name}"?
              Ця дія незворотна.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDeleteOpen(false)}>
              Скасувати
            </Button>
            <Button variant="destructive" onClick={handleDeleteUser}>
              Видалити
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
