
import { toast } from "sonner";
import { supabase } from '@/integrations/supabase/client';
import { User } from './types';
import { removeUserFromRelatedData } from './cleanupUtils';
import { formatUserFromSupabase } from './usersSync';

export async function deleteUser(
  userId: string, 
  users: User[], 
  setUsers: React.Dispatch<React.SetStateAction<User[]>>, 
  isFounder: boolean
): Promise<void> {
  const userToDelete = users.find(user => user.id === userId);
  
  // Prevent deletion of founder-admin
  if (userToDelete && (userToDelete.role === "admin-founder" || userToDelete.phoneNumber === "0507068007")) {
    toast.error("Неможливо видалити Адміністратора-засновника");
    return;
  }
  
  // Check if user is the currently logged in user
  const currentUser = JSON.parse(localStorage.getItem("currentUser") || "{}");
  if (userToDelete && userToDelete.id === currentUser.id) {
    toast.error("Неможливо видалити власний обліковий запис");
    return;
  }
  
  // Confirm before deletion
  if (confirm(`Ви впевнені, що хочете видалити користувача ${userToDelete?.firstName || ''} ${userToDelete?.lastName || ''}?`)) {
    try {
      // Спроба видалити користувача в Supabase
      try {
        const { error } = await supabase
          .from('users')
          .delete()
          .eq('id', userId);
          
        if (error) throw error;
      } catch (supabaseError) {
        console.warn("Помилка при видаленні користувача в Supabase:", supabaseError);
      }
      
      // Видаляємо локально в будь-якому випадку
      const updatedUsers = users.filter(user => user.id !== userId);
      setUsers(updatedUsers);
      localStorage.setItem("users", JSON.stringify(updatedUsers));
      
      // Also remove from other related data
      removeUserFromRelatedData(userId);
      
      toast.success("Користувача видалено");
    } catch (error) {
      console.error("Помилка при видаленні користувача:", error);
      toast.error("Помилка при видаленні користувача");
    }
  }
}

export async function changeUserStatus(
  userId: string, 
  newStatus: string, 
  users: User[], 
  setUsers: React.Dispatch<React.SetStateAction<User[]>>, 
  isFounder: boolean
): Promise<void> {
  const userToUpdate = users.find(user => user.id === userId);
  
  // Більш строга перевірка для захисту засновника
  if (userToUpdate && (userToUpdate.role === "admin-founder" || userToUpdate.phoneNumber === "0507068007") && !isFounder) {
    toast.error("Тільки Адміністратор-засновник може змінювати свій статус");
    return;
  }
  
  let newRole = "user";
  let isShareHolder = userToUpdate?.isShareHolder || userToUpdate?.is_shareholder || false;
  
  if (newStatus === "Адміністратор" || newStatus === "Адміністратор-засновник") {
    newRole = newStatus === "Адміністратор-засновник" ? "admin-founder" : "admin";
    isShareHolder = true; // Адміністратори автоматично є акціонерами
  } else if (newStatus === "Модератор") {
    newRole = "moderator";
  } else if (newStatus === "Представник") {
    newRole = "representative";
  } else if (newStatus === "Акціонер") {
    newRole = "shareholder";
    isShareHolder = true;
  }
  
  try {
    // Спроба оновити дані в Supabase
    try {
      const { error } = await supabase
        .from('users')
        .update({
          status: newStatus,
          role: newRole,
          is_admin: newStatus === "Адміністратор" || newStatus === "Адміністратор-засновник",
          is_shareholder: isShareHolder,
          founder_admin: newStatus === "Адміністратор-засновник" || userToUpdate?.phoneNumber === "0507068007"
        })
        .eq('id', userId);
        
      if (error) throw error;
    } catch (supabaseError) {
      console.warn("Помилка при оновленні статусу користувача в Supabase:", supabaseError);
    }
    
    // Оновлюємо локально в будь-якому випадку
    const updatedUsers = users.map(user => {
      if (user.id === userId) {
        return { 
          ...user, 
          status: newStatus, 
          role: newRole,
          isShareHolder,
          is_shareholder: isShareHolder,
          isAdmin: newStatus === "Адміністратор" || newStatus === "Адміністратор-засновник",
          is_admin: newStatus === "Адміністратор" || newStatus === "Адміністратор-засновник",
          // Спеціальна логіка для користувача з номером засновника
          ...(user.phoneNumber === "0507068007" || user.phone_number === "0507068007" ? {
            isAdmin: true,
            isFounder: true,
            is_admin: true,
            founder_admin: true,
            role: "admin-founder",
            status: "Адміністратор-засновник"
          } : {})
        };
      }
      return user;
    });
    
    setUsers(updatedUsers);
    localStorage.setItem("users", JSON.stringify(updatedUsers));
    toast.success(`Статус користувача змінено на "${newStatus}"`);
    
    // Оновлюємо поточного користувача, якщо змінено його статус
    const currentUser = JSON.parse(localStorage.getItem("currentUser") || "{}");
    if (currentUser.id === userId) {
      const updatedUser = updatedUsers.find(user => user.id === userId);
      if (updatedUser) {
        localStorage.setItem("currentUser", JSON.stringify(updatedUser));
      }
    }
  } catch (error) {
    console.error("Помилка при оновленні статусу користувача:", error);
    toast.error("Помилка при зміні статусу користувача");
  }
}

