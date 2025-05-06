
import { supabase } from '@/integrations/supabase/client';
import { toast } from "sonner";
import { User } from './types';

// Delete user function
export const deleteUser = async (userId: string) => {
  try {
    const storedUsers = JSON.parse(localStorage.getItem("users") || "[]");
    
    // Check if user exists in localStorage
    const userExists = storedUsers.some((user: any) => user.id === userId);
    
    if (userExists) {
      // Remove from localStorage
      const updatedUsers = storedUsers.filter((user: any) => user.id !== userId);
      localStorage.setItem("users", JSON.stringify(updatedUsers));
    }
    
    // Also try to delete from Supabase
    try {
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', userId);
        
      if (error) {
        console.warn("Error deleting user from Supabase:", error);
      }
    } catch (supabaseError) {
      console.warn("Supabase connection error:", supabaseError);
    }
    
    toast.success("Користувач успішно видалений");
    return true;
  } catch (error) {
    console.error("Error deleting user:", error);
    toast.error("Помилка при видаленні користувача");
    return false;
  }
};

// Change user status function
export const changeUserStatus = async (userId: string, newStatus: string) => {
  try {
    const storedUsers = JSON.parse(localStorage.getItem("users") || "[]");
    
    // Update in localStorage
    const updatedUsers = storedUsers.map((user: User) => {
      if (user.id === userId) {
        return { ...user, status: newStatus };
      }
      return user;
    });
    
    localStorage.setItem("users", JSON.stringify(updatedUsers));
    
    // Also try to update in Supabase - we use full_name field to store status since there's no status field
    try {
      const { error } = await supabase
        .from('users')
        .update({ full_name: newStatus })
        .eq('id', userId);
        
      if (error) {
        console.warn("Error updating user status in Supabase:", error);
      }
    } catch (supabaseError) {
      console.warn("Supabase connection error:", supabaseError);
    }
    
    toast.success("Статус користувача оновлено");
    return true;
  } catch (error) {
    console.error("Error changing user status:", error);
    toast.error("Помилка при зміні статусу користувача");
    return false;
  }
};

// Toggle shareholder status function
export const toggleShareholderStatus = async (userId: string, isShareHolder: boolean) => {
  try {
    console.log(`Зміна статусу акціонера для користувача ${userId} на ${isShareHolder}`);
    const storedUsers = JSON.parse(localStorage.getItem("users") || "[]");
    
    // Update in localStorage
    const updatedUsers = storedUsers.map((user: User) => {
      if (user.id === userId) {
        return { 
          ...user, 
          isShareHolder,
          is_shareholder: isShareHolder 
        };
      }
      return user;
    });
    
    localStorage.setItem("users", JSON.stringify(updatedUsers));
    
    // Also try to update in Supabase
    try {
      const { error } = await supabase
        .from('users')
        .update({ 
          is_shareholder: isShareHolder,
          isShareHolder: isShareHolder
        })
        .eq('id', userId);
        
      if (error) {
        console.warn("Error updating shareholder status in Supabase:", error);
      } else {
        // Update was successful
        // Dispatch an event to notify other components about the shareholder status update
        const statusUpdateEvent = new CustomEvent('shareholder-status-updated', { 
          detail: { 
            userId: userId,
            isShareHolder: isShareHolder 
          }
        });
        window.dispatchEvent(statusUpdateEvent);
      }
    } catch (supabaseError) {
      console.warn("Supabase connection error:", supabaseError);
    }
    
    // Update the current user if it's the same user
    const currentUser = JSON.parse(localStorage.getItem("currentUser") || "{}");
    if (currentUser && currentUser.id === userId) {
      currentUser.isShareHolder = isShareHolder;
      currentUser.is_shareholder = isShareHolder;
      localStorage.setItem("currentUser", JSON.stringify(currentUser));
    }
    
    toast.success(isShareHolder ? "Користувача призначено акціонером" : "Статус акціонера знято");
    return true;
  } catch (error) {
    console.error("Error toggling shareholder status:", error);
    toast.error("Помилка при зміні статусу акціонера");
    return false;
  }
};
