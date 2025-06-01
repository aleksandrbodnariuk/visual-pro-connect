
import React, { useState, useEffect } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { Sidebar } from "@/components/layout/Sidebar";
import { FriendsList } from "@/components/profile/FriendsList";
import { useFriendRequests } from "@/hooks/useFriendRequests";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { UserPlus, Search, User } from "lucide-react";
import { toast } from "sonner";

export default function FriendsPage() {
  const { friends, sendFriendRequest, refreshFriendRequests } = useFriendRequests();
  const [userIdToAdd, setUserIdToAdd] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        // Завантажуємо поточного користувача
        const userJSON = localStorage.getItem("currentUser");
        if (userJSON) {
          const user = JSON.parse(userJSON);
          setCurrentUser(user);
        }
        
        // Оновлюємо список друзів при завантаженні
        await refreshFriendRequests();
      } catch (error) {
        console.error("Помилка при завантаженні даних:", error);
        toast.error("Помилка при завантаженні даних");
      } finally {
        setIsLoading(false);
      }
    };
    
    loadData();
  }, [refreshFriendRequests]);
  
  // Функція для пошуку користувачів
  const handleSearch = async () => {
    if (!searchTerm.trim()) {
      setSearchResults([]);
      return;
    }
    
    setIsLoading(true);
    
    try {
      // Отримуємо всіх користувачів з localStorage
      const usersJSON = localStorage.getItem("users");
      if (!usersJSON) {
        toast.error("Не вдалося знайти користувачів");
        return;
      }
      
      const allUsers = JSON.parse(usersJSON);
      
      // Фільтруємо користувачів за пошуковим запитом
      const results = allUsers.filter((user: any) => {
        const fullName = `${user.firstName || ''} ${user.lastName || ''}`.toLowerCase();
        const userName = (user.full_name || '').toLowerCase();
        const phone = user.phoneNumber || '';
        const searchLower = searchTerm.toLowerCase();
        
        return fullName.includes(searchLower) || 
               userName.includes(searchLower) || 
               phone.includes(searchTerm);
      });
      
      // Виключаємо поточного користувача з результатів
      const filteredResults = results.filter((user: any) => user.id !== currentUser?.id);
      
      setSearchResults(filteredResults);
      
      if (filteredResults.length === 0) {
        toast.info("Користувачів не знайдено");
      }
    } catch (error) {
      console.error("Помилка при пошуку користувачів:", error);
      toast.error("Помилка при пошуку користувачів");
    } finally {
      setIsLoading(false);
    }
  };

  // Функція для додавання користувача в друзі
  const handleAddFriend = async (userId: string) => {
    if (!userId.trim()) return;
    
    try {
      await sendFriendRequest(userId.trim());
      // Оновлюємо дані після відправки запиту
      await refreshFriendRequests();
    } catch (error) {
      console.error("Помилка при додаванні друга:", error);
      toast.error("Помилка при додаванні друга");
    }
  };

  if (isLoading && !currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        Завантаження...
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-10">
      <Navbar />
      <div className="container mt-8 grid grid-cols-12 gap-6">
        <div className="hidden md:block md:col-span-3">
          <Sidebar className="sticky top-20" />
        </div>
        <main className="col-span-12 md:col-span-9">
          {/* Пошук користувачів */}
          <div className="mb-6">
            <h2 className="text-2xl font-semibold mb-4">Пошук друзів</h2>
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <div className="relative w-full sm:max-w-xs">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Ім'я або номер телефону"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
              <Button onClick={handleSearch} disabled={isLoading}>
                <Search className="mr-2 h-4 w-4" />
                {isLoading ? 'Пошук...' : 'Знайти'}
              </Button>
            </div>
          </div>
          
          {/* Результати пошуку */}
          {searchResults.length > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-2">Результати пошуку</h3>
              <div className="space-y-2">
                {searchResults.map((user) => {
                  const userName = user.full_name || `${user.firstName || ''} ${user.lastName || ''}`;
                  const isFriend = friends.some(friend => friend?.id === user.id);
                  
                  return (
                    <div key={user.id} className="flex items-center justify-between p-3 border rounded-md">
                      <div className="flex items-center gap-2">
                        <User className="h-8 w-8 p-1 bg-muted rounded-full" />
                        <div>
                          <p className="font-medium">{userName}</p>
                          <p className="text-sm text-muted-foreground">{user.phoneNumber}</p>
                        </div>
                      </div>
                      <Button 
                        onClick={() => handleAddFriend(user.id)} 
                        disabled={isFriend || isLoading}
                        variant={isFriend ? "outline" : "default"}
                      >
                        <UserPlus className="mr-2 h-4 w-4" />
                        {isFriend ? "Вже друзі" : "Додати в друзі"}
                      </Button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          
          {/* Додавання за ID (для адміністраторів) */}
          {currentUser?.isAdmin && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-2">Додати за ID (Адмін)</h3>
              <div className="flex flex-col sm:flex-row items-center gap-4">
                <Input
                  type="text"
                  placeholder="Введіть ID користувача"
                  value={userIdToAdd}
                  onChange={e => setUserIdToAdd(e.target.value)}
                  className="w-full sm:max-w-xs"
                />
                <Button onClick={() => handleAddFriend(userIdToAdd)} disabled={!userIdToAdd || isLoading}>
                  <UserPlus className="mr-2 h-4 w-4" />
                  Додати в друзі
                </Button>
              </div>
            </div>
          )}
          
          {/* Список друзів і запитів */}
          <FriendsList userId="" />
        </main>
      </div>
    </div>
  );
}
