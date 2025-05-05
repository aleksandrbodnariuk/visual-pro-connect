
// Створюємо окремий файл для функцій управління користувачами
import { toast } from "sonner";
import { User } from "./types";
import { supabase } from "@/integrations/supabase/client";

export const toggleShareholderStatus = async (
  userId: string,
  isShareHolder: boolean
) => {
  try {
    // Оновлюємо в localStorage
    const usersJson = localStorage.getItem("users");
    if (usersJson) {
      const users: User[] = JSON.parse(usersJson);
      const updatedUsers = users.map((user) => {
        if (user.id === userId) {
          const updatedUser = {
            ...user,
            isShareHolder,
            is_shareholder: isShareHolder, // Для сумісності з Supabase
          };
          
          // Оновлюємо роль і статус, якщо користувач став акціонером
          if (isShareHolder) {
            if (!user.role || user.role === "user") {
              updatedUser.role = "shareholder";
            }
            if (!user.status || user.status === "Звичайний користувач") {
              updatedUser.status = "Акціонер";
            }
          } 
          // Повертаємо звичайний статус, якщо користувач більше не акціонер
          else if (user.role === "shareholder") {
            updatedUser.role = "user";
            updatedUser.status = "Звичайний користувач";
          }
          
          return updatedUser;
        }
        return user;
      });
      localStorage.setItem("users", JSON.stringify(updatedUsers));

      // Оновлюємо поточного користувача, якщо це він
      const currentUserJson = localStorage.getItem("currentUser");
      if (currentUserJson) {
        const currentUser = JSON.parse(currentUserJson);
        if (currentUser.id === userId) {
          currentUser.isShareHolder = isShareHolder;
          if (isShareHolder && currentUser.role === "user") {
            currentUser.role = "shareholder";
            currentUser.status = "Акціонер";
          } else if (!isShareHolder && currentUser.role === "shareholder") {
            currentUser.role = "user";
            currentUser.status = "Звичайний користувач";
          }
          localStorage.setItem("currentUser", JSON.stringify(currentUser));
        }
      }
    }

    // Оновлюємо в Supabase
    try {
      const { error } = await supabase
        .from("users")
        .update({ is_shareholder: isShareHolder })
        .eq("id", userId);

      if (error) {
        console.warn("Помилка при оновленні статусу акціонера в Supabase:", error);
      }
    } catch (supabaseError) {
      console.warn("Помилка зв'язку з Supabase:", supabaseError);
    }

    return true;
  } catch (error) {
    console.error("Помилка при оновленні статусу акціонера:", error);
    return false;
  }
};

export const changeUserStatus = async (userId: string, status: string) => {
  try {
    // Визначаємо роль на основі статусу
    let role = "user";
    let isAdmin = false;
    let isShareHolder = false;
    let founderAdmin = false;
    
    switch (status) {
      case "Адміністратор-засновник":
        role = "admin-founder";
        isAdmin = true;
        isShareHolder = true;
        founderAdmin = true;
        break;
      case "Адміністратор":
        role = "admin";
        isAdmin = true;
        break;
      case "Акціонер":
        role = "shareholder";
        isShareHolder = true;
        break;
      default:
        role = "user";
    }
    
    // Оновлюємо в localStorage
    const usersJson = localStorage.getItem("users");
    if (usersJson) {
      const users: User[] = JSON.parse(usersJson);
      const updatedUsers = users.map((user) => {
        if (user.id === userId) {
          return {
            ...user,
            status,
            role,
            isAdmin,
            isShareHolder,
            founderAdmin,
            is_admin: isAdmin,
            is_shareholder: isShareHolder,
            founder_admin: founderAdmin,
          };
        }
        return user;
      });
      localStorage.setItem("users", JSON.stringify(updatedUsers));
      
      // Оновлюємо поточного користувача, якщо це він
      const currentUserJson = localStorage.getItem("currentUser");
      if (currentUserJson) {
        const currentUser = JSON.parse(currentUserJson);
        if (currentUser.id === userId) {
          currentUser.status = status;
          currentUser.role = role;
          currentUser.isAdmin = isAdmin;
          currentUser.isShareHolder = isShareHolder;
          currentUser.founderAdmin = founderAdmin;
          localStorage.setItem("currentUser", JSON.stringify(currentUser));
        }
      }
    }
    
    // Оновлюємо в Supabase
    try {
      const { error } = await supabase
        .from("users")
        .update({
          is_admin: isAdmin,
          is_shareholder: isShareHolder,
          founder_admin: founderAdmin,
        })
        .eq("id", userId);
        
      if (error) {
        console.warn("Помилка при оновленні статусу користувача в Supabase:", error);
      }
    } catch (supabaseError) {
      console.warn("Помилка зв'язку з Supabase:", supabaseError);
    }

    toast.success(`Статус користувача змінено на "${status}"`);
    return true;
  } catch (error) {
    console.error("Помилка при оновленні статусу користувача:", error);
    toast.error("Не вдалося змінити статус користувача");
    return false;
  }
};

export const deleteUser = async (userId: string) => {
  try {
    // Видаляємо з localStorage
    const usersJson = localStorage.getItem("users");
    if (usersJson) {
      const users: User[] = JSON.parse(usersJson);
      const updatedUsers = users.filter((user) => user.id !== userId);
      localStorage.setItem("users", JSON.stringify(updatedUsers));
    }
    
    // Видаляємо з Supabase
    try {
      const { error } = await supabase
        .from("users")
        .delete()
        .eq("id", userId);
        
      if (error) {
        console.warn("Помилка при видаленні користувача в Supabase:", error);
      }
    } catch (supabaseError) {
      console.warn("Помилка зв'язку з Supabase:", supabaseError);
    }

    return true;
  } catch (error) {
    console.error("Помилка при видаленні користувача:", error);
    toast.error("Не вдалося видалити користувача");
    return false;
  }
};
