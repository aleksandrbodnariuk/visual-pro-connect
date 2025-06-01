
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export function UsersTab() {
  const [users, setUsers] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [showBlocked, setShowBlocked] = useState(false);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
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
        setUsers(supabaseUsers);
        // Також оновлюємо localStorage
        localStorage.setItem('users', JSON.stringify(supabaseUsers));
      } else {
        // Використовуємо localStorage як резерв
        const localUsers = JSON.parse(localStorage.getItem('users') || '[]');
        setUsers(localUsers);
      }
    } catch (error) {
      console.error("Помилка завантаження користувачів:", error);
      // Використовуємо localStorage при помилці
      const localUsers = JSON.parse(localStorage.getItem('users') || '[]');
      setUsers(localUsers);
    }
  };

  const toggleShareholderStatus = async (userId: string, currentStatus: boolean) => {
    try {
      const newStatus = !currentStatus;
      
      // Оновлюємо в Supabase
      try {
        const { error } = await supabase
          .from('users')
          .update({ is_shareholder: newStatus })
          .eq('id', userId);

        if (error) {
          console.error("Помилка оновлення статусу акціонера в Supabase:", error);
        }
      } catch (supabaseError) {
        console.warn("Не вдалося оновити в Supabase, оновлюємо локально:", supabaseError);
      }

      // Оновлюємо локальний стан
      const updatedUsers = users.map(user => 
        user.id === userId 
          ? { ...user, is_shareholder: newStatus, isShareHolder: newStatus }
          : user
      );
      
      setUsers(updatedUsers);
      
      // Оновлюємо localStorage
      localStorage.setItem('users', JSON.stringify(updatedUsers));
      
      // Оновлюємо поточного користувача, якщо це він
      const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
      if (currentUser.id === userId) {
        const updatedCurrentUser = { 
          ...currentUser, 
          isShareHolder: newStatus,
          is_shareholder: newStatus
        };
        localStorage.setItem('currentUser', JSON.stringify(updatedCurrentUser));
      }
      
      toast.success(`Статус акціонера ${newStatus ? 'надано' : 'знято'}`);
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
      
      // Оновлюємо localStorage
      localStorage.setItem('users', JSON.stringify(updatedUsers));
      
      toast.success(`Статус адміністратора ${newStatus ? 'надано' : 'знято'}`);
    } catch (error) {
      console.error("Помилка зміни статусу адміністратора:", error);
      toast.error("Помилка зміни статусу адміністратора");
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
      
      // Оновлюємо localStorage
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
            <div>Статус</div>
            <div>Акціонер</div>
            <div>Дії</div>
          </div>

          {filteredUsers.map((user) => (
            <div key={user.id} className="grid grid-cols-7 gap-4 items-center py-2 border-b">
              <div className="text-sm font-mono">{user.id.slice(0, 8)}...</div>
              <div>{user.full_name || 'Не вказано'}</div>
              <div>{user.phone_number || 'Не вказано'}</div>
              <div>
                {user.is_admin && <Badge>Адміністратор</Badge>}
                {user.founder_admin && <Badge variant="destructive">Засновник</Badge>}
                {!user.is_admin && !user.founder_admin && <Badge variant="outline">Активний</Badge>}
              </div>
              <div>
                <Switch
                  checked={user.is_shareholder || user.isShareHolder || false}
                  onCheckedChange={() => toggleShareholderStatus(user.id, user.is_shareholder || user.isShareHolder)}
                  disabled={user.founder_admin}
                />
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
