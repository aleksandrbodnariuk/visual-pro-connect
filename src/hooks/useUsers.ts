
import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { supabase } from '@/integrations/supabase/client';

export function useUsers() {
  const [users, setUsers] = useState<any[]>([]);
  const [isFounder, setIsFounder] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const loadUsers = useCallback(async () => {
    setIsLoading(true);
    
    try {
      // Спочатку перевіряємо, чи поточний користувач є засновником
      const currentUser = JSON.parse(localStorage.getItem("currentUser") || "{}");
      
      // Перевіряємо, чи це засновник
      const isFounderAdmin = currentUser.role === "admin-founder" || 
                            (currentUser.phoneNumber === "0507068007");
      
      setIsFounder(isFounderAdmin);
      
      // Спробуємо отримати дані з Supabase
      try {
        const { data: supabaseUsers, error } = await supabase
          .from('users')
          .select('*')
          .order('created_at', { ascending: false });
        
        if (error) {
          console.error("Помилка запиту до Supabase:", error);
          throw error;
        }
        
        if (supabaseUsers && supabaseUsers.length > 0) {
          console.log("Користувачі з Supabase:", supabaseUsers);
          
          // Переконуємося, що засновник має правильний статус
          const updatedUsers = supabaseUsers.map((user: any) => {
            if (user.phone_number === "0507068007") {
              return {
                ...user,
                isAdmin: true,
                isFounder: true,
                is_admin: true,
                founder_admin: true,
                role: "admin-founder",
                isShareHolder: true,
                is_shareholder: true,
                status: "Адміністратор-засновник"
              };
            }
            return {
              ...user,
              firstName: user.full_name?.split(' ')[0] || '',
              lastName: user.full_name?.split(' ')[1] || '',
              avatarUrl: user.avatar_url,
              isAdmin: user.is_admin,
              isShareHolder: user.is_shareholder,
              isFounder: user.founder_admin,
              phoneNumber: user.phone_number,
              status: user.role === "admin-founder" ? "Адміністратор-засновник" : 
                     user.role === "admin" ? "Адміністратор" :
                     user.role === "moderator" ? "Модератор" :
                     user.is_shareholder ? "Акціонер" : "Звичайний користувач"
            };
          });
          
          console.log("Оновлені користувачі:", updatedUsers);
          setUsers(updatedUsers);
          
          // Оновлюємо також локальне сховище для сумісності
          localStorage.setItem("users", JSON.stringify(updatedUsers));
          return;
        }
      } catch (supabaseError) {
        console.warn("Помилка при отриманні даних з Supabase:", supabaseError);
      }
      
      // Якщо дані з Supabase не отримані, використовуємо localStorage
      const storedUsers = JSON.parse(localStorage.getItem("users") || "[]");
      
      if (storedUsers.length > 0) {
        console.log("Користувачі з localStorage:", storedUsers);
        
        // Для кожного користувача в localStorage спробуємо створити запис у Supabase
        for (const user of storedUsers) {
          try {
            const { error } = await supabase
              .from('users')
              .insert({
                id: user.id,
                full_name: user.firstName && user.lastName ? 
                  `${user.firstName} ${user.lastName}` : user.full_name || '',
                phone_number: user.phoneNumber || '',
                is_admin: user.isAdmin || user.role === 'admin' || user.role === 'admin-founder',
                is_shareholder: user.isShareHolder || user.role === 'shareholder',
                founder_admin: user.isFounder || user.role === 'admin-founder' || 
                  user.phoneNumber === '0507068007',
                avatar_url: user.avatarUrl || '',
                password: user.password || ''
              })
              .select();
              
            if (error && error.code !== '23505') { // Ігноруємо помилки дублікатів
              console.warn(`Помилка створення користувача в Supabase (${user.id}):`, error);
            }
          } catch (insertError) {
            console.error("Помилка при спробі створення користувача:", insertError);
          }
        }
        
        // Після спроби створення користувачів у Supabase повторно завантажуємо дані
        try {
          const { data: refreshedUsers, error } = await supabase
            .from('users')
            .select('*')
            .order('created_at', { ascending: false });
          
          if (!error && refreshedUsers && refreshedUsers.length > 0) {
            const updatedUsers = refreshedUsers.map((user: any) => {
              if (user.phone_number === "0507068007") {
                return {
                  ...user,
                  isAdmin: true,
                  isFounder: true,
                  is_admin: true,
                  founder_admin: true,
                  role: "admin-founder",
                  isShareHolder: true,
                  is_shareholder: true,
                  status: "Адміністратор-засновник"
                };
              }
              return {
                ...user,
                firstName: user.full_name?.split(' ')[0] || '',
                lastName: user.full_name?.split(' ')[1] || '',
                avatarUrl: user.avatar_url,
                isAdmin: user.is_admin,
                isShareHolder: user.is_shareholder,
                isFounder: user.founder_admin,
                phoneNumber: user.phone_number,
                status: user.role === "admin-founder" ? "Адміністратор-засновник" : 
                       user.role === "admin" ? "Адміністратор" :
                       user.role === "moderator" ? "Модератор" :
                       user.is_shareholder ? "Акціонер" : "Звичайний користувач"
              };
            });
            
            setUsers(updatedUsers);
            localStorage.setItem("users", JSON.stringify(updatedUsers));
            return;
          }
        } catch (refreshError) {
          console.error("Помилка при оновленні даних з Supabase:", refreshError);
        }
      }
      
      // Якщо нема користувачів ані в Supabase, ані в localStorage, повертаємо порожній масив
      setUsers([]);
      
    } catch (error) {
      console.error("Помилка при завантаженні користувачів:", error);
      toast.error("Помилка при завантаженні даних користувачів");
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Завантажуємо дані при першому рендерингу
  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const deleteUser = async (userId: string) => {
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
  };
  
  const removeUserFromRelatedData = (userId: string) => {
    // Remove user's posts
    const posts = JSON.parse(localStorage.getItem("posts") || "[]");
    const updatedPosts = posts.filter((post: any) => post.userId !== userId && post.user_id !== userId);
    localStorage.setItem("posts", JSON.stringify(updatedPosts));
    
    // Remove user's portfolio items
    const portfolio = JSON.parse(localStorage.getItem("portfolio") || "[]");
    const updatedPortfolio = portfolio.filter((item: any) => item.userId !== userId && item.user_id !== userId);
    localStorage.setItem("portfolio", JSON.stringify(updatedPortfolio));
    
    // Remove user from shares data
    const shares = JSON.parse(localStorage.getItem("shares") || "[]");
    const updatedShares = shares.filter((share: any) => share.userId !== userId && share.user_id !== userId);
    localStorage.setItem("shares", JSON.stringify(updatedShares));
    
    // Remove user from other relevant storage
    const stockExchange = JSON.parse(localStorage.getItem("stockExchange") || "[]");
    const updatedStockExchange = stockExchange.filter((item: any) => item.sellerId !== userId && item.seller_id !== userId);
    localStorage.setItem("stockExchange", JSON.stringify(updatedStockExchange));
    
    const transactions = JSON.parse(localStorage.getItem("sharesTransactions") || "[]");
    const updatedTransactions = transactions.filter(
      (t: any) => (t.sellerId !== userId && t.buyerId !== userId) && (t.seller_id !== userId && t.buyer_id !== userId)
    );
    localStorage.setItem("sharesTransactions", JSON.stringify(updatedTransactions));
    
    // Видаляємо повідомлення та запити в друзі
    const friendRequests = JSON.parse(localStorage.getItem("friendRequests") || "[]");
    const updatedFriendRequests = friendRequests.filter(
      (req: any) => req.sender_id !== userId && req.receiver_id !== userId
    );
    localStorage.setItem("friendRequests", JSON.stringify(updatedFriendRequests));
    
    const messages = JSON.parse(localStorage.getItem("messages") || "[]");
    const updatedMessages = messages.filter(
      (msg: any) => msg.sender_id !== userId && msg.receiver_id !== userId
    );
    localStorage.setItem("messages", JSON.stringify(updatedMessages));
  };

  const changeUserStatus = async (userId: string, newStatus: string) => {
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
  };

  const toggleShareholderStatus = async (userId: string, isShareHolder: boolean) => {
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
  };

  return {
    users,
    isFounder,
    isLoading,
    deleteUser,
    changeUserStatus,
    toggleShareholderStatus,
    refreshUsers: loadUsers
  };
}
