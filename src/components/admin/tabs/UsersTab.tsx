
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { UserRole } from "@/components/admin/users/UserRole";
import { UserTitle } from "@/components/admin/users/UserTitle";
import { ShareholderToggle } from "@/components/admin/users/ShareholderToggle";
import { UserActions } from "@/components/admin/users/UserActions";
import { Copy } from "lucide-react";
import { Button } from "@/components/ui/button";

export function UsersTab() {
  const [users, setUsers] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [showBlocked, setShowBlocked] = useState(false);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      console.log("Завантаження користувачів...");
      
      const { data: supabaseUsers, error } = await supabase
        .rpc('get_users_for_admin');

      if (error) {
        console.error("Помилка RPC get_users_for_admin:", error);
        console.log("Спроба альтернативного методу завантаження...");
        
        // Запасний варіант: прямий запит до таблиці users
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          toast.error("Користувач не авторизований");
          return;
        }

        const { data: directUsers, error: directError } = await supabase
          .from('users')
          .select(`
            *
          `)
          .order('created_at', { ascending: false });

        if (directError) {
          console.error("Помилка прямого запиту:", directError);
          throw directError;
        }

        if (directUsers && directUsers.length > 0) {
          console.log("Завантажено через прямий запит:", directUsers.length, "користувачів");
          
          // Отримуємо email для кожного користувача
          const usersWithEmail = await Promise.all(
            directUsers.map(async (user) => {
              try {
                const { data: authUser } = await supabase.auth.admin.getUserById(user.id);
                return {
                  ...user,
                  email: authUser?.user?.email || null,
                  has_password: true,
                  founder_admin: user.founder_admin || false
                };
              } catch (e) {
                return {
                  ...user,
                  email: null,
                  has_password: true,
                  founder_admin: user.founder_admin || false
                };
              }
            })
          );
          
          setUsers(usersWithEmail);
          localStorage.setItem('users', JSON.stringify(usersWithEmail));
          return;
        }
      }

      if (supabaseUsers && supabaseUsers.length > 0) {
        console.log("Завантажено з Supabase:", supabaseUsers.length, "користувачів");
        console.log("Перший користувач:", supabaseUsers[0]);
        setUsers(supabaseUsers);
        localStorage.setItem('users', JSON.stringify(supabaseUsers));
      } else {
        console.log("Немає користувачів в базі даних");
        setUsers([]);
      }
    } catch (error) {
      console.error("Помилка завантаження користувачів:", error);
      toast.error("Помилка завантаження користувачів. Деталі в консолі.");
      setUsers([]);
    }
  };

  const toggleShareholderStatus = async (userId: string) => {
    try {
      console.log(`=== Зміна статусу акціонера для користувача: ${userId} ===`);
      
      const currentUser = users.find(user => user.id === userId);
      if (!currentUser) {
        console.error("Користувача не знайдено в масиві users");
        toast.error("Користувача не знайдено");
        return;
      }
      
      console.log("Поточний користувач:", currentUser);
      
      // Перевіряємо, чи це засновник
      if (currentUser.phone_number === '0507068007' || currentUser.founder_admin) {
        console.log("Це засновник - статус акціонера незмінний (завжди true)");
        toast.error("Неможливо змінити статус акціонера для засновника");
        return;
      }
      
      const currentStatus = Boolean(currentUser.is_shareholder);
      const newStatus = !currentStatus;
      
      console.log(`Поточний статус акціонера: ${currentStatus}`);
      console.log(`Новий статус акціонера: ${newStatus}`);
      
      // Оновлюємо локальний стан
      const updatedUsers = users.map(user => {
        if (user.id === userId) {
          const updatedUser = { 
            ...user, 
            is_shareholder: newStatus,
            isShareHolder: newStatus
          };
          console.log("Оновлений користувач:", updatedUser);
          return updatedUser;
        }
        return user;
      });
      
      setUsers(updatedUsers);
      localStorage.setItem('users', JSON.stringify(updatedUsers));
      
      // Оновлюємо поточного користувача, якщо це він
      const currentUserData = JSON.parse(localStorage.getItem('currentUser') || '{}');
      if (currentUserData.id === userId) {
        console.log("Оновлення поточного користувача в localStorage...");
        const updatedCurrentUser = { 
          ...currentUserData, 
          is_shareholder: newStatus,
          isShareHolder: newStatus
        };
        localStorage.setItem('currentUser', JSON.stringify(updatedCurrentUser));
        console.log("Поточний користувач оновлено:", updatedCurrentUser);
      }

      // Оновлюємо в Supabase
      try {
        console.log("Оновлення в Supabase...");
        const { error } = await supabase
          .from('users')
          .update({ 
            is_shareholder: newStatus
          })
          .eq('id', userId);

        if (error) {
          console.error("Помилка оновлення статусу акціонера в Supabase:", error);
        } else {
          console.log("Статус акціонера успішно оновлено в Supabase");
        }
      } catch (supabaseError) {
        console.warn("Не вдалося оновити в Supabase, але локальні зміни збережено:", supabaseError);
      }
      
      // Відправляємо подію для оновлення статистики
      const statusUpdateEvent = new CustomEvent('shareholder-status-updated', { 
        detail: { 
          userId: userId,
          isShareHolder: newStatus 
        }
      });
      window.dispatchEvent(statusUpdateEvent);
      
      toast.success(`Статус акціонера ${newStatus ? 'надано' : 'знято'}`);
      console.log(`=== Операція завершена успішно ===`);
    } catch (error) {
      console.error("Помилка зміни статусу акціонера:", error);
      toast.error("Помилка зміни статусу акціонера");
    }
  };

  const changeUserTitle = async (userId: string, newTitle: string) => {
    try {
      try {
        const { error } = await supabase
          .from('users')
          .update({ title: newTitle })
          .eq('id', userId);

        if (error) {
          console.error("Помилка оновлення титулу в Supabase:", error);
        }
      } catch (supabaseError) {
        console.warn("Не вдалося оновити титул в Supabase:", supabaseError);
      }

      const updatedUsers = users.map(user => 
        user.id === userId 
          ? { ...user, title: newTitle }
          : user
      );
      
      setUsers(updatedUsers);
      localStorage.setItem('users', JSON.stringify(updatedUsers));
      
      toast.success(`Титул змінено на "${newTitle}"`);
    } catch (error) {
      console.error("Помилка зміни титулу:", error);
      toast.error("Помилка зміни титулу");
    }
  };

  const changeUserRole = async (userId: string, newRole: string) => {
    try {
      const updates: any = { role: newRole };
      
      if (newRole === "Адміністратор") {
        updates.is_admin = true;
      } else {
        updates.is_admin = false;
      }
      
      if (newRole === "Акціонер" || newRole === "Адміністратор") {
        updates.is_shareholder = true;
      } else {
        updates.is_shareholder = false;
      }

      try {
        const { error } = await supabase
          .from('users')
          .update(updates)
          .eq('id', userId);

        if (error) {
          console.error("Помилка оновлення ролі в Supabase:", error);
        }
      } catch (supabaseError) {
        console.warn("Не вдалося оновити роль в Supabase:", supabaseError);
      }

      const updatedUsers = users.map(user => 
        user.id === userId 
          ? { 
              ...user, 
              role: newRole,
              is_admin: updates.is_admin,
              isAdmin: updates.is_admin,
              is_shareholder: updates.is_shareholder,
              isShareHolder: updates.is_shareholder
            }
          : user
      );
      
      setUsers(updatedUsers);
      localStorage.setItem('users', JSON.stringify(updatedUsers));
      
      // Відправляємо подію для оновлення статистики
      const statusUpdateEvent = new CustomEvent('shareholder-status-updated', { 
        detail: { 
          userId: userId,
          isShareHolder: updates.is_shareholder 
        }
      });
      window.dispatchEvent(statusUpdateEvent);
      
      toast.success(`Роль змінено на "${newRole}"`);
    } catch (error) {
      console.error("Помилка зміни ролі:", error);
      toast.error("Помилка зміни ролі");
    }
  };

  const deleteUser = async (userId: string) => {
    if (!confirm("Ви впевнені, що хочете видалити цього користувача?")) {
      return;
    }

    try {
      try {
        const { error } = await supabase
          .from('users')
          .delete()
          .eq('id', userId);

        if (error) {
          console.error("Помилка видалення користувача з Supabase:", error);
        }
      } catch (supabaseError) {
        console.warn("Не вдалося видалити з Supabase, видаляємо локально:", supabaseError);
      }

      const updatedUsers = users.filter(user => user.id !== userId);
      setUsers(updatedUsers);
      localStorage.setItem('users', JSON.stringify(updatedUsers));
      
      toast.success("Користувача видалено");
    } catch (error) {
      console.error("Помилка видалення користувача:", error);
      toast.error("Помилка видалення користувача");
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.phone_number?.includes(searchTerm) ||
                         user.email?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Управління користувачами</CardTitle>
        <CardDescription>Перегляд та управління користувачами системи</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex justify-between items-center mb-4">
          <Input
            placeholder="Пошук за ім'ям, email або телефоном"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-sm"
          />
          <div className="flex items-center space-x-2">
            <Switch
              id="show-blocked"
              checked={showBlocked}
              onCheckedChange={setShowBlocked}
            />
            <label htmlFor="show-blocked">Показати заблокованих</label>
          </div>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-8 gap-4 font-medium text-sm text-muted-foreground border-b pb-2">
            <div>ID</div>
            <div>Email</div>
            <div>Ім'я</div>
            <div>Телефон</div>
            <div>Роль</div>
            <div>Титул</div>
            <div>Акціонер</div>
            <div>Дії</div>
          </div>

          {filteredUsers.map((user) => (
            <div key={user.id} className="grid grid-cols-8 gap-4 items-center py-2 border-b">
              <div className="text-xs font-mono flex items-center gap-1">
                <span className="truncate max-w-[120px]" title={user.id}>
                  {user.id}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  onClick={() => {
                    navigator.clipboard.writeText(user.id);
                    toast.success("ID скопійовано");
                  }}
                >
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
              <div className="text-sm truncate" title={user.email || 'Не вказано'}>
                {user.email || 'Не вказано'}
              </div>
              <div>{user.full_name || 'Не вказано'}</div>
              <div>{user.phone_number || 'Не вказано'}</div>
              <UserRole user={user} onRoleChange={changeUserRole} />
              <UserTitle user={user} onTitleChange={changeUserTitle} />
              <ShareholderToggle user={user} onToggleShareholder={toggleShareholderStatus} />
              <UserActions 
                user={user} 
                onDeleteUser={deleteUser} 
              />
            </div>
          ))}

          {filteredUsers.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              Користувачів не знайдено
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
