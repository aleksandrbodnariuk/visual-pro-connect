
import { useState, useEffect } from "react";
import { toast } from "sonner";

export function useUsers() {
  const [users, setUsers] = useState<any[]>([]);
  const [isFounder, setIsFounder] = useState(false);

  useEffect(() => {
    const currentUser = JSON.parse(localStorage.getItem("currentUser") || "{}");
    setIsFounder(currentUser.role === "admin-founder");
    
    const storedUsers = JSON.parse(localStorage.getItem("users") || "[]");
    setUsers(storedUsers);
  }, []);

  const deleteUser = (userId: string) => {
    const userToDelete = users.find(user => user.id === userId);
    if (userToDelete && userToDelete.role === "admin-founder") {
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
    if (userToUpdate && userToUpdate.role === "admin-founder" && !isFounder) {
      toast.error("Тільки Адміністратор-засновник може змінювати свій статус");
      return;
    }
    
    let newRole = "user";
    if (newStatus === "Адміністратор" || newStatus === "Адміністратор-засновник") {
      newRole = newStatus === "Адміністратор-засновник" ? "admin-founder" : "admin";
    } else if (newStatus === "Модератор") {
      newRole = "moderator";
    } else if (newStatus === "Представник") {
      newRole = "representative";
    }
    
    const updatedUsers = users.map(user => {
      if (user.id === userId) {
        return { ...user, status: newStatus, role: newRole };
      }
      return user;
    });
    
    setUsers(updatedUsers);
    localStorage.setItem("users", JSON.stringify(updatedUsers));
    toast.success(`Статус користувача змінено на "${newStatus}"`);
  };

  const toggleShareholderStatus = (userId: string, isShareHolder: boolean) => {
    const userToUpdate = users.find(user => user.id === userId);
    if (userToUpdate && userToUpdate.role === "admin-founder" && !isFounder) {
      toast.error("Тільки Адміністратор-засновник може змінювати акціонерний статус");
      return;
    }
    
    const updatedUsers = users.map(user => {
      if (user.id === userId) {
        return { 
          ...user, 
          isShareHolder,
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
  };

  return {
    users,
    isFounder,
    deleteUser,
    changeUserStatus,
    toggleShareholderStatus
  };
}
