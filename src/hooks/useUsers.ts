
import { useState, useEffect } from "react";
import { toast } from "sonner";

export function useUsers() {
  const [users, setUsers] = useState<any[]>([]);
  const [isFounder, setIsFounder] = useState(false);

  useEffect(() => {
    const currentUser = JSON.parse(localStorage.getItem("currentUser") || "{}");
    
    // Перевіряємо, чи це засновник
    const isFounderAdmin = currentUser.role === "admin-founder" || 
                          (currentUser.phoneNumber === "0507068007");
    
    setIsFounder(isFounderAdmin);
    
    // Завантажуємо користувачів
    const storedUsers = JSON.parse(localStorage.getItem("users") || "[]");
    
    // Переконуємося, що засновник має правильний статус
    const updatedUsers = storedUsers.map((user: any) => {
      if (user.phoneNumber === "0507068007") {
        return {
          ...user,
          isAdmin: true,
          isFounder: true,
          role: "admin-founder",
          isShareHolder: true,
          status: "Адміністратор-засновник"
        };
      }
      return user;
    });
    
    // Якщо є зміни, оновлюємо localStorage
    if (JSON.stringify(updatedUsers) !== JSON.stringify(storedUsers)) {
      localStorage.setItem("users", JSON.stringify(updatedUsers));
    }
    
    setUsers(updatedUsers);
  }, []);

  const deleteUser = (userId: string) => {
    const userToDelete = users.find(user => user.id === userId);
    if (userToDelete && (userToDelete.role === "admin-founder" || userToDelete.phoneNumber === "0507068007")) {
      toast.error("Неможливо видалити Адміністратора-засновника");
      return;
    }
    
    const updatedUsers = users.filter(user => user.id !== userId);
    setUsers(updatedUsers);
    localStorage.setItem("users", JSON.stringify(updatedUsers));
    toast.success("Користувача видалено");
  };

  const changeUserStatus = (userId: string, newStatus: string) => {
    const userToUpdate = users.find(user => user.id === userId);
    
    // Більш строга перевірка для захисту засновника
    if (userToUpdate && (userToUpdate.role === "admin-founder" || userToUpdate.phoneNumber === "0507068007") && !isFounder) {
      toast.error("Тільки Адміністратор-засновник може змінювати свій статус");
      return;
    }
    
    let newRole = "user";
    let isShareHolder = userToUpdate?.isShareHolder || false;
    
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
    
    const updatedUsers = users.map(user => {
      if (user.id === userId) {
        return { 
          ...user, 
          status: newStatus, 
          role: newRole,
          isShareHolder,
          // Спеціальна логіка для користувача з номером засновника
          ...(user.phoneNumber === "0507068007" ? {
            isAdmin: true,
            isFounder: true,
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
  };

  const toggleShareholderStatus = (userId: string, isShareHolder: boolean) => {
    const userToUpdate = users.find(user => user.id === userId);
    
    // Додаткова перевірка для засновника
    if (userToUpdate && (userToUpdate.role === "admin-founder" || userToUpdate.phoneNumber === "0507068007") && !isFounder) {
      toast.error("Тільки Адміністратор-засновник може змінювати акціонерний статус");
      return;
    }
    
    const updatedUsers = users.map(user => {
      if (user.id === userId) {
        // Спеціальна логіка для користувача з номером засновника
        if (user.phoneNumber === "0507068007") {
          return { 
            ...user, 
            isShareHolder: true,
            isAdmin: true,
            isFounder: true,
            role: "admin-founder",
            status: "Адміністратор-засновник"
          };
        }
        
        return { 
          ...user, 
          isShareHolder,
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
  };

  return {
    users,
    isFounder,
    deleteUser,
    changeUserStatus,
    toggleShareholderStatus
  };
}
