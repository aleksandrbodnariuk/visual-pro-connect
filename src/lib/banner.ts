
import { supabase } from "@/integrations/supabase/client";

export async function updateUserBanner(userId: string, bannerUrl: string) {
  try {
    // Спочатку оновлюємо в Supabase
    const { error } = await supabase
      .from('users')
      .update({ banner_url: bannerUrl })
      .eq('id', userId);
    
    if (error) throw error;
    
    // Потім оновлюємо в localStorage
    const currentUser = JSON.parse(localStorage.getItem("currentUser") || "{}");
    if (currentUser && currentUser.id === userId) {
      currentUser.bannerUrl = bannerUrl;
      currentUser.banner_url = bannerUrl;
      localStorage.setItem("currentUser", JSON.stringify(currentUser));
    }
    
    return true;
  } catch (error) {
    console.error("Error updating user banner:", error);
    
    // Зберігаємо в localStorage як запасний варіант
    const currentUser = JSON.parse(localStorage.getItem("currentUser") || "{}");
    if (currentUser && currentUser.id === userId) {
      currentUser.bannerUrl = bannerUrl;
      currentUser.banner_url = bannerUrl;
      localStorage.setItem("currentUser", JSON.stringify(currentUser));
    }
    
    return false;
  }
}

export function getUserBanner(user: any): string | null {
  // Спробуємо отримати з Supabase полів
  if (user?.banner_url) {
    return user.banner_url;
  }
  
  // Потім з camelCase полів
  if (user?.bannerUrl) {
    return user.bannerUrl;
  }
  
  // Якщо нічого не знайдено, спробуємо localStorage
  const userId = user?.id;
  if (userId) {
    const localBanner = localStorage.getItem(`banner-${userId}`);
    if (localBanner) {
      return localBanner;
    }
  }
  
  return null;
}