export async function toggleShareholderStatus(
  userId: string, 
  isShareHolder: boolean, 
  users: User[], 
  setUsers: React.Dispatch<React.SetStateAction<User[]>>, 
  isFounder: boolean
): Promise<void> {
  const userToUpdate = users.find(user => user.id === userId);
  
  // Додаткова перевірка для засновника
  if (userToUpdate && (userToUpdate.role === "admin-founder" || userToUpdate.phoneNumber === "0507068007") && !isFounder) {
    toast.error("Тільки Адміністратор-засновник може змінювати акціонерний статус");
    return;
  }
  
  try {
    // Спроба оновити дані в Supabase
    try {
      const { error } = await supabase
        .from('users')
        .update({
          is_shareholder: isShareHolder,
          status: isShareHolder ? 
                   (userToUpdate?.status === "Звичайний користувач" ? "Акціонер" : userToUpdate?.status) : 
                   (userToUpdate?.status === "Акціонер" ? "Звичайний користувач" : userToUpdate?.status),
          role: isShareHolder ? 
                 (userToUpdate?.role === "admin" || userToUpdate?.role === "admin-founder" ? userToUpdate?.role : "shareholder") :
                 (userToUpdate?.role === "shareholder" ? "user" : userToUpdate?.role)
        })
        .eq('id', userId);
        
      if (error) throw error;
    } catch (supabaseError) {
      console.warn("Помилка при оновленні статусу акціонера в Supabase:", supabaseError);
    }
    
    // Оновлюємо локально в будь-якому випадку
    const updatedUsers = users.map(user => {
      if (user.id === userId) {
        // Спеціальна логіка для користувача з номером засновника
        if (user.phoneNumber === "0507068007" || user.phone_number === "0507068007") {
          return { 
            ...user, 
            isShareHolder: true,
            is_shareholder: true,
            isAdmin: true,
            isFounder: true,
            is_admin: true,
            founder_admin: true,
            role: "admin-founder",
            status: "Адміністратор-засновник"
          };
        }
        
        return { 
          ...user, 
          isShareHolder,
          is_shareholder: isShareHolder,
          status: isShareHolder ? (user.status === "Звичайний користувач" ? "Акціонер" : user.status) : 
                               (user.status === "Акціонер" ? "Звичайний користувач" : user.status),
          role: isShareHolder ? 
            (user.role === "admin" || user.role === "admin-founder" ? user.role : "shareholder") :
            (user.role === "shareholder" ? "user" : user.role)
        };
      }
      return user;
    });
    
    setUsers(updatedUsers);
    localStorage.setItem("users", JSON.stringify(updatedUsers));
    toast.success(isShareHolder ? "Користувача додано до акціонерів" : "Користувача видалено з акціонерів");
    
    // Оновлюємо поточного користувача, якщо змінено його статус
    const currentUser = JSON.parse(localStorage.getItem("currentUser") || "{}");
    if (currentUser.id === userId) {
      const updatedUser = updatedUsers.find(user => user.id === userId);
      if (updatedUser) {
        localStorage.setItem("currentUser", JSON.stringify(updatedUser));
      }
    }
  } catch (error) {
    console.error("Помилка при зміні статусу акціонера:", error);
    toast.error("Помилка при зміні статусу акціонера");
  }
}
