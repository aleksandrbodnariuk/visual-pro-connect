
import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { UserRole } from "@/components/admin/users/UserRole";
import { UserTitle } from "@/components/admin/users/UserTitle";
import { ShareholderToggle } from "@/components/admin/users/ShareholderToggle";
import { SpecialistToggle } from "@/components/admin/users/SpecialistToggle";
import { UserActions } from "@/components/admin/users/UserActions";
import { DeleteUserDialog } from "@/components/admin/users/DeleteUserDialog";
import { Copy } from "lucide-react";
import { Button } from "@/components/ui/button";

// Перевіряє чи це номер телефону, а не email
const isValidPhoneNumber = (value: string | null | undefined): boolean => {
  if (!value) return false;
  // Якщо містить @ - це email, не телефон
  if (value.includes('@')) return false;
  // Перевіряємо що містить тільки цифри та можливо + або пробіли
  return /^[\d\s\+\-\(\)]+$/.test(value);
};

export function UsersTab() {
  const [users, setUsers] = useState<any[]>([]);
  const [userRoles, setUserRoles] = useState<Record<string, string[]>>({});
  const [searchTerm, setSearchTerm] = useState("");
  const [showBlocked, setShowBlocked] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<any>(null);

  useEffect(() => {
    loadUsers();
    loadUserRoles();
  }, []);

  const loadUsers = async () => {
    try {
      console.log("Завантаження користувачів через RPC get_users_for_admin...");

      // Перевіряємо наявність сесії, без неї RPC поверне помилку та немає сенсу робити запасні методи
      const { data: sessionData } = await supabase.auth.getSession();
      const hasSession = Boolean(sessionData?.session);
      if (!hasSession) {
        console.warn("Користувач не авторизований — припиняємо завантаження користувачів");
        toast.error("Потрібна авторизація для перегляду користувачів");
        setUsers([]);
        return;
      }

      const { data: supabaseUsers, error } = await supabase.rpc('get_users_for_admin');

      if (error) {
        console.error("Помилка RPC get_users_for_admin:", error);
        toast.error("Помилка завантаження користувачів (RPC)");
        setUsers([]);
        return;
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

  const loadUserRoles = async () => {
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('user_id, role');
      
      if (error) throw error;
      
      // Групуємо ролі по user_id
      const rolesMap: Record<string, string[]> = {};
      (data || []).forEach((row: any) => {
        if (!rolesMap[row.user_id]) {
          rolesMap[row.user_id] = [];
        }
        rolesMap[row.user_id].push(row.role);
      });
      
      setUserRoles(rolesMap);
    } catch (error) {
      console.error("Помилка завантаження ролей:", error);
    }
  };

  // Перевіряє чи користувач є фахівцем
  const isSpecialist = (userId: string): boolean => {
    return userRoles[userId]?.includes('specialist') || false;
  };

  const toggleSpecialistStatus = async (userId: string) => {
    try {
      console.log(`=== Зміна статусу фахівця для користувача: ${userId} ===`);
      
      const currentStatus = isSpecialist(userId);
      const newStatus = !currentStatus;
      
      console.log(`Поточний статус фахівця: ${currentStatus}`);
      console.log(`Новий статус фахівця: ${newStatus}`);
      
      if (newStatus) {
        // Додаємо роль 'specialist' в user_roles
        const { error } = await supabase
          .from('user_roles')
          .upsert(
            { user_id: userId, role: 'specialist' as any },
            { onConflict: 'user_id,role' }
          );
        
        if (error) {
          console.error("Помилка додавання ролі specialist:", error);
          toast.error("Помилка надання статусу фахівця");
          return;
        }
      } else {
        // Видаляємо роль 'specialist' з user_roles
        const { error } = await supabase
          .from('user_roles')
          .delete()
          .eq('user_id', userId)
          .eq('role', 'specialist');
        
        if (error) {
          console.error("Помилка видалення ролі specialist:", error);
          toast.error("Помилка зняття статусу фахівця");
          return;
        }
      }
      
      // Оновлюємо локальний стан ролей
      setUserRoles(prev => {
        const updated = { ...prev };
        if (newStatus) {
          updated[userId] = [...(updated[userId] || []), 'specialist'];
        } else {
          updated[userId] = (updated[userId] || []).filter(r => r !== 'specialist');
        }
        return updated;
      });
      
      toast.success(`Статус фахівця ${newStatus ? 'надано' : 'знято'}`);
      console.log(`=== Операція завершена успішно ===`);
    } catch (error) {
      console.error("Помилка зміни статусу фахівця:", error);
      toast.error("Помилка зміни статусу фахівця");
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
        
        // 1. Оновлюємо колонку is_shareholder в таблиці users
        const { error: usersError } = await supabase
          .from('users')
          .update({ is_shareholder: newStatus })
          .eq('id', userId);

        if (usersError) {
          console.error("Помилка оновлення статусу акціонера в users:", usersError);
        }
        
        // 2. Синхронізуємо з таблицею user_roles
        if (newStatus) {
          // Додаємо роль 'shareholder' в user_roles
          const { error: roleError } = await supabase
            .from('user_roles')
            .upsert(
              { user_id: userId, role: 'shareholder' as const },
              { onConflict: 'user_id,role' }
            );
          
          if (roleError) {
            console.error("Помилка додавання ролі shareholder:", roleError);
          } else {
            console.log("Роль shareholder додано в user_roles");
          }
        } else {
          // Видаляємо роль 'shareholder' з user_roles
          const { error: roleError } = await supabase
            .from('user_roles')
            .delete()
            .eq('user_id', userId)
            .eq('role', 'shareholder');
          
          if (roleError) {
            console.error("Помилка видалення ролі shareholder:", roleError);
          } else {
            console.log("Роль shareholder видалено з user_roles");
          }
        }
        
        console.log("Статус акціонера успішно оновлено в Supabase");
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
      // Спочатку зберігаємо в Supabase
      const { error } = await supabase
        .from('users')
        .update({ title: newTitle })
        .eq('id', userId);

      if (error) {
        console.error("Помилка оновлення титулу в Supabase:", error);
        toast.error("Не вдалося зберегти титул");
        return; // Не оновлюємо локальний стан при помилці
      }

      // Оновлюємо локальний стан тільки після успішного збереження
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
      // Map UI role names to DB values
      const roleMap: Record<string, string[]> = {
        "Учасник": ["user"],
        "Акціонер": ["user", "shareholder"],
        "Модератор": ["user", "moderator"],
        "Адміністратор": ["user", "admin"],
      };

      const targetRoles = roleMap[newRole] || ["user"];
      const isAdmin = targetRoles.includes("admin");
      const isShareholder = targetRoles.includes("shareholder");

      // 1. Update is_admin and is_shareholder flags on users table (no 'role' column exists)
      const { error: usersError } = await supabase
        .from('users')
        .update({ is_admin: isAdmin, is_shareholder: isShareholder })
        .eq('id', userId);

      if (usersError) {
        console.error("Помилка оновлення користувача:", usersError);
        toast.error("Не вдалося зберегти роль");
        return;
      }

      // 2. Replace roles in user_roles table: delete non-founder roles, then insert new ones
      // Keep 'founder' role if it exists
      const existingRoles = userRoles[userId] || [];
      const hasFounder = existingRoles.includes('founder');

      // Delete all non-founder roles
      const { error: deleteError } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId)
        .neq('role', 'founder');

      if (deleteError) {
        console.error("Помилка видалення старих ролей:", deleteError);
      }

      // Insert new roles
      const rolesToInsert = targetRoles.map(role => ({
        user_id: userId,
        role: role as any,
      }));

      const { error: insertError } = await supabase
        .from('user_roles')
        .upsert(rolesToInsert, { onConflict: 'user_id,role' });

      if (insertError) {
        console.error("Помилка додавання нових ролей:", insertError);
        toast.error("Помилка збереження ролей");
        return;
      }

      // 3. Update local state
      const updatedUsers = users.map(user =>
        user.id === userId
          ? {
              ...user,
              is_admin: isAdmin,
              isAdmin: isAdmin,
              is_shareholder: isShareholder,
              isShareHolder: isShareholder,
            }
          : user
      );

      setUsers(updatedUsers);
      localStorage.setItem('users', JSON.stringify(updatedUsers));

      // Update local roles state
      setUserRoles(prev => ({
        ...prev,
        [userId]: hasFounder ? ['founder', ...targetRoles] : targetRoles,
      }));

      // Dispatch event for stats update
      window.dispatchEvent(new CustomEvent('shareholder-status-updated', {
        detail: { userId, isShareHolder: isShareholder }
      }));

      toast.success(`Роль змінено на "${newRole}"`);
    } catch (error) {
      console.error("Помилка зміни ролі:", error);
      toast.error("Помилка зміни ролі");
    }
  };

  const openDeleteDialog = (userId: string) => {
    const user = users.find(u => u.id === userId);
    if (user) {
      setUserToDelete(user);
      setDeleteDialogOpen(true);
    }
  };

  const executeDelete = useCallback(async () => {
    if (!userToDelete) return;
    const userId = userToDelete.id;
    try {
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', userId);

      if (error) {
        console.error("Помилка видалення користувача з Supabase:", error);
      }

      const updatedUsers = users.filter(user => user.id !== userId);
      setUsers(updatedUsers);
      localStorage.setItem('users', JSON.stringify(updatedUsers));
      
      toast.success("Користувача видалено");
    } catch (error) {
      console.error("Помилка видалення користувача:", error);
      toast.error("Помилка видалення користувача");
    }
    setUserToDelete(null);
  }, [userToDelete, users]);

  const toggleBlockUser = async (userId: string) => {
    try {
      const currentUser = users.find(u => u.id === userId);
      if (!currentUser) return;
      
      const newStatus = !Boolean(currentUser.is_blocked);
      
      const { error } = await supabase
        .from('users')
        .update({ is_blocked: newStatus })
        .eq('id', userId);
      
      if (error) {
        console.error("Помилка блокування:", error);
        toast.error("Помилка зміни статусу блокування");
        return;
      }
      
      const updatedUsers = users.map(u => 
        u.id === userId ? { ...u, is_blocked: newStatus } : u
      );
      setUsers(updatedUsers);
      toast.success(newStatus ? "Користувача заблоковано" : "Користувача розблоковано");
    } catch (error) {
      console.error("Помилка блокування:", error);
      toast.error("Помилка зміни статусу блокування");
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.phone_number?.includes(searchTerm) ||
                         user.email?.toLowerCase().includes(searchTerm.toLowerCase());
    const isBlocked = Boolean(user.is_blocked);
    if (showBlocked) return matchesSearch && isBlocked;
    return matchesSearch && !isBlocked;
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

        {/* Desktop Table - hidden on mobile */}
        <div className="hidden md:block space-y-4">
          <div className="grid grid-cols-9 gap-4 font-medium text-sm text-muted-foreground border-b pb-2">
            <div>ID</div>
            <div>Email</div>
            <div>Ім'я</div>
            <div>Телефон</div>
            <div>Роль</div>
            <div>Титул</div>
            <div>Акціонер</div>
            <div>Фахівець</div>
            <div>Дії</div>
          </div>

          {filteredUsers.map((user) => (
            <div key={user.id} className="grid grid-cols-9 gap-4 items-center py-2 border-b">
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
              <div className="text-sm flex items-center gap-1">
                <span className="truncate max-w-[140px]" title={user.email || 'Не вказано'}>
                  {user.email || 'Не вказано'}
                </span>
                {user.email && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 shrink-0"
                    onClick={() => {
                      navigator.clipboard.writeText(user.email);
                      toast.success("Email скопійовано");
                    }}
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                )}
              </div>
              <div>{user.full_name || 'Не вказано'}</div>
              <div>{isValidPhoneNumber(user.phone_number) ? user.phone_number : 'Не вказано'}</div>
              <UserRole user={user} userRoles={userRoles[user.id]} onRoleChange={changeUserRole} />
              <UserTitle user={user} onTitleChange={changeUserTitle} />
              <ShareholderToggle user={user} onToggleShareholder={toggleShareholderStatus} />
              <SpecialistToggle 
                user={{ ...user, is_specialist: isSpecialist(user.id) }} 
                onToggleSpecialist={toggleSpecialistStatus} 
              />
              <UserActions 
                user={user} 
                onDeleteUser={openDeleteDialog}
                onToggleBlock={toggleBlockUser}
              />
            </div>
          ))}

          {filteredUsers.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              Користувачів не знайдено
            </div>
          )}
        </div>

        {/* Mobile Cards - shown only on mobile */}
        <div className="md:hidden space-y-4">
          {filteredUsers.map((user) => (
            <Card key={user.id} className="p-4">
              <div className="space-y-3">
                <div className="flex justify-between items-start">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold truncate">{user.full_name || 'Не вказано'}</h3>
                    <p className="text-sm text-muted-foreground truncate flex items-center gap-1">
                      <span className="truncate">{user.email || 'Не вказано'}</span>
                      {user.email && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-5 w-5 p-0 shrink-0"
                          onClick={() => {
                            navigator.clipboard.writeText(user.email);
                            toast.success("Email скопійовано");
                          }}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {isValidPhoneNumber(user.phone_number) ? user.phone_number : 'Телефон не вказано'}
                    </p>
                  </div>
                  <UserActions user={user} onDeleteUser={openDeleteDialog} onToggleBlock={toggleBlockUser} />
                </div>
                
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">Роль:</span>
                    <UserRole user={user} userRoles={userRoles[user.id]} onRoleChange={changeUserRole} />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">Титул:</span>
                    <UserTitle user={user} onTitleChange={changeUserTitle} />
                  </div>
                </div>
                
                <div className="flex flex-wrap gap-4">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Акціонер:</span>
                    <ShareholderToggle user={user} onToggleShareholder={toggleShareholderStatus} />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Фахівець:</span>
                    <SpecialistToggle 
                      user={{ ...user, is_specialist: isSpecialist(user.id) }} 
                      onToggleSpecialist={toggleSpecialistStatus} 
                    />
                  </div>
                </div>
              </div>
            </Card>
          ))}

          {filteredUsers.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              Користувачів не знайдено
            </div>
          )}
        </div>
      </CardContent>

      <DeleteUserDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        userName={userToDelete?.full_name || 'Без імені'}
        onConfirmDelete={executeDelete}
      />
    </Card>
  );
}
