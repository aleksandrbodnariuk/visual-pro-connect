
import { useState, useEffect } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { Sidebar } from "@/components/layout/Sidebar";
import { Search, Filter, Users, User, UserPlus, MessageSquare } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useNavigate } from "react-router-dom";
import { useFriendRequests } from "@/hooks/useFriendRequests";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";


export default function Connect() {
  const [users, setUsers] = useState<any[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [isLoading, setIsLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const navigate = useNavigate();
  const { sendFriendRequest, friends } = useFriendRequests();

  useEffect(() => {
    const checkCurrentUser = async () => {
      const { data } = await supabase.auth.getUser();
      if (data.user) {
        setCurrentUserId(data.user.id);
      }
    };
    
    checkCurrentUser();
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setIsLoading(true);
      
      // Спроба отримати користувачів з Supabase
      const { data, error } = await (supabase as any)
        .rpc('get_safe_public_profiles');
      
      if (error) {
        console.error("Помилка при завантаженні користувачів:", error);
        throw error;
      }
      
      // Якщо є дані з Supabase, використовуємо їх
      if (data && data.length > 0) {
        setUsers(data);
        setFilteredUsers(data);
      } else {
        // Якщо дані відсутні, показуємо порожній список
        console.log("Користувачів не знайдено");
        setUsers([]);
        setFilteredUsers([]);
      }
    } catch (err) {
      console.error("Помилка при завантаженні користувачів:", err);
      toast.error("Не вдалося завантажити список користувачів");
      
      // У випадку помилки показуємо порожній список
      setUsers([]);
      setFilteredUsers([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let result = users;
    
    // Не показуємо поточного користувача у списку
    if (currentUserId) {
      result = result.filter(user => user.id !== currentUserId);
    }
    
    // Застосувати фільтр пошуку
    if (searchTerm) {
      result = result.filter(user => 
        user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
        user.profession?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (user.categories && user.categories.some((cat: string) => 
          cat.toLowerCase().includes(searchTerm.toLowerCase())
        ))
      );
    }
    
    // Застосувати фільтр категорії
    if (categoryFilter !== "all") {
      result = result.filter(user => 
        user.category === categoryFilter || 
        user.profession?.toLowerCase().includes(categoryFilter.toLowerCase()) ||
        (user.categories && user.categories.includes(categoryFilter))
      );
    }
    
    setFilteredUsers(result);
  }, [searchTerm, categoryFilter, users, currentUserId]);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  const handleCategoryChange = (value: string) => {
    setCategoryFilter(value);
  };

  const handleSendMessage = (userId: string) => {
    navigate(`/messages?userId=${userId}`);
  };

  const handleSendFriendRequest = async (userId: string) => {
    if (!currentUserId) {
      toast.error("Ви повинні увійти в систему");
      return;
    }
    
    try {
      await sendFriendRequest(userId);
      toast.success("Запит у друзі надіслано");
    } catch (error) {
      console.error("Помилка при надсиланні запиту:", error);
      toast.error("Помилка при надсиланні запиту у друзі");
    }
  };

  const isFriend = (userId: string) => {
    return friends && friends.some(friend => friend?.id === userId);
  };

  // Функція для створення заглушок аватара
  const getAvatarFallback = (fullName: string) => {
    if (!fullName) return 'КР';
    return fullName.split(' ').map(part => part[0]).join('').substring(0, 2);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container grid grid-cols-12 gap-6 px-4 md:px-6 py-6">
        <Sidebar className="hidden lg:block col-span-3" />
        
        <main className="col-span-12 lg:col-span-9">
          <div className="mb-6">
            <h1 className="text-3xl font-bold mb-2">Знайти контакти</h1>
            <p className="text-muted-foreground">
              Знаходьте колег, партнерів та клієнтів для співпраці
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Пошук за ім'ям або професією..."
                className="pl-10"
                value={searchTerm}
                onChange={handleSearch}
              />
            </div>
            <div className="w-full sm:w-60">
              <Select value={categoryFilter} onValueChange={handleCategoryChange}>
                <SelectTrigger>
                  <div className="flex items-center">
                    <Filter className="mr-2 h-4 w-4" />
                    <SelectValue placeholder="Категорія" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Усі категорії</SelectItem>
                  <SelectItem value="photographer">Фотографи</SelectItem>
                  <SelectItem value="videographer">Відеографи</SelectItem>
                  <SelectItem value="musician">Музиканти</SelectItem>
                  <SelectItem value="host">Ведучі</SelectItem>
                  <SelectItem value="pyrotechnic">Піротехніки</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {isLoading ? (
              <div className="col-span-full text-center py-12 border rounded-lg bg-muted/30">
                <div className="animate-spin h-8 w-8 mx-auto border-4 border-primary border-t-transparent rounded-full mb-3"></div>
                <h3 className="text-xl font-medium mb-2">Завантаження контактів...</h3>
              </div>
            ) : filteredUsers.length > 0 ? (
              filteredUsers.map((user) => (
                <Card key={user.id} className="overflow-hidden hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex flex-col items-center text-center p-4">
                      <Avatar className="h-24 w-24 mb-4">
                        <AvatarImage src={user.avatar_url} alt={user.full_name} />
                        <AvatarFallback>{getAvatarFallback(user.full_name)}</AvatarFallback>
                      </Avatar>
                      <h3 className="font-semibold text-lg">{user.full_name || 'Користувач'}</h3>
                      {user.categories && user.categories.length > 0 && (
                        <Badge variant="secondary" className="mt-1">
                          {user.categories[0] === 'photographer' ? 'Фотограф' : 
                           user.categories[0] === 'videographer' ? 'Відеограф' : 
                           user.categories[0] === 'musician' ? 'Музикант' : 
                           user.categories[0] === 'host' ? 'Ведучий' : 
                           user.categories[0] === 'pyrotechnic' ? 'Піротехнік' : 
                           user.categories[0]}
                        </Badge>
                      )}
                      <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                        {user.bio || "Учасник спільноти B&C"}
                      </p>
                    </div>
                    
                    <div className="flex mt-4 space-x-2 justify-center">
                      <Button variant="outline" size="sm" onClick={() => navigate(`/profile/${user.id}`)}>
                        <User className="h-4 w-4 mr-1" /> Профіль
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => handleSendMessage(user.id)}
                      >
                        <MessageSquare className="h-4 w-4 mr-1" /> Написати
                      </Button>
                      {!isFriend(user.id) && (
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleSendFriendRequest(user.id)}
                        >
                          <UserPlus className="h-4 w-4 mr-1" /> Додати
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <div className="col-span-full text-center py-12 border rounded-lg bg-muted/30">
                <Users className="mx-auto h-8 w-8 text-muted-foreground mb-3" />
                <h3 className="text-xl font-medium mb-2">Користувачів не знайдено</h3>
                <p className="text-muted-foreground mb-4">
                  Спробуйте змінити параметри пошуку
                </p>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
