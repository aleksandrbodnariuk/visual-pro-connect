import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const AVAILABLE_TITLES = [
  "Акціонер",
  "Магнат", 
  "Барон",
  "Граф", 
  "Маркіз",
  "Лорд",
  "Герцог",
  "Імператор"
];

const AVAILABLE_ROLES = [
  "Учасник",
  "Акціонер", 
  "Модератор",
  "Адміністратор"
];

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
      
      // Завантажуємо з Supabase
      const { data: supabaseUsers, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });

      if (error && error.code !== 'PGRST116') {
        console.error("Помилка завантаження користувачів з Supabase:", error);
        throw error;
      }

      if (supabaseUsers && supabaseUsers.length > 0) {
        console.log("Завантажено з Supabase:", supabaseUsers.length, "користувачів");
        setUsers(supabaseUsers);
        localStorage.setItem('users', JSON.stringify(supabaseUsers));
      } else {
        console.log("Завантаження з localStorage...");
        const localUsers = JSON.parse(localStorage.getItem('users') || '[]');
        console.log("Завантажено з localStorage:", localUsers.length, "користувачів");
        setUsers(localUsers);
      }
    } catch (error) {
      console.error("Помилка завантаження користувачів:", error);
      const localUsers = JSON.parse(localStorage.getItem('users') || '[]');
      setUsers(localUsers);
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
      if (currentUser.founder_admin || currentUser.phone_number === '0507068007') {
        console.log("Це засновник - статус не можна змінювати");
        toast.error("Неможливо змінити статус засновника");
        return;
      }
      
      const currentStatus = Boolean(currentUser.is_shareholder);
      const newStatus = !currentStatus;
      
      console.log(`Поточний статус акціонера: ${currentStatus}`);
      console.log(`Новий статус акціонера: ${newStatus}`);
      
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
          throw error;
        } else {
          console.log("Статус акціонера успішно оновлено в Supabase");
        }
      } catch (supabaseError) {
        console.warn("Не вдалося оновити в Supabase, оновлюємо локально:", supabaseError);
      }

      // Оновлюємо локальний стан
      console.log("Оновлення локального стану...");
      const updatedUsers = users.map(user => {
        if (user.id === userId) {
          const updatedUser = { 
            ...user, 
            is_shareholder: newStatus
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
          is_shareholder: newStatus
        };
        localStorage.setItem('currentUser', JSON.stringify(updatedCurrentUser));
        console.log("Поточний користувач оновлено:", updatedCurrentUser);
      }
      
      toast.success(`Статус акціонера ${newStatus ? 'надано' : 'знято'}`);
      console.log(`=== Операція завершена успішно ===`);
    } catch (error) {
      console.error("Помилка зміни статусу акціонера:", error);
      toast.error("Помилка зміни статусу акціонера");
    }
  };

  const toggleAdminStatus = async (userId: string, currentStatus: boolean) => {
    try {
      const newStatus = !currentStatus;
      
      // Оновлюємо в Supabase
      try {
        const { error } = await supabase
          .from('users')
          .update({ is_admin: newStatus })
          .eq('id', userId);

        if (error) {
          console.error("Помилка оновлення статусу адміна в Supabase:", error);
        }
      } catch (supabaseError) {
        console.warn("Не вдалося оновити в Supabase, оновлюємо локально:", supabaseError);
      }

      // Оновлюємо локальний стан
      const updatedUsers = users.map(user => 
        user.id === userId 
          ? { ...user, is_admin: newStatus, isAdmin: newStatus }
          : user
      );
      
      setUsers(updatedUsers);
      localStorage.setItem('users', JSON.stringify(updatedUsers));
      
      toast.success(`Статус адміністратора ${newStatus ? 'надано' : 'знято'}`);
    } catch (error) {
      console.error("Помилка зміни статусу адміністратора:", error);
      toast.error("Помилка зміни статусу адміністратора");
    }
  };

  const changeUserTitle = async (userId: string, newTitle: string) => {
    try {
      // Оновлюємо в Supabase
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

      // Оновлюємо локальний стан
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
      // Автоматично встановлюємо статуси залежно від ролі
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

      // Оновлюємо в Supabase
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

      // Оновлюємо локальний стан
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
      // Видаляємо з Supabase
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

      // Видаляємо з локального стану
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
                         user.phone_number?.includes(searchTerm);
    return matchesSearch;
  });

  const getUserRole = (user: any) => {
    if (user.founder_admin) return "Засновник";
    if (user.is_admin || user.isAdmin) return "Адміністратор";
    if (user.is_shareholder || user.isShareHolder) return "Акціонер";
    return user.role || "Учасник";
  };

  const isShareholderSwitchDisabled = (user: any) => {
    return user.founder_admin || user.phone_number === '0507068007';
  };

  const getShareholderStatus = (user: any) => {
    return Boolean(user.is_shareholder);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Управління користувачами</CardTitle>
        <CardDescription>Перегляд та управління користувачами системи</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex justify-between items-center mb-4">
          <Input
            placeholder="Пошук за ім'ям або номером телефону"
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
          <div className="grid grid-cols-7 gap-4 font-medium text-sm text-muted-foreground border-b pb-2">
            <div>ID</div>
            <div>Ім'я</div>
            <div>Телефон</div>
            <div>Роль</div>
            <div>Титул</div>
            <div>Акціонер</div>
            <div>Дії</div>
          </div>

          {filteredUsers.map((user) => (
            <div key={user.id} className="grid grid-cols-7 gap-4 items-center py-2 border-b">
              <div className="text-sm font-mono">{user.id.slice(0, 8)}...</div>
              <div>{user.full_name || 'Не вказано'}</div>
              <div>{user.phone_number || 'Не вказано'}</div>
              <div>
                {!user.founder_admin ? (
                  <Select 
                    value={getUserRole(user)} 
                    onValueChange={(value) => changeUserRole(user.id, value)}
                  >
                    <SelectTrigger className="w-[130px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {AVAILABLE_ROLES.map((role) => (
                        <SelectItem key={role} value={role}>
                          {role}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Badge variant="destructive">Засновник</Badge>
                )}
              </div>
              <div>
                {(getShareholderStatus(user) || user.founder_admin) ? (
                  <Select 
                    value={user.title || "Акціонер"} 
                    onValueChange={(value) => changeUserTitle(user.id, value)}
                  >
                    <SelectTrigger className="w-[120px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {AVAILABLE_TITLES.map((title) => (
                        <SelectItem key={title} value={title}>
                          {title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <span className="text-muted-foreground">-</span>
                )}
              </div>
              <div>
                <Switch
                  checked={getShareholderStatus(user)}
                  onCheckedChange={() => toggleShareholderStatus(user.id)}
                  disabled={isShareholderSwitchDisabled(user)}
                />
                {isShareholderSwitchDisabled(user) && (
                  <span className="text-xs text-muted-foreground ml-2">Засновник</span>
                )}
              </div>
              <div className="flex space-x-2">
                {!user.founder_admin && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => toggleAdminStatus(user.id, user.is_admin || user.isAdmin)}
                  >
                    {user.is_admin || user.isAdmin ? 'Зняти адміна' : 'Зробити адміном'}
                  </Button>
                )}
                {!user.founder_admin && (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => deleteUser(user.id)}
                  >
                    Видалити
                  </Button>
                )}
              </div>
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
